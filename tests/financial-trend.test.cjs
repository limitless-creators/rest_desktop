const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm');
const file = fs.existsSync(path.join(__dirname, '../src/lib/financialTrend.ts')) ? '../src/lib/financialTrend.ts' : '../lib/financialTrend.ts';
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: mod, exports: mod.exports, Date, Intl });
const { financialTrend, trendGeometry } = mod.exports;
test('daily trend fills empty days and excludes data outside the selected period', () => {
 const data = financialTrend([{issueDate:'2026-09-01',amount:100.25},{issueDate:'2026-09-01',amount:0.1},{issueDate:'2026-08-31',amount:999}], [{expenseDate:'2026-09-03',amount:25}],new Date(2026,8,1),new Date(2026,8,3,23),'pt');
 assert.equal(data.length,3);assert.equal(data[0].a,100.35);assert.equal(data[1].a,0);assert.equal(data[2].b,25);assert.equal(data[0].key,'2026-09-01');
});
test('monthly trend includes partial boundary months and changes year correctly', () => {
 const data = financialTrend([{issueDate:'2025-12-31',amount:100},{issueDate:'2026-01-31',amount:50}],[],new Date(2025,11,20),new Date(2026,1,2),'en');
 assert.equal(data.length,3);assert.equal(data[0].a,100);assert.equal(data[1].a,50);assert.equal(data[2].key,'2026-02');
});
test('invalid and reversed periods return no points',()=>{
 assert.equal(financialTrend([],[],new Date('invalid'),new Date(),'pt').length,0);
 assert.equal(financialTrend([],[],new Date(2026,9,1),new Date(2026,8,1),'pt').length,0);
});
test('chart geometry clamps selection and handles zero, single and negative values',()=>{
 for(const data of [[{a:0,b:0}],[{a:-50,b:100},{a:25,b:50}]]){
  const g=trendGeometry(data,320,210);
  assert.ok(!g.path('a').includes('NaN'));assert.ok(!g.area('b').includes('Infinity'));
  assert.equal(g.nearest(-1000),0);assert.equal(g.nearest(10000),data.length-1);
  for(const p of data) assert.ok(g.y(p.a)>=g.top && g.y(p.a)<=g.bottom);
 }
});
