/* ============ TERRAIN PIPELINE — satellite-grade rendering ============ */
const RES_SCALE=(((window.screen&&Math.min(screen.width||9999,screen.height||9999)<760))||
  (navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4))?0.75:1;
function hslc(h,s,l){s/=100;l/=100;
  const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l);
  const f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
  return[f(0)*255|0,f(8)*255|0,f(4)*255|0];}
const mix=(a,b,t)=>a+(b-a)*t;
const mixHSL=(A,B,t)=>[mix(A[0],B[0],t),mix(A[1],B[1],t),mix(A[2],B[2],t)];
const smoothT=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// dual-frequency cylindrical sampling (for zonal wind-stretched clouds)
function cylUV(fb,u,v,fu,fv,oct){
  const th=u*Math.PI*2,ph=v*Math.PI,Ru=fu*0.48,Rv=fv*0.48;
  return fb(Math.cos(th)*Math.sin(ph)*Ru+Ru,Math.cos(ph)*Rv+Rv,Math.sin(th)*Math.sin(ph)*Ru+Ru,oct);
}
// domain warp: organic coastlines & terrain flow
function warp2(fb,u,v,f,amt){
  return[amt*cyl(fb,u+11.7,v+3.1,f,3),amt*cyl(fb,u+71.3,v+47.9,f,3)];
}

// per-pixel satellite coloring: smooth biome ramps, no elevation banding
function colorAt(W,fb2,rc,isCradle,e,slope,lat,u,v){
  const P=W.pal;let col;
  if(e<W.sea){
    const d=W.sea-e;
    const t=smoothT(0,0.22,d);
    col=mixHSL([P.shal[0],P.shal[1]+8,P.shal[2]+20],
               [P.deep[0],P.deep[1],Math.max(6,P.deep[2]-4)],t);
    col[2]+=cyl(fb2,u,v,9,2)*2.0;                       // bathymetric mottle
    const shelfW=0.008+0.008*Math.abs(cyl(fb2,u+41,v+17,11,2)); // ragged, varying shelf
    if(d<shelfW)col=mixHSL(mixHSL(col,[P.shal[0]-6,P.shal[1]+14,P.shal[2]+16],.55),col,d/shelfW);
    col[1]*=0.88;col[2]*=0.9;                            // satellite ocean: darker, calmer
  }else{
    const alt=e-W.sea;
    const moist=cyl(fb2,u,v,5,4)+0.15*Math.cos(lat*6.9); // moisture + latitude bands
    const veg=[P.low[0]+cyl(fb2,u+5,v,7,2)*16,P.low[1]+12,P.low[2]-2];
    const dry=[38,28,50];
    col=mixHSL(dry,veg,smoothT(-0.15,0.3,moist));
    if(moist>0.22&&cyl(fb2,u+63,v+37,12,3)>0.12){col[2]-=6;col[1]+=6;} // forest patchwork
    const rockT=Math.max(smoothT(0.05,0.15,slope),smoothT(0.30,0.5,alt));
    col=mixHSL(col,[P.high[0],Math.max(8,P.high[1]-14),P.high[2]],rockT);
    col[2]+=cyl(fb2,u+23,v+9,18,2)*5.5+cyl(fb2,u+91,v+53,34,2)*2.5; // layered surface mottle
    const snowLine=0.52-Math.pow(lat,1.6)*0.42+cyl(fb2,u,v,8,2)*0.05;
    if(alt>snowLine)col=mixHSL(col,[210,8,88],smoothT(snowLine,snowLine+0.08,alt));
    col[1]*=0.78;                                        // satellite land: olive, not video-game green
  }
  return col;
}

async function buildWorldMaps(key,progressCb){
  const W=WORLDS[key];
  const fb=makeNoise(W.seed*7919+3),fb2=makeNoise(W.seed*337+29),crack=makeNoise(W.seed*104729+11);
  const TW=Math.round(W.res[0]*RES_SCALE),TH=Math.round(W.res[1]*RES_SCALE);
  const Hf=new Float32Array(TW*TH);
  const isCradle=key==='cradle';
  // pass 1: heightfield
  for(let y=0;y<TH;y++){
    const v=y/TH;
    for(let x=0;x<TW;x++){
      const u=x/TW;
      Hf[y*TW+x]=isCradle?elevCradle(fb,u,v):elevGeneric(fb,W,u,v);
    }
    if(!(y&7)){progressCb(y/TH*0.5);await raf();}
  }
  // pass 2: color / normal / displacement / roughness
  const mk4=()=>{const c=document.createElement('canvas');c.width=TW;c.height=TH;
    const x2=c.getContext('2d');return[c,x2,x2.createImageData(TW,TH)];};
  const[cC,cctx,img]=mk4(),[cN,nctx,nimg]=mk4(),[cD,dctx,dimg]=mk4(),[cR,rctx,rimg]=mk4();
  const nstr=isCradle?5.5:4;
  const L=[-0.6,-0.75];
  for(let y=0;y<TH;y++){
    const v=y/TH,lat=Math.abs(v-0.5)*2;
    for(let x=0;x<TW;x++){
      const u=x/TW,i=y*TW+x,e=Hf[i];
      const xr=(x+1)%TW,yd=Math.min(TH-1,y+1);
      const dEx=Hf[y*TW+xr]-e,dEy=Hf[yd*TW+x]-e;
      const slope=Math.hypot(dEx,dEy)*TW/1024;
      const rc=isCradle?cradleRC(u*MAP_R*2-MAP_R,v*MAP_R*2-MAP_R):null;
      let[h,sat,l]=colorAt(W,fb2,rc,isCradle,e,slope,lat,u,v);
      let icy=false;
      if(isCradle&&e>=W.sea){
        if(rc.region==='everwood'){h=mix(h,125,.6);sat=Math.min(62,sat+14);l-=4;}
        else if(rc.region==='rosegold'&&e<W.sea+0.3){h=mix(h,38,.4);sat+=8;l+=2;}
        else if(rc.region==='iceflower'){h+=14;sat-=5;l+=3;}
        if(rc.sand>0.45&&e<W.sea+0.42){
          h=42;sat=32;l=57+(e-W.sea)*26;
          l+=1.8*Math.sin(u*640+cyl(fb2,u,v,10,2)*9); // dune striations
        }
        if(rc.ice>0.42){sat*=.2;l=Math.min(93,l+38);icy=true;}
      }
      if(lat>1-W.ice&&e>=W.sea){sat*=.28;l=Math.min(93,l+36);icy=true;}
      if(l>80&&e>=W.sea)icy=true; // snowcaps
      if(W.cracks&&Math.abs(cyl(crack,u,v,2.2,4))<0.03){h=0;sat=70;l=42;}
      if(W.rifts&&Math.abs(cyl(crack,u,v,1.4,3))<0.02){h=300;sat=60;l=55;}
      if(W.shattered&&Math.abs(cyl(crack,u,v,1.8,3))<0.025){h=45;sat=80;l=60;}
      if(W.lights&&e>=W.sea&&Math.abs(cyl(fb,u,v,8,2))>0.34&&lat<0.75){h=46;sat=85;l=66;}
      // hillshade (land only)
      if(e>=W.sea)l*=Math.max(0.4,Math.min(1.4,1+(dEx*L[0]+dEy*L[1])*nstr*3.1*TW/1024));
      l=Math.max(3,Math.min(95,l));
      const rgb=hslc(h,sat,l);
      img.data[i*4]=rgb[0];img.data[i*4+1]=rgb[1];img.data[i*4+2]=rgb[2];img.data[i*4+3]=255;
      const nx=-dEx*nstr*TW/512,ny=dEy*nstr*TH/256;
      const inv=1/Math.sqrt(nx*nx+ny*ny+1);
      nimg.data[i*4]=(nx*inv*0.5+0.5)*255;
      nimg.data[i*4+1]=(ny*inv*0.5+0.5)*255;
      nimg.data[i*4+2]=(1*inv*0.5+0.5)*255;
      nimg.data[i*4+3]=255;
      const dv2=Math.max(0,Math.min(1,(Math.max(e,W.sea)-W.sea)/1.1))*255|0;
      dimg.data[i*4]=dv2;dimg.data[i*4+1]=dv2;dimg.data[i*4+2]=dv2;dimg.data[i*4+3]=255;
      // roughness: smooth ocean (sun glint), matte land, semi-gloss ice
      const rv=e<W.sea?155:(icy?195:242); // matte satellite look — no marble shine
      rimg.data[i*4]=rv;rimg.data[i*4+1]=rv;rimg.data[i*4+2]=rv;rimg.data[i*4+3]=255;
    }
    if(!(y&7)){progressCb(0.5+y/TH*0.35);await raf();}
  }
  cctx.putImageData(img,0,0);nctx.putImageData(nimg,0,0);
  dctx.putImageData(dimg,0,0);rctx.putImageData(rimg,0,0);
  // pass 3: weather — banded cloud fields with seeded cyclones
  const clouds=await buildClouds(W,p=>progressCb(0.85+p*0.15));
  const mk=c=>{const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;return t;};
  return{color:mk(cC),normal:mk(cN),disp:mk(cD),rough:mk(cR),clouds:mk(clouds)};
}

async function buildClouds(W,progressCb){
  const cn=makeNoise(W.seed*31+17),rnd=mulberry(W.seed*97+5);
  const CW=Math.round(1024*RES_SCALE),CH=Math.round(512*RES_SCALE);
  const c=document.createElement('canvas');c.width=CW;c.height=CH;
  const x2=c.getContext('2d'),img=x2.createImageData(CW,CH);
  const dead=W.cracks||W.shattered;
  // seeded cyclones: position, size, spin direction
  const cyc=[];
  const nCyc=dead?1:2+(rnd()*2|0);
  for(let k=0;k<nCyc;k++)cyc.push({
    u:rnd(),v:0.22+rnd()*0.56,s:0.028+rnd()*0.034,dir:rnd()<.5?1:-1,ph:rnd()*6.28});
  const phase=rnd()*6.28;
  for(let y=0;y<CH;y++){
    const v=y/CH,lat=Math.abs(v-0.5)*2;
    // gentle zonal preference: ITCZ band, storm tracks, clearer subtropics, thin poles
    const bands=0.72+0.28*Math.sin(v*Math.PI*5.5+phase);
    const latW=bands*(0.55+0.45*smoothT(0.97,0.55,lat));
    for(let x=0;x<CW;x++){
      const u=x/CW;
      // strong swirl warp: makes fronts curl instead of blob
      const[du,dv]=warp2(cn,u,v,2.2,0.22);
      const[du2,dv2]=warp2(cn,u+31.7,v+13.1,5.5,0.06);
      // layered field: broad systems + wind-stretched streaks + fine texture
      let cov=cylUV(cn,u+du,v+dv,2.2,4.5,4)*0.62
             +cylUV(cn,u+du+du2,v+dv+dv2,4.5,11,4)*0.34
             +cyl(cn,u+du2,v+dv2,9,3)*0.18;
      // frontal bands: long diagonal streamers
      cov+=0.16*Math.sin((u*3.1+v*1.3)*6.283+cyl(cn,u,v,1.4,2)*5.5);
      // wispy erosion at the margins
      const erode=Math.abs(cyl(cn,u+57,v+21,13,3));
      // cyclones: logarithmic spiral arms with a clear eye
      for(const C of cyc){
        let cu=u-C.u;if(cu>0.5)cu-=1;if(cu<-0.5)cu+=1;
        const cvv=(v-C.v)*2;
        const r=Math.hypot(cu,cvv);
        if(r<C.s*4.5){
          const th=Math.atan2(cvv,cu);
          const arm=Math.sin(th*2-C.dir*Math.log(r+1e-4)*8+C.ph);
          cov+=(0.5+0.5*arm)*Math.exp(-(r*r)/(C.s*C.s*1.3))*0.62;
          if(r<C.s*0.14)cov-=0.55*(1-r/(C.s*0.14));
        }
      }
      // soft density curve: opaque cores, long feathered edges — no hard threshold
      let dens=smoothT(0.05,0.66,cov*latW-erode*0.24);
      dens=Math.pow(dens,1.5);
      const a=Math.min(232,dens*255)*(dead?0.4:1);
      const i=(y*CW+x)*4;
      // slight blue-grey in thin cloud, white cores — reads as depth
      const w=200+55*dens;
      img.data[i]=w;img.data[i+1]=w+2;img.data[i+2]=Math.min(255,w+8);img.data[i+3]=a;
    }
    if(!(y&15)){progressCb(y/CH);await raf();}
  }
  x2.putImageData(img,0,0);
  return c;
}
function glowTexture(hex,inner=1){
  const c=document.createElement('canvas');c.width=c.height=128;
  const x2=c.getContext('2d');
  const g=x2.createRadialGradient(64,64,0,64,64,64);
  const col='#'+hex.toString(16).padStart(6,'0');
  g.addColorStop(0,'rgba(255,255,255,'+inner+')');
  g.addColorStop(0.25,col+'cc');
  g.addColorStop(1,col+'00');
  x2.fillStyle=g;x2.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
// yield to the frame loop between texture rows; in a hidden/background tab
// rAF never fires (and timers are throttled), so build without yielding there
const raf=()=>document.hidden?Promise.resolve():new Promise(r=>requestAnimationFrame(()=>r()));
