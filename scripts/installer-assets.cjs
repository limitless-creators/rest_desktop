const { _electron: electron } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path');
const { PNG } = require('pngjs');
const out = path.resolve('build/installer');
fs.mkdirSync(out, {recursive:true});
function bmp(pngPath, bmpPath) {
 const p=PNG.sync.read(fs.readFileSync(pngPath)), stride=(p.width*3+3)&~3;
 const b=Buffer.alloc(54+stride*p.height);
 b.write('BM'); b.writeUInt32LE(b.length,2); b.writeUInt32LE(54,10);
 b.writeUInt32LE(40,14); b.writeInt32LE(p.width,18); b.writeInt32LE(p.height,22);
 b.writeUInt16LE(1,26); b.writeUInt16LE(24,28); b.writeUInt32LE(stride*p.height,34);
 for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
  const s=(y*p.width+x)*4,d=54+(p.height-1-y)*stride+x*3;
  b[d]=p.data[s+2]; b[d+1]=p.data[s+1]; b[d+2]=p.data[s];
 }fs.writeFileSync(bmpPath,b);
}
const url=p=>'data:image/'+(p.endsWith('webp')?'webp':'png')+';base64,'+fs.readFileSync(p).toString('base64');
(async()=>{
 const env={...process.env,REST_DESKTOP_HEADLESS:'1',REST_DESKTOP_TEST_DATA:path.resolve('.smoke-data','installer-demo-'+Date.now())};
 delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:require('electron'),args:['.'],env});
 try{
 const page=await app.firstWindow(); await page.setViewportSize({width:1440,height:800});
 await page.waitForSelector('input[type=email]');
 await page.evaluate(async()=>{
  const a=window.restDesktop;
  const check=r=>{if(r?.error)throw Error(JSON.stringify(r.error));return r?.data};
  await a.auth('signUp',{email:'demo@rest.local',password:'demo-installer-only',options:{data:{name:'Ana Silva'}}});
  await a.auth('signInWithPassword',{email:'demo@rest.local',password:'demo-installer-only'});
  check(await a.query({table:'company_settings',action:'upsert',payload:{company_name:'Horizonte Comercial · Demonstração',setup_complete:true,nuit:'400000000',address:'Maputo',city:'Maputo'}}));
  const products=[['Papel A4 · resma',320,450,280],['Tinteiro preto',850,1250,34],['Caderno executivo',180,290,150],['Caneta azul · caixa',120,195,12],['Pasta de arquivo',150,240,86],['Agenda profissional',380,620,42]];
  for(let i=0;i<products.length;i++){
   const [name,price,sale_price,stock_level]=products[i];
   check(await a.query({table:'stock_items',action:'insert',payload:{name,sku:'REST-00'+(i+1),price,sale_price,stock_level,max_stock:300}}));
  }
  const clients=['Horizonte Serviços','Mercado Central','Oficina Nova Era','Papelaria Maputo','Cantinho do Bairro'];
  for(let i=0;i<20;i++){
   const d=new Date();d.setDate(Math.max(1,d.getDate()-i));
   const day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
   const invoice=check(await a.rpc('rest_save_document',{p_request_id:'demo-invoice-'+i,p_kind:'invoice',p_document:{client:clients[i%clients.length],issue_date:day,status:i<3||i%5===0?'Pending':'Paid'},p_items:[{description:products[i%products.length][0],quantity:4+i%8,unitPrice:products[i%products.length][2]}]}));
   if(i<3)check(await a.rpc('rest_create_receipt',{p_request_id:'demo-receipt-'+i,p_receipt:{invoice_id:invoice.id,amount:(4+i%8)*products[i%products.length][2],method:'Cash',method_pt:'Dinheiro'}}));
   check(await a.query({table:'expenses',action:'insert',payload:{seq_number:i+1,merchant:i%2?'Transporte local':'Material de escritório',category:'Other',category_pt:'Outros',amount:350+(i%6)*210,expense_date:day,status:'Approved'}}));
  }
 });
 const screens=[['dashboard','Painel'],['invoices','Facturas'],['stock','Inventário'],['reports','Relatórios']];
 for(const [tab] of screens){
  await page.evaluate(tab=>localStorage.setItem('invstock_tab',tab),tab);
  await page.reload(); await page.waitForSelector('nav');
  await page.waitForFunction(()=>!document.body.innerText.includes('A carregar'));
  if(tab==='reports'){await page.getByRole('button',{name:'Resultados e Métricas',exact:true}).click();await page.getByRole('button',{name:'Último mês',exact:true}).click();}
  await page.screenshot({path:path.join(out,tab+'.png')});
 }
 const slides=[
  ['dashboard','01 / VISÃO GERAL','O seu negócio,\nem perspectiva.','Vendas, recebimentos e prioridades do dia num só lugar.'],
  ['invoices','02 / FACTURAÇÃO','Mais fluidez.\nEm cada venda.','Crie facturas, cotações e recibos com a identidade da sua empresa.'],
  ['stock','03 / INVENTÁRIO','Tudo no lugar.\nSempre consigo.','Acompanhe produtos e níveis de stock, mesmo sem internet.'],
  ['reports','04 / RESULTADOS','Veja os números.\nDecida melhor.','Receitas, despesas e indicadores para acompanhar o seu negócio.']
 ];
 const logo=url('src/assets/logo_extended_darkmode.webp');
 for(const [id,eyebrow,title,body] of slides){
  await page.setViewportSize({width:1080,height:465});
  await page.setContent('<html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#0f1e46;color:white;font-family:Arial,sans-serif;overflow:hidden}.glow{position:absolute;right:-130px;top:-200px;width:720px;height:720px;border:1px solid #ffffff16;border-radius:50%}.glow:after{content:"";position:absolute;inset:65px;border:1px solid #ffffff13;border-radius:50%}.copy{position:absolute;left:38px;top:32px;width:270px}.logo{width:145px;height:48px;object-fit:contain;object-position:left}.eyebrow{color:#d9ae72;font-size:11px;letter-spacing:2px;margin:38px 0 18px}h1{font-size:32px;line-height:1.18;font-weight:600;letter-spacing:-1px;margin:0 0 17px;white-space:pre-line}p{font-size:15px;line-height:1.7;color:#bac4dc;margin:0}.pills{margin-top:25px;display:flex;gap:6px}.pills i{width:20px;height:3px;background:#ffffff30;border-radius:3px}.pills i.active{width:38px;background:#dab173}.screen{position:absolute;top:38px;left:343px;width:705px;background:#fff;border:5px solid #ffffffdd;border-radius:10px;overflow:hidden;box-shadow:0 18px 40px #0004}.screen img{display:block;width:100%}.demo{position:absolute;bottom:15px;right:33px;color:#8899bd;font-size:10px;letter-spacing:.4px}</style><body><div class="glow"></div><div class="copy"><img class="logo" src="'+logo+'"><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p>'+body+'</p><div class="pills">'+slides.map(s=>'<i class="'+(s[0]===id?'active':'')+'"></i>').join('')+'</div></div><div class="screen"><img src="'+url(path.join(out,id+'.png'))+'"></div><div class="demo">Telas com dados de demonstração · Limitless, Lda</div></body></html>');
  await page.screenshot({path:path.join(out,'slide-'+id+'.png')});
 }
 // NSIS bitmaps are generated from the same HTML layout, not from user data.
 await page.setViewportSize({width:480,height:900});
 await page.setContent('<html><style>body{margin:0;background:#0f1e46;color:white;font-family:Arial;overflow:hidden}.logo{width:290px;margin:72px 60px 0}.title{font-size:49px;line-height:1.15;letter-spacing:-1px;margin:88px 60px 30px}.desc{font-size:22px;line-height:1.65;color:#b9c5de;margin:0 60px}.line{height:4px;width:60px;background:#c79753;margin:38px 60px}.bottom{position:absolute;bottom:58px;left:60px;font-size:18px;color:#b9c5de}.circle{position:absolute;left:225px;top:550px;width:480px;height:480px;border:1px solid #ffffff18;border-radius:50%}</style><body><img class="logo" src="'+logo+'"><div class="title">O seu negócio.<br>Nas suas mãos.</div><div class="line"></div><div class="desc">Gestão local.<br>Liberdade para crescer.</div><div class="circle"></div><div class="bottom">REST DESKTOP<br><small>Limitless, Lda</small></div></body></html>');
 await page.screenshot({path:path.join(out,'sidebar.png')});bmp(path.join(out,'sidebar.png'),path.join(out,'sidebar.bmp'));
 await page.setViewportSize({width:300,height:100});
 await page.setContent('<body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;height:100px"><img style="width:190px" src="'+url('src/assets/Logo_extended.webp')+'"></body>');
 await page.screenshot({path:path.join(out,'header.png')});bmp(path.join(out,'header.png'),path.join(out,'header.bmp'));
 fs.writeFileSync(path.join(out,'slides.dat'),'[0]\r\n'+slides.map(s=>'=slide-'+s[0]+'.png,400,4500,""').join('\r\n')+'\r\n');
 console.log('Installer assets generated from isolated demonstration data: '+out);
 }finally{await app.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
