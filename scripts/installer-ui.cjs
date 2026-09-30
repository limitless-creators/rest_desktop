// Scale NSIS dialog resources in place: no additional runtime is needed.
// Input resources retain their NSIS license; this creates an altered UI template.
const fs=require('fs'),path=require('path');
const root=process.env.NSIS_HOME||path.join(process.env.LOCALAPPDATA,'electron-builder/Cache/nsis-3.0.4.1/nsis-3.0.4.1-1mx3n');
function patch(input,output){
 const b=fs.readFileSync(input),pe=b.readUInt32LE(0x3c),n=b.readUInt16LE(pe+6),optSize=b.readUInt16LE(pe+20),opt=pe+24;
 const sections=Array.from({length:n},(_,i)=>{const o=opt+optSize+i*40;return {rva:b.readUInt32LE(o+12),size:b.readUInt32LE(o+8),raw:b.readUInt32LE(o+20)}});
 const raw=rva=>{const s=sections.find(s=>rva>=s.rva&&rva<s.rva+s.size);if(!s)throw Error('Invalid RVA');return s.raw+rva-s.rva};
 const base=raw(b.readUInt32LE(opt+112));
 const skip=o=>{if(b.readUInt16LE(o)===0xffff)return o+4;while(b.readUInt16LE(o)!==0)o+=2;return o+2;};
 const xy=(o,sx,sy)=>{for(let i=0;i<4;i++)b.writeInt16LE(Math.round(b.readInt16LE(o+i*2)*(i%2?sy:sx)),o+i*2)};
 function dialog(o,id){
  const extended=b.readUInt16LE(o)===1&&b.readUInt16LE(o+2)===0xffff;
  const style=b.readUInt32LE(o+(extended?12:0)),count=b.readUInt16LE(o+(extended?16:8));
  xy(o+(extended?18:10),1.5,1.45);
  let p=o+(extended?26:18);p=skip(skip(skip(p)));
  if(style&0x40){p+=extended?6:2;p=skip(p)}
  for(let i=0;i<count;i++){
   p=(p+3)&~3;xy(p+(extended?12:8),1.5,1.45);p+=extended?24:18;p=skip(skip(p));const extra=b.readUInt16LE(p);p+=extra||2;
  }
  console.log('Scaled dialog '+id+' ('+count+' controls)');
 }
 function walk(dir,level,ids){
  const o=base+dir,count=b.readUInt16LE(o+12)+b.readUInt16LE(o+14);
  for(let i=0;i<count;i++){const e=o+16+i*8,id=b.readUInt32LE(e),next=b.readUInt32LE(e+4);if(level===0&&id!==5)continue;
   if(next&0x80000000)walk(next&0x7fffffff,level+1,ids.concat(id));
   else if(ids[0]===5)dialog(raw(b.readUInt32LE(base+next)),ids[1]);
  }
 }
 walk(0,0,[]);fs.writeFileSync(output,b);
}
fs.mkdirSync('build/installer',{recursive:true});
patch(path.join(root,'Contrib/UIs/modern.exe'),'build/installer/modern-rest.exe');
patch(path.join(root,'Contrib/UIs/modern_headerbmpr.exe'),'build/installer/header-rest.exe');
fs.mkdirSync('build/x86-unicode',{recursive:true});
fs.copyFileSync('build/vendor/nsisSlideshow/bin/nsisSlideshowW.dll','build/x86-unicode/nsisSlideshow.dll');
