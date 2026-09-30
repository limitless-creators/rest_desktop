import {validateReceipt} from '../../shared/receipts';
export async function uploadReceiptImage(file:File,_userId:string):Promise<string>{
 validateReceipt(file.type,file.size);
 const result=await window.restDesktop.attachment('upload',{mime:file.type,bytes:new Uint8Array(await file.arrayBuffer())});
 return result.key;
}
export async function fetchReceiptObjectUrl(reference:string):Promise<string>{
 const result=await window.restDesktop.attachment('download',{key:reference});
 return URL.createObjectURL(new Blob([result.bytes],{type:result.mime}));
}
