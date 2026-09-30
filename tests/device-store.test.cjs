const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {createStore}=require('../electron/device-store.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rest-devices-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let time=Date.now();const opts={root,protect:s=>Buffer.from(s),unprotect:b=>b.toString(),now:()=>time};
 const store=createStore(opts),user=randomUUID(),id=randomUUID(),other=randomUUID();
 fs.writeFileSync(path.join(root,'mobile-devices.enc'),JSON.stringify({[id]:{userId:user,name:'Loja',key:'PRIVATE-KEY'},[other]:{userId:'another-user',name:'Other',key:'OTHER-KEY'}}));
 return {root,store,user,id,other,opts,advance:n=>time+=n};
}
test('manager projects only current account without exposing keys and migrates old grants',t=>{
 const f=fixture(t),rows=f.store.list(f.user);assert.equal(rows.length,1);assert.equal(rows[0].name,'Loja');assert.equal(rows[0].lastSync,null);assert.equal(JSON.stringify(rows).includes('PRIVATE-KEY'),false);
 assert.throws(()=>f.store.rename(f.user,f.other,'Intruder'),/não encontrado/);
 assert.throws(()=>f.store.remove(f.user,f.other),/não encontrado/);
});
test('presence expires and file events do not imply network connectivity',t=>{
 const f=fixture(t);f.store.event(f.user,f.id,'sync',{network:true,sync:true});
 assert.equal(f.store.list(f.user,{running:true})[0].connection,'recent');assert.equal(f.store.list(f.user,{running:false})[0].connection,'unknown');
 f.advance(61000);f.store.event(f.user,f.id,'fileImport',{sync:true,via:'file',changes:2});
 const row=f.store.list(f.user,{running:true})[0];assert.equal(row.connection,'unknown');assert.equal(row.lastSyncVia,'file');assert.notEqual(row.lastContact,row.lastSync);
 f.store.event(f.user,f.id,'fileExport',{via:'file'});assert.equal(f.store.list(f.user)[0].lastSync,row.lastSync);
});
test('rename and individual revocation persist history and leave other devices intact',t=>{
 const f=fixture(t);f.store.rename(f.user,f.id,'Vendas');f.store.begin(f.user,f.id);
 assert.throws(()=>f.store.remove(f.user,f.id),/Aguarde/);f.store.end(f.user,f.id);f.store.remove(f.user,f.id);
 const fresh=createStore(f.opts),row=fresh.list(f.user)[0];assert.equal(row.authorized,false);assert.equal(row.name,'Vendas');assert.equal(row.events[0].type,'removed');
 assert.equal(fresh.grants()[f.id],undefined);assert.ok(fresh.grants()[f.other]);assert.throws(()=>fresh.rename(f.user,f.id,' '),/nome/);
});
test('refused contacts remain visible and audit history is bounded',t=>{
 const f=fixture(t),id=randomUUID();f.store.event(f.user,id,'refused',{status:'refused',network:true});
 assert.equal(f.store.list(f.user).find(x=>x.id===id).status,'refused');
 for(let n=0;n<105;n++)f.store.event(f.user,f.id,'sync',{sync:true});
 assert.equal(f.store.list(f.user).find(x=>x.id===f.id).events.length,100);
});
