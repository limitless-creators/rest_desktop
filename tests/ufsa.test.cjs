const {test}=require('node:test'),assert=require('node:assert/strict');
const {isUfsaUrl,checkUfsa}=require('../electron/ufsa.cjs');
test('UFSA network access is limited to its HTTPS hosts',()=>{
 assert.ok(isUfsaUrl('https://www.ufsa.gov.mz/concursos'));
 for(const url of ['http://www.ufsa.gov.mz','https://www.ufsa.gov.mz.evil.test','https://evil.test','file:///test']) assert.equal(isUfsaUrl(url),false);
});
test('UFSA differentiates connectivity failures, portal errors and success',async()=>{
 assert.equal(await checkUfsa(async()=>{throw Error('Offline')}),'offline');
 assert.equal(await checkUfsa(async()=>({ok:false,url:'https://www.ufsa.gov.mz'})),'unavailable');
 assert.equal(await checkUfsa(async()=>({ok:true,url:'https://www.ufsa.gov.mz/'})),'ready');
 assert.equal(await checkUfsa(async()=>({ok:true,url:'https://other.test/'})),'unavailable');
});

test('Electron successful responses can omit the URL without blocking the portal', async()=>{
 assert.equal(await checkUfsa(async()=>({ok:true,url:''})),'ready');
});
