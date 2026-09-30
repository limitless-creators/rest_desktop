const {_electron:electron}=require('@playwright/test'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const env={...process.env,REST_DESKTOP_HEADLESS:'1',REST_DESKTOP_TEST_DATA:path.resolve('.smoke-data','charts-'+Date.now())};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:process.env.REST_SMOKE_EXE||require('electron'),args:process.env.REST_SMOKE_EXE?[]:['.'],env});
 try{
 const page=await app.firstWindow();await page.waitForSelector('input[type=email]');
 await page.evaluate(async()=>{
  const a=window.restDesktop;await a.auth('signUp',{email:'charts@test.local',password:'password123',options:{data:{name:'Chart Test'}}});await a.auth('signInWithPassword',{email:'charts@test.local',password:'password123'});
  await a.query({table:'company_settings',action:'upsert',payload:{company_name:'Chart Test',setup_complete:true}});
  for(let i=0;i<14;i++){
   const date=new Date();date.setDate(date.getDate()-i*2);
   const day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
   await a.rpc('rest_save_document',{p_request_id:crypto.randomUUID(),p_kind:'invoice',p_document:{client:'Cliente '+i,issue_date:day,status:'Paid'},p_items:[{description:'Service',quantity:1,unitPrice:i===0?12345.67:4000+Math.round(Math.sin(i)*3000)}]});
   await a.query({table:'expenses',action:'insert',payload:{seq_number:i+1,merchant:'Despesa '+i,category:'Other',category_pt:'Outros',amount:i===0?4321.25:1000+Math.round(Math.cos(i)*600),expense_date:day,status:'Approved'}});
  }
  localStorage.setItem('invstock_tab','reports');
 });
 await page.reload();await page.getByRole('button',{name:'Resultados e Métricas',exact:true}).click();
 await page.getByRole('button',{name:'Último mês',exact:true}).click();
 const chart=page.getByTestId('financial-chart');await chart.scrollIntoViewIfNeeded();
 const slider=chart.getByRole('slider');const box=await slider.boundingBox();
 await page.mouse.move(box.x+box.width*0.98,box.y+100);
 await page.getByTestId('chart-tooltip').waitFor();
 assert.match(await page.getByTestId('chart-tooltip').innerText(),/12.?345,67/);
 assert.match(await page.getByTestId('chart-tooltip').innerText(),/4.?321,25/);
 await page.mouse.click(box.x+box.width*0.98,box.y+100);
 await page.mouse.move(box.x,box.y-30);
 assert.match(await page.getByTestId('chart-tooltip').innerText(),/12.?345,67/);
 await chart.screenshot({path:'test-results/chart-desktop-light-1.1.3.png'});
 await slider.focus();await page.keyboard.press('Home');assert.equal(await slider.getAttribute('aria-valuenow'),'1');
 await page.keyboard.press('ArrowRight');assert.equal(await slider.getAttribute('aria-valuenow'),'2');
 await page.keyboard.press('End');assert.equal(await slider.getAttribute('aria-valuenow'),'31');
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await chart.screenshot({path:'test-results/chart-desktop-dark-1.1.3.png'});
 await page.getByRole('button',{name:'Últimos 3 meses',exact:true}).click();
 assert.ok(Number(await slider.getAttribute('aria-valuemax'))<=4);
 console.log(JSON.stringify({passed:true,hover:true,pinnedClick:true,keyboard:true,dailyAndMonthly:true}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
