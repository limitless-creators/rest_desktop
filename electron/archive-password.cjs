const {contextBridge,ipcRenderer}=require('electron');
const token=process.argv.find(x=>x.startsWith('--rest-archive-token='))?.split('=')[1];
contextBridge.exposeInMainWorld('archivePassword',{submit:value=>ipcRenderer.send('rest:archive-password:'+token,String(value))});
