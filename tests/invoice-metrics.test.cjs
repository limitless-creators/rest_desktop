const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module');
const {buildSync}=require('esbuild');
const code=buildSync({entryPoints:[path.resolve('src/lib/db.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const compiled=new Module(path.resolve('tests/compiled-db.cjs'));compiled.filename=path.resolve('tests/compiled-db.cjs');compiled.paths=Module._nodeModulePaths(process.cwd());compiled._compile(code,compiled.filename);
const {fetchInvoices,createInvoice}=compiled.exports;
test('invoice metrics load all item pages and group numeric quantities under the correct invoice',async()=>{
 const invoices=[{id:'one',seq_number:1,client:'One',amount:'1',issue_date:'2026-09-27'},{id:'two',seq_number:2,client:'Two',amount:'2',issue_date:'2026-09-27'}];
 const items=Array.from({length:105},(_,i)=>({id:String(i),invoice_id:i<104?'one':'two',description:'Product '+i,quantity:'2.5',unit_price:'10.25'}));
 let itemPages=0;
 global.window={restDesktop:{query:async q=>{
  assert.ok(q.filters.some(f=>f.column==='user_id'&&f.value==='owner-metrics'));
  if(q.table==='invoice_items')itemPages++;
  const data=q.table==='invoices'?invoices:items;
  return {data:data.slice(q.range[0],q.range[1]+1),count:data.length,error:null};
 }}};
 const result=await fetchInvoices('owner-metrics');
 assert.equal(itemPages,2);assert.equal(result[0].items.length,104);assert.equal(result[1].items.length,1);
 assert.equal(result[1].items[0].description,'Product 104');assert.equal(result[1].items[0].quantity,2.5);assert.equal(result[1].items[0].unitPrice,10.25);
});
test('newly created invoices expose items immediately without reloading',async()=>{
 global.window={restDesktop:{rpc:async()=>({data:{id:'new',seq_number:3,client:'New',amount:'30',issue_date:'2026-09-27'},error:null})}};
 const items=[{description:'Mouse',quantity:3,unitPrice:10}];
 const result=await createInvoice({userId:'owner',client:'New',amount:30,status:'Paid'},items);
 assert.deepEqual(result.items,items);assert.notEqual(result.items[0],items[0]);
});
