/* ============ PRESENCE PANEL ============ */
const panel=document.getElementById('panel');
let currentNode=null;
function presenceSay(n){
  stopAudio();sfx('chime');
  document.getElementById('pTitle').textContent=n.name;
  document.getElementById('pLoc').textContent=n.loc||'';
  const refs=document.getElementById('pRefs');refs.innerHTML='';
  if(n.refs&&n.refs.length){
    const l=document.createElement('span');l.className='lbl';l.textContent='References';refs.appendChild(l);
    for(const[k,v]of n.refs){
      const row=document.createElement('div');
      if(/^https?:/.test(v))row.innerHTML='<span class="chap">'+k+'</span> — <a href="'+v+'" target="_blank" rel="noopener">'+v.replace('https://','')+'</a>';
      else row.innerHTML='<span class="chap">'+k+'</span> — '+v;
      refs.appendChild(row);
    }
  }
  panel.classList.add('open');
  typeBody(n.body||'');
  currentNode=n;
  document.getElementById('focusLine').textContent=n.name;
  lastNoteId=n.id;
  updateVoiceNote();
  // announce the record, then read it — queued, so nothing cuts anything off.
  // The body's opening [ header ] restates the iteration name the announcement
  // just spoke, so it's skipped in speech (still shown on screen).
  sysVoice('Information requested. '+n.name.replace(/—/g,',')+'.');
  if(n.body)vSay(n.body.replace(/^\s*\[[^\]]*\]\s*/,''),false);
  queryArchive(wikiFor[n.id]||n.name.split('—')[0].trim().replace(/ /g,'_'),false);
}
let typeTimer=null,tickN=0;
function renderBody(txt,withLinks){
  let h=esc(txt);
  if(withLinks)h=h.replace(/\{\{([^|{}]+)\|([^}]+)\}\}/g,
    '<span class="dd" data-t="$2">$1</span>');
  else h=h.replace(/\{\{([^|{}]+)\|[^}]+\}\}/g,'$1');
  return h.replace(/\[([^\]]*)\]/g,'<span class="brkt">[$1]</span>');
}
function typeBody(txt){
  clearInterval(typeTimer);
  const plain=txt.replace(/\{\{([^|{}]+)\|[^}]+\}\}/g,'$1');
  const elB=document.getElementById('pBody');elB.innerHTML='';let i=0;
  typeTimer=setInterval(()=>{
    i+=3;
    if(!((tickN++)%6)&&Math.random()<0.8)sfx('tick');
    elB.innerHTML=renderBody(plain.slice(0,i),false);
    if(i>=plain.length){
      clearInterval(typeTimer);
      elB.innerHTML=renderBody(txt,true); // final pass: deep-dive links live
    }
  },12);
}
// glitchy Presence interrupt, then drill
function glitchDive(title){
  const g=document.getElementById('glitch');
  document.getElementById('glitchTopic').textContent=title.replace(/_/g,' ');
  g.classList.remove('on');void g.offsetWidth;g.classList.add('on');
  sfx('glitch');
  presenceVoice('Information requested. '+title.replace(/_/g,' ')+'.');
  setTimeout(()=>{
    panel.classList.add('open');
    queryArchive(title,true); // deep dive: read the retrieved summary aloud
    const arc=document.getElementById('archive');
    if(arc&&arc.scrollIntoView)setTimeout(()=>arc.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
  },480);
}
document.getElementById('pBody').addEventListener('click',e=>{
  const d=e.target.closest('.dd');
  if(d){sfx('click');glitchDive(d.dataset.t);}
});
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');}
document.getElementById('pclose').onclick=()=>{panel.classList.remove('open');stopAudio();sfx('click');};
