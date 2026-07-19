/* ============ ABIDAN ARCHIVE RELAY (live wiki data) ============
   Pulls from the community-run Abidan Archive wiki via action=parse (the wiki
   has no TextExtracts extension, so we parse the rendered page ourselves).
   Falls back to the Sanctum local cache when the relay or the page is missing. */
const WIKI='https://wiki.abidanarchive.com';
function kbLookup(title){
  const k=decodeURIComponent(title).replace(/_/g,' ').trim();
  return localKB[k]?{key:k,e:localKB[k]}:null;
}
function renderLocal(kbHit,txt,tp,tph,src,announce){
  txt.textContent=kbHit.e.s;
  if(announce)vSay(kbHit.e.s,false);
  if(kbHit.e.t&&kbHit.e.t.length){
    tph.hidden=false;
    for(const t of kbHit.e.t){
      const b=document.createElement('button');
      b.textContent=t;
      b.onclick=()=>{sfx('click');glitchDive(t.replace(/ /g,'_'));};
      tp.appendChild(b);
    }
  }
  src.innerHTML='Source: Sanctum local cache — original summaries by this overlay';
}
// distill the rendered article into a short plain-text excerpt
function wikiSummary(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const img=doc.querySelector('img');
  const imgSrc=img?img.getAttribute('src'):null;
  doc.querySelectorAll('table,.infobox,.toc,#toc,.thumb,.mw-editsection,style,script').forEach(n=>n.remove());
  const paras=[...doc.querySelectorAll('p')]
    .map(p=>p.textContent.replace(/\[\d+\]/g,'').replace(/\s+/g,' ').trim())
    .filter(t=>t.length>60&&!/^\[INFORMATION/i.test(t));
  let text=paras.slice(0,2).join('\n\n');
  if(text.length>520){ // trim to a sentence boundary
    const cut=text.slice(0,520);
    const end=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('.\n'));
    text=end>200?cut.slice(0,end+1):cut+'…';
  }
  return{text,imgSrc};
}
let arcSeq=0;
async function queryArchive(title,announce){
  const seq=++arcSeq;
  const arc=document.getElementById('archive'),
        txt=document.getElementById('arcText'),
        img=document.getElementById('arcImg'),
        tp=document.getElementById('arcTopics'),
        tph=document.getElementById('arcTopicsH'),
        src=document.getElementById('arcSrc');
  arc.hidden=false;img.hidden=true;tp.innerHTML='';tph.hidden=true;src.innerHTML='';
  txt.innerHTML='<span class="brkt">[ Information requested. Accessing Abidan Archives… ]</span>';
  try{
    const url=WIKI+'/api.php?action=parse&format=json&origin=*&redirects=1'+
      '&prop=text%7Clinks&disablelimitreport=1&page='+encodeURIComponent(decodeURIComponent(title));
    const res=await fetch(url);
    const data=await res.json();
    if(seq!==arcSeq)return; // superseded by a newer query
    if(data.error||!data.parse||!data.parse.text){
      const kb=kbLookup(title);
      if(kb){renderLocal(kb,txt,tp,tph,src,announce);return;}
      txt.innerHTML='<span class="brkt">[ Record ends. No further data available in this archive. ]</span>';
      if(announce)presenceVoice('Record ends. No further data available.',false);
      return;
    }
    const{text:summary,imgSrc}=wikiSummary(data.parse.text['*']);
    if(!summary){
      const kb=kbLookup(title);
      if(kb){renderLocal(kb,txt,tp,tph,src,announce);return;}
      txt.innerHTML='<span class="brkt">[ Record exists but holds no readable summary. ]</span>';
      return;
    }
    // short attributed excerpt only — full record stays at the source
    txt.textContent=summary;
    if(announce)vSay(summary,false); // deep dives are read; record panels read their own body
    if(imgSrc){img.src=/^https?:/.test(imgSrc)?imgSrc:WIKI+imgSrc;img.hidden=false;}
    const links=(data.parse.links||[])
      .filter(l=>l.ns===0&&l['*']&&l['*'].length<40)
      .map(l=>l['*']);
    // spread suggestions across the list instead of taking the first N
    const picks=[];
    if(links.length){
      const step=Math.max(1,Math.floor(links.length/6));
      for(let i=0;i<links.length&&picks.length<6;i+=step)picks.push(links[i]);
    }
    if(picks.length){
      tph.hidden=false;
      for(const t of picks){
        const b=document.createElement('button');
        b.textContent=t;
        b.onclick=()=>{sfx('click');glitchDive(t.replace(/ /g,'_'));};
        tp.appendChild(b);
      }
    }else{
      txt.textContent+='\n\n[ This record links to no further topics. Dead end. ]';
    }
    const pageTitle=data.parse.title||decodeURIComponent(title).replace(/_/g,' ');
    const href=WIKI+'/index.php/'+encodeURIComponent(pageTitle.replace(/ /g,'_'));
    src.innerHTML='Source: <a href="'+href+'" target="_blank" rel="noopener">Abidan Archive Wiki — '+pageTitle+'</a> · CC-BY-SA · community-maintained';
  }catch(err){
    if(seq!==arcSeq)return;
    const kb=kbLookup(title);
    if(kb){renderLocal(kb,txt,tp,tph,src,announce);return;}
    txt.innerHTML='<span class="brkt">[ Relay unavailable, and no local record matches. Dead end. ]</span>';
    if(announce)presenceVoice('Relay unavailable. No local record matches.',false);
  }
}
