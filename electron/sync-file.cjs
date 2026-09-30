const nacl = require('tweetnacl');
const {stable,validate,merge,countChanges}=require('./replication.cjs');
const LIMIT=64*1024*1024;
const encode=s=>new TextEncoder().encode(s),decode=b=>new TextDecoder().decode(b);
const numbered=['invoices','quotes','receipts','expenses','general_sales'];
function protocol({b64,unb64,random}){
 const digest=value=>b64(nacl.hash(encode(stable(value))));
 const unpack=(text,key,deviceId)=>{
  if(typeof text!=='string'||text.length>LIMIT)throw Error('Arquivo de sincronização demasiado grande (máximo 64 MB).');
  let envelope;try{envelope=JSON.parse(text);}catch{throw Error('Arquivo inválido.');}
  if(envelope.format!=='rest-sync'||envelope.version!==1||envelope.deviceId!==deviceId)throw Error('Arquivo incompatível ou destinado a outro dispositivo.');
  let bytes;try{bytes=nacl.secretbox.open(unb64(envelope.box),unb64(envelope.nonce),unb64(key));}catch{}
  if(!bytes)throw Error('Arquivo danificado ou não autorizado por este emparelhamento.');
  const p=JSON.parse(decode(bytes));
  if(p.deviceId!==deviceId||p.format!=='rest-sync'||p.version!==1||typeof p.id!=='string'||p.id.length>100||!Number.isSafeInteger(p.sequence)||p.sequence<1||!['windows','mobile'].includes(p.source))throw Error('Conteúdo de sincronização inválido.');
  return p;
 };
 const pack=(payload,key)=>{
  const bytes=encode(JSON.stringify(payload));if(bytes.length>48*1024*1024)throw Error('Os dados e anexos excedem o limite de 48 MB por sincronização.');
  const nonce=random(24);return JSON.stringify({format:'rest-sync',version:1,deviceId:payload.deviceId,nonce:b64(nonce),box:b64(nacl.secretbox(bytes,nonce,unb64(key)))});
 };
 return {pack,unpack,digest};
}
function checkSnapshot(data,owner,tables,unb64){
 validate(data,owner,tables);
 const attachments=new Set();
 for(const a of data.attachments){
  if(typeof a.data!=='string'||a.data.length>14*1024*1024||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a.data))throw Error('Anexo inválido: '+a.id);
  const bytes=unb64(a.data);
  if(!bytes.length||bytes.length>10*1024*1024||!['image/jpeg','image/png','image/webp','application/pdf'].includes(a.mime))throw Error('Anexo incompatível: '+a.id);
  attachments.add(a.id);
 }
 for(const [t,rows] of Object.entries(data))for(const row of rows)for(const [field,value] of Object.entries(row)){
  if(typeof value==='string'&&value.startsWith('local:')&&!attachments.has(value.slice(6)))throw Error('Anexo em falta: '+t+' / '+row.id);
  if(field==='receipt_image_url'&&value&&!String(value).startsWith('local:'))throw Error('O comprovativo '+row.id+' não está guardado localmente. Guarde-o na aplicação antes de exportar.');
 }
}
function validateNumbers(base,incoming,current,limits){
 for(const t of numbered){
  const old=new Map(current[t].map(r=>[r.id,r])),before=new Map(base[t].map(r=>[r.id,r]));
  for(const row of incoming[t]){
   const previous=old.get(row.id)||before.get(row.id);
   if(previous&&previous.seq_number!==row.seq_number)throw Error('Não pode alterar a numeração de documentos existentes.');
   if(!previous&&(!Number.isSafeInteger(row.seq_number)||row.seq_number<limits[t]?.start||row.seq_number>limits[t]?.end||!limits[t]))throw Error('Numeração fora do intervalo autorizado.');
  }
 }
}
function preview(base,incoming,current){
 try{
  const merged=merge(base,incoming,current);
  return {merged,changes:countChanges(current,merged),conflicts:[]};
 }catch(e){if(!e.conflicts)throw e;return {conflicts:e.conflicts.map(c=>({...c,label:(current[c.table].find(r=>r.id===c.id)||incoming[c.table].find(r=>r.id===c.id)||{}).name||c.id})),changes:0};}
}
module.exports={protocol,checkSnapshot,validateNumbers,preview,numbered,LIMIT};
