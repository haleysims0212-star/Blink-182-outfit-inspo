function move(n){const a=boardList();if(!a.length)return;idx=(idx+n+a.length)%a.length;renderSwipe();const active=$('.thumb.on');if(active)active.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}
$('#prev').onclick=()=>move(-1);$('#next').onclick=()=>move(1);$('#backHome').onclick=()=>{currentId=null;renderHome();window.scrollTo(0,0)};
$('#swipeViewBtn').onclick=()=>{viewMode='swipe';renderBoard()};$('#gridViewBtn').onclick=()=>{viewMode='grid';renderBoard()};
$('#heart').onclick=()=>{const x=boardList()[idx];if(x)toggleSavedItem(x)};
$('#itemMore').onclick=()=>{const x=boardList()[idx];if(x)openFindModal(x.id)};$('#editBoard').onclick=()=>openBoardModal(currentId);$('#addFind').onclick=()=>openFindModal(null);
$$('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));$$('.overlay').forEach(o=>o.onclick=e=>{if(e.target===o)closeModal(o.id)});
function openModal(id){$('#'+id).classList.add('show')}function closeModal(id){$('#'+id).classList.remove('show')}
function openBoardModal(id=null){
  editBoardId=id; const p=id?projects.find(x=>x.id===id):null; boardTypeChoice=p?.type||'inspo';
  $('#boardModalTitle').textContent=p?'Edit board':'New board';$('#boardIcon').value=p?.icon||'';$('#boardName').value=p?.title||'';$('#boardNote').value=p?.subtitle||'';$('#saveBoard').textContent=p?'Save changes':'Create board';$('#deleteBoard').hidden=!p;syncTypeButtons();openModal('boardModal');setTimeout(()=>$('#boardName').focus(),120)
}
function syncTypeButtons(){$('#typeInspo').classList.toggle('on',boardTypeChoice==='inspo');$('#typeProject').classList.toggle('on',boardTypeChoice==='project')}
$('#typeInspo').onclick=()=>{boardTypeChoice='inspo';syncTypeButtons()};$('#typeProject').onclick=()=>{boardTypeChoice='project';syncTypeButtons()};$('#newBoard').onclick=()=>openBoardModal(null);
$('#saveBoard').onclick=()=>{
  const title=$('#boardName').value.trim();if(!title){toast('Give the board a name first');return}
  if(editBoardId){const p=projects.find(x=>x.id===editBoardId);if(!p)return;p.type=boardTypeChoice;p.icon=$('#boardIcon').value.trim()||'✦';p.title=title;p.subtitle=$('#boardNote').value.trim();p.updated=now()}
  else{const p={id:'board-'+now(),type:boardTypeChoice,icon:$('#boardIcon').value.trim()||'✦',title,subtitle:$('#boardNote').value.trim(),created:now(),updated:now(),items:[],saved:[]};projects.push(p);currentId=p.id}
  persist();closeModal('boardModal'); if(currentId){openBoard(currentId)}else renderHome()
};
$('#deleteBoard').onclick=()=>{const p=projects.find(x=>x.id===editBoardId);if(!p)return;if(!confirm(`Delete “${p.title}”?`))return;projects=projects.filter(x=>x.id!==p.id);persist();closeModal('boardModal');if(currentId===p.id)currentId=null;renderHome();toast('Board deleted')};
