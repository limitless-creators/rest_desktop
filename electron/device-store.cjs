const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const active=new Map();
const validId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
function createStore({root,protect,unprotect,now=()=>Date.now()}){
 const file=path.join(root,'mobile-devices.enc'),history=path.join(root,'mobile-history.enc');
 const read=(p,fallback)=>fs.existsSync(p)?JSON.parse(unprotect(fs.readFileSync(p))):fallback;
 const write=(p,value)=>{const tmp=p+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(tmp,protect(JSON.stringify(value)),{flag:'wx'});fs.renameSync(tmp,p);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}};
 const grants=()=>read(file,{});
 const audit=()=>read(history,{version:1,devices:{}});
 const key=(user,id)=>root+'|'+user+'|'+id;
 function event(user,id,type,options={}){
  if(!validId(id))throw Error('Identidade inválida.');
  const h=audit();h.devices[user]??={};
  const row=h.devices[user][id]??={id,name:options.name||'Celular',firstSeen:new Date(now()).toISOString(),events:[]};
  if(options.limits)row.limits=options.limits;
  if(options.name)row.name=String(options.name).slice(0,60);
  const at=new Date(now()).toISOString();
  if(options.network)row.lastContact=at;
  if(options.sync){row.lastSync=at;row.lastSyncVia=options.via||'hotspot';}
  if(options.status)row.status=options.status;
  if(options.address)row.address=String(options.address).slice(0,64);
  if(type!=='ping')row.events=[{id:randomUUID(),at,type,via:options.via||'hotspot',changes:options.changes??null},...(row.events||[])].slice(0,100);
  write(history,h);
 }
 function list(user,{running=false,since=0}={}){
  const h=audit().devices[user]||{},g=grants(),ids=new Set([...Object.keys(h),...Object.keys(g).filter(id=>g[id].userId===user)]);
  return [...ids].map(id=>{
   const row=h[id]||{},grant=g[id]?.userId===user?g[id]:null;
   const inFlight=active.has(key(user,id));
   const recent=running&&Date.parse(row.lastContact)>=since&&now()-Date.parse(row.lastContact)<60000;
   return {id,name:grant?.name||row.name||'Celular '+id.slice(0,6),authorized:!!grant,status:grant?'authorized':row.status||'removed',firstSeen:row.firstSeen||grant?.created||null,lastContact:row.lastContact||null,lastSync:row.lastSync||null,lastSyncVia:row.lastSyncVia||null,address:row.address||null,events:row.events||[],connection:inFlight?'active':recent?'recent':'unknown'};
  }).sort((a,b)=>Number(b.authorized)-Number(a.authorized)||(b.lastContact||b.firstSeen||'').localeCompare(a.lastContact||a.firstSeen||''));
 }
 function rename(user,id,name){
  if(typeof name!=='string'||!name.trim()||name.trim().length>60)throw Error('Use um nome de 1 a 60 caracteres.');
  const rows=list(user);if(!rows.some(x=>x.id===id))throw Error('Celular não encontrado nesta conta.');
  const g=grants();if(g[id]?.userId===user){g[id].name=name.trim();write(file,g);}
  event(user,id,'renamed',{name:name.trim(),via:'windows'});
 }
 function remove(user,id){
  if(active.has(key(user,id)))throw Error('Aguarde que a comunicação termine antes de remover o celular.');
  const row=list(user).find(x=>x.id===id);if(!row)throw Error('Celular não encontrado nesta conta.');
  const g=grants(),rowLimits=g[id]?.userId===user?g[id].limits:undefined;if(g[id]?.userId===user){delete g[id];write(file,g);}
  event(user,id,'removed',{name:row.name,limits:rowLimits,status:'removed',via:'windows'});
 }
 return {event,list,rename,remove,grants,audit,
  begin:(user,id)=>active.set(key(user,id),true),
  end:(user,id)=>active.delete(key(user,id)),
  clearActive:user=>{for(const k of active.keys())if(k.startsWith(root+'|'+user+'|'))active.delete(k);}
 };
}
function nativeStore(root){const {safeStorage}=require('electron');if(!safeStorage.isEncryptionAvailable())throw Error('A proteção local de chaves não está disponível.');return createStore({root,protect:s=>safeStorage.encryptString(s),unprotect:b=>safeStorage.decryptString(b)});}
module.exports={createStore,nativeStore};
