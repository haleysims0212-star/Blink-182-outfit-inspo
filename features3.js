function openFindModal(id=null){
  editItemId=id;const b=current(),x=id?(b.items||[]).find(i=>i.id===id):null;$('#findModalTitle').textContent=x?'Edit find':'Add a find';$('#findUrl').value=x?.url||'';$('#findName').value=x?.title||'';$('#findImage').value=x?.image||'';$('#findTag').value=x?.tag||'';$('#findPrice').value=x?.price||'';$('#findSize').value=x?.size||'';$('#findReviews').value=x?.reviews||'';$('#findCondition').value=x?.condition||'';$('#saveFind').textContent=x?'Save changes':'Add to board';$('#deleteFind').hidden=!x;$('#findStatus').textContent='';openModal('findModal');setTimeout(()=>$('#findUrl').focus(),120)
}
async function preview(url){const r=await fetch('https://api.microlink.io/?url='+encodeURIComponent(url));if(!r.ok)throw new Error('preview');const d=(await r.json()).data||{};return{title:d.title||'',image:d.image?.url||'',source:d.publisher||'',description:d.description||''}}
$('#saveFind').onclick=async()=>{
  const b=current();if(!b)return;let url=$('#findUrl').value.trim(),title=$('#findName').value.trim(),image=$('#findImage').value.trim(),tag=$('#findTag').value.trim(),price=$('#findPrice').value.trim(),size=$('#findSize').value.trim(),reviews=$('#findReviews').value.trim(),condition=$('#findCondition').value.trim(),source='',detailsChecked=0;
  if(url){url=safeHttpUrl(url);if(!url){$('#findStatus').textContent='Use a normal http or https source link.';return}}
  if(image){image=safeImageUrl(image);if(!image){$('#findStatus').textContent='Use a normal http or https photo URL.';return}}
  if(!url&&!image){$('#findStatus').textContent='Add a source link or a photo URL.';return}
  if(!editItemId&&url&&(b.items||[]).some(x=>x.url===url)){$('#findStatus').textContent='That link is already on this board.';return}
  $('#saveFind').textContent='Adding…';$('#saveFind').disabled=true;
  if(url&&(!title||!image||!price||!size||!reviews||!condition)){try{const d=await preview(url);if(!title)title=d.title;if(!image)image=d.image;source=sourceName(url,d.source);const det=parseDetails([d.title,d.description].filter(Boolean).join(' '));if(!price)price=det.price||'';if(!size)size=det.size||'';if(!reviews)reviews=det.reviews||'';if(!condition)condition=det.condition||'';detailsChecked=Date.now()}catch{}}
  source=source||sourceName(url);title=title||source+' find';
  if(editItemId){const x=b.items.find(i=>i.id===editItemId);if(x){x.url=url;x.title=title;x.image=image;x.tag=tag;x.source=source;x.price=price;x.size=size;x.reviews=reviews;x.condition=condition;x.detailsChecked=detailsChecked||x.detailsChecked||0}}
  else b.items.unshift({id:'item-'+now(),url,title,image,tag,source,price,size,reviews,condition,detailsChecked});
  b.updated=now();persist();$('#saveFind').disabled=false;$('#saveFind').textContent=editItemId?'Save changes':'Add to board';closeModal('findModal');idx=0;filter='all';renderBoard();toast(editItemId?'Find updated':'Added to board')
};
$('#deleteFind').onclick=()=>{const b=current(),x=b?.items.find(i=>i.id===editItemId);if(!x)return;if(!confirm('Remove this find from the board?'))return;b.items=b.items.filter(i=>i.id!==x.id);b.saved=(b.saved||[]).filter(id=>id!==x.id);b.updated=now();persist();closeModal('findModal');idx=0;renderBoard();toast('Find removed')};
