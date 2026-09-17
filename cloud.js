
(()=> {
const SUPABASE_URL='https://lvbtuweiariexxtulqmo.supabase.co';
const SUPABASE_KEY='sb_publishable_gV3fjp4nxKlMQP2qGoy65A_5Wtd-WA-';
const APP_URL='https://haleysims0212-star.github.io/Blink-182-outfit-inspo/';
if(!window.supabase)return;
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,detectSessionInUrl:true}});
let cloudUser=null,syncTimer=null,syncing=false,reloading=false,channel=null,ownedIds=new Set();
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const localPersist=persist;

function injectUI(){
  document.body.insertAdjacentHTML('afterbegin',`
  <div id="authGate"><div class="auth-card"><div class="eyebrow">private visual workspace</div><h2>Inspo Projects</h2><p id="authMsg">Sign in to see your boards.</p><button id="googleLogin" class="auth-btn auth-google">Continue with Google</button><div class="auth-or">or</div><input id="emailLogin" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com"><button id="emailLoginBtn" class="auth-btn auth-email">Continue with email</button><div id="authStatus" class="auth-status"></div></div></div>
  <div id="shareCloudModal" class="overlay"><div class="sheet"><div class="sheet-head"><h2>Share board</h2><button class="close" id="closeCloudShare">×</button></div><div id="shareCloudBody"></div></div></div>`);
  const home=document.querySelector('.home-actions'); if(home){home.insertAdjacentHTML('beforebegin','<div id="cloudUserBar" class="cloud-user" hidden><span id="cloudUserText"></span><button id="cloudSignOut">Sign out</button></div>')}
  $('#closeCloudShare').onclick=()=>$('#shareCloudModal').classList.remove('show');
  $('#shareCloudModal').onclick=e=>{if(e.target.id==='shareCloudModal')e.currentTarget.classList.remove('show')};
  $('#googleLogin').onclick=googleLogin; $('#emailLoginBtn').onclick=emailLogin; $('#cloudSignOut').onclick=()=>sb.auth.signOut();
}
function showGate(msg='Sign in to see your boards.'){document.querySelector('.shell').style.display='none';$('#authMsg').textContent=msg;$('#authGate').classList.add('show')}
function hideGate(){document.querySelector('.shell').style.display='';$('#authGate').classList.remove('show')}
function status(s){$('#authStatus').textContent=s||''}
async function googleLogin(){
  localStorage.setItem('inspoPendingJoin',new URL(location.href).searchParams.get('join')||localStorage.getItem('inspoPendingJoin')||'');
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:APP_URL}});
  if(error)status('Google sign-in still needs to be enabled for this app.');
}
async function emailLogin(){
  const email=$('#emailLogin').value.trim(); if(!email){status('Enter your email first.');return}
  localStorage.setItem('inspoPendingJoin',new URL(location.href).searchParams.get('join')||localStorage.getItem('inspoPendingJoin')||'');
  status('Sending your sign-in link…');
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:APP_URL,shouldCreateUser:true}});
  status(error?error.message:'Check your email for the sign-in link ✦');
}
function normalizeIds(){
  for(const p of projects){
    const oldBoard=p.id;if(!uuidRe.test(p.id)){p.id=crypto.randomUUID();if(currentId===oldBoard)currentId=p.id}
    const map=new Map();for(const x of (p.items||[])){const old=x.id;if(!uuidRe.test(x.id))x.id=crypto.randomUUID();map.set(old,x.id)}
    p.saved=(p.saved||[]).map(id=>map.get(id)||id).filter(id=>uuidRe.test(id));
  }
  localPersist();
}
function toBoardRow(p){
  return{id:p.id,owner_id:p._ownerId||cloudUser.id,title:p.title||'Untitled board',subtitle:p.subtitle||null,icon:p.icon||null,board_type:p.type||'inspo'};
}
async function syncAll(){
  if(!cloudUser||syncing||reloading)return;syncing=true;
  try{
    normalizeIds();
    const presentOwned=new Set();
    for(const p of projects){
      const role=p._role||'owner'; const owner=p._ownerId||cloudUser.id;
      if(role==='viewer')continue;
      if(role==='owner'||owner===cloudUser.id){
        presentOwned.add(p.id);
        if(!p._cloud){
          const {error}=await sb.from('boards').insert(toBoardRow(p)); if(error)throw error;
          p._cloud=true;p._ownerId=cloudUser.id;p._role='owner';
        }else{
          await sb.from('boards').update({title:p.title,subtitle:p.subtitle||null,icon:p.icon||null,board_type:p.type||'inspo'}).eq('id',p.id);
        }
      }else{
        await sb.from('boards').update({title:p.title,subtitle:p.subtitle||null,icon:p.icon||null,board_type:p.type||'inspo'}).eq('id',p.id);
      }
      const localIds=new Set();
      for(let pos=0;pos<(p.items||[]).length;pos++){
        const x=p.items[pos]; if(!uuidRe.test(x.id))x.id=crypto.randomUUID();localIds.add(x.id);
        await sb.from('items').upsert({id:x.id,board_id:p.id,created_by:x._createdBy||cloudUser.id,source_url:x.url||null,source_name:x.source||null,title:x.title||'Untitled find',image_url:x.image||null,tag:x.tag||null,price:x.price||null,size:x.size||null,reviews:x.reviews||null,condition:x.condition||null,position:pos});
      }
      const {data:dbItems}=await sb.from('items').select('id').eq('board_id',p.id);
      const stale=(dbItems||[]).map(r=>r.id).filter(id=>!localIds.has(id)); if(stale.length)await sb.from('items').delete().in('id',stale);
      await sb.from('saved_items').delete().eq('board_id',p.id).eq('user_id',cloudUser.id);
      const saves=(p.saved||[]).filter(id=>localIds.has(id)).map(item_id=>({board_id:p.id,item_id,user_id:cloudUser.id}));
      if(saves.length)await sb.from('saved_items').insert(saves);
    }
    for(const id of ownedIds){if(!presentOwned.has(id)){await sb.from('boards').delete().eq('id',id)}}
    ownedIds=presentOwned; localPersist();
  }catch(e){console.warn('Cloud sync',e)}finally{syncing=false}
}
persist=function(){localPersist();if(cloudUser&&!reloading){clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,450)}};

function dbBoardToLocal(b,items,saved,members){
  const its=(items||[]).filter(i=>i.board_id===b.id).sort((a,z)=>(a.position||0)-(z.position||0)).map(i=>({id:i.id,url:i.source_url||'',source:i.source_name||'',title:i.title||'',image:i.image_url||'',tag:i.tag||'',price:i.price||'',size:i.size||'',reviews:i.reviews||'',condition:i.condition||'',_createdBy:i.created_by}));
  const role=b.owner_id===cloudUser.id?'owner':((members||[]).find(m=>m.board_id===b.id&&m.user_id===cloudUser.id)?.role||'viewer');
  return{id:b.id,type:b.board_type,icon:b.icon||'✦',title:b.title,subtitle:b.subtitle||'',created:Date.parse(b.created_at),updated:Date.parse(b.updated_at),items:its,saved:(saved||[]).filter(s=>s.board_id===b.id).map(s=>s.item_id),_cloud:true,_ownerId:b.owner_id,_role:role,_shareToken:b.share_token,_collaborateToken:b.collaborate_token,_visibility:b.visibility};
}
async function loadCloud(){
  if(!cloudUser)return;reloading=true;
  try{
    const [{data:boards,error:be},{data:items},{data:saved},{data:members}]=await Promise.all([
      sb.from('boards').select('*').order('updated_at',{ascending:false}),
      sb.from('items').select('*'),
      sb.from('saved_items').select('*'),
      sb.from('board_members').select('*')
    ]);
    if(be)throw be;
    if((boards||[]).length===0&&projects.length){
      normalizeIds();for(const p of projects){p._ownerId=cloudUser.id;p._role='owner';p._cloud=false}await syncAll();
      return loadCloud();
    }
    projects=(boards||[]).map(b=>dbBoardToLocal(b,items,saved,members));
    ownedIds=new Set(projects.filter(p=>p._role==='owner').map(p=>p.id));
    localPersist();currentId=null;renderHome();
  }catch(e){console.warn(e);toast('Could not load cloud boards')}finally{reloading=false}
}
const originalRenderHome=renderHome;
renderHome=function(){
  if(!cloudUser){originalRenderHome();return}
  $('#homeView').hidden=false;$('#boardView').hidden=true;const wrap=$('#projects');wrap.innerHTML='';$('#emptyHome').hidden=projects.length!==0;
  const groups=[['My Boards',projects.filter(p=>p._role==='owner')],['Shared With Me',projects.filter(p=>p._role!=='owner')]];
  const card=p=>{
    const btn=document.createElement('button');btn.className='project-card';const imgs=(p.items||[]).filter(x=>x.image).slice(0,4);
    const cover=imgs.length?'<div class="cover">'+imgs.map(x=>`<img src="${escapeHTML(x.image)}" alt="" referrerpolicy="no-referrer">`).join('')+'</div>':`<div class="cover empty">${escapeHTML(p.icon||'✦')}</div>`;
    const saved=(p.saved||[]).length,count=(p.items||[]).length;
    btn.innerHTML=cover+`<div class="pc-body"><span class="pill">${p._role==='owner'?(p.type==='project'?'Project board':'Inspo board'):'Shared '+p._role}</span><div class="pc-title">${escapeHTML(p.icon||'')} ${escapeHTML(p.title)}</div><div class="pc-sub">${escapeHTML(p.subtitle||'')}</div><div class="pc-meta">${count} find${count===1?'':'s'}${saved?' · '+saved+' saved':''}</div></div>${p._role==='owner'?'<button class="pc-more" aria-label="Edit board">•••</button>':''}`;
    btn.onclick=e=>{if(e.target.closest('.pc-more')){openBoardModal(p.id);e.stopPropagation();return}openBoard(p.id)};return btn
  };
  groups.forEach(([title,arr])=>{if(!arr.length)return;const h=document.createElement('div');h.className='project-section-title';h.textContent=title;wrap.appendChild(h);arr.sort((a,b)=>(b.updated||0)-(a.updated||0)).forEach(p=>wrap.appendChild(card(p)))});
};
async function openCloudShare(){
  const b=current();if(!b)return;if(b._role!=='owner'){toast('Only the board owner can change sharing');return}
  await syncAll();
  const {data:fresh}=await sb.from('boards').select('share_token,collaborate_token,visibility').eq('id',b.id).single();
  if(fresh){b._shareToken=fresh.share_token;b._collaborateToken=fresh.collaborate_token;b._visibility=fresh.visibility}
  const body=$('#shareCloudBody');body.innerHTML=`
    <button class="share-choice" id="copyViewLink">🔗 Copy view-only link<small>Anyone with the link can look at this board. They cannot edit it.</small></button>
    <button class="share-choice" id="copyCollabLink">👥 Copy collaboration link<small>They’ll sign in, then both of you can edit the same live board.</small></button>
    <button class="share-choice" id="disableLinks">🔒 Turn off old links<small>Makes the board private again and replaces both share links.</small></button>
    <div class="collab-list"><div class="project-section-title">Collaborators</div><div id="collabRows">Loading…</div></div>`;
  $('#shareCloudModal').classList.add('show');
  $('#copyViewLink').onclick=async()=>{await sb.from('boards').update({visibility:'link_view'}).eq('id',b.id);b._visibility='link_view';await copyShare(APP_URL+'?view='+b._shareToken,'View link copied')};
  $('#copyCollabLink').onclick=()=>copyShare(APP_URL+'?join='+b._collaborateToken,'Collaboration link copied');
  $('#disableLinks').onclick=async()=>{await sb.from('boards').update({visibility:'private'}).eq('id',b.id);const {data}=await sb.rpc('rotate_board_tokens',{bid:b.id});const row=Array.isArray(data)?data[0]:data;if(row){b._shareToken=row.share_token;b._collaborateToken=row.collaborate_token}b._visibility='private';toast('Old links turned off')};
  loadCollaborators(b.id);
}
async function copyShare(url,msg){
  try{if(navigator.share)await navigator.share({title:current()?.title||'Inspo board',url});else await navigator.clipboard.writeText(url);toast(msg)}catch(e){if(e?.name!=='AbortError')toast('Could not share link')}
}
async function loadCollaborators(bid){
  const el=$('#collabRows');const {data,error}=await sb.rpc('board_collaborators',{bid});if(error){el.textContent='Could not load collaborators.';return}
  if(!data?.length){el.textContent='No collaborators yet.';return}el.innerHTML='';
  data.forEach(m=>{const row=document.createElement('div');row.className='collab-row';row.innerHTML=`<div class="who"><b>${escapeHTML(m.display_name||m.email||'Collaborator')}</b><span>${escapeHTML(m.email||'')} · ${escapeHTML(m.role)}</span></div><button>Remove</button>`;row.querySelector('button').onclick=async()=>{await sb.rpc('remove_board_collaborator',{bid,member_id:m.user_id});loadCollaborators(bid);toast('Collaborator removed')};el.appendChild(row)})
}
$('#shareBoard').onclick=openCloudShare;

async function joinPending(){
  const u=new URL(location.href),token=u.searchParams.get('join')||localStorage.getItem('inspoPendingJoin');if(!token||!cloudUser)return false;
  const {data,error}=await sb.rpc('join_board_as_editor',{token});if(error){toast('That collaboration link could not be used');return false}
  localStorage.removeItem('inspoPendingJoin');history.replaceState(null,'',APP_URL);await loadCloud();if(data)openBoard(data);toast('Board added to Shared With Me');return true
}
async function publicView(token){
  document.querySelector('.shell').style.display='none';$('#authGate').classList.remove('show');
  const {data,error}=await sb.rpc('public_board_snapshot',{token});
  if(error||!data){document.body.insertAdjacentHTML('beforeend','<div class="public-wrap"><h1>Board unavailable</h1><p class="sub">This link may have been turned off.</p></div>');return}
  const b=data.board,items=data.items||[];document.body.insertAdjacentHTML('beforeend',`<main class="public-wrap"><div class="eyebrow">shared inspo board</div><h1>${escapeHTML((b.icon?b.icon+' ':'')+b.title)}</h1><p class="sub">${escapeHTML(b.subtitle||'')}</p><div class="public-grid">${items.map(x=>`<article class="public-card">${x.image_url?`<img src="${escapeHTML(x.image_url)}" alt="" referrerpolicy="no-referrer">`:''}<div class="public-info"><div class="public-store">${escapeHTML(x.source_name||'Inspo')}</div><div class="public-title">${escapeHTML(x.title||'Untitled find')}</div><div class="public-meta">${[x.price,x.size,x.reviews,x.condition].filter(Boolean).map(escapeHTML).join(' · ')}</div>${x.source_url?`<a class="public-open" href="${escapeHTML(x.source_url)}" target="_blank" rel="noopener">Open source</a>`:''}</div></article>`).join('')}</div></main>`);
}
function subscribeRealtime(){
  if(channel)sb.removeChannel(channel);channel=sb.channel('inspo-cloud').on('postgres_changes',{event:'*',schema:'public',table:'boards'},scheduleReload).on('postgres_changes',{event:'*',schema:'public',table:'items'},scheduleReload).on('postgres_changes',{event:'*',schema:'public',table:'board_members'},scheduleReload).subscribe()
}
let reloadTimer=null;function scheduleReload(){if(syncing)return;clearTimeout(reloadTimer);reloadTimer=setTimeout(async()=>{const open=currentId;await loadCloud();if(open&&projects.some(p=>p.id===open))openBoard(open)},650)}
async function onSession(session){
  cloudUser=session?.user||null;
  if(!cloudUser){$('#cloudUserBar').hidden=true;showGate();return}
  hideGate();$('#cloudUserBar').hidden=false;$('#cloudUserText').textContent=cloudUser.email||'Signed in';subscribeRealtime();await loadCloud();await joinPending()
}
async function start(){
  injectUI();
  const q=new URL(location.href).searchParams;if(q.get('view')){await publicView(q.get('view'));return}
  if(q.get('join'))localStorage.setItem('inspoPendingJoin',q.get('join'));
  const {data:{session}}=await sb.auth.getSession();await onSession(session);
  sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='SIGNED_OUT')setTimeout(()=>onSession(session),0)});
}
start();
})();
