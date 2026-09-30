const { contextBridge, ipcRenderer } = require("electron");
const call = (method, ...args) =>
  ipcRenderer.invoke("rest:call", { method, args });
contextBridge.exposeInMainWorld("restDesktop", {
  auth: (action, payload) => call("auth", action, payload),
  query: (payload) => call("query", payload),
  rpc: (operation, payload) => call("rpc", operation, payload),
  attachment: (action, payload) => call("attachment", action, payload),
  info: () => call("info"),
  backup: () => ipcRenderer.invoke("rest:backup"),
  restore: () => ipcRenderer.invoke("rest:restore"),
  importData: () => ipcRenderer.invoke("rest:import"),
  save: (name, bytes) => ipcRenderer.invoke("rest:save", { name, bytes }),
  onSync: (callback) => {
    const listener=()=>callback();
    ipcRenderer.on("rest:sync-changed",listener);
    return ()=>ipcRenderer.removeListener("rest:sync-changed",listener);
  },
  ufsaStatus: () => ipcRenderer.invoke("rest:ufsa-status"),
  onUfsaFailure: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("rest:ufsa-failure", listener);
    return () => ipcRenderer.removeListener("rest:ufsa-failure", listener);
  },
  rootExport: () => ipcRenderer.invoke("rest:archive:rootExport"),
  rootRestore: () => ipcRenderer.invoke("rest:archive:rootRestore"),
  syncExport: () => ipcRenderer.invoke("rest:archive:syncExport"),
  syncImport: () => ipcRenderer.invoke("rest:archive:syncImport"),
  print: () => ipcRenderer.invoke("rest:print"),
});
