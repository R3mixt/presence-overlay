/* ============ NEURAL VOICE WORKER ============
   Kokoro-82M runs entirely in this worker so speech generation never blocks
   the render loop. The page sends {type:'load'} once, then {type:'generate'}
   per sentence; audio comes back as a transferable Float32Array. */
let tts=null;
onmessage=async e=>{
  const m=e.data;
  if(m.type==='load'){
    try{
      const{KokoroTTS}=await import('https://cdn.jsdelivr.net/npm/kokoro-js@1/+esm');
      tts=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{
        dtype:'q8',device:'wasm',
        progress_callback:x=>{
          if(x&&x.status==='progress'&&x.total>2e6)
            postMessage({type:'progress',loaded:x.loaded,total:x.total});
        }
      });
      postMessage({type:'ready'});
    }catch(err){
      postMessage({type:'fail',message:String((err&&err.message)||err)});
    }
  }else if(m.type==='generate'){
    if(!tts){postMessage({type:'result',id:m.id,ok:false});return;}
    try{
      const out=await tts.generate(m.text,{voice:m.voice,speed:m.speed});
      postMessage({type:'result',id:m.id,ok:true,rate:out.sampling_rate,audio:out.audio},[out.audio.buffer]);
    }catch(err){
      postMessage({type:'result',id:m.id,ok:false});
    }
  }
};
