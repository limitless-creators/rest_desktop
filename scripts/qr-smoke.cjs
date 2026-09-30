
const { _electron: electron }=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {randomBytes,randomUUID}=require('node:crypto');
const nacl=require('tweetnacl'),jsQR=require('jsqr');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
async function call(qr,id,key,payload,route){
 const nonce=randomBytes(24);
 const r=await fetch(qr.endpoint+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nonce:nonce.toString('base64'),box:Buffer.from(nacl.secretbox(Buffer.from(JSON.stringify(payload)),nonce,Buffer.from(key,'base64'))).toString('base64')})});
 assert.equal(r.status,200);
 const box=await r.json();
 const plain=nacl.secretbox.open(Buffer.from(box.box,'base64'),Buffer.from(box.nonce,'base64'),Buffer.from(key,'base64'));
 assert.ok(plain);const result=JSON.parse(Buffer.from(plain).toString());assert.equal(result.requestNonce,nonce.toString('base64'));return result;
}
(async()=>{
 const env={...process.env,REST_DESKTOP_HEADLESS:'1',REST_DESKTOP_TEST_DATA:path.resolve('.smoke-data','qr-'+Date.now())};
 delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:process.env.REST_SMOKE_EXE||require('electron'),args:process.env.REST_SMOKE_EXE?[]:['.'],env,timeout:45000});
 try{
  const page=await app.firstWindow(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.waitForSelector('input[type=email]');
  await page.evaluate(async()=>{
   await window.restDesktop.auth('signUp',{email:'qr@test.local',password:'password123',options:{data:{name:'QR Test'}}});
   await window.restDesktop.auth('signInWithPassword',{email:'qr@test.local',password:'password123'});
   await window.restDesktop.query({table:'company_settings',action:'upsert',payload:{company_name:'QR Company',setup_complete:true}});
   localStorage.setItem('invstock_tab','contacts');
  });
  await page.reload();await page.waitForSelector('nav');
  await app.evaluate(({dialog})=>{
   globalThis.qrApprovals=0;
   dialog.showMessageBox=async(_parent,opts)=>{
    if(opts.title==='Rede do hotspot')return {response:0};
    globalThis.qrApprovals++;return {response:1};
   };
   dialog.showErrorBox=(_title,message)=>{throw Error(message);};
  });
  async function openQR(){
   const next=app.waitForEvent('window');
   await app.evaluate(async({Menu,BrowserWindow})=>{
    const item=Menu.getApplicationMenu().items.find(i=>i.label==='Celular').submenu.items[0];
    await item.click(item,BrowserWindow.getAllWindows()[0],{});
   });
   const screen=await next;await screen.waitForSelector('img');
   const src=await screen.locator('img').getAttribute('src');
   const png=PNG.sync.read(Buffer.from(src.split(',')[1],'base64'));
   const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
   assert.ok(decoded,'QR must decode from generated pixels');
   const qr=JSON.parse(decoded.data);
   assert.equal(qr.version,1);assert.equal(qr.type,'rest-local-pairing');
   assert.equal(Buffer.from(qr.key,'base64').length,32);
   fs.mkdirSync('test-results',{recursive:true});
   await screen.screenshot({path:'test-results/windows-qr-1.1.0.png'});
   await screen.close();
   return qr;
  }
  const qr=await openQR(),device=randomUUID();
  const paired=await call(qr,qr.invite,qr.key,{deviceId:device},'pair');
  assert.equal(paired.error,undefined);
  assert.equal(await app.evaluate(()=>globalThis.qrApprovals),1);
  const next=await openQR();
  assert.equal(next.endpoint,qr.endpoint,'showing a new QR must preserve the active endpoint');
  const local=structuredClone(paired.snapshot),id=randomUUID(),now=new Date().toISOString();
  local.contacts.push({id,user_id:paired.user.id,name:'Contacto sincronizado Android',email:'',phone:'',company:'',role:'',role_pt:'',avatar_color:'',created_at:now,updated_at:now});
  const synced=await call(next,device,paired.key,{base:paired.snapshot,local},'sync');
  assert.equal(synced.error,undefined);
  await page.getByText('Contacto sincronizado Android',{exact:true}).first().waitFor();
  assert.equal(synced.snapshot.contacts.length,1);
  const repeat=await call(next,device,paired.key,{base:paired.snapshot,local},'sync');
  assert.equal(repeat.snapshot.contacts.length,1);
  await page.screenshot({path:'test-results/windows-sync-contact-1.1.0.png',fullPage:true});
  await app.evaluate(async({Menu,BrowserWindow})=>{
   const item=Menu.getApplicationMenu().items.find(i=>i.label==='Celular').submenu.items[1];
   await item.click(item,BrowserWindow.getAllWindows()[0],{});
  });
  await assert.rejects(()=>fetch(next.endpoint+'ping',{method:'POST',body:'{}'}));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,qrDecoded:true,nativeMenu:true,approval:true,encryptedPairing:true,mobileWriteVisibleInDesktop:true,retryWithoutDuplicates:true,stopServer:true,errors}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
