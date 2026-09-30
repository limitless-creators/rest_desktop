const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{randomUUID,randomBytes}=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {Service}=require('../electron/service.cjs'),{tables}=require('../electron/schema.cjs');
const {snapshot,replace,countChanges}=require('../electron/replication.cjs');
const {protocol}=require('../electron/sync-file.cjs');
const {LocalService}=require('../../rest_mobile_offline/mobile_app/lib/local-core.cjs');
const {mobileFiles}=require('../../rest_mobile_offline/mobile_app/lib/file-sync-mobile.cjs');
const b64=x=>Buffer.from(x).toString('base64'),unb64=x=>Buffer.from(x,'base64');
const options={tables,b64,unb64,random:randomBytes},files=mobileFiles(options),codec=protocol(options);
const insert=(s,t,p)=>s.query({table:t,action:'insert',payload:p,single:'required'}).data;
const update=(s,t,id,p)=>s.query({table:t,action:'update',payload:p,filters:[{column:'id',op:'eq',value:id}]});
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rest-archives-')),pc=new Service(root);
 pc.auth('signUp',{email:'owner@test.local',password:'password123',options:{data:{name:'Owner'}}});pc.auth('signInWithPassword',{email:'owner@test.local',password:'password123'});
 const user=pc.auth('getUser').user;
 const c=insert(pc,'contacts',{name:'Original'});
 const limits={};for(const kind of ['invoices','quotes','receipts','expenses','general_sales']){limits[kind]={start:1,end:1000};pc.db.prepare('INSERT INTO counters VALUES(?,?,?)').run(user.id,kind,1000);}
 const deviceId=randomUUID(),key=b64(randomBytes(32)),grant={userId:user.id,key,limits};
 const db=new DatabaseSync(':memory:'),mobile=new LocalService(db,user,randomUUID,()=>{});
 db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(user.id,'mobile@test.local','Phone','pair','pair',new Date().toISOString());
 const read=s=>snapshot(s.db,user.id,tables,b64);
 let base=read(pc),state={};
 mobile.tx(()=>{replace(db,user.id,tables,base,unb64);for(const [kind,range] of Object.entries(limits))db.prepare('INSERT INTO counters VALUES(?,?,?)').run(user.id,kind,range.start-1);});
 const binding={user,deviceId,limits};
 const context=()=>({binding,base,current:read(mobile),state});
 function phoneExport(){const x=files.exportFile(context(),key,randomUUID());state=x.state;return x;}
 function pcImport(text,commit=true){const args={text,deviceId,grant},p=pc.syncFilePreview(args);return commit?pc.syncFileImport({...args,expected:p.digest}):p;}
 function phoneImport(text){const r=files.previewFile(text,key,context());if(r.already)return r;if(r.conflicts.length)throw Error('conflict');mobile.tx(()=>replace(db,user.id,tables,r.merged,unb64));base=r.packet.data;state=files.accepted(r);return r;}
 t.after(()=>{pc.close();db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {pc,mobile,root,user,c,grant,deviceId,key,read,phoneExport,pcImport,phoneImport,context,state:()=>state,pcExport:()=>pc.syncFileExport(deviceId,grant)};
}
test('bidirectional sync files carry expense attachments, logo and stamp bytes',t=>{
 const f=fixture(t);
 const bytes=Buffer.from('expense-document-test');
 const asset=f.pc.attachment('upload',{mime:'application/pdf',bytes}).key;
 insert(f.pc,'expenses',{merchant:'PC supplier',amount:10,expense_date:'2026-09-27',receipt_image_url:asset});
 f.pc.query({table:'company_settings',action:'upsert',payload:{company_name:'Company',logo_base64:'data:image/png;base64,aGVsbG8=',stamp_base64:'data:image/png;base64,c3RhbXA='}});
 const outgoing=f.pcExport();assert.ok(!outgoing.text.includes('PC supplier'));
 f.phoneImport(outgoing.text);
 assert.equal(f.read(f.mobile).expenses[0].receipt_image_url,asset);
 assert.equal(f.read(f.mobile).attachments[0].data,b64(bytes));
 assert.equal(f.read(f.mobile).company_settings[0].stamp_base64,'data:image/png;base64,c3RhbXA=');
 insert(f.mobile,'contacts',{name:'From phone'});const phone=f.phoneExport();assert.ok(!phone.text.includes('From phone'));
 f.pcImport(phone.text);f.phoneImport(f.pcExport().text);
 assert.equal(f.read(f.pc).contacts.length,2);assert.equal(countChanges(f.context().base,f.context().current),0);
});
test('acknowledgement preserves phone edits made after file export and keeps them pending',t=>{
 const f=fixture(t);update(f.mobile,'contacts',f.c.id,{name:'First phone edit'});
 const outgoing=f.phoneExport();update(f.mobile,'contacts',f.c.id,{name:'Later phone edit'});
 f.pcImport(outgoing.text);f.phoneImport(f.pcExport().text);
 assert.equal(f.read(f.mobile).contacts[0].name,'Later phone edit');
 assert.equal(f.read(f.pc).contacts[0].name,'First phone edit');
 assert.equal(countChanges(f.context().base,f.context().current),1);
 f.pcImport(f.phoneExport().text);f.phoneImport(f.pcExport().text);
 assert.equal(countChanges(f.context().base,f.context().current),0);
});
test('conflicting records reject all writes and identify the record',t=>{
 const f=fixture(t);update(f.mobile,'contacts',f.c.id,{name:'Phone'});update(f.pc,'contacts',f.c.id,{name:'PC'});
 const x=f.phoneExport(),p=f.pcImport(x.text,false);assert.equal(p.conflicts[0].id,f.c.id);assert.throws(()=>f.pcImport(x.text),/conflitos/);
 assert.equal(f.read(f.pc).contacts[0].name,'PC');
});
test('duplicate and out-of-order files cannot overwrite newer state',t=>{
 const f=fixture(t),older=f.phoneExport();update(f.mobile,'contacts',f.c.id,{name:'New'});const newer=f.phoneExport();f.pcImport(newer.text);
 assert.equal(f.pcImport(newer.text).already,true);assert.throws(()=>f.pcImport(older.text),/antigo/);
 const first=f.pcExport(),second=f.pcExport();f.phoneImport(second.text);assert.throws(()=>f.phoneImport(first.text),/antigo/);assert.equal(f.phoneImport(second.text).already,true);
});
test('live sync sequence invalidates older phone files',t=>{
 const f=fixture(t),old=f.phoneExport();f.pc.fileLive(f.deviceId,old.packet.sequence);
 assert.throws(()=>f.pcImport(old.text),/antigo/);
});
test('tampered, wrong-device and wrong-owner files are rejected',t=>{
 const f=fixture(t),out=f.phoneExport(),e=JSON.parse(out.text);
 e.box=e.box.slice(0,-5)+'AAAA=';assert.throws(()=>f.pcImport(JSON.stringify(e)),/danificado|autorizado/);
 assert.throws(()=>f.pc.syncFilePreview({text:out.text,deviceId:randomUUID(),grant:f.grant}),/outro dispositivo/);
 const forged={...out.packet,ownerId:'other'};assert.throws(()=>f.pcImport(codec.pack(forged,f.key)),/conta/);
});
test('missing attachments and invalid relational data are rejected without partial writes',t=>{
 const f=fixture(t);
 insert(f.mobile,'expenses',{merchant:'Missing file',amount:10,expense_date:'2026-09-27',receipt_image_url:'local:missing'});
 assert.throws(()=>f.phoneExport(),/Anexo em falta/);
 f.mobile.query({table:'expenses',action:'delete',filters:[{column:'id',op:'eq',value:f.read(f.mobile).expenses[0].id}]});
 const x=f.phoneExport();x.packet.data.invoice_items.push({id:randomUUID(),user_id:f.user.id,invoice_id:'missing',description:'Item',quantity:'1',unit_price:'1',sort_order:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
 assert.throws(()=>f.pcImport(codec.pack(x.packet,f.key)),/Referências|FOREIGN KEY/);
 assert.equal(f.read(f.pc).invoice_items.length,0);assert.equal(f.read(f.pc).contacts[0].name,'Original');
});
test('root backup restores all installation data, assets, counters and pairing metadata',t=>{
 const f=fixture(t);const asset=f.pc.attachment('upload',{mime:'image/png',bytes:Buffer.from('image-bytes')}).key;
 insert(f.pc,'expenses',{merchant:'Root expense',amount:50,expense_date:'2026-09-27',receipt_image_url:asset});
 const dest=path.join(f.root,'complete.restroot');f.pcExport();
 f.pc.rootExport(dest,'backup-password',{grants:{[f.deviceId]:f.grant},preferences:{invstock_tab:'reports'}},'password123');
 assert.ok(!fs.readFileSync(dest,'utf8').includes('Root expense'));
 assert.throws(()=>f.pc.rootPreview(dest,'wrong-password','password123'),/Senha incorrecta/);
 const p=f.pc.rootPreview(dest,'backup-password','password123');assert.equal(p.attachments,1);assert.equal(p.extras.grants[f.deviceId].key,f.key);
 update(f.pc,'contacts',f.c.id,{name:'Changed'});
 f.pc.rootRestore(dest,'backup-password',p.digest,'password123');
 f.pc.auth('signInWithPassword',{email:'owner@test.local',password:'password123'});
 assert.equal(f.read(f.pc).contacts[0].name,'Original');
 assert.equal(f.read(f.pc).attachments[0].data,b64(Buffer.from('image-bytes')));
 assert.equal(f.pc.db.prepare('SELECT value FROM counters WHERE kind=?').get('expenses').value,1001);
 assert.equal(f.read(f.pc).expenses[0].receipt_image_url,asset);
});
test('corrupt root archive and preview mismatch never replace the database',t=>{
 const f=fixture(t),dest=path.join(f.root,'root.restroot');f.pc.rootExport(dest,'backup-password',{},'password123');
 const p=f.pc.rootPreview(dest,'backup-password','password123');
 assert.throws(()=>f.pc.rootRestore(dest,'backup-password','changed','password123'),/alterado/);
 const e=JSON.parse(fs.readFileSync(dest,'utf8'));e.data=e.data.slice(0,-8)+'AAAAAAAA';fs.writeFileSync(dest,JSON.stringify(e));
 assert.throws(()=>f.pc.rootRestore(dest,'backup-password',p.digest,'password123'),/danificado/);assert.equal(f.read(f.pc).contacts.length,1);
});

test('root restores into a fresh Windows installation without a temporary account',t=>{
 const f=fixture(t),file=path.join(f.root,'fresh.restroot');f.pc.rootExport(file,'backup-password',{},'password123');
 const target=fs.mkdtempSync(path.join(os.tmpdir(),'rest-fresh-')),fresh=new Service(target);
 t.after(()=>{fresh.close();fs.rmSync(target,{recursive:true,force:true});});
 const p=fresh.rootPreview(file,'backup-password');assert.equal(p.accounts,1);
 fresh.rootRestore(file,'backup-password',p.digest);
 fresh.auth('signInWithPassword',{email:'owner@test.local',password:'password123'});
 assert.equal(fresh.query({table:'contacts'}).data[0].name,'Original');
});
test('any signed-in account can export root with its password',t=>{
 const f=fixture(t),file=path.join(f.root,'admin.restroot');f.pc.rootExport(file,'backup-password',{},'password123');
 f.pc.auth('signUp',{email:'staff@test.local',password:'password123',options:{data:{name:'Staff'}}});
 f.pc.auth('signInWithPassword',{email:'staff@test.local',password:'password123'});
 assert.ok(f.pc.rootPreview(file,'backup-password','password123'));
 const target=path.join(f.root,'staff.restroot');
 assert.throws(()=>f.pc.rootExport(target,'backup-password',{},'wrong-password'),/Senha da conta/);assert.equal(fs.existsSync(target),false);
 assert.throws(()=>f.pc.rootExport(target,'backup-password'),/Senha da conta/);
 f.pc.rootExport(target,'backup-password',{},'password123');assert.ok(fs.existsSync(target));
 f.pc.auth('signOut');assert.throws(()=>f.pc.rootExport(target,'backup-password',{},'password123'),/sessão/);
});

test('ordinary account restores root and legacy using its own password',t=>{
 const f=fixture(t),root=path.join(f.root,'all.restroot'),legacy=path.join(f.root,'all.restbackup');
 f.pc.rootExport(root,'backup-password',{},'password123');f.pc.backup(legacy);
 const login=()=>f.pc.auth('signInWithPassword',{email:'staff@test.local',password:'staff-password'});
 const signup=()=>f.pc.auth('signUp',{email:'staff@test.local',password:'staff-password',options:{data:{name:'Staff'}}});
 signup();login();
 assert.throws(()=>f.pc.rootPreview(root,'backup-password'),/Senha da conta/);
 assert.throws(()=>f.pc.rootPreview(root,'backup-password','password123'),/Senha da conta/);
 const p=f.pc.rootPreview(root,'backup-password','staff-password');
 assert.throws(()=>f.pc.rootRestore(root,'backup-password',p.digest,'wrong'),/Senha da conta/);
 assert.equal(f.pc.db.prepare('SELECT count(*) n FROM users').get().n,2);
 const restored=f.pc.rootRestore(root,'backup-password',p.digest,'staff-password');assert.ok(fs.existsSync(restored.safetyBackup));
 assert.equal(f.pc.db.prepare('SELECT count(*) n FROM users').get().n,1);
 signup();login();
 assert.throws(()=>f.pc.restore(legacy,true,'wrong'),/Senha da conta/);
 const old=f.pc.restore(legacy,true,'staff-password');assert.ok(fs.existsSync(old.safetyBackup));
 assert.equal(f.pc.db.prepare('SELECT count(*) n FROM users').get().n,1);
 assert.throws(()=>f.pc.rootPreview(root,'backup-password','staff-password'),/sessão/);
});
