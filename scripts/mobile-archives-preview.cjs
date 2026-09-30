const fs=require('fs'),path=require('path'),{build}=require('esbuild'),{_electron:electron}=require('@playwright/test'),assert=require('node:assert/strict');
(async()=>{
const mobile=path.resolve('../rest_mobile_offline/mobile_app');
const mocks={
 'fileSync':"export async function shareSyncFile(){}; export async function pickSyncFile(){return {text:'fixture',summary:{changes:2,attachments:1,already:false,conflicts:[]}};} export async function importSyncFile(){};",
 'settingsStore':"export const useSettingsStore=s=>s({darkMode:globalThis.previewDark||false});useSettingsStore.getState=()=>({loadSettings:async()=>{}});",
 'dataStore':"export const useDataStore={getState:()=>({loadAll:async()=>{}})};",
 'authStore':"export const useAuthStore={getState:()=>({userId:'test'})};",
 'safe-area':"export {View as SafeAreaView} from 'react-native';"
};
const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import SyncFileActions from './components/SyncFileActions';
function App(){const[dark,setDark]=useState(false);globalThis.previewDark=dark;return <main style={{padding:20,background:dark?'#0d0f14':'#fff',minHeight:'100vh',boxSizing:'border-box',fontFamily:'Arial',color:dark?'white':'#0c1c48'}}><h2>Sincronização com o PC</h2><button onClick={()=>setDark(!dark)}>Alternar tema</button><div style={{marginTop:20}}><SyncFileActions/></div></main>}createRoot(document.getElementById('root')).render(<App/>);`;
const dir=path.resolve('test-results/mobile-archives');fs.mkdirSync(dir,{recursive:true});
await build({stdin:{contents:entry,resolveDir:mobile,loader:'tsx'},outfile:path.join(dir,'app.js'),bundle:true,platform:'browser',jsx:'automatic',resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.js','.json'],alias:{'react-native':path.join(mobile,'node_modules/react-native-web')},define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'native-dialog-fixtures',setup(b){
 b.onResolve({filter:/\/lib\/fileSync$/},()=>({path:'fileSync',namespace:'mock'}));
 b.onResolve({filter:/\/stores\/(settingsStore|dataStore|authStore)$/},a=>({path:a.path.split('/').at(-1),namespace:'mock'}));
 b.onResolve({filter:/^react-native-safe-area-context$/},()=>({path:'safe-area',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js',resolveDir:mobile}));
}}]});
fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><script src="./app.js"></script>');
fs.writeFileSync(path.join(dir,'harness.cjs'),"const {app,BrowserWindow}=require('electron');app.disableHardwareAcceleration();app.whenReady().then(()=>{const w=new BrowserWindow({width:390,height:780,show:false,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false}});w.loadFile(require('path').join(__dirname,'index.html'));});app.on('window-all-closed',()=>app.quit());");
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:require('electron'),args:[path.join(dir,'harness.cjs')],env});
try{
 const page=await app.firstWindow();await page.getByText('Enviar arquivo de sincronização',{exact:true}).waitFor();
 await page.waitForTimeout(400); await page.screenshot({path:'test-results/archives-mobile-light-1.1.0.png'});
 await page.getByText('Importar arquivo do Windows',{exact:true}).click();
 await page.getByText('Rever atualização',{exact:true}).waitFor();
 await page.getByText('2 alterações · 1 anexos',{exact:true}).waitFor();
 await page.waitForTimeout(400); await page.screenshot({path:'test-results/archives-mobile-preview-1.1.0.png'});
 await page.getByText('Importar atualização',{exact:true}).click();
 await page.getByText('Atualização importada. Alterações feitas depois do envio continuam pendentes.',{exact:true}).first().waitFor();
 await page.getByRole('button',{name:'Alternar tema'}).click();
 await page.waitForTimeout(400); await page.screenshot({path:'test-results/archives-mobile-dark-1.1.0.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log(JSON.stringify({passed:true,renderer:'React Native Web',nativeDialogs:'mocked',preview:true,import:true,narrowScreen:true}));
}finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
