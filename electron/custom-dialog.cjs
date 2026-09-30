const {BrowserWindow,ipcMain}=require('electron');
const path=require('node:path'),{randomUUID}=require('node:crypto');
module.exports=function(parent,config){
 return new Promise(resolve=>{
 const token=randomUUID(),channel='rest:dialog:'+token;
 const win=new BrowserWindow({parent,modal:true,width:540,height:620,resizable:true,minWidth:400,minHeight:400,show:!process.env.REST_DESKTOP_HEADLESS,webPreferences:{preload:path.join(__dirname,'custom-dialog-preload.cjs'),additionalArguments:['--rest-dialog-token='+token],sandbox:true,contextIsolation:true,nodeIntegration:false,offscreen:!!process.env.REST_DESKTOP_HEADLESS}});
 win.setMenu(null);let done=false;
 const finish=value=>{if(done)return;done=true;ipcMain.removeListener(channel,listener);resolve(value);if(!win.isDestroyed())win.close();};
 const listener=(event,value)=>{if(event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame)finish(value&&typeof value==='object'?value:null);};
 ipcMain.on(channel,listener);win.on('closed',()=>finish(null));
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
 const data=JSON.stringify(config).replace(/</g,'\\u003c');
 const html=fsTemplate(token,data);
 win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html)).catch(()=>finish(null));
 });
};
function fsTemplate(token,data){return require('node:fs').readFileSync(path.join(__dirname,'custom-dialog.html'),'utf8').replaceAll('__TOKEN__',token).replace('__CONFIG__',data);}
