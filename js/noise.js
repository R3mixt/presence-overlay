/* ============ SEEDED 3D NOISE & SMALL GEOMETRY HELPERS ============ */
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;
  let z=Math.imul(seed^seed>>>15,1|seed);z=z+Math.imul(z^z>>>7,61|z)^z;
  return((z^z>>>14)>>>0)/4294967296;}}
function makeNoise(seed){
  const rnd=mulberry(seed),P=new Uint8Array(512);
  const p=[...Array(256).keys()];
  for(let i=255;i>0;i--){const j=(rnd()*(i+1))|0;[p[i],p[j]]=[p[j],p[i]];}
  for(let i=0;i<512;i++)P[i]=p[i&255];
  const fade=x=>x*x*x*(x*(x*6-15)+10),lerp=(a,b,t)=>a+t*(b-a);
  function grad(h,x,y,z){const u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);
    return((h&1)?-u:u)+((h&2)?-v:v);}
  function n3(x,y,z){
    const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;
    x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);
    const u=fade(x),v=fade(y),w=fade(z);
    const A=P[X]+Y,AA=P[A]+Z,AB=P[A+1]+Z,B=P[X+1]+Y,BA=P[B]+Z,BB=P[B+1]+Z;
    return lerp(
      lerp(lerp(grad(P[AA]&15,x,y,z),grad(P[BA]&15,x-1,y,z),u),
           lerp(grad(P[AB]&15,x,y-1,z),grad(P[BB]&15,x-1,y-1,z),u),v),
      lerp(lerp(grad(P[AA+1]&15,x,y,z-1),grad(P[BA+1]&15,x-1,y,z-1),u),
           lerp(grad(P[AB+1]&15,x,y-1,z-1),grad(P[BB+1]&15,x-1,y-1,z-1),u),v),w);
  }
  return function fbm3(x,y,z,oct=5){let a=0,amp=.55,f=1;
    for(let i=0;i<oct;i++){a+=amp*n3(x*f,y*f,z*f);amp*=.5;f*=2;}return a;};
}
function cyl(fb,u,v,freq,oct){
  // true spherical sampling: seamless in longitude AND clean at the poles
  const th=u*Math.PI*2,ph=v*Math.PI,R=freq*0.48;
  return fb(Math.cos(th)*Math.sin(ph)*R+R,Math.cos(ph)*R+R,Math.sin(th)*Math.sin(ph)*R+R,oct);
}
// ridged variant for mountains
function ridged(fb,u,v,freq,oct){
  const th=u*Math.PI*2,ph=v*Math.PI,R=freq*0.48;
  const x=Math.cos(th)*Math.sin(ph),y=Math.cos(ph),z=Math.sin(th)*Math.sin(ph);
  let a=0,amp=.6,f=1;
  for(let i=0;i<oct;i++){
    const n=fb(x*R*f+R,y*R*f+R,z*R*f+R,1);
    a+=amp*(1-Math.abs(n)*2.2);
    amp*=.5;f*=2;
  }
  return a;
}
function segDist(px,py,ax,ay,bx,by){
  const vx=bx-ax,vy=by-ay,wx2=px-ax,wy2=py-ay;
  const t=Math.max(0,Math.min(1,(wx2*vx+wy2*vy)/(vx*vx+vy*vy)));
  const dx=px-(ax+vx*t),dy=py-(ay+vy*t);
  return Math.sqrt(dx*dx+dy*dy);
}
function polyDist(pts,x,y){
  let d=1e9;
  for(let i=0;i<pts.length-1;i++)
    d=Math.min(d,segDist(x,y,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]));
  return d;
}
