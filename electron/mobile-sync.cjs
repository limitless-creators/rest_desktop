
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {randomBytes,randomUUID}=require('node:crypto');
const nacl=require('tweetnacl');
const {Service}=require('./service.cjs');
const {tables}=require('./schema.cjs');
const {snapshot,validate,merge,replace,stable}=require('./replication.cjs');
const b64=b=>Buffer.from(b).toString('base64'),unb64=s=>new Uint8Array(Buffer.from(s,'base64'));
const numbered=['invoices','quotes','receipts','expenses','general_sales'];
async function startMobileSync({root,host,user,protect,unprotect,approve,authorize,onChange=()=>{}}){
 const service=new Service(root);service.user={id:user.id,email:user.email};
 const filename=path.join(root,'mobile-devices.enc');
 let grants={};
 if(fs.existsSync(filename))grants=JSON.parse(unprotect(fs.readFileSync(filename)));
 const save=()=>{const tmp=filename+'.tmp';fs.writeFileSync(tmp,protect(JSON.stringify(grants)));fs.renameSync(tmp,filename);};
 let invite={id:randomUUID(),key:b64(randomBytes(32)),expires:Date.now()+10*60*1000};
 const read=()=>snapshot(service.db,user.id,tables,b64);
 let busy=false;
 const server=http.createServer(async(req,res)=>{
  const answer=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  if(req.method!=='POST'||!['/pair','/sync','/ping'].includes(req.url)){answer(404,{});return;}
  let raw='',envelope,key,nonce;
  try{
   for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>64*1024*1024)throw Error('Dados demasiado grandes.');}
   envelope=JSON.parse(raw);
   grants=fs.existsSync(filename)?JSON.parse(unprotect(fs.readFileSync(filename))):{};
   if(typeof envelope.id!=='string'||typeof envelope.nonce!=='string'||typeof envelope.box!=='string')throw Error('Pedido inválido.');
   if(req.url==='/pair'){
    if(envelope.id!==invite.id||invite.expires<Date.now())throw Error('Convite expirado.');
    key=invite.key;
   }else{
    const grant=grants[envelope.id];
    if(!grant||grant.userId!==user.id)throw Error('Dispositivo não autorizado.');
    key=grant.key;
   }
   nonce=unb64(envelope.nonce);
   const opened=nacl.secretbox.open(unb64(envelope.box),nonce,unb64(key));
   if(!opened)throw Error('Autenticação inválida.');
   if(!await authorize(user.id))throw Error('Abra a conta autorizada no REST Desktop.');
   const payload=JSON.parse(Buffer.from(opened).toString('utf8'));
   if(busy)throw Error('Outra sincronização está em curso. Tente novamente.');
   busy=true;
   let result;
   try{
    if(req.url==='/pair'){
     if(envelope.id!==invite.id||invite.expires<Date.now())throw Error('Convite expirado.');
     if(typeof payload.deviceId!=='string'||!/^[a-f0-9-]{36}$/.test(payload.deviceId))throw Error('Identidade inválida.');
     const approved=await approve('Autorizar este celular a aceder e alterar os dados desta conta?');
     if(!approved)throw Error('Emparelhamento recusado no PC.');
     grants=fs.existsSync(filename)?JSON.parse(unprotect(fs.readFileSync(filename))):{};
     if(!await authorize(user.id))throw Error('A conta no PC mudou. Gere um novo QR.');
     const limits=service.tx(()=>{
      const limits={};
      for(const t of numbered){
       const current=service.db.prepare('SELECT value FROM counters WHERE user_id=? AND kind=?').get(user.id,t)?.value||0;
       limits[t]={start:current+1,end:current+1000};
       service.db.prepare('INSERT INTO counters VALUES(?,?,?) ON CONFLICT(user_id,kind) DO UPDATE SET value=excluded.value').run(user.id,t,current+1000);
      }
      return limits;
     });
     const grant={name:typeof approved==='string'?approved.trim().slice(0,60):(grants[payload.deviceId]?.name||'Celular '+(Object.keys(grants).length+1)),userId:user.id,key:b64(randomBytes(32)),limits,created:new Date().toISOString()};
     grants[payload.deviceId]=grant;save();invite.expires=0;
     result={fileRevision:service.fileLive(payload.deviceId),key:grant.key,user:{id:user.id,name:user.user_metadata?.name||'REST Local'},limits,snapshot:read()};
    }else if(req.url==='/ping')result={ok:true};
    else{
     validate(payload.base,user.id,tables);validate(payload.local,user.id,tables);
     const grant=grants[envelope.id];
     for(const t of numbered){
      const baseIds=new Set(payload.base[t].map(r=>r.id));
      for(const r of payload.local[t]){
       if(!baseIds.has(r.id)&&(!Number.isSafeInteger(r.seq_number)||r.seq_number<grant.limits[t].start||r.seq_number>grant.limits[t].end))throw Error('Numeração fora do intervalo autorizado.');
      }
     }
     result=service.tx(()=>{
      const remote=read(),merged=merge(payload.base,payload.local,remote);
      for(const t of numbered){
       const existing=new Map(remote[t].map(r=>[r.id,r]));
       for(const row of merged[t]){
        const previous=existing.get(row.id);
        if(previous&&previous.seq_number!==row.seq_number)throw Error('Não pode alterar a numeração de documentos existentes.');
        if(!previous&&(!Number.isSafeInteger(row.seq_number)||row.seq_number<grant.limits[t].start||row.seq_number>grant.limits[t].end))throw Error('Numeração fora do intervalo autorizado.');
       }
      }
      for(const t of Object.keys(tables))for(const row of merged[t])service.prepare(t,row,true);
      if(stable(remote)!==stable(merged))replace(service.db,user.id,tables,merged,s=>Buffer.from(s,'base64'));
      return {snapshot:read(),fileRevision:service.fileLive(envelope.id,payload.fileSequence,payload.lastPcRevision),changed:stable(remote)!==stable(merged)};
     });
    }
   }finally{busy=false;}
   if(result?.changed){try{onChange();}catch{}}
   const responseNonce=randomBytes(24);
   answer(200,{nonce:b64(responseNonce),box:b64(nacl.secretbox(Buffer.from(JSON.stringify({...result,requestNonce:envelope.nonce})),responseNonce,unb64(key)))});
  }catch(e){
   if(key&&nonce){
    const responseNonce=randomBytes(24);
    answer(200,{nonce:b64(responseNonce),box:b64(nacl.secretbox(Buffer.from(JSON.stringify({error:e.message,requestNonce:envelope.nonce})),responseNonce,unb64(key)))});
   }else answer(403,{error:'Ligação não autorizada.'});
  }
 });
 server.requestTimeout=120000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,host,resolve);});
 return {
  invitation:()=>{invite={id:randomUUID(),key:b64(randomBytes(32)),expires:Date.now()+10*60*1000};return {type:'rest-local-pairing',version:1,endpoint:'http://'+host+':'+server.address().port+'/',invite:invite.id,key:invite.key,expires:invite.expires};},
  close:()=>new Promise(resolve=>{server.close(()=>{service.close();resolve();});server.closeAllConnections();}),
  revoke:()=>{grants={};save();}
 };
}
module.exports={startMobileSync};
