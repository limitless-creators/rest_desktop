const {BrowserWindow,dialog,ipcMain,safeStorage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
function passwordDialog(parent,creating){
 return new Promise(resolve=>{
  const token=randomUUID(),channel='rest:archive-password:'+token;
  const win=new BrowserWindow({parent,modal:true,width:470,height:creating?440:360,resizable:false,show:!process.env.REST_DESKTOP_HEADLESS,webPreferences:{preload:path.join(__dirname,'archive-password.cjs'),additionalArguments:['--rest-archive-token='+token],contextIsolation:true,sandbox:true,nodeIntegration:false,offscreen:!!process.env.REST_DESKTOP_HEADLESS}});
  win.setMenu(null);let done=false;
  const finish=value=>{if(done)return;done=true;ipcMain.removeListener(channel,listener);resolve(value);if(!win.isDestroyed())win.close();};
  const listener=(event,value)=>{if(event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame)finish(value);};
  ipcMain.on(channel,listener);win.on('closed',()=>finish(null));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  const html=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${token}'"><title>Backup da instalação</title><style>body{font:14px system-ui;padding:26px;color:#0c1c48}input{box-sizing:border-box;display:block;width:100%;padding:12px;margin:12px 0;border:1px solid #ccd2de;border-radius:8px}button{padding:12px 20px;background:#0c1c48;color:white;border:0;border-radius:8px;cursor:pointer}p{color:#64748b;line-height:1.5}#error{color:#b91c1c}</style><h2>${creating?'Proteger backup root':'Abrir backup root'}</h2><p>${creating?'Guarde esta senha num lugar seguro. Sem ela não será possível restaurar o arquivo.':'Introduza a senha definida ao criar este backup.'}</p><form id="form"><input id="password" type="password" minlength="8" maxlength="256" placeholder="Senha do backup (8+ caracteres)" aria-label="Senha do backup" required autofocus>${creating?'<input id="confirm" type="password" placeholder="Repetir senha" aria-label="Repetir senha" required>':''}<p id="error"></p><button type="submit">Continuar</button> <button id="cancel" type="button">Cancelar</button></form><script nonce="${token}">document.getElementById('form').onsubmit=e=>{e.preventDefault();const p=document.getElementById('password').value,c=document.getElementById('confirm');if(c&&p!==c.value){document.getElementById('error').textContent='As senhas não coincidem.';return;}window.archivePassword.submit(p);};document.getElementById('cancel').onclick=()=>window.archivePassword.submit('');</script>`;
  win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
 });
}
module.exports=function({window,call,root,trusted}){
 let busy=false;
 const protect=()=>{if(!safeStorage.isEncryptionAvailable())throw Error('A protecção de chaves do Windows não está disponível.');};
 const grantFile=path.join(root,'mobile-devices.enc');
 const grants=()=>{protect();return fs.existsSync(grantFile)?JSON.parse(safeStorage.decryptString(fs.readFileSync(grantFile))):{};};
 const writeAtomic=(file,data)=>{const temp=file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(temp,data,{flag:'wx'});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}};
 const wrap=fn=>async()=>{if(busy)throw Error('Outra operação de arquivo está em curso.');busy=true;try{return await fn();}finally{busy=false;}};
 const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
 async function exportFor(deviceId,grant){
  const choice=await dialog.showSaveDialog(window,{title:'Enviar atualização para o celular',defaultPath:'REST-Windows-'+stamp()+'.restsync',filters:[{name:'Sincronização REST',extensions:['restsync']}]});
  if(choice.canceled)return {canceled:true};
  const result=await call('syncFileExport',deviceId,grant);writeAtomic(choice.filePath,result.text);return {path:choice.filePath};
 }
 const rootExport=wrap(async()=>{
  const {user}=await call('auth','getUser');if(!user)throw Error('Entre primeiro na sua conta.');
  const entry=await require('./custom-dialog.cjs')(window,{title:'Criar cópia da instalação',description:'Confirme a senha da sua conta para autorizar a cópia completa. Defina também a senha que protegerá o arquivo e será necessária no restauro.',fields:[{id:'accountPassword',label:'Senha da conta',type:'password'},{id:'password',label:'Senha do backup',type:'password',min:8},{id:'confirm',label:'Repetir senha',type:'password',min:8}],submit:'Criar cópia'});
  if(!entry)return {canceled:true};
  const {password,accountPassword}=entry.values||{};
  await call('verifyRootPassword',accountPassword);
  const choice=await dialog.showSaveDialog(window,{title:'Guardar backup completo da instalação',defaultPath:'REST-Root-'+stamp()+'.restroot',filters:[{name:'Backup root REST',extensions:['restroot']}]});
  if(choice.canceled)return {canceled:true};
  await require('./mobile-menu.cjs').stop();
  const extras={grants:grants(),preferences:await window.webContents.executeJavaScript("Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('invstock_')))")};
  const temp=choice.filePath+'.'+randomUUID()+'.tmp';
  try{await call('rootExport',temp,password,extras,accountPassword);fs.renameSync(temp,choice.filePath);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  return {path:choice.filePath};
 });
 const rootRestore=wrap(async()=>{
  await call('rootAccess');
  const choice=await dialog.showOpenDialog(window,{title:'Restaurar instalação Windows',properties:['openFile'],filters:[{name:'Backup root REST',extensions:['restroot']}]});if(choice.canceled)return {canceled:true};
  const password=await passwordDialog(window,false);if(!password)return {canceled:true};
  const preview=await call('rootPreview',choice.filePaths[0],password);
  const answer=await dialog.showMessageBox(window,{type:'warning',title:'Restaurar backup root',message:'Substituir os dados de toda a instalação?',detail:preview.accounts+' conta(s), '+preview.attachments+' anexo(s). Criado em '+preview.createdAt+'. Será guardada uma cópia dos dados actuais. As contas e emparelhamentos serão restaurados.',buttons:['Cancelar','Restaurar'],defaultId:0,cancelId:0});
  if(answer.response!==1)return {canceled:true};
  protect();const encrypted=safeStorage.encryptString(JSON.stringify(preview.extras.grants||{}));
  await require('./mobile-menu.cjs').stop();
  if(fs.existsSync(grantFile))fs.copyFileSync(grantFile,grantFile+'.before-restore-'+Date.now());
  const oldGrants=fs.existsSync(grantFile)?fs.readFileSync(grantFile):null;
  writeAtomic(grantFile,encrypted);
  let result;
  try{result=await call('rootRestore',choice.filePaths[0],password,preview.digest);}
  catch(error){if(oldGrants)writeAtomic(grantFile,oldGrants);else if(fs.existsSync(grantFile))fs.unlinkSync(grantFile);throw error;}
  const preferences=Object.entries(preview.extras.preferences||{}).filter(([k,v])=>k.startsWith('invstock_')&&typeof v==='string');
  await window.webContents.executeJavaScript('for(const [k,v] of '+JSON.stringify(preferences)+')localStorage.setItem(k,v)');
  window.webContents.reload();return result;
 });
 const syncExport=wrap(async()=>{
  const {user}=await call('auth','getUser');if(!user)throw Error('Entre primeiro na sua conta.');
  const list=Object.entries(grants()).filter(([,g])=>g.userId===user.id);
  if(!list.length)throw Error('Emparelhe primeiro o celular pelo QR. Depois pode usar arquivos sem hotspot.');
  const pick=await require('./device-names.cjs').choose(window,root,user.id);
  if(!pick)return {canceled:true};
  return exportFor(pick.id,pick.grant);
 });
 const syncImport=wrap(async()=>{
  const {user}=await call('auth','getUser');if(!user)throw Error('Entre primeiro na sua conta.');
  const choice=await dialog.showOpenDialog(window,{title:'Importar atualização do celular',properties:['openFile'],filters:[{name:'Sincronização REST',extensions:['restsync']}]});if(choice.canceled)return {canceled:true};
  const source=choice.filePaths[0];if(fs.statSync(source).size>64*1024*1024)throw Error('Arquivo demasiado grande (máximo 64 MB).');
  const text=fs.readFileSync(source,'utf8');let envelope;try{envelope=JSON.parse(text);}catch{throw Error('Arquivo inválido.');}
  const grant=grants()[envelope.deviceId];if(!grant||grant.userId!==user.id)throw Error('Este arquivo não pertence a um celular autorizado nesta conta.');
  const args={text,deviceId:envelope.deviceId,grant};
  const preview=await call('syncFilePreview',args);
  if(preview.conflicts.length){await dialog.showMessageBox(window,{type:'warning',message:'Conflitos: nenhum dado será alterado.',detail:preview.conflicts.slice(0,10).map(c=>c.table+' · '+c.label).join('\n')+'\nReveja estes registos nos dois dispositivos e exporte novamente.'});return {canceled:true};}
  const answer=await dialog.showMessageBox(window,{title:'Rever atualização',message:preview.already?'Este arquivo já foi importado.':preview.changes+' alterações e '+preview.attachments+' anexos.',detail:'Será criada uma cópia de segurança antes da importação. Depois guarde uma resposta para importar no celular e confirmar a sincronização.',buttons:['Cancelar',preview.already?'Continuar':'Importar'],cancelId:0,defaultId:1});if(answer.response!==1)return {canceled:true};
  const result=await call('syncFileImport',{...args,expected:preview.digest});window.webContents.send('rest:sync-changed');
  const reply=await dialog.showMessageBox(window,{message:'Atualização recebida. Guardar resposta para o celular?',detail:'Importe a resposta no celular para receber as alterações do PC e confirmar as alterações enviadas.',buttons:['Mais tarde','Guardar resposta'],defaultId:1,cancelId:0});
  if(reply.response===1)return {...result,...await exportFor(envelope.deviceId,grant)};
  return result;
 });
 for(const [name,fn] of Object.entries({rootExport,rootRestore,syncExport,syncImport}))ipcMain.handle('rest:archive:'+name,async event=>{trusted(event);return fn();});
 const click=fn=>()=>fn().then(r=>{if(r?.path)dialog.showMessageBox(window,{message:'Arquivo guardado.',detail:r.path});}).catch(e=>dialog.showErrorBox('Arquivos REST',e.message));
 return {rootExport,rootRestore,syncExport,syncImport,menu:{label:'Arquivos',submenu:[
  {label:'Criar backup root da instalação',click:click(rootExport)},{label:'Restaurar backup root',click:click(rootRestore)},{type:'separator'},
  {label:'Exportar sincronização para celular',click:click(syncExport)},{label:'Importar sincronização do celular',click:click(syncImport)}
 ]}};
};
