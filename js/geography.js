/* ============ CRADLE GEOGRAPHY (digitized from the official Lands of Cradle map) ============ */
const MAP_R=620;
// Ashwind detail frame: normalized map-image coords (mx→right, my→down) → world coords
const AS={x0:240,y0:-150,sx:440,sy:380};
const m2w=(mx,my)=>[AS.x0+(mx-.5)*AS.sx, AS.y0+(my-.55)*AS.sy];
// Continents per the map inset: Ashwind NE (detailed), Ninecloud NW, Everwood SW, Iceflower S, Rosegold SE
const cradleContinents=[];
function blob(cx,cy,rx,ry,w,region){cradleContinents.push({cx,cy,rx,ry,w,region});}
// Ashwind landmass silhouette — blobs traced from the map (incl. Ghostwater isle NW,
// eastern isles, southern peninsula, Phantom Islands chain SW)
[[0.30,0.40,.17,.155,1],[0.43,0.51,.16,.14,1],[0.41,0.26,.14,.095,.95],[0.55,0.33,.12,.11,.95],
 [0.68,0.37,.15,.14,1],[0.63,0.21,.11,.075,.85],[0.29,0.68,.10,.115,.9],[0.20,0.47,.09,.09,.85],
 [0.14,0.20,.025,.02,.55],[0.86,0.30,.03,.025,.5],[0.88,0.44,.025,.02,.45],
 [0.17,0.76,.03,.022,.5],[0.23,0.80,.025,.02,.45],[0.27,0.84,.02,.018,.4],[0.60,0.72,.05,.03,.55]
].forEach(a=>{const[wx,wy]=m2w(a[0],a[1]);blob(wx,wy,a[2]*AS.sx,a[3]*AS.sy,a[4],'ashwind');});
blob(-330,-190,110,140,1,'ninecloud');
blob(-435,85,125,95,1,'everwood');
blob(115,160,80,58,.9,'iceflower');
blob(330,210,150,125,1,'rosegold');
blob(295,115,70,50,.7,'rosegold');
function contDist(c,wx,wy){
  let dx=wx-c.cx;const span=MAP_R*2;
  if(dx>span/2)dx-=span;if(dx<-span/2)dx+=span;
  return(dx*dx)/(c.rx*c.rx)+((wy-c.cy)*(wy-c.cy))/(c.ry*c.ry);
}
function cradleMask(wx,wy){
  let m=0;
  for(const c of cradleContinents)m+=c.w*Math.exp(-contDist(c,wx,wy)*1.6);
  return m;
}
// Sacred Valley: west Ashwind, ringed by peaks (Samara on the eastern rim)
const SV=(()=>{const[x,y]=m2w(0.238,0.318);
  return{x,y,ringR:15,ringW:5.5,peakH:.8,floor:-.18};})();
// Mountain ranges traced from the map (map coords → world), width in world units
const cradleRanges=[
  {m:[[0.195,0.245],[0.215,0.315],[0.245,0.375]],w:14,amp:.85},   // western range (Sacred Valley / Sky's Edge)
  {m:[[0.345,0.235],[0.415,0.295],[0.465,0.265]],w:13,amp:.6},    // north-central range (E of Blackflame City)
  {m:[[0.395,0.455],[0.465,0.50],[0.52,0.47]],w:15,amp:.8},       // Akura range (Family Fortress)
  {m:[[0.635,0.295],[0.70,0.355],[0.685,0.44]],w:14,amp:.7},      // Dragon Territory west arc
  {m:[[0.74,0.275],[0.795,0.335]],w:11,amp:.55},                  // Dragon Territory east arc
  {m:[[0.155,0.545],[0.215,0.578],[0.27,0.558]],w:12,amp:.55},    // Seishen Kingdom range
  {m:[[0.585,0.615],[0.655,0.655]],w:11,amp:.5}                   // southern island range
].map(R=>({pts:R.m.map(p=>m2w(p[0],p[1])),w:R.w,amp:R.amp}));
// Rivers traced from the map (mountains → coast); the wide short one is the Seishen lake
const cradleRivers=[
  {m:[[0.245,0.36],[0.205,0.405],[0.155,0.425]],w:4.5,d:.5},
  {m:[[0.40,0.295],[0.365,0.355],[0.325,0.40],[0.30,0.445]],w:4.5,d:.5},   // Blackflame river
  {m:[[0.575,0.275],[0.565,0.395],[0.55,0.52],[0.585,0.615]],w:5,d:.5},    // great eastern river
  {m:[[0.33,0.545],[0.285,0.60],[0.25,0.635]],w:4.5,d:.45},
  {m:[[0.44,0.235],[0.445,0.175]],w:4,d:.45},
  {m:[[0.325,0.55],[0.345,0.552]],w:9,d:.6}                                 // Seishen lake
].map(R=>({pts:R.m.map(p=>m2w(p[0],p[1])),w:R.w,d:R.d}));
// Climate masks from the map: the Wastelands (sand) and the northern ice sheet
const wastelandE=[[0.505,0.385,.105,.10],[0.645,0.43,.06,.05]]
  .map(a=>{const[wx,wy]=m2w(a[0],a[1]);return{cx:wx,cy:wy,rx:a[2]*AS.sx,ry:a[3]*AS.sy};});
const icecapE=[[0.595,0.225,.125,.09]]
  .map(a=>{const[wx,wy]=m2w(a[0],a[1]);return{cx:wx,cy:wy,rx:a[2]*AS.sx,ry:a[3]*AS.sy};});
function ellSum(list,wx,wy){
  let m=0;
  for(const c of list)m+=Math.exp(-contDist(c,wx,wy)*3);
  return m;
}
// region + climate lookup used by the color pass
function cradleRC(wx,wy){
  let best=null,bv=0;
  for(const c of cradleContinents){
    const v=c.w*Math.exp(-contDist(c,wx,wy)*1.6);
    if(v>bv){bv=v;best=c.region;}
  }
  return{region:best,sand:ellSum(wastelandE,wx,wy),ice:ellSum(icecapE,wx,wy)};
}

/* ---- elevation models ---- */
function elevCradle(fb,u,v){
  const wx=u*MAP_R*2-MAP_R, wy=v*MAP_R*2-MAP_R;
  const[du,dv]=warp2(fb,u,v,3,0.08);
  const base=cradleMask(wx,wy)-0.40+cyl(fb,u+du,v+dv,7,6)*0.15;
  let e;
  if(base<=0)e=base;
  else{
    // interiors compress into lowland plains (green stays green)…
    const plains=0.20*Math.tanh(base*1.6);
    // …with distinct interior ranges rising only along ridge features
    const ridge=0.5*Math.max(0,ridged(fb,u+du*.6,v+dv*.6,13,5))
               *smoothT(0.06,0.35,base)*smoothT(0.18,0.45,Math.abs(cyl(fb,u+17,v+29,3.5,3)));
    e=0.002+plains+ridge+0.04*cyl(fb,u+3.7,v+7.9,11,3);
  } // warped coastline/terrain detail — silhouettes stay authored
  if(wx>30&&wx<475&&wy>-330&&wy<-30){
    for(const R of cradleRanges){
      const d=polyDist(R.pts,wx,wy);
      if(d<R.w*3){
        const gate=Math.exp(-(d*d)/(R.w*R.w));
        e+=R.amp*gate*(0.55+0.45*Math.max(0,ridged(fb,u+du,v+dv,26,5)));
      }
    }
    {
      let dx=wx-SV.x;const span=MAP_R*2;
      if(dx>span/2)dx-=span;if(dx<-span/2)dx+=span;
      const dist=Math.sqrt(dx*dx+(wy-SV.y)*(wy-SV.y));
      if(dist<SV.ringR*2.2){
        const ring=Math.exp(-((dist-SV.ringR)*(dist-SV.ringR))/(SV.ringW*SV.ringW));
        const ang=Math.atan2(wy-SV.y,dx);
        const four=0.6+0.4*Math.pow(Math.abs(Math.cos(ang*2)),1.5);
        e+=SV.peakH*ring*four*(0.7+0.3*Math.max(0,ridged(fb,u,v,30,3)));
        if(dist<SV.ringR-SV.ringW)e+=SV.floor*(1-dist/(SV.ringR-SV.ringW))*0.7+0.12;
      }
    }
    for(const RV of cradleRivers){
      const d=polyDist(RV.pts,wx,wy);
      if(d<RV.w*3)e-=RV.d*Math.exp(-(d*d)/(RV.w*RV.w));
    }
  }
  return e;
}
function elevGeneric(fb,W,u,v){
  const[du,dv]=warp2(fb,u,v,2.2,0.10);
  let e=cyl(fb,u+du,v+dv,4,7)*0.62+cyl(fb,u+du*.5,v+dv*.5,1.6,3)*0.55;
  const m=Math.max(0,e-W.sea-0.05);
  e+=m*0.85*Math.max(0,ridged(fb,u+du,v+dv,16,5));
  return e;
}
