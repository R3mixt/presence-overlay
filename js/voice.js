/* ============ PRESENCE VOICE ============
   One speech queue, one voice: Kokoro-82M running on-device in a Web Worker
   (lazy-loaded from CDN on first interaction, ~90 MB once, cached by the
   browser after). Until the model is ready — or on devices where it can't
   load — the Presence is simply silent; there is no synthetic fallback voice,
   and the overlay works fine without sound. */
let voiceOn=true,narrating=false;

/* ---- pronunciation guide for the books' proper nouns ----
   Respellings that steer any TTS engine toward the audiobook pronunciations.
   Speech only — the on-screen text is untouched. */
const PRONOUNCE=[
  [/\bAbidan\b/gi,'Abbidon'],
  [/\bmadra\b/gi,'mahdra'],
  [/\bEithan\b/gi,'Eethan'],
  [/\bYerin\b/gi,'Yerrin'],
  [/\bSuriel\b/gi,'Sooriel'],
  [/\bMakiel\b/gi,'Mahkiel'],
  [/\bOzriel\b/gi,'Ozzriel'],
  [/\bDaruman\b/gi,'Dahrooman'],
  [/\bVroshir\b/gi,'Vrosheer'],
  [/\bWei Shi\b/gi,'Way Shee'],
  [/\bAkura\b/gi,'Akoora'],
  [/\bArelius\b/gi,'Arellius'],
  [/\bOth'?kimeth\b/gi,'Oth kimmeth'],
  [/\bSeishen\b/gi,'Sayshen'],
  [/\bAion\b/gi,'Ion']
];
/* ---- text prep: strip interface glyphs the synthesizers trip over ---- */
function speakable(text){
  for(const[re,to]of PRONOUNCE)text=text.replace(re,to);
  return text
    .replace(/\[|\]/g,'')
    .replace(/\{\{([^|{}]+)\|[^}]+\}\}/g,'$1')
    .replace(/·/g,', ')
    .replace(/—/g,', ')
    .replace(/\bch\.\s*/gi,'chapter ')
    .replace(/\bNo\.\s*/g,'number ')
    .replace(/\s+/g,' ').trim();
}
function splitSentences(t){return t.match(/[^.!?]+[.!?]+["')\]]?\s*/g)||[t];}

/* ---- neural engine (Kokoro-82M, on-device, in a Web Worker) ----
   Inference runs off the main thread — an earlier build ran it inline and
   froze the render loop for every sentence. */
const NEURAL_VOICE='am_michael';
let neuralState='idle',neuralPct=0; // idle | loading | ready | off
let ttsWorker=null,reqId=0;const reqPending=new Map();
function neuralAllowed(){
  const small=window.screen&&Math.min(screen.width||9999,screen.height||9999)<760;
  const saveData=navigator.connection&&navigator.connection.saveData;
  return !small&&!saveData&&typeof WebAssembly!=='undefined'&&typeof Worker!=='undefined';
}
function neuralOff(){
  neuralState='off';
  if(ttsWorker){try{ttsWorker.terminate();}catch(e){}ttsWorker=null;}
  for(const res of reqPending.values())res(null);
  reqPending.clear();
  updateVoiceNote();
}
function loadNeural(){
  if(neuralState!=='idle')return;
  if(!neuralAllowed()){neuralState='off';updateVoiceNote();return;}
  neuralState='loading';updateVoiceNote();
  try{
    ttsWorker=new Worker('js/voice-worker.js',{type:'module'});
    ttsWorker.onerror=neuralOff;
    ttsWorker.onmessage=e=>{
      const m=e.data;
      if(m.type==='progress'){
        const p=Math.round(m.loaded/m.total*100);
        if(p!==neuralPct){neuralPct=p;updateVoiceNote();}
      }else if(m.type==='ready'){
        neuralState='ready';updateVoiceNote();
      }else if(m.type==='fail'){
        neuralOff();
      }else if(m.type==='result'){
        const res=reqPending.get(m.id);
        if(res){reqPending.delete(m.id);res(m.ok?{audio:m.audio,sampling_rate:m.rate}:null);}
      }
    };
    ttsWorker.postMessage({type:'load'});
  }catch(e){neuralOff();}
}
function neuralGenerate(text){
  if(neuralState!=='ready'||!ttsWorker)return Promise.resolve(null);
  return new Promise(res=>{
    const id=++reqId;
    reqPending.set(id,res);
    ttsWorker.postMessage({type:'generate',id,text,voice:NEURAL_VOICE,speed:0.97});
    setTimeout(()=>{ // a wedged worker must not wedge the speech queue
      if(reqPending.has(id)){reqPending.delete(id);res(null);}
    },30000);
  });
}
// warm the model up front so it's usually ready by the first record
document.addEventListener('pointerdown',()=>{loadNeural();},{once:true});

/* ---- the queue ---- */
let vq=[],vGen=0,vPumping=false,curSource=null,nextPrepared=null;
function vFlush(){
  vGen++;vq.length=0;nextPrepared=null;
  if(curSource){try{curSource.stop();}catch(e){}curSource=null;}
}
function vSay(text,flush,force){
  if(!voiceOn&&!force)return;
  if(neuralState!=='ready')return; // one voice only — silent until it exists
  if(flush)vFlush();
  const clean=speakable(text);
  if(!clean)return;
  vq.push(...splitSentences(clean).map(s=>s.trim()).filter(Boolean));
  vPump();
}
function prepare(s){
  if(neuralState!=='ready'||!AC)return Promise.resolve(null);
  return neuralGenerate(s);
}
async function vPump(){
  if(vPumping)return;vPumping=true;
  const gen=vGen;
  while(vq.length&&gen===vGen){
    const s=vq.shift();
    // pipeline: while this sentence plays, the next one is already generating
    const p=(nextPrepared&&nextPrepared.s===s)?nextPrepared.p:prepare(s);
    nextPrepared=vq.length?{s:vq[0],p:prepare(vq[0])}:null;
    let out=null;
    try{out=await p;}catch(e){}
    if(gen!==vGen)break;
    if(out)await playPCM(out.audio,out.sampling_rate,gen);
    // a failed generation skips its sentence — no fallback voice, no stall
    if(gen!==vGen)break;
  }
  vPumping=false;
  if(vq.length)vPump(); // a new say landed while we were exiting
  else if(narrating&&gen===vGen)stopAudio();
}
function playPCM(f32,sr,gen){
  return new Promise(res=>{
    try{
      const buf=AC.createBuffer(1,f32.length,sr);
      buf.getChannelData(0).set(f32);
      const src=AC.createBufferSource();src.buffer=buf;
      const g=AC.createGain();g.gain.value=1.0;
      src.connect(g);g.connect(master);
      // a whisper of the shared reverb — reads as the Presence, not a podcast
      const wg=AC.createGain();wg.gain.value=.10;src.connect(wg);wg.connect(revSend);
      curSource=src;
      src.onended=()=>{if(curSource===src)curSource=null;res();};
      src.start();
    }catch(e){res();}
  });
}
/* ---- public interface (kept compatible with the rest of the app) ---- */
function presenceVoice(text,interrupt){
  if(narrating)return; // never talk over narration
  vSay(text,interrupt!==false);
}
const sysVoice=presenceVoice;
document.getElementById('voiceBtn').onclick=e=>{
  voiceOn=!voiceOn;
  if(!voiceOn)vFlush();
  e.target.textContent=voiceOn?'Voice On':'Voice Off';
  sfx('click');
  if(voiceOn)sysVoice('Presence voice online.');
};

/* ---- panel status line ---- */
let lastNoteId=null;
function voiceNoteText(id){
  if(id&&audioMap[id])return 'Narration: recorded audio';
  if(neuralState==='ready')return 'Narration: Presence voice · on-device';
  if(neuralState==='off')return 'Presence voice unavailable on this device · running silent';
  return 'Presence voice loading '+(neuralPct?neuralPct+'%':'…')+' · silent until ready';
}
function updateVoiceNote(){
  const el=document.getElementById('audioNote');
  if(el)el.textContent=voiceNoteText(lastNoteId);
}

/* ---- narration player ---- */
let audioEl=null;
const playBtn=document.getElementById('playBtn');
playBtn.onclick=()=>{
  initAudio();
  if(narrating||(audioEl&&!audioEl.paused)){stopAudio();return;}
  if(!currentNode)return;
  const url=audioMap[currentNode.id];
  if(!url&&neuralState!=='ready'){updateVoiceNote();return;} // nothing to play yet
  playBtn.classList.add('playing');
  document.getElementById('playLbl').textContent='Stop narration';
  if(url){
    audioEl=new Audio(url);audioEl.play();
    audioEl.onended=stopAudio;
  }else{
    vFlush();
    narrating=true;
    vSay(document.getElementById('pBody').textContent,false,true);
  }
};
function stopAudio(){
  if(audioEl){audioEl.pause();audioEl=null;}
  narrating=false;
  vFlush();
  playBtn.classList.remove('playing');
  document.getElementById('playLbl').textContent='Play narration';
}
