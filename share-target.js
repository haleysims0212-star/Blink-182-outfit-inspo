(function(){
var APP_URL='https://inspo-projects.github.io/';
var PENDING_KEY='inspoPendingSharedFind';
var installPrompt=null;
var sharedOpen=false;

function q(id){return document.getElementById(id)}
function currentUser(){return window.inspoCloudApi&&window.inspoCloudApi.getUser?window.inspoCloudApi.getUser():null}
function extractUrl(text){
  var m=String(text||'').match(/https?:\/\/[^\s<>]+/i);
  return m?safeHttpUrl(m[0].replace(/[),.;!?]+$/,'')):'';
}
function captureIncoming(){
  var u=new URL(location.href);
  if(u.searchParams.get('share_target')!=='1')return false;
  var url=safeHttpUrl(u.searchParams.get('shared_url'))||extractUrl(u.searchParams.get('shared_text'));
  if(url){
    localStorage.setItem(PENDING_KEY,JSON.stringify({
      url:url,
      title:u.searchParams.get('shared_title')||'',
      text:u.searchParams.get('shared_text')||'',
      received:Date.now()
    }));
  }
  history.replaceState(null,'',APP_URL);
  return !!url;
}
function ensureUI(){
  if(!q('sharedFindModal')){
    document.body.insertAdjacentHTML('beforeend',
      '<div id="sharedFindModal" class="overlay"><div class="sheet">'+
      '<div class="sheet-head"><h2>Save shared find</h2><button class="close" id="closeSharedFind">×</button></div>'+
      '<div id="sharedFindBody"></div></div></div>'+
      '<div id="phoneShareModal" class="overlay"><div class="sheet">'+
      '<div class="sheet-head"><h2>Phone sharing</h2><button class="close" id="closePhoneShare">×</button></div>'+
      '<div id="phoneShareBody"></div></div></div>'+
      '<div id="pasteLinkModal" class="overlay"><div class="sheet">'+
      '<div class="sheet-head"><h2>Paste a link</h2><button class="close" id="closePasteLink">×</button></div>'+
      '<div class="field"><label>Product or inspo link</label><input id="pasteLinkInput" type="url" inputmode="url" placeholder="Paste the link here"></div>'+
      '<button id="usePastedLink" class="primary">Add this find</button><div id="pasteLinkStatus" class="hintline"></div></div></div>'
    );
    q('closeSharedFind').onclick=function(){closeShared(true)};
    q('closePhoneShare').onclick=function(){q('phoneShareModal').classList.remove('show')};
    q('closePasteLink').onclick=function(){q('pasteLinkModal').classList.remove('show')};
    q('usePastedLink').onclick=useManualPastedLink;
    q('sharedFindModal').onclick=function(e){if(e.target.id==='sharedFindModal')closeShared(true)};
    q('phoneShareModal').onclick=function(e){if(e.target.id==='phoneShareModal')q('phoneShareModal').classList.remove('show')};
    q('pasteLinkModal').onclick=function(e){if(e.target.id==='pasteLinkModal')q('pasteLinkModal').classList.remove('show')};
  }
  var home=document.querySelector('.home-actions');
  if(home&&!q('pasteLinkBtn')){
    home.insertAdjacentHTML('beforeend','<button id="pasteLinkBtn" class="share-setup-btn">＋ Paste link</button><button id="phoneSharingSetup" class="share-setup-btn">↗ Phone sharing</button>');
    q('pasteLinkBtn').onclick=pasteLinkFlow;
    q('phoneSharingSetup').onclick=openPhoneSetup;
  }
}
function closeShared(discard){
  if(q('sharedFindModal'))q('sharedFindModal').classList.remove('show');
  sharedOpen=false;
  if(discard)localStorage.removeItem(PENDING_KEY);
}
async function previewShared(data){
  var base={
    url:data.url,
    title:data.title||sourceName(data.url)+' find',
    image:'',
    source:sourceName(data.url),
    price:'',
    size:'',
    reviews:'',
    condition:''
  };
  try{
    var d=await previewDetails(data.url);
    base.title=d.title||base.title;
    base.image=safeImageUrl(d.image)||'';
    base.source=sourceName(data.url,d.source);
    base.price=d.price||'';
    base.size=d.size||'';
    base.reviews=d.reviews||'';
    base.condition=d.condition||'';
    return base;
  }catch(e){
    try{
      var p=await preview(data.url);
      base.title=p.title||base.title;
      base.image=safeImageUrl(p.image)||'';
      base.source=sourceName(data.url,p.source);
    }catch(ignore){}
    return base;
  }
}
function boardOptions(){
  return (projects||[]).filter(function(p){return p._role!=='viewer'});
}
async function openPending(){
  ensureUI();
  if(sharedOpen||!currentUser())return false;
  var raw=localStorage.getItem(PENDING_KEY);
  if(!raw)return false;
  var data=safeJSON(raw,null);
  if(!data||!safeHttpUrl(data.url)){localStorage.removeItem(PENDING_KEY);return false}
  sharedOpen=true;
  q('sharedFindBody').innerHTML='<div class="shared-loading">Pulling in the product…</div>';
  q('sharedFindModal').classList.add('show');
  var info=await previewShared(data);
  if(!sharedOpen)return false;
  var boards=boardOptions();
  var options='';
  boards.forEach(function(b){
    options+='<option value="'+escapeHTML(b.id)+'">'+escapeHTML((b.icon?b.icon+' ':'')+b.title)+'</option>';
  });
  options+='<option value="__quick__">＋ Quick Saves</option>';
  q('sharedFindBody').innerHTML=
    '<div class="shared-preview">'+
      (info.image?'<img src="'+escapeHTML(info.image)+'" alt="" referrerpolicy="no-referrer">':'<div class="shared-preview-ph">✦</div>')+
      '<div><span>'+escapeHTML(info.source||'Inspo')+'</span><b>'+escapeHTML(info.title||'Shared find')+'</b>'+
      '<small>'+escapeHTML(info.price||'')+'</small></div>'+
    '</div>'+
    '<div class="field"><label>Save to</label><select id="sharedBoardSelect">'+options+'</select></div>'+
    '<button id="saveSharedFind" class="primary">Save find</button>'+
    '<button id="cancelSharedFind" class="share-cancel">Not now</button>';
  q('cancelSharedFind').onclick=function(){closeShared(true)};
  q('saveSharedFind').onclick=async function(){
    var btn=q('saveSharedFind');
    btn.disabled=true;btn.textContent='Saving…';
    var id=q('sharedBoardSelect').value;
    var b=(projects||[]).find(function(x){return x.id===id});
    var user=currentUser();
    if(id==='__quick__'||!b){
      b=(projects||[]).find(function(x){return x._role==='owner'&&x.title==='Quick Saves'});
      if(!b){
        b={
          id:crypto.randomUUID(),type:'inspo',icon:'✦',title:'Quick Saves',
          subtitle:'Things I shared to Inspo Projects.',created:now(),updated:now(),
          items:[],saved:[],_ownerId:user.id,_role:'owner',_cloud:false
        };
        projects.unshift(b);
      }
    }
    if((b.items||[]).some(function(x){return x.url===info.url})){
      localStorage.removeItem(PENDING_KEY);closeShared(false);openBoard(b.id);toast('Already on this board');return;
    }
    b.items=b.items||[];
    b.items.unshift({
      id:crypto.randomUUID(),url:info.url,title:info.title,image:info.image,tag:'',
      source:info.source,price:info.price,size:info.size,reviews:info.reviews,
      condition:info.condition,detailsChecked:Date.now(),_createdBy:user.id
    });
    b.updated=now();
    localStorage.removeItem(PENDING_KEY);
    persist();
    if(window.inspoCloudApi&&window.inspoCloudApi.sync)await window.inspoCloudApi.sync();
    closeShared(false);openBoard(b.id);toast('Saved to '+b.title);
  };
  return true;
}

function queueSharedUrl(url,title=''){
  url=safeHttpUrl(url);
  if(!url)return false;
  localStorage.setItem(PENDING_KEY,JSON.stringify({url:url,title:title||'',text:'',received:Date.now()}));
  return true;
}
async function pasteLinkFlow(){
  ensureUI();
  var text='';
  try{
    if(navigator.clipboard&&navigator.clipboard.readText)text=await navigator.clipboard.readText();
  }catch(e){}
  var url=extractUrl(text)||safeHttpUrl(text);
  if(url){
    queueSharedUrl(url);
    await openPending();
    return;
  }
  q('pasteLinkInput').value='';
  q('pasteLinkStatus').textContent='Copy a product link first, then paste it here.';
  q('pasteLinkModal').classList.add('show');
  setTimeout(function(){q('pasteLinkInput').focus()},100);
}
function useManualPastedLink(){
  var raw=q('pasteLinkInput').value.trim();
  var url=extractUrl(raw)||safeHttpUrl(raw);
  if(!url){
    q('pasteLinkStatus').textContent='That does not look like a normal web link yet.';
    return;
  }
  q('pasteLinkModal').classList.remove('show');
  queueSharedUrl(url);
  openPending();
}
function openPhoneSetup(){
  ensureUI();
  var standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  q('phoneShareBody').innerHTML=
    '<div class="phone-share-block"><div class="phone-share-kicker">ANDROID</div>'+
    '<b>Share straight to Inspo Projects</b>'+
    '<p>'+(standalone?'This app is installed. Share a product link and choose Inspo Projects.':'Install the app first. Then Inspo Projects can appear in your phone Share menu.')+'</p>'+
    '<button id="installInspo" class="primary">'+(standalone?'Installed ✓':'Install Inspo Projects')+'</button>'+
    '<div id="installHelp" class="hintline"></div></div>'+
    '<div class="phone-share-block"><div class="phone-share-kicker">IPHONE</div>'+
    '<b>Add Inspo Projects to your Home Screen</b>'+
    '<p><b>1.</b> Open Inspo Projects in <b>Safari</b>.<br><b>2.</b> Tap the Share button.<br><b>3.</b> Tap <b>Add to Home Screen</b>.<br><b>4.</b> Turn on <b>Open as Web App</b>.<br><b>5.</b> Tap <b>Add</b>.</p>'+
    '<button id="copyIphoneAppLink" class="share-choice">Copy app link<small>Send this to an iPhone user so they can open it in Safari.</small></button>'+
    '<p class="iphone-save-note">To save a product later: Share → Copy Link → open Inspo Projects → <b>Paste link</b>.</p>'+
    '<button id="iphonePasteHelp" class="share-choice">Try Paste link<small>No Apple Shortcut needed.</small></button></div>';
  q('phoneShareModal').classList.add('show');
  q('installInspo').onclick=async function(){
    if(standalone)return;
    if(installPrompt){
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt=null;
    }else{
      q('installHelp').textContent='In Chrome, tap ⋮ and choose Install app or Add to Home screen. Then reopen Inspo Projects from the new icon.';
    }
  };
  q('copyIphoneAppLink').onclick=async function(){
    try{await navigator.clipboard.writeText(APP_URL);toast('App link copied')}
    catch(e){toast('Could not copy app link')}
  };
  q('iphonePasteHelp').onclick=function(){q('phoneShareModal').classList.remove('show');pasteLinkFlow()};
}
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();installPrompt=e});
window.addEventListener('appinstalled',function(){installPrompt=null;toast('Inspo Projects installed')});
window.addEventListener('inspo-session',function(e){if(e.detail&&e.detail.signedIn)setTimeout(openPending,50)});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(function(){})}
captureIncoming();
ensureUI();
setTimeout(function(){if(currentUser())openPending()},700);
})();