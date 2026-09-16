function renderCompare(){
  const grid=$('#compareGrid');if(!grid)return;grid.innerHTML='';if(filter!=='saved')return;const b=current(),a=(b.items||[]).filter(x=>(b.saved||[]).includes(x.id));
  if(!a.length){grid.innerHTML='<div class="compare-empty">Save a few finds first, then compare them here.</div>';return}
  a.forEach(x=>{const c=document.createElement('article');c.className='compare-card';const img=x.image?`<img src="${escapeHTML(x.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:'Visual unavailable';const reviews=x.reviews||x.rating||'—';c.innerHTML=`<div class="compare-img">${img}</div><div class="compare-body"><div class="compare-src">${escapeHTML(x.source||'Inspo')}</div><div class="compare-title">${escapeHTML(x.title||'Untitled find')}</div>${compareRow('Price',x.price)}${compareRow('Size',x.size)}${compareRow('Reviews',reviews)}${compareRow('Condition',x.condition)}${x.url?`<a class="compare-open" href="${escapeHTML(x.url)}" target="_blank" rel="noopener">Open source</a>`:''}</div>`;grid.appendChild(c)})
}
function compareRow(label,value){return `<div class="compare-row"><span>${label}</span><b>${escapeHTML(value||'—')}</b></div>`}
function parseDetails(text=''){
  const s=String(text).replace(/\s+/g,' ').trim(),out={};let m=s.match(/\$\s?\d+(?:[.,]\d{2})?/);if(m)out.price=m[0].replace(/\s+/g,'');
  m=s.match(/\b(XXXL|XXL|XL|L|M|S|XS|XXS)\s*\/\s*US\s*(\d{1,2}(?:\s*[-–]\s*\d{1,2})?)/i);if(m)out.size=m[1].toUpperCase()+' / US '+m[2].replace(/\s+/g,'');else{m=s.match(/\bSize\s*[:\-]?\s*(XXXL|XXL|XL|L|M|S|XS|XXS|\d{1,2}(?:\s*[-–]\s*\d{1,2})?)/i);if(m)out.size=m[1].toUpperCase()}
  const star=s.match(/([0-5](?:\.\d)?)\s*(?:out of 5|stars?|★)/i),rev=s.match(/([\d,]+)\s*(?:ratings?|reviews?)/i);if(star||rev)out.reviews=[star?star[1]+' ★':'',rev?rev[1]+' reviews':''].filter(Boolean).join(' · ');
  m=s.match(/\b(new with tags|new without tags|very good|good|satisfactory|used|new)\b/i);if(m)out.condition=m[1].replace(/\b\w/g,c=>c.toUpperCase());return out
}
async function previewDetails(url){
  const endpoint='https://api.microlink.io/?url='+encodeURIComponent(url)+'&prerender=true&data.text.attr=text',r=await fetch(endpoint);if(!r.ok)throw new Error('details');const j=await r.json(),d=j.data||{},text=typeof d.text==='string'?d.text:(d.text?.value||''),det=parseDetails([d.title,d.description,text].filter(Boolean).join(' '));return{title:d.title||'',image:d.image?.url||'',source:d.publisher||'',price:det.price||'',size:det.size||'',reviews:det.reviews||'',condition:det.condition||''}
}
async function enrichItem(x,force=false){
  if(!x?.url)return false;const hasDetails=!!(x.price||x.size||x.reviews||x.condition),fresh=x.detailsChecked&&Date.now()-x.detailsChecked<21600000;if(!force&&hasDetails&&fresh)return false;
  try{const d=await previewDetails(x.url);let changed=false;if(d.image&&!x.image){x.image=d.image;changed=true}if(d.title&&(!x.title||/^(Amazon|Vinted|Inspo) (outfit option|find)$/i.test(x.title))){x.title=d.title;changed=true}const s=sourceName(x.url,d.source);if(s&&s!==x.source){x.source=s;changed=true}for(const k of ['price','size','reviews','condition'])if(d[k]&&(!x[k]||force)&&x[k]!==d[k]){x[k]=d[k];changed=true}x.detailsChecked=Date.now();return changed}catch{x.detailsChecked=Date.now();return false}
}
async function refreshSavedDetails(force=true){
  const b=current();if(!b)return;const a=(b.items||[]).filter(x=>(b.saved||[]).includes(x.id));if(!a.length){toast('Save a few finds first');return}$('#refreshDetails').disabled=true;$('#refreshDetails').textContent='Refreshing…';let changed=false,found=0;for(const x of a){const before=[x.price,x.size,x.reviews,x.condition].filter(Boolean).length;changed=(await enrichItem(x,force))||changed;const after=[x.price,x.size,x.reviews,x.condition].filter(Boolean).length;if(after>before)found++}if(changed){b.updated=now();persist()}$('#refreshDetails').disabled=false;$('#refreshDetails').textContent='↻ Refresh details';renderBoard();toast(changed?(found?'Details pulled from source':'Details refreshed'):'No new details found')
}
async function hydrateMissing(){let changed=false;for(const b of projects){for(const x of (b.items||[])){if(x.url&&(!x.image||!x.detailsChecked))changed=(await enrichItem(x,false))||changed}}if(changed)persist();if(currentId)renderBoard();else renderHome()}
$('#savedBrowseBtn').onclick=()=>{savedMode='browse';renderBoard()};$('#savedCompareBtn').onclick=()=>{savedMode='compare';renderBoard();setTimeout(()=>refreshSavedDetails(false),100)};$('#refreshDetails').onclick=()=>refreshSavedDetails(true);
