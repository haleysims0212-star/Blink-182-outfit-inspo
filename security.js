function safeHttpUrl(value=''){
  try{
    const u=new URL(String(value||'').trim());
    return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';
  }catch{return''}
}
function safeImageUrl(value=''){return safeHttpUrl(value)}
