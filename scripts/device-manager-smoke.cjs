const {_electron:electron,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
(async()=>{
 const root=path.resolve('.smoke-data','devices-ui-'+Date.now());fs.mkdirSync(root,{recursive:true});
 const env={...process.env,REST_DESKTOP_HEADLESS:'1',REST_DESKTOP_TEST_DATA:root};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:process.env.REST_SMOKE_EXE||require('electron'),args:process.env.REST_SMOKE_EXE?[]:['.'],env});
 try{
 const page=await app.firstWindow();await page.waitForSelector('input[type=email]');
 const user=await page.evaluate(async()=>{
  const a=window.restDesktop;await a.auth('signUp',{email:'manager@test.local',password:'password123',options:{data:{name:'Manager'}}});await a.auth('signInWithPassword',{email:'manager@test.local',password:'password123'});
  await a.query({table:'company_settings',action:'upsert',payload:{company_name:'Teste gestor',setup_complete:true}});
  localStorage.setItem('invstock_tab','settings');return (await a.auth('getUser')).user;
 });
 const id=randomUUID(),second=randomUUID(),removed=randomUUID(),foreign=randomUUID();
 await app.evaluate(({safeStorage},{root,user,id,second,removed,foreign})=>{
  const fs=process.getBuiltinModule('fs'),path=process.getBuiltinModule('path'),now=new Date().toISOString(),key=Buffer.alloc(32,7).toString('base64');
  const grants={[id]:{userId:user.id,name:'Celular da loja',key},[second]:{userId:user.id,name:'Celular do armazém',key},[foreign]:{userId:'another-user',name:'PRIVATE OTHER ACCOUNT',key}};
  const history={version:1,devices:{[user.id]:{
   [id]:{id,name:'Celular da loja',firstSeen:now,lastContact:now,lastSync:now,lastSyncVia:'hotspot',address:'192.168.43.1',events:[{id:'1',at:now,type:'fileExport',via:'file'},{id:'2',at:now,type:'sync',via:'hotspot',changes:4},{id:'3',at:now,type:'conflict',via:'hotspot'}]},
   [removed]:{id:removed,name:'Celular antigo',firstSeen:now,status:'removed',events:[{id:'4',at:now,type:'removed',via:'windows'}]}
  }}};
  fs.writeFileSync(path.join(root,'data','mobile-devices.enc'),safeStorage.encryptString(JSON.stringify(grants)));
  fs.writeFileSync(path.join(root,'data','mobile-history.enc'),safeStorage.encryptString(JSON.stringify(history)));
 },{root,user,id,second,removed,foreign});
 await page.reload();await page.getByRole('button',{name:'Gerir celulares',exact:true}).waitFor();
 const opened=app.waitForEvent('window');await page.getByRole('button',{name:'Gerir celulares',exact:true}).click();const manager=await opened;
 await manager.getByRole('button',{name:'Ver Celular da loja',exact:true}).click();
 await expect(manager.locator('#authorized')).toHaveText('2');await expect(manager.locator('#total')).toHaveText('3');
 await expect(manager.locator('#detail')).toContainText('Sincronização concluída');await expect(manager.locator('#recent')).toHaveText('0');
 assert.equal((await manager.locator('body').innerText()).includes('PRIVATE OTHER ACCOUNT'),false);
 await manager.screenshot({path:'test-results/device-manager-light-1.3.0.png'});
 await manager.getByLabel('Procurar celular').fill('armazém');await expect(manager.locator('.device')).toHaveCount(1);await manager.getByLabel('Procurar celular').fill('');
 await manager.getByRole('button',{name:'Editar nome',exact:true}).click();
 await manager.getByLabel('Nome do celular',{exact:true}).fill('Vendas Centro');await manager.getByRole('button',{name:'Guardar nome',exact:true}).click();
 await expect(manager.locator('#detail h2')).toHaveText('Vendas Centro');
 await manager.getByRole('button',{name:'Remover celular',exact:true}).click();await manager.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(manager.locator('#authorized')).toHaveText('2');
 await manager.getByRole('button',{name:'Remover celular',exact:true}).click();
 await manager.screenshot({path:'test-results/device-manager-remove-1.3.0.png'});
 await manager.locator('dialog').getByRole('button',{name:'Remover celular',exact:true}).click();
 await expect(manager.locator('#authorized')).toHaveText('1');await expect(manager.locator('#detail')).toContainText('Celular removido; autorização revogada');
 const grants=await app.evaluate(({safeStorage},root)=>{const fs=process.getBuiltinModule('fs'),path=process.getBuiltinModule('path');return JSON.parse(safeStorage.decryptString(fs.readFileSync(path.join(root,'data','mobile-devices.enc'))));},root);
 assert.equal(grants[id],undefined);assert.ok(grants[second]);assert.ok(grants[foreign]);
 await manager.evaluate(()=>document.documentElement.classList.add('dark'));
 await manager.screenshot({path:'test-results/device-manager-dark-1.3.0.png'});
 await page.evaluate(()=>window.restDesktop.auth('signOut'));
 await manager.getByRole('button',{name:'Atualizar',exact:true}).click();await expect(manager.locator('#error')).toContainText('A conta mudou');
 assert.equal((await manager.locator('#list').innerText()).includes('Vendas Centro'),false);
 console.log(JSON.stringify({passed:true,search:true,history:true,rename:true,cancelRemoval:true,remove:true,accountIsolation:true,statusNoFalseOnline:true,sessionGuard:true}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
