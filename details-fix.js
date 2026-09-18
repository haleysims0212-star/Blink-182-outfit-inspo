let detailAttempted=new Set();
const hydratingBoards=new Set();

async function hydrateBoardDetails(boardId){
  const b=projects.find(p=>p.id===boardId);
  if(!b||hydratingBoards.has(boardId))return;
  hydratingBoards.add(boardId);
  let changed=false;
  try{
    const todo=(b.items||[]).filter(x=>x.url&&(!x.price||!x.image||!x.size||!x.reviews||!x.condition)&&!detailAttempted.has(x.id));
    for(let i=0;i<todo.length;i+=3){
      const batch=todo.slice(i,i+3);
      await Promise.all(batch.map(async x=>{
        detailAttempted.add(x.id);
        x._priceLoading=!x.price;
        try{
          const d=await previewDetails(x.url);
          if(d.image&&!x.image){x.image=d.image;changed=true}
          if(d.title&&(!x.title||/^(Amazon|Vinted|Inspo) (outfit option|find)$/i.test(x.title))){x.title=d.title;changed=true}
          const s=sourceName(x.url,d.source);if(s&&s!==x.source){x.source=s;changed=true}
          for(const k of ['price','size','reviews','condition']){
            if(d[k]&&!x[k]){x[k]=d[k];changed=true}
          }
        }catch(e){}
        x._priceLoading=false;
        x._priceChecked=true;
      }));
      if(currentId===boardId)renderBoard();
    }
    if(changed){b.updated=now();persist()}
  }finally{
    hydratingBoards.delete(boardId);
    if(currentId===boardId)renderBoard();
  }
}

async function hydrateMissing(){
  let changed=false;
  for(const b of projects){
    for(const x of (b.items||[])){
      if(x.url&&!x.image){
        try{
          const d=await preview(x.url);
          if(d.image){x.image=d.image;changed=true}
          if(d.title&&(!x.title||/^(Amazon|Vinted|Inspo) (outfit option|find)$/i.test(x.title))){x.title=d.title;changed=true}
          const s=sourceName(x.url,d.source);if(s&&s!==x.source){x.source=s;changed=true}
        }catch(e){}
      }
    }
  }
  if(changed)persist();
  if(currentId)renderBoard();else renderHome();
}

window.retryBoardDetails=function(boardId){
  detailAttempted=new Set();
  return hydrateBoardDetails(boardId||currentId);
};
