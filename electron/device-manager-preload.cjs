const {contextBridge,ipcRenderer}=require('electron');
const token=process.argv.find(x=>x.startsWith('--rest-devices-token='))?.split('=')[1];
contextBridge.exposeInMainWorld('devices',{call:(action,payload)=>ipcRenderer.invoke('rest:devices:'+token,action,payload)});
