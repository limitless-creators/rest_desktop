export {};
declare global {
 interface Window {
 restDesktop: {
 auth:(action:string,payload?:any)=>Promise<any>;
 query:(payload:any)=>Promise<any>;
 rpc:(operation:string,payload:any)=>Promise<any>;
 attachment:(action:string,payload:any)=>Promise<any>;
 info:()=>Promise<{path:string;version:string;schema:number;isAdmin:boolean}>;
 backup:()=>Promise<any>;restore:()=>Promise<any>;importData:()=>Promise<any>;
 save:(name:string,bytes:ArrayBuffer|Uint8Array)=>Promise<any>;
 onSync:(callback:()=>void)=>()=>void;
 ufsaStatus:()=>Promise<"ready"|"offline"|"unavailable">;
 onUfsaFailure:(callback:()=>void)=>()=>void;
 rootExport:()=>Promise<any>;rootRestore:()=>Promise<any>;syncExport:()=>Promise<any>;syncImport:()=>Promise<any>;
 print:()=>Promise<any>;
 };
 }
}
