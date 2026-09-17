function renderBoard(){
  const b=current(); if(!b){renderHome();return}
  $('#boardType').textContent=b.type==='project'?'Project board':'Inspo board';$('#boardTitle').textContent=(b.icon?b.icon+' ':'')+b.title;$('#boardSub').textContent=b.subtitle||'';
  const comparing=filter==='saved'&&savedMode==='compare';
  $('#swipeViewBtn').classList.toggle('on',viewMode==='swipe');$('#gridViewBtn').classList.toggle('on',viewMode==='grid');
  $('#savedTools').classList.toggle('show',filter==='saved');$('#savedBrowseBtn').classList.toggle('on',savedMode==='browse');$('#savedCompareBtn').classList.toggle('on',savedMode==='compare');
  $('#comparePanel').classList.toggle('show',comparing);$('#swipePanel').hidden=comparing||viewMode!=='swipe';$('#gridPanel').hidden=comparing||viewMode!=='grid';
  renderFilters(); renderSwipe(); renderGrid(); renderCompare();
}
function renderFilters(){
  const b=current(), f=$('#filters'); f.innerHTML=''; const sources=[...new Set((b.items||[]).map(x=>x.source).filter(Boolean))];
  const defs=[['all','All'],...sources.map(s=>[s,s]),['saved','♡ Saved '+(b.saved||[]).length]];
  defs.forEach(([key,label])=>{const bt=document.createElement('button');bt.className='chip'+(filter===key?' on':'');bt.textContent=label;bt.onclick=()=>{filter=key;idx=0;if(key!=='saved')savedMode='browse';renderBoard()};f.appendChild(bt)});
}
function renderSwipe(){
  const a=boardList(), b=current(); const has=a.length>0;
  $('#card').hidden=!has;$('#emptySwipe').hidden=has;$('#thumbs').innerHTML='';
  $('#thumbTitle').textContent=filter==='saved'?'Saved finds':filter==='all'?'All finds':filter;
  if(!has){$('#emptyTitle').textContent=filter==='saved'?'No saved finds yet':'Nothing here yet';$('#emptyText').textContent=filter==='saved'?'Tap the heart on anything you want to keep.':'Add a find or try another filter.';return}
  idx=Math.max(0,Math.min(idx,a.length-1));const x=a[idx];
  $('#src').textContent=x.source||'Inspo';$('#tag').textContent=x.tag||'';$('#count').textContent=`${idx+1} of ${a.length}`;$('#ttl').textContent=x.title||'Untitled find';
  $('#heart').textContent=(b.saved||[]).includes(x.id)?'♥':'♡';$('#heart').classList.toggle('on',(b.saved||[]).includes(x.id));
  const shop=$('#shop'),link=$('#picLink'),safeUrl=safeHttpUrl(x.url); if(safeUrl){shop.href=safeUrl;shop.classList.remove('disabled');link.href=safeUrl;link.removeAttribute('aria-disabled')}else{shop.removeAttribute('href');shop.classList.add('disabled');link.removeAttribute('href');link.setAttribute('aria-disabled','true')}
  showMainImage(x); renderThumbs(a);
}
function showMainImage(x){const im=$('#pic'),ph=$('#ph'),src=safeImageUrl(x.image);if(src){im.hidden=false;ph.hidden=true;im.src=src;im.alt=x.title||'';im.referrerPolicy='no-referrer';im.onerror=()=>{im.hidden=true;ph.hidden=false}}else{im.hidden=true;ph.hidden=false}}
function renderThumbs(a){const t=$('#thumbs'),b=current();a.forEach((x,i)=>{const bt=document.createElement('button');bt.className='thumb'+(i===idx?' on':'');const thumbSrc=safeImageUrl(x.image);if(thumbSrc){const im=document.createElement('img');im.src=thumbSrc;im.alt='';im.referrerPolicy='no-referrer';im.onerror=()=>im.remove();bt.appendChild(im)}if((b.saved||[]).includes(x.id)){const h=document.createElement('span');h.className='mh';h.textContent='♥';bt.appendChild(h)}bt.onclick=()=>{idx=i;renderSwipe();bt.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})};t.appendChild(bt)})}
function renderGrid(){
  const a=boardList(),g=$('#moodgrid');g.innerHTML='';$('#emptyGrid').hidden=a.length>0;
  const b=current();a.forEach((x,i)=>{const bt=document.createElement('button');bt.className='tile';const tileSrc=safeImageUrl(x.image);bt.innerHTML=tileSrc?`<img src="${escapeHTML(tileSrc)}" alt="" referrerpolicy="no-referrer">`:`<div class="tile-ph">✦<br>${escapeHTML(x.title||'Find')}</div>`;bt.innerHTML+=`<span class="source-dot">${escapeHTML(x.source||'Inspo')}</span>${(b.saved||[]).includes(x.id)?'<span class="tile-heart">♥</span>':''}`;bt.onclick=()=>{viewMode='swipe';idx=i;renderBoard();window.scrollTo({top:0,behavior:'smooth'})};g.appendChild(bt)});
}
