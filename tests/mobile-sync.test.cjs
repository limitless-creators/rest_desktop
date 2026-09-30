
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const nacl=require('tweetnacl');
const {Service}=require('../electron/service.cjs');
const {tables}=require('../electron/schema.cjs');
const {startMobileSync}=require('../electron/mobile-sync.cjs');
const {snapshot,replace,stable}=require('../electron/replication.cjs');
const {LocalService}=require('../../rest_mobile_offline/mobile_app/lib/local-core.cjs');
const b64=x=>Buffer.from(x).toString('base64');
async function request(endpoint,id,key,payload,route='sync'){
 const nonce=randomBytes(24);
 const r=await fetch(endpoint+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,nonce:b64(nonce),box:b64(nacl.secretbox(Buffer.from(JSON.stringify(payload)),nonce,Buffer.from(key,'base64')))})});
 if(r.status!==200)return {http:r.status};
 const envelope=await r.json();
 const bytes=nacl.secretbox.open(Buffer.from(envelope.box,'base64'),Buffer.from(envelope.nonce,'base64'),Buffer.from(key,'base64'));
 assert.ok(bytes,'response must be authenticated');
 const result=JSON.parse(Buffer.from(bytes).toString());
 assert.equal(result.requestNonce,b64(nonce));
 return result;
}
async function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rest-sync-'));
 const s=new Service(root);
 s.auth('signUp',{email:'sync@test.local',password:'password123',options:{data:{name:'Teste'}}});
 s.auth('signInWithPassword',{email:'sync@test.local',password:'password123'});
 const user=s.auth('getUser').user;
 let approved=true,authorized=true,approvals=0;
 const opts={root,host:'127.0.0.1',user,protect:x=>Buffer.from(x),unprotect:x=>x.toString(),approve:async()=>{approvals++;return approved;},authorize:async()=>authorized};
 let server=await startMobileSync(opts);
 const servers=[server],phones=[];
 t.after(async()=>{for(const x of servers)await x.close();for(const x of phones)x.close();s.close();fs.rmSync(root,{recursive:true,force:true});});
 async function pair(){
 const qr=server.invitation(),id=randomUUID();
 const p=await request(qr.endpoint,qr.invite,qr.key,{deviceId:id,name:'Android'},'pair');
 if(p.error)return {p,qr,id};
 const db=new DatabaseSync(':memory:');phones.push(db);
 const mobile=new LocalService(db,p.user,randomUUID,()=>{});
 db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(user.id,'mobile@test.local','Mobile','paired','paired',new Date().toISOString());
 mobile.tx(()=>{
 replace(db,user.id,tables,p.snapshot,x=>Buffer.from(x,'base64'));
 for(const [kind,range] of Object.entries(p.limits))db.prepare('INSERT INTO counters VALUES(?,?,?)').run(user.id,kind,range.start-1);
 });
 let base=p.snapshot;
 return {qr,id,p,mobile,db,
 local:()=>snapshot(db,user.id,tables,b64),
 sync:async()=>request(qr.endpoint,id,p.key,{base,local:snapshot(db,user.id,tables,b64)}),
 accept:r=>{assert.equal(r.error,undefined);mobile.tx(()=>replace(db,user.id,tables,r.snapshot,x=>Buffer.from(x,'base64')));base=r.snapshot;},
 base:()=>base
 };
 }
 return {s,user,pair,server,opts,servers,
 setApproved:v=>approved=v,setAuthorized:v=>authorized=v,approvals:()=>approvals,
 restart:async()=>{await server.close();servers.splice(servers.indexOf(server),1);server=await startMobileSync(opts);servers.push(server);return server;},
 read:()=>snapshot(s.db,user.id,tables,b64)};
}
const insert=(s,table,payload)=>s.query({table,action:'insert',payload,single:'required'}).data;
test('QR authorizes explicitly, downloads data, reserves numbers and is single-use',async t=>{
 const f=await fixture(t);
 insert(f.s,'contacts',{name:'PC'});
 const m=await f.pair();
 assert.equal(m.local().contacts[0].name,'PC');assert.equal(f.approvals(),1);
 assert.equal(m.p.limits.invoices.start,1);assert.equal(m.p.limits.invoices.end,1000);
 const replay=await request(m.qr.endpoint,m.qr.invite,m.qr.key,{deviceId:randomUUID()},'pair');
 assert.equal(replay.http,403);
 const second=await f.pair();assert.equal(second.p.limits.invoices.start,1001);
});
test('refused pairing and logged-out desktop cannot authorize mobile',async t=>{
 const f=await fixture(t);f.setApproved(false);
 assert.match((await f.pair()).p.error,/recusado/);
 f.setApproved(true);const m=await f.pair();f.setAuthorized(false);
 assert.match((await m.sync()).error,/conta autorizada/);
});
test('bidirectional offline writes using actual mobile core; safe retry and deletion',async t=>{
 const f=await fixture(t);const m=await f.pair();
 insert(f.s,'contacts',{name:'Criado no PC'});
 const mobileContact=insert(m.mobile,'contacts',{name:'Criado no Android'});
 const r=await m.sync();assert.equal(r.error,undefined);assert.equal(r.snapshot.contacts.length,2);
 const retry=await m.sync();assert.equal(retry.error,undefined);assert.equal(f.read().contacts.length,2);
 m.accept(retry);
 m.mobile.query({table:'contacts',action:'delete',filters:[{column:'id',op:'eq',value:mobileContact.id}]});
 m.accept(await m.sync());assert.equal(f.read().contacts.length,1);
});
test('same row edited on both sides rejects all writes and preserves both versions',async t=>{
 const f=await fixture(t);const c=insert(f.s,'contacts',{name:'Original'});
 const m=await f.pair();
 f.s.query({table:'contacts',action:'update',payload:{name:'PC'},filters:[{column:'id',op:'eq',value:c.id}]});
 m.mobile.query({table:'contacts',action:'update',payload:{name:'Mobile'},filters:[{column:'id',op:'eq',value:c.id}]});
 insert(m.mobile,'contacts',{name:'Outra alteração'});
 const r=await m.sync();assert.match(r.error,/incompat/);
 assert.equal(f.read().contacts.length,1);assert.equal(f.read().contacts[0].name,'PC');
 assert.equal(m.local().contacts.find(x=>x.id===c.id).name,'Mobile');
});
test('mobile paid invoice synchronizes items, stock, attachment and client without duplicate deduction',async t=>{
 const f=await fixture(t);
 insert(f.s,'stock_items',{name:'Artigo',sku:'A',stock_level:10,max_stock:20,price:2,sale_price:3});
 const m=await f.pair();
 m.mobile.rpc('rest_save_document',{p_request_id:randomUUID(),p_kind:'invoice',p_document:{client:'Cliente',status:'Paid'},p_items:[{description:'Artigo',quantity:2,unitPrice:3}]});
 const bytes=Buffer.from('%PDF-1.4 test');
 m.db.prepare('INSERT INTO attachments VALUES(?,?,?,?,?)').run(randomUUID(),f.user.id,'application/pdf',bytes,new Date().toISOString());
 const r=await m.sync();assert.equal(r.error,undefined);assert.equal(r.snapshot.invoices[0].seq_number,1);
 assert.equal(Number(f.read().stock_items[0].stock_level),8);
 assert.equal(Buffer.from(f.read().attachments[0].data,'base64').toString(),bytes.toString());
 assert.equal((await m.sync()).error,undefined);assert.equal(Number(f.read().stock_items[0].stock_level),8);
 const inv=f.s.rpc('rest_save_document',{p_request_id:randomUUID(),p_kind:'invoice',p_document:{client:'PC',status:'Pending'},p_items:[{description:'Serviço',quantity:1,unitPrice:5}]}).data;
 assert.equal(inv.seq_number,1001);
});
test('company settings JSON survive synchronization',async t=>{
 const f=await fixture(t);
 f.s.query({table:'company_settings',action:'upsert',payload:{company_name:'Empresa',bank_accounts:[{bank:'BCI',iban:'123'}],setup_complete:true}});
 const m=await f.pair();insert(m.mobile,'contacts',{name:'Novo'});
 const r=await m.sync();assert.equal(r.error,undefined);
 assert.equal(JSON.parse(f.read().company_settings[0].bank_accounts)[0].bank,'BCI');
});
test('invalid relations roll back the whole incoming snapshot',async t=>{
 const f=await fixture(t);const m=await f.pair(),incoming=m.local();
 incoming.invoice_items.push({id:randomUUID(),user_id:f.user.id,invoice_id:randomUUID(),description:'Invalid',quantity:'1',unit_price:'1',sort_order:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
 const before=stable(f.read());
 const r=await request(m.qr.endpoint,m.id,m.p.key,{base:m.base(),local:incoming});
 assert.ok(r.error);assert.equal(stable(f.read()),before);
});
test('cross-account rows, unknown devices, tampering and malformed nonces cannot mutate data',async t=>{
 const f=await fixture(t);const m=await f.pair();insert(m.mobile,'contacts',{name:'Local'});
 const incoming=m.local();incoming.contacts[0].user_id=randomUUID();
 assert.match((await request(m.qr.endpoint,m.id,m.p.key,{base:m.base(),local:incoming})).error,/inválido/);
 assert.equal((await request(m.qr.endpoint,randomUUID(),m.p.key,{})).http,403);
 const r=await fetch(m.qr.endpoint+'sync',{method:'POST',body:JSON.stringify({id:m.id,nonce:'a',box:'bad'})});
 assert.ok([200,403].includes(r.status));
 assert.equal((await request(m.qr.endpoint,m.id,m.p.key,{},'ping')).ok,true);
 assert.equal(f.read().contacts.length,0);
});
test('authorized device persists across service restart and can be revoked',async t=>{
 const f=await fixture(t);const m=await f.pair();
 const server=await f.restart(),qr=server.invitation();
 assert.equal((await request(qr.endpoint,m.id,m.p.key,{},'ping')).ok,true);
 server.revoke();
 assert.equal((await request(qr.endpoint,m.id,m.p.key,{},'ping')).http,403);
});

test('device names survive rename while server is running and a later pairing',async t=>{
 const f=await fixture(t);f.setApproved('Celular da loja');const a=await f.pair();
 const file=path.join(f.opts.root,'mobile-devices.enc');let grants=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(grants[a.id].name,'Celular da loja');
 grants[a.id].name='Celular de vendas';fs.writeFileSync(file,JSON.stringify(grants));
 f.setApproved('Celular do gerente');const b=await f.pair();grants=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(grants[a.id].name,'Celular de vendas');assert.equal(grants[b.id].name,'Celular do gerente');assert.equal((await a.sync()).error,undefined);
 await f.restart();assert.equal((JSON.parse(fs.readFileSync(file,'utf8')))[a.id].name,'Celular de vendas');
});

test('manager records pairing, sync and failures, and individual removal denies old keys',async t=>{
 const f=await fixture(t),store=require('../electron/device-store.cjs').createStore(f.opts);
 f.setApproved('Celular da caixa');const m=await f.pair();
 let row=store.list(f.user.id,{running:true})[0];assert.equal(row.name,'Celular da caixa');assert.ok(row.lastSync);assert.equal(row.events[0].type,'paired');
 const other=await f.pair();insert(m.mobile,'contacts',{name:'From mobile'});
 assert.equal((await m.sync()).error,undefined);
 row=store.list(f.user.id).find(x=>x.id===m.id);assert.equal(row.events[0].type,'sync');
 const invalid=m.local();invalid.contacts[0].user_id=randomUUID();
 assert.ok((await request(m.qr.endpoint,m.id,m.p.key,{base:m.base(),local:invalid})).error);
 assert.equal(store.list(f.user.id).find(x=>x.id===m.id).events[0].type,'error');
 store.remove(f.user.id,m.id);assert.equal((await request(m.qr.endpoint,m.id,m.p.key,{},'ping')).http,403);
 assert.equal((await request(other.qr.endpoint,other.id,other.p.key,{},'ping')).ok,true);
 f.setApproved(false);const refused=await f.pair();assert.ok(store.list(f.user.id).some(x=>x.id===refused.id&&x.status==='refused'));
});

const {prepareReauthorization}=require('../../rest_mobile_offline/mobile_app/lib/reconnect-core.cjs');
async function reconnect(f,m,overrides={}){
 const qr=f.server.invitation(),binding={user:f.user,deviceId:m.id,limits:m.p.limits};
 return prepareReauthorization({qr,binding,state:{outgoing:3,lastPc:4}},payload=>request(qr.endpoint,qr.invite,qr.key,{...payload,...overrides},'pair'));
}
test('removed phone reauthorizes preserving pending documents, numbering and attachments',async t=>{
 const f=await fixture(t),m=await f.pair(),store=require('../electron/device-store.cjs').createStore(f.opts);
 insert(m.mobile,'contacts',{name:'Pending mobile'});
 m.mobile.rpc('rest_save_document',{p_request_id:randomUUID(),p_kind:'invoice',p_document:{client:'Offline',status:'Pending'},p_items:[{description:'Service',quantity:1,unitPrice:25}]});
 const bytes=Buffer.from('%PDF pending');m.db.prepare('INSERT INTO attachments VALUES(?,?,?,?,?)').run(randomUUID(),f.user.id,'application/pdf',bytes,new Date().toISOString());
 const before=stable(m.local()),base=stable(m.base()),number=m.local().invoices[0].seq_number;
 insert(f.s,'contacts',{name:'PC contact'});const pcBefore=stable(f.read());
 store.remove(f.user.id,m.id);assert.equal((await request(m.qr.endpoint,m.id,m.p.key,{},'ping')).http,403);
 const restored=await reconnect(f,m);
 assert.notEqual(restored.credentials.key,m.p.key);assert.equal(stable(m.local()),before);assert.equal(stable(m.base()),base);assert.equal(stable(f.read()),pcBefore);
 assert.equal(store.list(f.user.id).find(x=>x.id===m.id).events[0].type,'reauthorized');
 const payload={base:m.base(),local:m.local(),fileSequence:3,lastPcRevision:restored.fileRevision};
 const result=await request(m.qr.endpoint,m.id,restored.credentials.key,payload);assert.equal(result.error,undefined);m.accept(result);
 assert.equal(m.local().contacts.length,2);assert.equal(m.local().invoices[0].seq_number,number);assert.equal(Buffer.from(m.local().attachments[0].data,'base64').toString(),bytes.toString());
 assert.equal((await request(m.qr.endpoint,m.id,restored.credentials.key,payload)).error,undefined);assert.equal(f.read().invoices.length,1);
});
test('refused reauthorization and wrong account leave local data and grants unchanged',async t=>{
 const f=await fixture(t),m=await f.pair(),store=require('../electron/device-store.cjs').createStore(f.opts);
 insert(m.mobile,'contacts',{name:'Keep'});store.remove(f.user.id,m.id);const before=stable(m.local());
 f.setApproved(false);await assert.rejects(reconnect(f,m),/recusado/);assert.equal(store.grants()[m.id],undefined);
 f.setApproved(true);const count=f.approvals();await assert.rejects(reconnect(f,m,{ownerId:randomUUID()}),/outra conta/);assert.equal(f.approvals(),count);
 assert.equal(stable(m.local()),before);assert.equal(store.grants()[m.id],undefined);
});
test('reauthorization validates ranges and recovers Windows 1.3.0 removed history',async t=>{
 const f=await fixture(t),m=await f.pair(),store=require('../electron/device-store.cjs').createStore(f.opts);
 store.remove(f.user.id,m.id);const bad=structuredClone(m.p.limits);bad.invoices.end++;
 await assert.rejects(reconnect(f,m,{limits:bad}),/numeração/);
 const file=path.join(f.opts.root,'mobile-history.enc'),history=JSON.parse(fs.readFileSync(file,'utf8'));delete history.devices[f.user.id][m.id].limits;fs.writeFileSync(file,JSON.stringify(history));
 const other=await f.pair();await assert.rejects(reconnect(f,m,{limits:other.p.limits}),/outro celular/);
 assert.ok((await reconnect(f,m)).credentials.key);assert.deepEqual(store.grants()[m.id].limits,m.p.limits);
});
test('lost response can be retried with a fresh QR; conflicts still preserve both versions',async t=>{
 const f=await fixture(t),c=insert(f.s,'contacts',{name:'Base'}),m=await f.pair(),store=require('../electron/device-store.cjs').createStore(f.opts);
 f.s.query({table:'contacts',action:'update',payload:{name:'PC edit'},filters:[{column:'id',op:'eq',value:c.id}]});
 m.mobile.query({table:'contacts',action:'update',payload:{name:'Mobile edit'},filters:[{column:'id',op:'eq',value:c.id}]});
 store.remove(f.user.id,m.id);const localBefore=stable(m.local()),pcBefore=stable(f.read());
 const lost=await reconnect(f,m),retry=await reconnect(f,m);assert.notEqual(lost.credentials.key,retry.credentials.key);
 const result=await request(m.qr.endpoint,m.id,retry.credentials.key,{base:m.base(),local:m.local()});assert.match(result.error,/incompat/);
 assert.equal(stable(m.local()),localBefore);assert.equal(stable(f.read()),pcBefore);
});
test('mobile rejects old Windows before sending reauthorization',async()=>{
 let sent=false;await assert.rejects(prepareReauthorization({qr:{},binding:{},state:{}},async()=>{sent=true;}),/Atualize/);assert.equal(sent,false);
});
