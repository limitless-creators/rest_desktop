const {contextBridge,ipcRenderer}=require('electron');
const token=process.argv.find(x=>x.startsWith('--rest-dialog-token='))?.split('=')[1];
contextBridge.exposeInMainWorld('restDialog',{submit:value=>ipcRenderer.send('rest:dialog:'+token,value)});
