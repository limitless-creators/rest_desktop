
const {_electron:electron}=require('@playwright/test'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const env={...process.env,REST_DESKTOP_HEADLESS:'1',REST_DESKTOP_TEST_DATA:path.resolve('.smoke-data','sales-'+Date.now())};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:process.env.REST_SMOKE_EXE||require('electron'),args:process.env.REST_SMOKE_EXE?[]:['.'],env});
 try{
 const page=await app.firstWindow();await page.waitForSelector('input[type=email]');
 await page.evaluate(async()=>{
  const a=window.restDesktop;
  await a.auth('signUp',{email:'sales@test.local',password:'password123',options:{data:{name:'Sales Test'}}});
  await a.auth('signInWithPassword',{email:'sales@test.local',password:'password123'});
  await a.query({table:'company_settings',action:'upsert',payload:{company_name:'Sales Company',setup_complete:true}});
  const now=new Date();const day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  await a.rpc('rest_save_document',{p_request_id:crypto.randomUUID(),p_kind:'invoice',p_document:{client:'Today',issue_date:day,status:'Paid'},p_items:[{description:'Service',quantity:1,unitPrice:150}]});
  await a.rpc('rest_save_document',{p_request_id:crypto.randomUUID(),p_kind:'invoice',p_document:{client:'Old',issue_date:'2020-01-01',status:'Paid'},p_items:[{description:'Old service',quantity:1,unitPrice:900}]});
  await a.rpc('rest_save_document',{p_request_id:crypto.randomUUID(),p_kind:'invoice',p_document:{client:'Pending',issue_date:day,status:'Pending'},p_items:[{description:'Unpaid service',quantity:1,unitPrice:700}]});
  await a.rpc('rest_create_sale',{p_request_id:crypto.randomUUID(),p_sale:{product_name:'Direct sale',quantity:1,unit_price:50,sale_date:day}});
  localStorage.setItem('invstock_tab','dashboard');
 });
 await page.reload();await page.waitForSelector('nav');
 const card=page.locator('div[ class*="group cursor-pointer"]').filter({has:page.getByText('Vendas Hoje',{exact:true})}).first();
 await card.getByText('200,00 MT',{exact:true}).waitFor();
 await card.getByText('2 transacções pagas',{exact:true}).waitFor();
 const info=await page.evaluate(()=>window.restDesktop.info());assert.equal(info.version,'1.1.1');
 await page.screenshot({path:'test-results/sales-today-1.1.1.png',fullPage:true});
 console.log(JSON.stringify({passed:true,version:info.version,total:200,count:2,excludesOldAndPending:true}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
