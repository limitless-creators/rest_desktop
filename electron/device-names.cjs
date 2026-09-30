const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {safeStorage}=require('electron'),show=require('./custom-dialog.cjs');
const clean=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>60)throw Error('Use um nome de 1 a 60 caracteres.');return value.trim();};
async function choose(window,root,userId,manage=false){
 if(!safeStorage.isEncryptionAvailable())throw Error('A proteção de chaves do Windows não está disponível.');
 const file=path.join(root,'mobile-devices.enc');
 const read=()=>fs.existsSync(file)?JSON.parse(safeStorage.decryptString(fs.readFileSync(file))):{};
 const all=read(),list=Object.entries(all).filter(([,g])=>g.userId===userId);
 if(!list.length)throw Error('Ainda não existem celulares emparelhados nesta conta.');
 const result=await show(window,{title:manage?'Os meus celulares':'Enviar atualização',description:manage?'Dê um nome a cada celular para o reconhecer facilmente.':'Escolha o celular que vai receber a atualização. Pode editar os nomes abaixo.',items:list.map(([id,g],i)=>({id,label:g.name||'Celular '+(i+1)})),editNames:true,submit:manage?'Guardar nomes':'Selecionar celular'});
 if(!result)return null;
 if(!list.some(([id])=>id===result.choice))throw Error('Celular inválido.');
 const latest=read();
 for(const [id] of list){if(!latest[id]||latest[id].userId!==userId)throw Error('Os celulares autorizados mudaram. Abra novamente a lista.');latest[id].name=clean(result.names?.[id]);}
 const temp=file+'.'+randomUUID()+'.tmp';
 try{fs.writeFileSync(temp,safeStorage.encryptString(JSON.stringify(latest)),{flag:'wx'});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
 return {id:result.choice,grant:latest[result.choice]};
}
module.exports={choose,clean};
