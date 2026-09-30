
const {BrowserWindow,dialog,safeStorage}=require('electron');
const {networkInterfaces}=require('node:os');
const QRCode=require('qrcode');
const {startMobileSync}=require('./mobile-sync.cjs');
let running,activeHost,activeUser,grantsRoot,activeSince=0;
module.exports=function({window,call,root,archives}){
 grantsRoot=root;
 const menu={label:'Celular',submenu:[
 {label:'Ligar Android / mostrar QR',click:async()=>{try{
  if(!safeStorage.isEncryptionAvailable())throw Error('O Windows não disponibilizou protecção para as chaves.');
  const {user}=await call('auth','getUser');if(!user)throw Error('Entre primeiro na conta do Windows.');
  const addresses=Object.entries(networkInterfaces()).flatMap(([name,items])=>(items||[]).filter(x=>x.family==='IPv4'&&!x.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.address)).map(x=>({name,address:x.address})));
  if(!addresses.length)throw Error('Ligue o PC ao hotspot do celular primeiro.');
  const pick=await require('./custom-dialog.cjs')(window,{title:'Rede do hotspot',description:'Escolha a ligação do PC ao hotspot do celular.',items:addresses.map((x,i)=>({id:String(i),label:x.name+' — '+x.address})),submit:'Mostrar QR'});
  if(!pick)return;
  const host=addresses[Number(pick.choice)]?.address;if(!host)throw Error('Rede inválida.');
  if(running&&(host!==activeHost||user.id!==activeUser)){await running.close();running=null;}
  if(!running){activeSince=Date.now();running=await startMobileSync({root,host,user,
   onChange:()=>{if(!window.isDestroyed())window.webContents.send('rest:sync-changed');},
   protect:s=>safeStorage.encryptString(s),unprotect:b=>safeStorage.decryptString(b),
   approve:async message=>{const result=await require('./custom-dialog.cjs')(window,{title:'Adicionar celular',description:message,fields:[{id:'name',label:'Nome do celular',max:60}],submit:'Autorizar celular'});return result?require('./device-names.cjs').clean(result.values?.name):false;},
   authorize:async id=>(await call('auth','getUser')).user?.id===id
  });}
  activeHost=host;activeUser=user.id;
  const qr=await QRCode.toDataURL(JSON.stringify(running.invitation()),{width:500,margin:2,errorCorrectionLevel:'M'});
  const screen=new BrowserWindow({show:!process.env.REST_DESKTOP_HEADLESS,width:620,height:730,parent:window,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,offscreen:!!process.env.REST_DESKTOP_HEADLESS,backgroundThrottling:false}});
  screen.setMenu(null);
  await screen.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><title>Ligar REST Android</title><body style="font-family:Arial;text-align:center;color:#0c1c48;padding:16px"><h1>Ligar REST Android</h1><p>Abra a app no celular e toque em Ler QR do PC.</p><img width="470" height="470" src="'+qr+'"><p>Confirme a autorização no PC. QR válido por 10 minutos.</p><p>Mantenha o REST Desktop aberto durante a sincronização.</p></body>'));
 }catch(e){dialog.showErrorBox('Ligação ao celular',e.message);}}},
 {label:'Gerir celulares',click:()=>module.exports.openManager().catch(e=>dialog.showErrorBox('Celulares',e.message))},
 {label:'Parar sincronização local',click:async()=>{if(running){await running.close();running=null;}}},
 {label:'Revogar celulares autorizados',click:async()=>{if(running&&(await dialog.showMessageBox(window,{message:'Revogar o acesso dos celulares? Os dados locais nos celulares serão preservados.',buttons:['Cancelar','Revogar'],cancelId:0})).response===1)running.revoke();}}
 ]};
 module.exports.openManager=()=>require('./device-manager.cjs')({window,call,root,status:user=>({running:!!running&&activeUser===user,host:activeUser===user?activeHost:null,since:activeSince}),pair:()=>menu.submenu[0].click(),isBusy:()=>archives.isBusy()});
 return menu;
};

module.exports.stop=async function(revoke=false){if(running){if(revoke)running.revoke();await running.close();running=null;}if(revoke&&grantsRoot){const fs=require('node:fs');const file=require('node:path').join(grantsRoot,'mobile-devices.enc');if(fs.existsSync(file))fs.unlinkSync(file);}};
