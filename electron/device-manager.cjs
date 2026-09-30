const {BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
let manager;
module.exports=async function({window,call,root,status,pair,isBusy}){
 const {user}=await call('auth','getUser');if(!user)throw Error('Entre primeiro na sua conta.');
 if(manager&&!manager.isDestroyed()){manager.focus();return;}
 const store=require('./device-store.cjs').nativeStore(root),token=randomUUID(),channel='rest:devices:'+token;
 const win=new BrowserWindow({parent:window,width:1100,height:780,minWidth:820,minHeight:620,show:!process.env.REST_DESKTOP_HEADLESS,webPreferences:{preload:path.join(__dirname,'device-manager-preload.cjs'),additionalArguments:['--rest-devices-token='+token],contextIsolation:true,sandbox:true,nodeIntegration:false,offscreen:!!process.env.REST_DESKTOP_HEADLESS}});
 manager=win;win.setMenu(null);
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
 ipcMain.handle(channel,async(event,action,payload={})=>{
  if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Origem inválida.');
  if((await call('auth','getUser')).user?.id!==user.id)throw Error('A conta mudou. Feche esta janela e abra novamente o gestor.');
  const state=status(user.id);
  if(action==='list')return {devices:store.list(user.id,state),server:state};
  if(action==='pair'){await pair();return {ok:true};}
  if(!['rename','remove'].includes(action))throw Error('Operação inválida.');
  if(isBusy())throw Error('Aguarde que a operação de backup ou sincronização termine.');
  if(action==='rename')store.rename(user.id,payload.id,payload.name);
  if(action==='remove'){if(payload.confirm!==true)throw Error('Confirme a remoção.');store.remove(user.id,payload.id);}
  return {ok:true};
 });
 win.on('closed',()=>{ipcMain.removeHandler(channel);manager=null;});
 const dark=await window.webContents.executeJavaScript("document.documentElement.classList.contains('dark')").catch(()=>false);
 const html=fs.readFileSync(path.join(__dirname,'device-manager.html'),'utf8').replaceAll('__TOKEN__',token).replace('__THEME__',dark?'dark':'');
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
};
