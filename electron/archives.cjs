const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {DatabaseSync}=require('node:sqlite');
const {tables}=require('./schema.cjs');
const {snapshot,replace,stable}=require('./replication.cjs');
const {protocol,checkSnapshot,validateNumbers,preview}=require('./sync-file.cjs');
const b64=x=>Buffer.from(x).toString('base64'),unb64=x=>Buffer.from(x,'base64');
const codec=protocol({b64,unb64,random:crypto.randomBytes});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const ROOT_LIMIT=512*1024*1024;
function ensure(db){db.exec('CREATE TABLE IF NOT EXISTS file_sync_state(user_id TEXT NOT NULL,device_id TEXT NOT NULL,state TEXT NOT NULL,PRIMARY KEY(user_id,device_id))');}
function getState(service,id){ensure(service.db);const r=service.db.prepare('SELECT state FROM file_sync_state WHERE user_id=? AND device_id=?').get(service.owner(),id);return r?JSON.parse(r.state):{sent:0,lastIncoming:0,received:[]};}
function putState(service,id,state){service.db.prepare('INSERT INTO file_sync_state VALUES(?,?,?) ON CONFLICT(user_id,device_id) DO UPDATE SET state=excluded.state').run(service.owner(),id,JSON.stringify(state));}
function read(service){return snapshot(service.db,service.owner(),tables,b64);}
function safety(service,label){const dir=path.join(service.root,'backups');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,label+'-'+Date.now()+'-'+crypto.randomUUID()+'.restbackup');service.db.prepare('VACUUM INTO ?').run(file);return file;}
function grantFor(service,grant){if(!grant||grant.userId!==service.owner()||unb64(grant.key||'').length!==32)throw Error('Celular não autorizado para esta conta.');}
function incoming(service,args){
 grantFor(service,args.grant);
 const packet=codec.unpack(args.text,args.grant.key,args.deviceId);
 if(packet.source!=='mobile'||packet.ownerId!==service.owner())throw Error('Seleccione um arquivo enviado pelo celular desta conta.');
 checkSnapshot(packet.base,service.owner(),tables,unb64);checkSnapshot(packet.data,service.owner(),tables,unb64);
 const state=getState(service,args.deviceId);
 const already=state.received.includes(packet.id);
 if(!already&&packet.sequence<=state.lastIncoming)throw Error('Arquivo antigo. Exporte uma nova atualização do celular.');
 const current=read(service);
 validateNumbers(packet.base,packet.data,current,args.grant.limits);
 const result=already?{changes:0,conflicts:[],merged:current}:preview(packet.base,packet.data,current);
 return {packet,state,current,already,...result};
}
function readRoot(source,password){
 if(typeof password!=='string'||password.length<8)throw Error('Introduza a senha do backup (mínimo 8 caracteres).');
 if(fs.statSync(source).size>ROOT_LIMIT)throw Error('Backup demasiado grande (máximo 512 MB).');
 const archiveBytes=fs.readFileSync(source);
 let e;try{e=JSON.parse(archiveBytes.toString('utf8'));}catch{throw Error('Backup root inválido.');}
 if(e.format!=='rest-root'||e.version!==1||e.kdf!=='scrypt-32768'||e.cipher!=='aes-256-gcm')throw Error('Formato de backup root incompatível.');
 let payload;
 try{
  const salt=unb64(e.salt),iv=unb64(e.iv),tag=unb64(e.tag);
  if(salt.length!==16||iv.length!==12||tag.length!==16)throw Error();
  const key=crypto.scryptSync(password,salt,32,{N:32768,maxmem:64*1024*1024});
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(Buffer.from('rest-root-v1'));decipher.setAuthTag(tag);
  const compressed=Buffer.concat([decipher.update(unb64(e.data)),decipher.final()]);
  payload=JSON.parse(zlib.gunzipSync(compressed,{maxOutputLength:ROOT_LIMIT}).toString('utf8'));
 }catch{throw Error('Senha incorrecta ou backup danificado. Nenhum dado foi alterado.');}
 if(payload.format!=='rest-root-data'||payload.schema!==1||typeof payload.database!=='string'||hash(unb64(payload.database))!==payload.sha256)throw Error('Conteúdo do backup inválido.');
 return {payload,digest:hash(archiveBytes)};
}
module.exports=function(Service){
 Service.prototype.fileLive=function(deviceId,mobileSequence=0,lastPcRevision=0){
  const state=getState(this,deviceId);state.sent=Math.max(state.sent,Number.isSafeInteger(lastPcRevision)?lastPcRevision:0)+1;
  state.lastIncoming=Math.max(state.lastIncoming,Number.isSafeInteger(mobileSequence)?mobileSequence:0);
  state.ackBase=null;state.ackFor=null;putState(this,deviceId,state);return state.sent;
 };
 Service.prototype.syncFileExport=function(deviceId,grant){
  grantFor(this,grant);const data=read(this);checkSnapshot(data,this.owner(),tables,unb64);
  return this.tx(()=>{
   const state=getState(this,deviceId);state.sent++;
   const payload={format:'rest-sync',version:1,id:crypto.randomUUID(),deviceId,ownerId:this.owner(),source:'windows',sequence:state.sent,createdAt:new Date().toISOString(),data,ackBase:state.ackBase||null,ackFor:state.ackFor||null};
   const text=codec.pack(payload,grant.key);putState(this,deviceId,state);
   return {text,id:payload.id,attachments:data.attachments.length};
  });
 };
 Service.prototype.syncFilePreview=function(args){
  const r=incoming(this,args);
  return {digest:hash(args.text),changes:r.changes,attachments:r.packet.data.attachments.length,conflicts:r.conflicts,already:r.already};
 };
 Service.prototype.syncFileImport=function(args){
  if(hash(args.text)!==args.expected)throw Error('O arquivo foi alterado. Repita a importação.');
  const r=incoming(this,args);
  if(r.conflicts.length)throw Error('Existem '+r.conflicts.length+' conflitos. Nenhum dado foi alterado.');
  if(r.already)return {already:true};
  const backup=safety(this,'before-file-sync');
  return this.tx(()=>{
   // Re-evaluate against the latest database state inside the write lock.
   const live=incoming(this,args);if(live.conflicts.length)throw Error('Os dados mudaram e existem conflitos. Repita a importação.');
   for(const t of Object.keys(tables))for(const row of live.merged[t])this.prepare(t,row,true);
   checkSnapshot(live.merged,this.owner(),tables,unb64);
   replace(this.db,this.owner(),tables,live.merged,unb64);
   live.state.lastIncoming=live.packet.sequence;
   live.state.sent=Math.max(live.state.sent,Number.isSafeInteger(live.packet.seenPc)?live.packet.seenPc:0);
   live.state.received=[...live.state.received,live.packet.id].slice(-100);
   live.state.ackBase=live.packet.data;live.state.ackFor=live.packet.id;
   putState(this,args.deviceId,live.state);
   return {imported:true,changes:live.changes,safetyBackup:backup};
  });
 };
 Service.prototype.rootExport=function(destination,password,extras={},accountPassword){
  this.verifyRootPassword(accountPassword);if(typeof password!=='string'||password.length<8)throw Error('Use uma senha de pelo menos 8 caracteres para proteger o backup.');
  const stage=path.join(this.root,'root-export-'+crypto.randomUUID()+'.sqlite');
  try{
   this.db.prepare('VACUUM INTO ?').run(stage);const bytes=fs.readFileSync(stage);
   if(bytes.length>256*1024*1024)throw Error('A instalação excede o limite de 256 MB deste formato.');
   const payload={format:'rest-root-data',schema:1,appVersion:require('../package.json').version,createdAt:new Date().toISOString(),sha256:hash(bytes),database:b64(bytes),extras};
   const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=crypto.scryptSync(password,salt,32,{N:32768,maxmem:64*1024*1024});
   const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('rest-root-v1'));
   const encrypted=Buffer.concat([cipher.update(zlib.gzipSync(Buffer.from(JSON.stringify(payload)))),cipher.final()]);
   fs.writeFileSync(destination,JSON.stringify({format:'rest-root',version:1,kdf:'scrypt-32768',cipher:'aes-256-gcm',salt:b64(salt),iv:b64(iv),tag:b64(cipher.getAuthTag()),data:b64(encrypted)}),{flag:'wx'});
   return {path:destination};
  }finally{if(fs.existsSync(stage))fs.unlinkSync(stage);}
 };
 Service.prototype.rootAccess=function(){
  const empty=!this.db.prepare("SELECT id FROM users LIMIT 1").get();if(!empty)this.owner();return {empty};
 };
 Service.prototype.rootPreview=function(source,password,accountPassword){
  if(!this.rootAccess().empty)this.verifyRootPassword(accountPassword);const {payload,digest}=readRoot(source,password);
  const temp=path.join(this.root,'root-check-'+crypto.randomUUID()+'.sqlite');let db;
  try{
   fs.writeFileSync(temp,unb64(payload.database),{flag:'wx'});db=new DatabaseSync(temp,{readOnly:true});
   if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Base de dados do backup inválida.');
   const users=db.prepare('SELECT id FROM users').all();
   const grants=payload.extras?.grants||{};
   for(const [id,g] of Object.entries(grants))if(!/^[a-f0-9-]{36}$/.test(id)||!users.some(u=>u.id===g.userId)||unb64(g.key||'').length!==32)throw Error('Emparelhamentos inválidos no backup.');
   return {digest,createdAt:payload.createdAt,accounts:users.length,attachments:db.prepare('SELECT count(*) n FROM attachments').get().n,extras:payload.extras||{}};
  }finally{db?.close();if(fs.existsSync(temp))fs.unlinkSync(temp);}
 };
 Service.prototype.rootRestore=function(source,password,expected,accountPassword){
  const p=this.rootPreview(source,password,accountPassword);if(p.digest!==expected)throw Error('O backup foi alterado. Repita a importação.');
  const {payload,digest}=readRoot(source,password);if(digest!==expected)throw Error('O backup foi alterado. Repita a importação.');const temp=path.join(this.root,'root-restore-'+crypto.randomUUID()+'.sqlite');
  try{fs.writeFileSync(temp,unb64(payload.database),{flag:'wx'});return this.restore(temp,true,accountPassword);}
  finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
 };
};
