/* ============ MAIN APP — scene, camera, picking, modes, loop ============
   Everything in here needs THREE, so it runs from window.__main once the
   render library is loaded (see js/boot.js). */
window.__main=function(){
try{

/* ============ SCENE ============ */
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.5,9000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
document.getElementById('stage').appendChild(renderer.domElement);
scene.background=new THREE.Color(0x03040a);

function starPoints(n,rad,size,op){
  const g=new THREE.BufferGeometry(),pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const th=Math.random()*6.283,ph=Math.acos(2*Math.random()-1),r=rad*(0.55+Math.random()*0.45);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.cos(ph);pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
  }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  return new THREE.Points(g,new THREE.PointsMaterial({color:0xdde6ff,size,sizeAttenuation:true,
    transparent:true,opacity:op,depthWrite:false}));
}
scene.add(starPoints(2600,3600,2.2,.85));
scene.add(starPoints(1400,2200,1.4,.5));
const nebGroup=new THREE.Group();scene.add(nebGroup);
[[0x5aa7ff,.10],[0xa07bff,.12],[0x2e5adf,.08],[0x7a5adf,.09]].forEach(([col,op])=>{
  for(let k=0;k<5;k++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(col,.25),
      transparent:true,opacity:op,depthWrite:false,blending:THREE.AdditiveBlending}));
    sp.position.set((Math.random()-.5)*2400,(Math.random()-.5)*1200,(Math.random()-.5)*2400);
    const s=700+Math.random()*900;sp.scale.set(s,s,1);
    nebGroup.add(sp);
  }
});
scene.add(new THREE.AmbientLight(0x39476b,1.15));
scene.add(new THREE.HemisphereLight(0x9db8e8,0x241a12,0.5));
// chaos beyond the Edge: crimson-black nebulae, growing denser with distance
{
  const D=new THREE.Vector3(0.88,0.04,-0.32).normalize();
  [[0x8b1a1a,.16],[0x4a0d12,.22],[0x6e1418,.14]].forEach(([col,op])=>{
    for(let k=0;k<6;k++){
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(col,.2),
        transparent:true,opacity:op,depthWrite:false}));
      const dist=1250+Math.random()*750;
      sp.position.copy(D).multiplyScalar(dist)
        .add(new THREE.Vector3((Math.random()-.5)*700,(Math.random()-.5)*420,(Math.random()-.5)*700));
      const sc=520+Math.random()*720;sp.scale.set(sc,sc,1);
      nebGroup.add(sp);
    }
  });
}

const pickables=[],labelNodes=[],systems={};
async function buildSystems(progressCb){
  const worldKeys=iterations.filter(n=>n.world).map(n=>n.world);
  const maps={};
  let done=0;
  for(const key of worldKeys){
    maps[key]=await buildWorldMaps(key,p=>progressCb((done+p)/worldKeys.length,key));
    done++;
  }
  const flickerGlows=[]; window._flickerGlows=flickerGlows;
  const tumblers=[]; window._tumblers=tumblers;
  for(const node of iterations){
    const grp=new THREE.Group();
    grp.position.fromArray(node.pos);
    scene.add(grp);
    if(node.corrupt){
      // a world losing the Way: no star, dim red light, flickering halo, slow tumble
      const W=WORLDS[node.world];
      const planet=new THREE.Mesh(new THREE.SphereGeometry(W.pr,96,48),
        new THREE.MeshStandardMaterial({
          map:maps[node.world].color,normalMap:maps[node.world].normal,
          normalScale:new THREE.Vector2(1,1),
          displacementMap:maps[node.world].disp,displacementScale:W.pr*0.07,
          roughnessMap:maps[node.world].rough,
          roughness:1,metalness:0}));
      planet.userData.node=node;pickables.push(planet);
      grp.add(planet);
      const ash=new THREE.Mesh(new THREE.SphereGeometry(W.pr*1.06,48,24),
        new THREE.MeshBasicMaterial({map:maps[node.world].clouds,color:0x6a4b45,
          transparent:true,opacity:.7,depthWrite:false}));
      grp.add(ash);tumblers.push(ash);
      grp.add(new THREE.PointLight(0x8b2020,.9,W.pr*14));
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(W.atmo,.4),
        transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending}));
      glow.scale.set(W.pr*6,W.pr*6,1);grp.add(glow);
      flickerGlows.push({mat:glow.material,seed:Math.random()*100});
      tumblers.push(planet);
      systems[node.id]={group:grp,planet,node,W,corrupt:true};
      labelNodes.push({node,get:()=>grp.position});
      continue;
    }
    if(node.edge){
      // the boundary veil: light of the Way fading into chaos
      const veil=new THREE.Group();
      const gradTex=(cA,cB,aA,aB)=>{
        const c=document.createElement('canvas');c.width=256;c.height=8;
        const x2=c.getContext('2d');
        const g=x2.createLinearGradient(0,0,256,0);
        g.addColorStop(0,cA.replace(')',','+aA+')').replace('rgb','rgba'));
        g.addColorStop(1,cB.replace(')',','+aB+')').replace('rgb','rgba'));
        x2.fillStyle=g;x2.fillRect(0,0,256,8);
        return new THREE.CanvasTexture(c);
      };
      const blue=new THREE.Mesh(new THREE.PlaneGeometry(980,640),
        new THREE.MeshBasicMaterial({map:gradTex('rgb(90,167,255)','rgb(90,167,255)',0.34,0),
          transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
      const red=new THREE.Mesh(new THREE.PlaneGeometry(1100,720),
        new THREE.MeshBasicMaterial({map:gradTex('rgb(80,10,16)','rgb(139,26,26)',0,0.5),
          transparent:true,side:THREE.DoubleSide,depthWrite:false}));
      red.position.z=-140;
      veil.add(blue,red);
      grp.add(veil);
      grp.lookAt(0,0,0);
      // clickable boundary beacon
      const beacon=new THREE.Mesh(new THREE.SphereGeometry(14,10,10),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      const mark=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(0xd9b36b,.6),
        transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));
      mark.scale.set(46,46,1);
      grp.add(beacon,mark);
      beacon.userData.node=node;pickables.push(beacon);
      flickerGlows.push({mat:mark.material,seed:7});
      systems[node.id]={group:grp,node,edge:true};
      labelNodes.push({node,get:()=>grp.position});
      continue;
    }
    if(node.beacon){
      // sector: a vast translucent volume of the Way's light enclosing its
      // member worlds — the largest thing in its region, as it should be.
      // (nodes without shellR stay small markers, e.g. the 943 memorial)
      const col=node.beaconColor||0x5aa7ff;
      const R=node.shellR||0;
      const rings=[];
      if(R){
        // soft aurora shell: inner surface glow + faint outer haze
        const shell=new THREE.Mesh(new THREE.SphereGeometry(R,48,32),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.05,
            side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));
        const haze=new THREE.Mesh(new THREE.SphereGeometry(R,48,32),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.018,
            side:THREE.FrontSide,blending:THREE.AdditiveBlending,depthWrite:false}));
        grp.add(shell,haze);
        // slow great-circle survey rings on the boundary
        const mkRing=tilt=>{
          const seg=128,pts=new Float32Array(seg*3);
          for(let i=0;i<seg;i++){const a=i/seg*6.283;
            pts[i*3]=Math.cos(a)*R;pts[i*3+1]=0;pts[i*3+2]=Math.sin(a)*R;}
          const g2=new THREE.BufferGeometry();
          g2.setAttribute('position',new THREE.BufferAttribute(pts,3));
          const ln=new THREE.LineLoop(g2,new THREE.LineBasicMaterial({color:col,
            transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false}));
          ln.rotation.x=tilt;ln.rotation.z=tilt*.6;
          return ln;
        };
        const r1=mkRing(0.35),r2=mkRing(-0.85);
        grp.add(r1,r2);rings.push(r1,r2);
      }
      // designation buoy at the top pole: pick target + label anchor
      const buoy=new THREE.Group();buoy.position.y=R;
      const hit=new THREE.Mesh(new THREE.SphereGeometry(R?30:22,10,10),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      const mark=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(col,.5),
        transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending}));
      mark.scale.set(R?64:44,R?64:44,1);
      const core=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(R?11:8,0)),
        new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.8}));
      buoy.add(hit,mark,core);
      grp.add(buoy);
      hit.userData.node=node;pickables.push(hit);
      systems[node.id]={group:grp,node,beacon:true,anchor:core,rings};
      labelNodes.push({node,get:()=>{const v=new THREE.Vector3();buoy.getWorldPosition(v);return v;}});
      continue;
    }
    if(node.vroshir){
      // hostile host: drifting angular shards, crimson glow, no filament — by design
      const host=new THREE.Group();
      for(let k=0;k<9;k++){
        const sz=5+Math.random()*11;
        const shard=new THREE.Mesh(new THREE.TetrahedronGeometry(sz,0),
          new THREE.MeshStandardMaterial({color:0x120b0d,emissive:0x8b1a1a,
            emissiveIntensity:.45,metalness:.7,roughness:.4,flatShading:true}));
        shard.position.set((Math.random()-.5)*90,(Math.random()-.5)*60,(Math.random()-.5)*90);
        shard.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
        shard.userData.node=node;
        host.add(shard);pickables.push(shard);
        tumblers.push(shard);
      }
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(0x8b1a1a,.35),
        transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending}));
      glow.scale.set(220,220,1);host.add(glow);
      flickerGlows.push({mat:glow.material,seed:31});
      grp.add(host);grp.add(new THREE.PointLight(0x8b1a1a,1.1,400));
      systems[node.id]={group:grp,node,vroshir:true,anchor:host};
      labelNodes.push({node,get:()=>grp.position});
      continue;
    }
    if(node.station){
      const st=new THREE.Group();
      const core=new THREE.Mesh(new THREE.OctahedronGeometry(9,0),
        new THREE.MeshStandardMaterial({color:0x0a0f1d,emissive:0xa07bff,
          emissiveIntensity:.5,metalness:.8,roughness:.3}));
      const wire=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(13,0)),
        new THREE.LineBasicMaterial({color:0xa07bff,transparent:true,opacity:.7}));
      const ring=new THREE.Mesh(new THREE.TorusGeometry(18,0.4,8,64),
        new THREE.MeshBasicMaterial({color:0x4a3580}));
      ring.rotation.x=Math.PI/2.4;
      st.add(core,wire,ring);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(0xa07bff),
        transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending}));
      glow.scale.set(60,60,1);st.add(glow);
      grp.add(st);
      core.userData.node=node;pickables.push(core);
      systems[node.id]={group:grp,anchor:st,node,station:true};
      labelNodes.push({node,get:()=>grp.position});
      continue;
    }
    const W=WORLDS[node.world];
    const star=new THREE.Mesh(new THREE.SphereGeometry(7,24,24),
      new THREE.MeshBasicMaterial({color:W.star}));
    grp.add(star);
    const starGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(W.star),
      transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));
    starGlow.scale.set(120,120,1);grp.add(starGlow);
    grp.add(new THREE.PointLight(W.star,0.95,W.orbit*6));

    const plane=new THREE.Group();plane.rotation.x=W.tilt;plane.rotation.z=W.tilt*0.5;
    grp.add(plane);
    const seg=160,opts=new Float32Array(seg*3);
    for(let i=0;i<seg;i++){const a=i/seg*6.283;
      opts[i*3]=Math.cos(a)*W.orbit;opts[i*3+1]=0;opts[i*3+2]=Math.sin(a)*W.orbit;}
    const og=new THREE.BufferGeometry();og.setAttribute('position',new THREE.BufferAttribute(opts,3));
    plane.add(new THREE.LineLoop(og,new THREE.LineBasicMaterial({color:W.atmo,
      transparent:true,opacity:.2})));

    const holder=new THREE.Group();plane.add(holder);
    const isCradle=node.world==='cradle';
    const segs=isCradle?[288,144]:[160,80];
    const dispScale=W.pr*(isCradle?0.02:0.016); // Earth-true: relief is invisible from orbit
    const M=maps[node.world];
    const planet=new THREE.Mesh(new THREE.SphereGeometry(W.pr,segs[0],segs[1]),
      new THREE.MeshStandardMaterial({
        map:M.color,
        normalMap:M.normal,
        normalScale:new THREE.Vector2(0.95,0.95),
        displacementMap:M.disp,
        displacementScale:dispScale,
        roughnessMap:M.rough,
        roughness:1.0,metalness:0}));
    planet.userData.node=node;pickables.push(planet);
    holder.add(planet);
    // cloud shadow → cloud deck → layered atmosphere
    const shadow=new THREE.Mesh(new THREE.SphereGeometry(W.pr*1.006+dispScale,64,32),
      new THREE.MeshBasicMaterial({map:M.clouds,color:0x000000,transparent:true,opacity:.3,
        depthWrite:false}));
    shadow.rotation.y=-0.018;
    holder.add(shadow);
    const clouds=new THREE.Mesh(new THREE.SphereGeometry(W.pr*1.013+dispScale,96,48),
      new THREE.MeshStandardMaterial({map:M.clouds,transparent:true,
        depthWrite:false,roughness:1}));
    holder.add(clouds);
    // thin bright limb + faint outer glow — like Earth's blue line
    const rim=new THREE.Mesh(new THREE.SphereGeometry(W.pr*1.028+dispScale,64,64),
      new THREE.MeshBasicMaterial({color:W.atmo,transparent:true,opacity:.30,
        side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));
    const haze=new THREE.Mesh(new THREE.SphereGeometry(W.pr*1.09+dispScale,48,48),
      new THREE.MeshBasicMaterial({color:W.atmo,transparent:true,opacity:.05,
        side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));
    holder.add(rim,haze);

    const markers=new THREE.Group();markers.visible=false;planet.add(markers);
    for(const p of (worldPois[node.world]||[])){
      // exact equirect→sphere mapping (matches SphereGeometry UVs)
      const lonA=((p.x+MAP_R)/(MAP_R*2))*Math.PI*2, colat=((p.y+MAP_R)/(MAP_R*2))*Math.PI;
      const r=W.pr*1.03+dispScale;
      const px=-r*Math.cos(lonA)*Math.sin(colat),py=r*Math.cos(colat),pz=r*Math.sin(lonA)*Math.sin(colat);
      const m=new THREE.Group();m.position.set(px,py,pz);
      const pin=new THREE.Mesh(new THREE.OctahedronGeometry(W.pr*0.04,0),
        new THREE.MeshBasicMaterial({color:0xffffff}));
      const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(0xa07bff),
        transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));
      halo.scale.set(W.pr*0.11,W.pr*0.11,1);
      // generous invisible hit target for touch
      const hit=new THREE.Mesh(new THREE.SphereGeometry(W.pr*0.14,8,8),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      m.add(pin,halo,hit);
      pin.userData.node=p;pin.userData.isPoi=true;pin.userData.worldKey=node.world;
      hit.userData.node=p;hit.userData.isPoi=true;hit.userData.worldKey=node.world;
      pickables.push(pin,hit);
      markers.add(m);
      p._marker=m;p._worldKey=node.world;
    }
    // geo labels for Cradle
    if(isCradle){
      node._geo=[];
      for(const[nm,gx,gy]of cradleGeoLabels){
        const lonA=((gx+MAP_R)/(MAP_R*2))*Math.PI*2, colat=((gy+MAP_R)/(MAP_R*2))*Math.PI;
        const r=W.pr*1.03+dispScale;
        const anchor=new THREE.Object3D();
        anchor.position.set(-r*Math.cos(lonA)*Math.sin(colat),r*Math.cos(colat),r*Math.sin(lonA)*Math.sin(colat));
        planet.add(anchor);
        node._geo.push({name:nm,obj:anchor});
      }
    }
    const phase=Math.random()*6.283;
    systems[node.id]={group:grp,plane,holder,planet,clouds,shadow,markers,node,W,phase};
    labelNodes.push({node,get:()=>{const v=new THREE.Vector3();planet.getWorldPosition(v);return v;}});
  }
}

/* ============ THE WAY — filament channels between the worlds ============ */
let wayFlow=null;
function buildWay(){
  const byId={};for(const n of iterations)byId[n.id]=new THREE.Vector3().fromArray(n.pos);
  const links=[];
  for(const n of iterations)
    if(n.id!=='way-cradle'&&!n.corrupt&&!n.edge&&!n.vroshir&&!n.beacon)
      links.push(['way-cradle',n.id,0x4d7fd0]);
  links.push(['way-harrow','way-limit',0x4d7fd0]);   // the collision course
  links.push(['way-harrow','way-scour',0x4d7fd0]);   // the quarantine route
  links.push(['way-haven','way-outpost',0x4d7fd0]);  // Abidan infrastructure
  links.push(['way-sanctum','way-outpost',0x4d7fd0]);
  links.push(['way-sanctum','way-haven',0x4d7fd0]);
  // concordance threads — the four series of the Willverse (gold)
  links.push(['way-cradle','way-amalgam',0xd9b36b]);
  links.push(['way-cradle','way-asylum',0xd9b36b]);
  links.push(['way-cradle','way-fathom',0xd9b36b]);
  links.push(['way-fathom','way-asylum',0xd9b36b]);
  links.push(['way-asylum','way-amalgam',0xd9b36b]);
  links.push(['way-amalgam','way-fathom',0xd9b36b]);
  const curves=[];
  for(const[a,b,col]of links){
    const A=byId[a],B=byId[b];
    const mid=A.clone().add(B).multiplyScalar(.5);
    const perp=B.clone().sub(A).normalize().cross(new THREE.Vector3(0,1,0)).multiplyScalar(40+Math.random()*70);
    mid.add(perp).add(new THREE.Vector3(0,30+Math.random()*60,0));
    const curve=new THREE.CatmullRomCurve3([A,mid,B]);
    curves.push(curve);
    const pts=curve.getPoints(64);
    const lg=new THREE.BufferGeometry().setFromPoints(pts);
    scene.add(new THREE.Line(lg,new THREE.LineBasicMaterial({color:col,
      transparent:true,opacity:col===0xd9b36b?.18:.13,
      blending:THREE.AdditiveBlending,depthWrite:false})));
  }
  // FAILING connections: corrupted worlds' filaments fragment and stop short of the sector
  window._fadeLinks=[];
  for(const n of iterations)if(n.corrupt){
    const A=new THREE.Vector3().fromArray(n.pos);
    const reach=n.id==='way-corrupt1'?0.55:0.3; // terminal world barely connects at all
    const B=A.clone().multiplyScalar(1-reach);  // toward sector center, never arriving
    const mid=A.clone().lerp(B,.5).add(new THREE.Vector3(0,40,30));
    const curve=new THREE.CatmullRomCurve3([A,mid,B]);
    const segPts=[];
    const P=curve.getPoints(80);
    for(let i=0;i<P.length-1;i++){
      const frac=i/P.length;
      if(Math.random()>frac*0.85){segPts.push(P[i],P[i+1]);}
    }
    const lg=new THREE.BufferGeometry().setFromPoints(segPts);
    const mat=new THREE.LineBasicMaterial({color:0x5aa7ff,transparent:true,opacity:.14,
      blending:THREE.AdditiveBlending,depthWrite:false});
    scene.add(new THREE.LineSegments(lg,mat));
    window._fadeLinks.push({curve,mat,reach,seed:Math.random()*50});
  }
  const PER=22,N=curves.length*PER;
  const pos=new Float32Array(N*3),meta=[];
  for(let i=0;i<N;i++)meta.push({c:curves[(i/PER)|0],t:Math.random(),sp:.018+Math.random()*.03});
  const pg=new THREE.BufferGeometry();
  pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pm=new THREE.PointsMaterial({size:4.2,map:glowTexture(0x9fc4ff),color:0xbfd8ff,
    transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
  const points=new THREE.Points(pg,pm);
  scene.add(points);
  wayFlow={meta,geo:pg,tmp:new THREE.Vector3()};
  // dying motes: they set out along the failing filaments and never arrive
  if(window._fadeLinks.length){
    const FN=window._fadeLinks.length*10;
    const fpos=new Float32Array(FN*3),fmeta=[];
    for(let i=0;i<FN;i++){
      const L=window._fadeLinks[(i/10)|0];
      fmeta.push({c:L.curve,t:Math.random()*0.9,sp:.012+Math.random()*.02,die:.6+Math.random()*.35});
    }
    const fg=new THREE.BufferGeometry();
    fg.setAttribute('position',new THREE.BufferAttribute(fpos,3));
    const fpts=new THREE.Points(fg,new THREE.PointsMaterial({size:3.4,map:glowTexture(0x8fb0e8),
      color:0x9db4dd,transparent:true,opacity:.5,depthWrite:false,
      blending:THREE.AdditiveBlending,sizeAttenuation:true}));
    scene.add(fpts);
    window._fadeFlow={meta:fmeta,geo:fg,tmp:new THREE.Vector3()};
  }
}
function updateWay(dt){
  if(window._fadeFlow){
    const arr=window._fadeFlow.geo.attributes.position.array;
    for(let i=0;i<window._fadeFlow.meta.length;i++){
      const m=window._fadeFlow.meta[i];
      m.t+=m.sp*dt;
      if(m.t>m.die){m.t=0;m.die=.55+Math.random()*.4;} // the mote fails; another sets out
      m.c.getPointAt(Math.min(m.t,1),window._fadeFlow.tmp);
      arr[i*3]=window._fadeFlow.tmp.x;arr[i*3+1]=window._fadeFlow.tmp.y;arr[i*3+2]=window._fadeFlow.tmp.z;
    }
    window._fadeFlow.geo.attributes.position.needsUpdate=true;
  }
  if(window._fadeLinks)for(const L of window._fadeLinks)
    L.mat.opacity=.06+.1*Math.abs(Math.sin(performance.now()*.0011+L.seed))*Math.random();
  if(!wayFlow)return;
  const arr=wayFlow.geo.attributes.position.array;
  for(let i=0;i<wayFlow.meta.length;i++){
    const m=wayFlow.meta[i];
    m.t+=m.sp*dt; if(m.t>1)m.t-=1;
    m.c.getPointAt(m.t,wayFlow.tmp);
    arr[i*3]=wayFlow.tmp.x;arr[i*3+1]=wayFlow.tmp.y;arr[i*3+2]=wayFlow.tmp.z;
  }
  wayFlow.geo.attributes.position.needsUpdate=true;
}

/* ============ CAMERA (weighted) ============ */
const ctrl={
  target:new THREE.Vector3(0,0,0),
  theta:0.6,phi:1.25,radius:2400,
  vTheta:0,vPhi:0,
  tTarget:new THREE.Vector3(0,0,0),tRadius:2400,
  followFn:null
};
function applyCamera(){
  ctrl.theta+=ctrl.vTheta;ctrl.phi+=ctrl.vPhi;
  ctrl.vTheta*=0.90;ctrl.vPhi*=0.90;
  ctrl.phi=Math.max(0.05,Math.min(Math.PI-0.05,ctrl.phi));
  if(ctrl.followFn)ctrl.tTarget.copy(ctrl.followFn());
  ctrl.target.lerp(ctrl.tTarget,0.045);
  ctrl.radius+=(ctrl.tRadius-ctrl.radius)*0.045;
  const sp=Math.sin(ctrl.phi);
  camera.position.set(
    ctrl.target.x+ctrl.radius*sp*Math.cos(ctrl.theta),
    ctrl.target.y+ctrl.radius*Math.cos(ctrl.phi),
    ctrl.target.z+ctrl.radius*sp*Math.sin(ctrl.theta));
  camera.lookAt(ctrl.target);
}
const ptrs=new Map();let moved=0,lastPinch=0;
const el=renderer.domElement;
function rotK(){ // heavier feel: slower rotation up close, capped overall
  return 0.0028*THREE.MathUtils.clamp(ctrl.radius/700,0.35,1);
}
el.addEventListener('pointerdown',e=>{
  initAudio();
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  moved=0;el.setPointerCapture(e.pointerId);
});
el.addEventListener('pointermove',e=>{
  if(ptrs.has(e.pointerId)){
    const p=ptrs.get(e.pointerId);
    const dx=e.clientX-p.x,dy=e.clientY-p.y;
    if(ptrs.size===1){
      moved+=Math.abs(dx)+Math.abs(dy);
      const k=rotK();
      ctrl.vTheta=THREE.MathUtils.lerp(ctrl.vTheta,dx*k,0.5);
      ctrl.vPhi=THREE.MathUtils.lerp(ctrl.vPhi,-dy*k,0.5);
    }
    p.x=e.clientX;p.y=e.clientY;
    if(ptrs.size===2){
      const[a,b]=[...ptrs.values()];
      const d=Math.hypot(a.x-b.x,a.y-b.y);
      if(lastPinch)ctrl.tRadius=THREE.MathUtils.clamp(ctrl.tRadius*(lastPinch/d),minR(),2600);
      lastPinch=d;moved+=10;
    }
  }
  updateHover(e);
});
function endPtr(e){
  const wasTap=moved<8&&ptrs.size===1;
  ptrs.delete(e.pointerId);
  if(ptrs.size<2)lastPinch=0;
  if(wasTap)pick(e.clientX,e.clientY);
}
el.addEventListener('pointerup',endPtr);
el.addEventListener('pointercancel',e=>ptrs.delete(e.pointerId));
el.addEventListener('wheel',e=>{
  e.preventDefault();
  ctrl.tRadius=THREE.MathUtils.clamp(ctrl.tRadius*(e.deltaY>0?1.09:0.915),minR(),2600);
},{passive:false});
function minR(){return mode==='surface'&&focusSys?focusSys.W.pr*1.35:30;}

/* ============ PICKING ============ */
const ray=new THREE.Raycaster();
const mouse=new THREE.Vector2();
let hoverNode=null;
function castAt(x,y){
  mouse.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);
  ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObjects(pickables,false);
  return hits.length?hits[0].object.userData:null;
}
function updateHover(e){
  if(e.pointerType!=='mouse')return;
  const ud=castAt(e.clientX,e.clientY);
  hoverNode=ud?ud.node:null;
  el.style.cursor=hoverNode?'pointer':'grab';
}
function pick(x,y){
  const ud=castAt(x,y);
  if(!ud)return;
  sfx('click');
  if(ud.isPoi)selectPoi(ud.node);
  else selectSystem(ud.node);
}

/* ============ MODES ============ */
let mode='way',focusSys=null,focusPending=null;
const descendBtn=document.getElementById('descendBtn');
function selectSystem(node){
  const sys=systems[node.id];
  focusPending=sys;
  ctrl.followFn=(node.station||node.edge||node.vroshir||node.corrupt||node.beacon)
    ?()=>sys.group.position
    :()=>{const v=new THREE.Vector3();sys.planet.getWorldPosition(v);return v;};
  ctrl.tRadius=node.viewR||(node.station?90:sys.W.pr*9);
  sfx('whoosh');
  presenceSay(node);
  descendBtn.classList.toggle('show',!!node.enterable&&mode==='way');
  if(node.station){sfx('deny');setTimeout(()=>sysVoice('Warning. Access to this installation is restricted.'),350);}
  if(node.vroshir){sfx('deny');setTimeout(()=>sysVoice('Warning. Hostile signature. This host is outside the Way.'),350);}
  if(node.corrupt)setTimeout(()=>sysVoice('Caution. Way connection degrading. Record integrity not guaranteed.'),300);
}
descendBtn.onclick=()=>{
  if(!focusPending||!focusPending.node.enterable)return;
  sfx('click');enterOrbit(focusPending);
};
function enterOrbit(sys){
  mode='surface';focusSys=sys;
  sys.markers.visible=true;
  panel.classList.remove('open');
  descendBtn.classList.remove('show');
  ctrl.followFn=()=>{const v=new THREE.Vector3();sys.planet.getWorldPosition(v);return v;};
  ctrl.tRadius=sys.W.pr*3.0;
  sfx('whoosh');
  document.getElementById('viewTitle').textContent=sys.node.name;
  document.getElementById('viewSub').textContent='Low orbit · '+(worldPois[sys.node.world]||[]).length+' record(s)';
  document.getElementById('backBtn').disabled=false;
  document.getElementById('hint').textContent='Orbit the world · Select a record marker';
  sysVoice('Descending to low orbit. '+sys.node.name.replace(/—/g,',')+'.');
}
function selectPoi(p){
  const sys=focusSys||systems['way-'+p._worldKey];
  if(!sys)return;
  const mw=new THREE.Vector3();p._marker.getWorldPosition(mw);
  const pw=new THREE.Vector3();sys.planet.getWorldPosition(pw);
  const dir=mw.clone().sub(pw).normalize();
  ctrl.theta=Math.atan2(dir.z,dir.x);
  ctrl.phi=Math.acos(THREE.MathUtils.clamp(dir.y,-1,1));
  ctrl.tRadius=sys.W.pr*2.1;
  sfx('whoosh');
  presenceSay(p);
  descendBtn.classList.remove('show');
}
document.getElementById('backBtn').onclick=()=>{
  if(focusSys)focusSys.markers.visible=false;
  mode='way';focusSys=null;focusPending=null;
  panel.classList.remove('open');stopAudio();sfx('whoosh');
  ctrl.followFn=null;
  ctrl.tTarget.set(0,0,0);ctrl.tRadius=900;
  document.getElementById('viewTitle').textContent='The Way';
  document.getElementById('viewSub').textContent='Iteration Overlay — Presence Interface';
  document.getElementById('backBtn').disabled=true;
  document.getElementById('focusLine').textContent='—';
  document.getElementById('hint').textContent='Drag to orbit · Pinch / scroll to approach · Select a system';
  sysVoice('Returning to the Way.');
};

/* ============ LABELS ============ */
const labelPool=[];
function getLabelEl(i){
  if(!labelPool[i]){
    const d=document.createElement('div');d.className='lbl3d';
    d.innerHTML='<span class="txt"></span><span class="tick"></span>';
    document.body.appendChild(d);labelPool[i]=d;
  }
  return labelPool[i];
}
const V=new THREE.Vector3();
function placeLabel(i,worldPos,text,kind){
  V.copy(worldPos).project(camera);
  const d=getLabelEl(i);
  if(V.z<1&&V.z>-1){
    d.style.left=((V.x+1)/2*innerWidth)+'px';
    d.style.top=((-V.y+1)/2*innerHeight)+'px';
    d.querySelector('.txt').textContent=text;
    d.classList.toggle('geo',kind==='geo');
    d.classList.toggle('sector',kind==='sector');
    d.classList.add('show');
    return true;
  }
  d.classList.remove('show');
  return false;
}
const tmpV=new THREE.Vector3(),tmpP=new THREE.Vector3();
function frontFacing(worldPos,planetPos){
  const normal=tmpV.copy(worldPos).sub(planetPos).normalize();
  const toCam=tmpP.copy(camera.position).sub(worldPos).normalize();
  return normal.dot(toCam)>0.08;
}
function updateLabels(){
  let i=0;
  if(mode==='way'){
    for(const ln of labelNodes)
      if(placeLabel(i,ln.get(),ln.node.short||ln.node.name.split('—')[0].trim(),
        (ln.node.beacon&&ln.node.shellR)?'sector':null))i++;else i++;
  }else if(focusSys){
    const pw=new THREE.Vector3();focusSys.planet.getWorldPosition(pw);
    for(const p of (worldPois[focusSys.node.world]||[])){
      p._marker.getWorldPosition(tmpV);
      const wp=tmpV.clone();
      if(frontFacing(wp,pw))placeLabel(i,wp,p.name.split('—')[0].trim(),null);
      else getLabelEl(i).classList.remove('show');
      i++;
    }
    if(focusSys.node._geo&&ctrl.radius<focusSys.W.pr*4.5){
      for(const g of focusSys.node._geo){
        g.obj.getWorldPosition(tmpV);
        const wp=tmpV.clone();
        if(frontFacing(wp,pw))placeLabel(i,wp,g.name,'geo');
        else getLabelEl(i).classList.remove('show');
        i++;
      }
    }
  }
  for(;i<labelPool.length;i++)labelPool[i]&&labelPool[i].classList.remove('show');
}

/* ============ LOOP ============ */
const clock=new THREE.Clock();
function animate(){
  const dt=clock.getDelta(),t=clock.elapsedTime;
  for(const id in systems){
    const s=systems[id];
    if(s.station){s.anchor.rotation.y+=dt*.25;s.anchor.rotation.x=Math.sin(t*.3)*.1;continue;}
    if(s.beacon){
      s.anchor.rotation.y+=dt*.3;s.anchor.rotation.z+=dt*.12;
      if(s.rings)for(const r of s.rings)r.rotation.y+=dt*.025;
      continue;
    }
    if(s.corrupt||s.edge||s.vroshir)continue; // anomalies don't orbit — tumble/flicker handled separately
    const a=s.phase+t*(6.283/s.W.period);
    s.holder.position.set(Math.cos(a)*s.W.orbit,0,Math.sin(a)*s.W.orbit);
    s.planet.rotation.y+=dt*.05;
    s.clouds.rotation.y+=dt*.072;
    s.shadow.rotation.y+=dt*.072;
  }
  nebGroup.rotation.y+=dt*.002;
  if(window._flickerGlows)for(const f of window._flickerGlows)
    f.mat.opacity=.25+.3*Math.abs(Math.sin(t*1.7+f.seed))+(Math.random()<.04?.25:0);
  if(window._tumblers)for(const m of window._tumblers){m.rotation.y+=dt*.05;m.rotation.x+=dt*.017;}
  updateWay(dt);
  applyCamera();
  updateLabels();
  if(!(animate.f=((animate.f||0)+1)%10)){
    document.getElementById('roCam').textContent=
      'CAM R '+ctrl.radius.toFixed(0)+' · θ '+(ctrl.theta%6.283).toFixed(2)+' · φ '+ctrl.phi.toFixed(2);
    let orb='ORBIT —';
    if(focusSys)orb='ORBIT '+focusSys.node.name.split('—')[0].trim().toUpperCase()+' · T '+focusSys.W.period+'s';
    else if(focusPending&&!focusPending.station&&focusPending.W)orb='TRACKING '+focusPending.node.name.split('—')[0].trim().toUpperCase();
    document.getElementById('roOrbit').textContent=orb;
  }
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}
animate();
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* ============ BOOT ============ */
(async()=>{
  const txt=document.getElementById('bootText'),bar=document.getElementById('bootBar');
  const stage=[
    '[ AUTHORIZING — SIXTH DIVISION CLEARANCE ]',
    '[ BINDING VIEWPORT TO SANCTUM RELAY ]'
  ];
  for(const s of stage){txt.textContent=s;await new Promise(r=>setTimeout(r,500));}
  await buildSystems((p,key)=>{
    bar.style.width=(p*100).toFixed(0)+'%';
    txt.textContent='[ RENDERING '+(key?key.toUpperCase():'')+' — '+(p*100).toFixed(0)+'% ]';
  });
  buildWay();
  txt.textContent='[ OVERLAY READY ]';
  bar.style.width='100%';
  await new Promise(r=>setTimeout(r,350));
  document.getElementById('boot').classList.add('done');
  ctrl.radius=2400;ctrl.tRadius=900;
  setTimeout(()=>sysVoice('Overlay ready. Sectors eleven, thirteen and twenty-one resolved. Anomalies flagged beyond the boundary. The Way is at your fingertips.'),900);
})();
document.getElementById('boot').addEventListener('pointerdown',initAudio);

}catch(e){window.__fault(e.message||'initialization error');throw e;}
};
