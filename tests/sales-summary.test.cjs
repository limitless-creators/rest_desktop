
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module');
const {buildSync}=require('esbuild'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file){
 const code=buildSync({entryPoints:[path.resolve(file)],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react-dom']}).outputFiles[0].text;
 const module=new Module(path.resolve('tests/compiled-sales.cjs'));
 module.filename=path.resolve('tests/compiled-sales.cjs');module.paths=Module._nodeModulePaths(process.cwd());module._compile(code,module.filename);
 return module.exports;
}
const {salesForDay,localDateKey}=load('src/lib/salesSummary.ts');
const Dashboard=load('src/components/DashboardView.tsx').default;
const sale=(totalAmount,saleDate='2026-09-27')=>({totalAmount,saleDate});
const invoice=(amount,status='Paid',issueDate='2026-09-27')=>({id:String(amount),amount,status,issueDate});
test('daily total combines direct sales and paid invoices and excludes other dates and unpaid invoices',()=>{
 const result=salesForDay([sale(100.25),sale(20),sale(999,'2026-09-26')],[invoice(50.15),invoice(888,'Pending'),invoice(777,'Overdue'),invoice(666,'Paid','2026-09-26')],'2026-09-27');
 assert.deepEqual(result,{total:170.4,count:3});
});
test('decimal amounts and empty dashboard are correct',()=>{
 assert.deepEqual(salesForDay([sale(0.1)],[invoice(0.2)],'2026-09-27'),{total:0.3,count:2});
 assert.deepEqual(salesForDay([],[],'2026-09-27'),{total:0,count:0});
});
test('local calendar date is independent of the UTC calendar boundary',()=>{
 const day={getFullYear:()=>2026,getMonth:()=>8,getDate:()=>28,toISOString:()=> '2026-09-27T22:30:00Z'};
 assert.equal(localDateKey(day),'2026-09-28');
});
test('rendered sales card displays paid invoice money and counts the same daily operations',()=>{
 const day=localDateKey();
 const html=renderToStaticMarkup(React.createElement(Dashboard,{
  transactions:[{id:'old',status:'Paid',transactionId:'FAC-old',client:'Old',amount:999}],
  stockItems:[],invoices:[invoice(150,'Paid',day),invoice(20,'Pending',day)],generalSales:[sale(50,day)],
  language:'pt',currency:'MZN',onNavigate:()=>{},onNewInvoice:()=>{},onAddStock:()=>{},onGenerateReport:()=>{},onNavigateToVendas:()=>{}
 }));
 const card=html.slice(html.indexOf('Vendas Hoje'),html.indexOf('Receita Mensal'));
 assert.match(card,/200,00 MT/);assert.match(card,/2 transac/);
});
