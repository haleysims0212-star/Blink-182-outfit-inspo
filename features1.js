function renderCompare(){
  const grid=$('#compareGrid');if(!grid)return;grid.innerHTML='';if(filter!=='saved')return;const b=current(),a=(b.items||[]).filter(x=>(b.saved||[]).includes(x.id));
  if(!a.length){grid.innerHTML='<div class="compare-empty">Save a few finds first, then compare them here.</div>';return}
  a.forEach(x=>{
    const c=document.createElement('article');c.className='cmp-card';
    const imageUrl=safeImageUrl(x.image),sourceUrl=safeHttpUrl(x.url);
    const img=imageUrl?`<img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(x.title||'')}" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('missing');this.remove()">`:'<div class="cmp-noimg">Visual unavailable</div>';
    const reviews=x.reviews||x.rating||'—';
    c.innerHTML=`<div class="cmp-media">${img}</div><div class="cmp-info"><div class="cmp-store">${escapeHTML(x.source||'Inspo')}</div><div class="cmp-name">${escapeHTML(x.title||'Untitled find')}</div>${compareRow('Price',x.price)}${compareRow('Size',x.size)}${compareRow('Reviews',reviews)}${compareRow('Condition',x.condition)}${sourceUrl?`<a class="cmp-open" href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source</a>`:''}</div>`;
    grid.appendChild(c)
  })
}
function compareRow(label,value){return `<div class="cmp-row"><span>${label}</span><b>${escapeHTML(value||'—')}</b></div>`}
function parseDetails(text=''){
  const s=String(text).replace(/\s+/g,' ').trim(),out={};let m=s.match(/\$\s?\d+(?:[.,]\d{2})?/);if(m)out.price=m[0].replace(/\s+/g,'');
  m=s.match(/\b(XXXL|XXL|XL|L|M|S|XS|XXS)\s*\/\s*US\s*(\d{1,2}(?:\s*[-–]\s*\d{1,2})?)/i);if(m)out.size=m[1].toUpperCase()+' / US '+m[2].replace(/\s+/g,'');else{m=s.match(/\bSize\s*[:\-]?\s*(XXXL|XXL|XL|L|M|S|XS|XXS|\d{1,2}(?:\s*[-–]\s*\d{1,2})?)/i);if(m)out.size=m[1].toUpperCase()}
  const star=s.match(/([0-5](?:\.\d)?)\s*(?:out of 5|stars?|★)/i),rev=s.match(/([\d,]+)\s*(?:ratings?|reviews?)/i);if(star||rev)out.reviews=[star?star[1]+' ★':'',rev?rev[1]+' reviews':''].filter(Boolean).join(' · ');
  m=s.match(/\b(new with tags|new without tags|very good|good|satisfactory|used|new)\b/i);if(m)out.condition=m[1].replace(/\b\w/g,c=>c.toUpperCase());return out
}
function isAmazonUrl(url=''){try{const h=new URL(url).hostname.toLowerCase();return h==='a.co'||h.includes('amazon.')}catch{return false}}
function amazonReviews(rating='',count=''){
  const r=String(rating||'').match(/([0-5](?:\.\d)?)/),c=String(count||'').match(/([\d,]+)/);return [r?r[1]+' ★':'',c?c[1]+' reviews':''].filter(Boolean).join(' · ')
}
function cleanAmazonPrice(value=''){
  const m=String(value||'').match(/\$\s?\d+(?:[.,]\d{2})?/);return m?m[0].replace(/\s+/g,''):''
}
function cleanAmazonSize(value=''){
  const s=String(value||'').replace(/\s+/g,' ').trim();return s&&s.length<45?s:''
}
async function previewDetails(url){
  url=safeHttpUrl(url);if(!url)throw new Error('unsafe url');
  const amazon=isAmazonUrl(url),q=new URLSearchParams();q.set('url',url);q.set('prerender','true');q.set('data.pageText.selector','body');q.set('data.pageText.attr','text');
  if(amazon){
    q.set('data.amazonRating.selector','#acrPopover');q.set('data.amazonRating.attr','title');
    q.set('data.amazonReviewCount.selector','#acrCustomerReviewText');q.set('data.amazonReviewCount.attr','aria-label');
    q.set('data.amazonPrice.selector','#corePrice_feature_div .a-price .a-offscreen');q.set('data.amazonPrice.attr','text');
    q.set('data.amazonSize.selector','#variation_size_name .selection');q.set('data.amazonSize.attr','text')
  }
  const r=await fetch('https://api.microlink.io/?'+q.toString());if(!r.ok)throw new Error('details');const j=await r.json(),d=j.data||{},text=typeof d.pageText==='string'?d.pageText:(d.pageText?.value||''),det=parseDetails([d.title,d.description,text].filter(Boolean).join(' '));
  const amazonReview=amazonReviews(d.amazonRating,d.amazonReviewCount);
  if(amazon){
    const exactPrice=cleanAmazonPrice(d.amazonPrice),exactSize=cleanAmazonSize(d.amazonSize);
    return{title:d.title||'',image:d.image?.url||'',source:d.publisher||'',price:exactPrice||'See Amazon',size:exactSize||'Choose on Amazon',reviews:amazonReview||det.reviews||'',condition:''}
  }
  return{title:d.title||'',image:d.image?.url||'',source:d.publisher||'',price:det.price||'',size:det.size||'',reviews:det.reviews||'',condition:det.condition||''}
}
async function enrichItem(x,force=false){
  if(!x?.url)return false;const hasDetails=!!(x.price||x.size||x.reviews||x.condition),fresh=x.detailsChecked&&Date.now()-x.detailsChecked<21600000;if(!force&&hasDetails&&fresh)return false;
  try{const d=await previewDetails(x.url);let changed=false;if(d.image&&!x.image){x.image=d.image;changed=true}if(d.title&&(!x.title||/^(Amazon|Vinted|Inspo) (outfit option|find)$/i.test(x.title))){x.title=d.title;changed=true}const s=sourceName(x.url,d.source);if(s&&s!==x.source){x.source=s;changed=true}
    const amazon=isAmazonUrl(x.url);
    if(amazon){for(const k of ['price','size','reviews'])if(d[k]&&x[k]!==d[k]){x[k]=d[k];changed=true}}
    else{for(const k of ['price','size','reviews','condition'])if(d[k]&&(!x[k]||force)&&x[k]!==d[k]){x[k]=d[k];changed=true}}
    x.detailsChecked=Date.now();return changed}catch{x.detailsChecked=Date.now();return false}
}
async function refreshSavedDetails(force=true){
  const b=current();if(!b)return;const a=(b.items||[]).filter(x=>(b.saved||[]).includes(x.id));if(!a.length){toast('Save a few finds first');return}$('#refreshDetails').disabled=true;$('#refreshDetails').textContent='Refreshing…';let changed=false,found=0;for(const x of a){const before=[x.price,x.size,x.reviews,x.condition].filter(Boolean).length;changed=(await enrichItem(x,force))||changed;const after=[x.price,x.size,x.reviews,x.condition].filter(Boolean).length;if(after>before)found++}if(changed){b.updated=now();persist()}$('#refreshDetails').disabled=false;$('#refreshDetails').textContent='↻ Refresh details';renderBoard();toast(changed?(found?'Details pulled from source':'Details refreshed'):'No new details found')
}
async function hydrateMissing(){let changed=false;for(const b of projects){for(const x of (b.items||[])){if(x.url&&(!x.image||!x.detailsChecked))changed=(await enrichItem(x,false))||changed}}if(changed)persist();if(currentId)renderBoard();else renderHome()}
$('#savedBrowseBtn').onclick=()=>{savedMode='browse';renderBoard()};$('#savedCompareBtn').onclick=()=>{savedMode='compare';renderBoard();setTimeout(()=>refreshSavedDetails(false),100)};$('#refreshDetails').onclick=()=>refreshSavedDetails(true);