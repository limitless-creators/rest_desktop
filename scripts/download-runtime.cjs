const {spawn}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
(async()=>{
 const total=158184819,parts=16,size=Math.ceil(total/parts),folder=path.resolve('vendor/parts');fs.mkdirSync(folder,{recursive:true});
 const url='https://github.com/electron/electron/releases/download/v44.4.5/electron-v44.4.5-win32-x64.zip';
 await Promise.all(Array.from({length:parts},(_,i)=>new Promise((resolve,reject)=>{
 const start=i*size,end=Math.min(total-1,start+size-1),file=path.join(folder,String(i)+'.part');
 const child=spawn('curl.exe',['-L','--fail','--silent','--show-error','--max-time','600','--range',start+'-'+end,url,'-o',file],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let err='';child.stderr.on('data',d=>err+=d);child.on('exit',code=>{if(code!==0||fs.statSync(file).size!==end-start+1)reject(Error('Parte '+i+': '+err));else{console.log('Parte '+(i+1)+'/'+parts+' concluída');resolve();}});
 })));
 const data=Buffer.concat(Array.from({length:parts},(_,i)=>fs.readFileSync(path.join(folder,String(i)+'.part'))));
 const expected=require('../node_modules/electron/checksums.json')['electron-v44.4.5-win32-x64.zip'];
 const actual=crypto.createHash('sha256').update(data).digest('hex');if(actual!==expected)throw Error('Checksum incorrecto: '+actual);
 fs.writeFileSync('vendor/electron-verified.zip',data);console.log('Download oficial verificado: '+actual);
})().catch(e=>{console.error(e);process.exitCode=1;});
