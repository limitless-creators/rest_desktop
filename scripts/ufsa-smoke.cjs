const {_electron:electron}=require('@playwright/test'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const env={...process.env,REST_DESKTOP_HEADLESS:'1',REST_DESKTOP_TEST_DATA:path.resolve('.smoke-data','ufsa-'+Date.now())};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:process.env.REST_SMOKE_EXE||require('electron'),args:process.env.REST_SMOKE_EXE?[]:['.'],env});
 try {
 const page=await app.firstWindow();await page.waitForSelector('input[type=email]');
 await page.evaluate(async()=>{
  const a=window.restDesktop;
  await a.auth('signUp',{email:'ufsa@test.local',password:'password123',options:{data:{name:'UFSA Test'}}});
  await a.auth('signInWithPassword',{email:'ufsa@test.local',password:'password123'});
  await a.query({table:'company_settings',action:'upsert',payload:{company_name:'UFSA Test',setup_complete:true}});
  localStorage.setItem('invstock_tab','ufsa');
 });
 await page.reload();
 await page.getByRole('button',{name:'Tentar novamente'}).waitFor({timeout:20000}).catch(()=>{});
 const liveStatus=await page.evaluate(()=>window.restDesktop.ufsaStatus());
 console.log('Live portal status: '+liveStatus);
 await app.evaluate(({session,ipcMain})=>{
   ipcMain.removeHandler("rest:ufsa-status");
   ipcMain.handle("rest:ufsa-status",()=>global.ufsaTestMode === "online" ? "ready" : global.ufsaTestMode);
   global.ufsaTestMode='offline';
   session.defaultSession.protocol.handle('https',request=>{
     if(global.ufsaTestMode==='offline') throw Error('Network disconnected');
     if(global.ufsaTestMode==='unavailable') return new Response('Unavailable',{status:503});
     return new Response('<!doctype html><html><body><h1>Concursos UFSA (teste)</h1></body></html>',{headers:{'Content-Type':'text/html'}});
   });
 });
 await page.reload();
 await page.getByRole('heading',{name:'É necessária uma ligação à internet'}).waitFor();
 assert.equal(await page.locator('iframe').count(),0);
 assert.ok((await page.getByRole('status').boundingBox()).width >= 400); await page.screenshot({path:'test-results/ufsa-offline-1.1.2.png'});
 await app.evaluate(()=>{global.ufsaTestMode='online';});
 console.log('Probe: '+await page.evaluate(()=>window.restDesktop.ufsaStatus())); await page.getByRole('button',{name:'Tentar novamente'}).click();
 await page.frameLocator('iframe').getByText('Concursos UFSA (teste)').waitFor();
 assert.equal(await page.evaluate(()=>location.protocol),'file:');
 // Remote frame has no access to the desktop bridge.
 assert.equal(await page.frameLocator('iframe').locator('body').evaluate(()=>typeof window.restDesktop),'undefined');
 await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
 await page.getByRole('heading',{name:'É necessária uma ligação à internet'}).waitFor();
 assert.equal(await page.locator('iframe').count(),0);
 await app.evaluate(()=>{global.ufsaTestMode='unavailable';});
 console.log('Probe: '+await page.evaluate(()=>window.restDesktop.ufsaStatus())); await page.getByRole('button',{name:'Tentar novamente'}).click();
 await page.getByRole('heading',{name:'Não foi possível abrir o UFSA'}).waitFor();
 await app.evaluate(()=>{global.ufsaTestMode='online';});
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await page.frameLocator('iframe').getByText('Concursos UFSA (teste)').waitFor();
 console.log(JSON.stringify({passed:true,liveStatus,offlineNotice:true,retry:true,reconnection:true,remoteBridgeIsolated:true}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
