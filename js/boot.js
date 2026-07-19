/* ============ RESILIENT BOOT: load THREE from a fallback chain, surface all faults ============ */
(function(){
  const bootTxt=()=>document.getElementById('bootText');
  window.__fault=function(msg){
    try{
      const b=document.getElementById('boot');
      b.classList.remove('done');
      bootTxt().textContent='[ FAULT ] '+msg;
      bootTxt().style.color='#ff8866';
      const bar=document.getElementById('bootBar');if(bar)bar.style.background='#ff8866';
    }catch(e){}
  };
  window.addEventListener('error',e=>{window.__fault((e.message||'script error')+(e.lineno?' @'+e.lineno:''));});
  window.addEventListener('unhandledrejection',e=>{window.__fault('async: '+((e.reason&&e.reason.message)||e.reason||'unknown'));});

  const sources=[
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.128.0/three.min.js',
    'https://unpkg.com/three@0.128.0/build/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
  ];
  let idx=0;
  function tryNext(){
    if(typeof THREE!=='undefined'){window.__main();return;}
    if(idx>=sources.length){
      window.__fault('render library unreachable — check your network connection and reload');
      return;
    }
    bootTxt().textContent='[ BINDING RENDER RELAY — SOURCE '+(idx+1)+'/'+sources.length+' ]';
    const sc=document.createElement('script');
    sc.src=sources[idx++];
    sc.onload=()=>{ if(typeof THREE!=='undefined')window.__main(); else tryNext(); };
    sc.onerror=tryNext;
    document.head.appendChild(sc);
  }
  window.addEventListener('DOMContentLoaded',tryNext);
  if(document.readyState!=='loading')tryNext();
})();
