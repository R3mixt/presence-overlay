/* ============ PRESENCE VOICE ============
   One speech queue, two engines:
   - neural: Kokoro-82M running on-device via WebAssembly (lazy-loaded from
     CDN on first interaction, ~90 MB once, cached by the browser after).
     This is the voice you actually want to listen to.
   - browser: speechSynthesis fallback while the model loads, on data-saver /
     small-screen devices, or if the CDN is unreachable. Installed voices are
     ranked so the least robotic one is used.
   Everything spoken goes through the queue, so lines no longer cancel each
   other mid-sentence. */
let voiceOn=true,narrating=false;

/* ---- browser-voice ranking ---- */
let chosenVoice=null;
function scoreVoice(v){
  const n=v.name,lang=v.lang||'';
  if(!/^en/i.test(lang))return -1e4;
  let s=0;
  if(/natural|neural/i.test(n))s+=80;               // Edge / Azure neural
  if(/google/i.test(n))s+=50;                        // Chrome network voices
  if(/premium|enhanced|siri/i.test(n))s+=45;         // Apple high-quality
  if(/aria|sonia|libby|ryan|guy|jenny/i.test(n))s+=8;
  if(!v.localService)s+=10;                          // network voices read better
  if(/en-GB/i.test(lang))s+=6;else if(/en-US/i.test(lang))s+=4;
  if(/desktop|compact|espeak|david|sam|mark|zira|hazel|susan/i.test(n))s-=40;
  if(/male|guy|ryan|davis|andrew|christopher|george|brian|david|mark/i.test(n)&&!/female/i.test(n))s+=3; // the Presence reads male here
  return s;
}
function pickVoice(){
  const vs=speechSynthesis.getVoices();
  if(!vs.length)return null;
  let best=null,bs=-1e4-1;
  for(const v of vs){const s=scoreVoice(v);if(s>bs){bs=s;best=v;}}
  return best;
}
if('speechSynthesis'in window){
  chosenVoice=pickVoice();
  speechSynthesis.onvoiceschanged=()=>{chosenVoice=pickVoice();};
}

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
  if('speechSynthesis'in window)speechSynthesis.cancel();
}
function vSay(text,flush,force){
  if(!voiceOn&&!force)return;
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
    else await browserSpeak(s);
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
function browserSpeak(s){
  return new Promise(res=>{
    if(!('speechSynthesis'in window)){res();return;}
    let done=false;const fin=()=>{if(!done){done=true;res();}};
    try{
      const u=new SpeechSynthesisUtterance(s);
      u.rate=0.98;u.pitch=1.0;u.volume=0.95;
      if(chosenVoice)u.voice=chosenVoice;
      u.onend=fin;u.onerror=fin;
      speechSynthesis.speak(u);
      setTimeout(fin,1500+s.length*100); // some engines drop onend
    }catch(e){fin();}
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
  if(voiceOn)sysVoice('System voice online.');
};

/* ---- panel status line ---- */
let lastNoteId=null;
function voiceNoteText(id){
  if(id&&audioMap[id])return 'Narration: recorded audio';
  if(neuralState==='ready')return 'Narration: Presence neural voice · on-device';
  if(neuralState==='loading')return 'Narration: system voice · neural voice loading '+(neuralPct?neuralPct+'%':'…');
  return 'Narration: system voice';
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
