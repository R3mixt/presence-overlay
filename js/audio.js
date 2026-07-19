/* ============ SFX ENGINE — processed game-UI sound design ============
   Architecture: every sound is layered (transient + body + sub) and routed
   through a shared FX bus: dry → compressor, plus sends to a convolution
   reverb and a feedback delay.
   Ambience is deliberately sparse: a quiet sine pad and occasional telemetry
   pings. (An earlier build ran a filtered-noise "air" bed underneath —
   it read as jet-cabin roar, so it's gone.) */
let AC=null,master=null,revSend=null,revWetOut=null,delSend=null,muted=false;
function makeIR(dur,decay){
  const len=AC.sampleRate*dur|0,buf=AC.createBuffer(2,len,AC.sampleRate);
  for(let ch=0;ch<2;ch++){
    const d=buf.getChannelData(ch);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);
  }
  return buf;
}
function pan(node,p){
  if(AC.createStereoPanner){const sp=AC.createStereoPanner();sp.pan.value=p;node.connect(sp);return sp;}
  return node;
}
// route(source, dryGain, reverbSend, delaySend)
function route(n,dry,wet,del){
  const dg=AC.createGain();dg.gain.value=dry;n.connect(dg);dg.connect(master);
  if(wet){const wg=AC.createGain();wg.gain.value=wet;n.connect(wg);wg.connect(revSend);}
  if(del){const eg=AC.createGain();eg.gain.value=del;n.connect(eg);eg.connect(delSend);}
}
function noiseBuf(dur){
  const len=AC.sampleRate*dur|0,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  return b;
}
function initAudio(){
  if(AC)return;
  AC=new (window.AudioContext||window.webkitAudioContext)();
  // ---- bus: master → compressor → destination
  const comp=AC.createDynamicsCompressor();
  comp.threshold.value=-20;comp.knee.value=18;comp.ratio.value=5;
  comp.attack.value=.004;comp.release.value=.24;
  master=AC.createGain();master.gain.value=.9;
  master.connect(comp);comp.connect(AC.destination);
  // ---- convolution reverb (generated IR, dark tail)
  revSend=AC.createGain();revSend.gain.value=1;
  const conv=AC.createConvolver();conv.buffer=makeIR(2.2,3.2);
  const revLP=AC.createBiquadFilter();revLP.type='lowpass';revLP.frequency.value=4200;
  revWetOut=AC.createGain();revWetOut.gain.value=.5;
  revSend.connect(conv);conv.connect(revLP);revLP.connect(revWetOut);revWetOut.connect(master);
  // ---- feedback delay (dotted slapback for data pings)
  delSend=AC.createGain();delSend.gain.value=1;
  const dly=AC.createDelay(1);dly.delayTime.value=.31;
  const fb=AC.createGain();fb.gain.value=.38;
  const dlp=AC.createBiquadFilter();dlp.type='lowpass';dlp.frequency.value=2600;
  delSend.connect(dly);dly.connect(dlp);dlp.connect(fb);fb.connect(dly);
  dlp.connect(master);

  /* ---- ambience: quiet sine pad with a slow filter drift ---- */
  const padG=AC.createGain();padG.gain.value=.028;
  const padF=AC.createBiquadFilter();padF.type='lowpass';padF.frequency.value=220;padF.Q.value=.8;
  padG.connect(padF);padF.connect(master);
  const padWet=AC.createGain();padWet.gain.value=.3;padF.connect(padWet);padWet.connect(revSend);
  [[55,'sine',.5],[82.4,'sine',.28],[110.2,'triangle',.12]].forEach(a=>{
    const o=AC.createOscillator();o.type=a[1];o.frequency.value=a[0];
    const og=AC.createGain();og.gain.value=a[2];
    o.connect(og);og.connect(padG);o.start();
  });
  const pLfo=AC.createOscillator();pLfo.frequency.value=.043;
  const pLg=AC.createGain();pLg.gain.value=60;
  pLfo.connect(pLg);pLg.connect(padF.frequency);pLfo.start();

  /* ---- telemetry: sparse processed pings through delay+reverb ---- */
  (function dataLayer(){
    if(!muted&&AC){
      const t0=AC.currentTime,roll=Math.random(),pp=(Math.random()*1.6-0.8);
      const ping=(f0,f1,at,dur,vol)=>{
        const o=AC.createOscillator(),g=AC.createGain();
        o.type='sine';
        o.frequency.setValueAtTime(f0,at);
        o.frequency.exponentialRampToValueAtTime(f1,at+dur);
        g.gain.setValueAtTime(.0001,at);
        g.gain.exponentialRampToValueAtTime(vol,at+.008);
        g.gain.exponentialRampToValueAtTime(.0001,at+dur);
        o.connect(g);
        route(pan(g,pp),.5,.9,.8);
        o.start(at);o.stop(at+dur+.05);
      };
      if(roll<0.12){ // scanner sweep: three descending FM pings
        const base=1180+Math.random()*500;
        for(let k=0;k<3;k++)ping(base*(1-k*.18),base*(1-k*.18)*.82,t0+k*.13,.11,.028);
      }else if(roll<0.2){ // deep system pulse
        ping(164,74,t0,.3,.06);
      }else if(roll<0.62){ // single telemetry ping
        const f=[740,988,1245,1480][Math.random()*4|0];
        ping(f,f*.86,t0,.09,.02+Math.random()*.02);
      }
    }
    setTimeout(dataLayer,900+Math.random()*2600);
  })();
}

/* ---- one-shot designed sounds ---- */
function sfx(type){
  if(!AC||muted)return;
  const t0=AC.currentTime;

  if(type==='click'){
    // [transient] filtered noise tick
    const ns=AC.createBufferSource();ns.buffer=noiseBuf(.05);
    const nf=AC.createBiquadFilter();nf.type='bandpass';nf.frequency.value=3400;nf.Q.value=2.2;
    const ng=AC.createGain();
    ng.gain.setValueAtTime(.5,t0);ng.gain.exponentialRampToValueAtTime(.001,t0+.03);
    ns.connect(nf);nf.connect(ng);route(ng,.9,.35,0);ns.start(t0);
    // [body] FM blip — modulated carrier with fast pitch drop
    const car=AC.createOscillator(),mod=AC.createOscillator(),mg=AC.createGain(),cg=AC.createGain();
    car.type='sine';car.frequency.setValueAtTime(960,t0);
    car.frequency.exponentialRampToValueAtTime(620,t0+.06);
    mod.type='square';mod.frequency.value=142;mg.gain.value=310;
    mod.connect(mg);mg.connect(car.frequency);
    cg.gain.setValueAtTime(.12,t0);cg.gain.exponentialRampToValueAtTime(.001,t0+.08);
    car.connect(cg);route(cg,.9,.4,0);
    car.start(t0);car.stop(t0+.1);mod.start(t0);mod.stop(t0+.1);
    // [sub] knock
    const sb=AC.createOscillator(),sg=AC.createGain();
    sb.type='sine';sb.frequency.setValueAtTime(110,t0);
    sb.frequency.exponentialRampToValueAtTime(52,t0+.07);
    sg.gain.setValueAtTime(.22,t0);sg.gain.exponentialRampToValueAtTime(.001,t0+.09);
    sb.connect(sg);route(sg,1,.15,0);sb.start(t0);sb.stop(t0+.1);

  }else if(type==='tick'){
    // terminal character: tiny bright noise click, subtle random pan, hint of verb
    const ns=AC.createBufferSource();ns.buffer=noiseBuf(.02);
    const nf=AC.createBiquadFilter();nf.type='highpass';nf.frequency.value=5200;
    const ng=AC.createGain();
    ng.gain.setValueAtTime(.16,t0);ng.gain.exponentialRampToValueAtTime(.001,t0+.014);
    ns.connect(nf);nf.connect(ng);
    route(pan(ng,(Math.random()-.5)*.5),.8,.12,0);ns.start(t0);

  }else if(type==='chime'){
    // record-open: resonant filter sweep "zhwip" + glassy detuned dyad + long tail
    const sw=AC.createOscillator(),swF=AC.createBiquadFilter(),swG=AC.createGain();
    sw.type='sawtooth';sw.frequency.setValueAtTime(220,t0);
    sw.frequency.exponentialRampToValueAtTime(440,t0+.16);
    swF.type='bandpass';swF.Q.value=9;
    swF.frequency.setValueAtTime(500,t0);
    swF.frequency.exponentialRampToValueAtTime(3400,t0+.17);
    swG.gain.setValueAtTime(.0001,t0);
    swG.gain.exponentialRampToValueAtTime(.14,t0+.05);
    swG.gain.exponentialRampToValueAtTime(.001,t0+.22);
    sw.connect(swF);swF.connect(swG);route(swG,.8,.7,0);
    sw.start(t0);sw.stop(t0+.25);
    [[1174.7,0],[1180.2,0],[1760,.06],[1766,.06]].forEach(a=>{
      const o=AC.createOscillator(),g=AC.createGain();
      o.type='sine';o.frequency.value=a[0];
      const st=t0+.12+a[1];
      g.gain.setValueAtTime(.0001,st);
      g.gain.exponentialRampToValueAtTime(.055,st+.015);
      g.gain.exponentialRampToValueAtTime(.001,st+.7);
      o.connect(g);route(g,.55,1.1,0);o.start(st);o.stop(st+.75);
    });
    const sub=AC.createOscillator(),subg=AC.createGain();
    sub.type='sine';sub.frequency.value=58.7;
    subg.gain.setValueAtTime(.0001,t0);
    subg.gain.exponentialRampToValueAtTime(.14,t0+.09);
    subg.gain.exponentialRampToValueAtTime(.001,t0+.8);
    sub.connect(subg);route(subg,1,.2,0);sub.start(t0);sub.stop(t0+.85);

  }else if(type==='whoosh'){
    // flight: resonant noise sweep + shepard FM riser + deep sub dive, big verb tail
    const ns=AC.createBufferSource();ns.buffer=noiseBuf(1.5);
    const f=AC.createBiquadFilter();f.type='bandpass';f.Q.value=2.6;
    f.frequency.setValueAtTime(140,t0);
    f.frequency.exponentialRampToValueAtTime(2100,t0+.55);
    f.frequency.exponentialRampToValueAtTime(200,t0+1.4);
    const g=AC.createGain();
    g.gain.setValueAtTime(.0001,t0);
    g.gain.exponentialRampToValueAtTime(.4,t0+.3);
    g.gain.exponentialRampToValueAtTime(.001,t0+1.45);
    ns.connect(f);f.connect(g);route(g,.85,.8,0);ns.start(t0);
    const rise=AC.createOscillator(),rg=AC.createGain();
    rise.type='sawtooth';
    rise.frequency.setValueAtTime(90,t0);
    rise.frequency.exponentialRampToValueAtTime(340,t0+.9);
    const rf=AC.createBiquadFilter();rf.type='lowpass';rf.frequency.value=900;rf.Q.value=4;
    rg.gain.setValueAtTime(.0001,t0);
    rg.gain.exponentialRampToValueAtTime(.05,t0+.4);
    rg.gain.exponentialRampToValueAtTime(.0001,t0+1.1);
    rise.connect(rf);rf.connect(rg);route(rg,.7,.9,0);
    rise.start(t0);rise.stop(t0+1.15);
    const sub=AC.createOscillator(),sg=AC.createGain();
    sub.type='sine';sub.frequency.setValueAtTime(80,t0);
    sub.frequency.exponentialRampToValueAtTime(27,t0+1.25);
    sg.gain.setValueAtTime(.0001,t0);
    sg.gain.exponentialRampToValueAtTime(.26,t0+.35);
    sg.gain.exponentialRampToValueAtTime(.001,t0+1.35);
    sub.connect(sg);route(sg,1,.1,0);sub.start(t0);sub.stop(t0+1.4);

  }else if(type==='glitch'){
    // stuttered digital interrupt: gated square + noise slices
    const o=AC.createOscillator();o.type='square';
    o.frequency.setValueAtTime(880,t0);
    const g=AC.createGain();g.gain.value=.0001;
    [0,.05,.11,.16,.24].forEach((off,k)=>{
      o.frequency.setValueAtTime([880,1245,660,1480,990][k],t0+off);
      g.gain.setValueAtTime(.07,t0+off);
      g.gain.exponentialRampToValueAtTime(.0001,t0+off+.03);
    });
    const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1200;bp.Q.value=1.5;
    o.connect(bp);bp.connect(g);route(g,.8,.4,.3);
    o.start(t0);o.stop(t0+.3);
    const ns=AC.createBufferSource();ns.buffer=noiseBuf(.28);
    const nf=AC.createBiquadFilter();nf.type='highpass';nf.frequency.value=2800;
    const ng=AC.createGain();ng.gain.value=.0001;
    [.02,.09,.19].forEach(off=>{
      ng.gain.setValueAtTime(.09,t0+off);
      ng.gain.exponentialRampToValueAtTime(.0001,t0+off+.04);
    });
    ns.connect(nf);nf.connect(ng);route(ng,.8,.3,0);ns.start(t0);
  }else if(type==='deny'){
    // access denied: hard-clipped square burst, gate-stuttered, dark verb
    const o=AC.createOscillator();o.type='square';
    o.frequency.setValueAtTime(196,t0);
    o.frequency.linearRampToValueAtTime(139,t0+.3);
    const clip=AC.createWaveShaper();
    const c=new Float32Array(64);
    for(let i=0;i<64;i++){const x=i/32-1;c[i]=Math.max(-.6,Math.min(.6,x*2.4));}
    clip.curve=c;
    const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1300;
    const g=AC.createGain();
    // gate stutter: three pulses
    [0,.11,.22].forEach(off=>{
      g.gain.setValueAtTime(.0001,t0+off);
      g.gain.exponentialRampToValueAtTime(.2,t0+off+.012);
      g.gain.exponentialRampToValueAtTime(.0001,t0+off+.085);
    });
    o.connect(clip);clip.connect(lp);lp.connect(g);route(g,.9,.5,0);
    o.start(t0);o.stop(t0+.35);
    const sb=AC.createOscillator(),sg2=AC.createGain();
    sb.type='sine';sb.frequency.value=49;
    sg2.gain.setValueAtTime(.18,t0);sg2.gain.exponentialRampToValueAtTime(.001,t0+.32);
    sb.connect(sg2);route(sg2,1,.1,0);sb.start(t0);sb.stop(t0+.35);
  }
}
document.getElementById('muteBtn').onclick=e=>{
  muted=!muted;
  if(master)master.gain.value=muted?0:.9;
  e.target.textContent=muted?'♪ Off':'♪ On';
  if(!muted)sfx('click');
};

/* Speech (system voice + narration) lives in js/voice.js. */
