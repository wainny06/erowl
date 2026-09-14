const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(file,mocks={}){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:n=>n in mocks?mocks[n]:require(n),process,console,Response,Request,Date,Map,Buffer,URL,AbortSignal,setTimeout});return exports;}
(async()=>{
 const auth=load('lib/http.ts');
 const model=load('lib/daily-model.ts');assert.equal(model.previousKoreanDate(new Date('2026-12-31T15:00:00Z')),'2026-12-31');assert.equal(model.koreanDate(new Date('2026-12-31T15:00:00Z')),'2027-01-01');assert(!model.validDate('2026-02-30'));assert(!model.validDate('../secret'));
 let calls=0,fail=false;const files=new Map();process.env.BLOB_READ_WRITE_TOKEN='mock';
 const inventory={products:[{id:'1',name:'=BAD()',category:'환',quantity:5,minimum:8,unit:'개',note:'메모'},...JSON.parse(fs.readFileSync('data/import-20260914.json','utf8')).map(p=>({...p,quantity:p.opening,minimum:null}))]};
 const daily=load('lib/daily.ts',{'@/lib/daily-model':model,'@/lib/inventory':{rpc:async()=>{calls++;return Response.json(fail?{error:'down'}:inventory,{status:fail?503:200})}},'@vercel/blob':{
 get:async path=>files.has(path)?{statusCode:200,stream:new Response(files.get(path)).body}:null,
 put:async(path,data,opts)=>{assert.equal(opts.access,'private');assert.equal(opts.allowOverwrite,false);if(files.has(path))throw Error('exists');files.set(path,data);},
 list:async()=>({blobs:[...files.keys()].map(pathname=>({pathname})),hasMore:false})}});
 delete process.env.BLOB_READ_WRITE_TOKEN;delete process.env.VERCEL_OIDC_TOKEN;process.env.BLOB_STORE_ID='store_test';assert(daily.blobConfigured());
 delete process.env.BLOB_STORE_ID;assert(!daily.blobConfigured());process.env.BLOB_STORE_ID='store_test';
 const first=await daily.captureDaily('2026-09-14','scheduled');assert(first.created);assert.equal(first.report.products[0].quantity,5);assert.equal(first.report.products.filter(p=>p.inventory_group==='treatment').length,29);assert.equal(first.report.products.filter(p=>p.inventory_group==='pharmacopuncture').length,9);assert.equal(first.report.products.find(p=>p.name==='태반').unit,'바이알');assert(first.report.products.some(p=>p.name==='알콜'));assert.equal(first.report.products[0].inventory_group,'medicine');
 inventory.products[0].quantity=99;const second=await daily.captureDaily('2026-09-14','scheduled');assert(!second.created);assert.equal(second.report.products[0].quantity,5);assert.equal(calls,1);
 fail=true;await assert.rejects(()=>daily.captureDaily('2026-09-15','scheduled'));assert.equal(files.size,1);
 const csv=model.reportCsv(first.report);assert(csv.includes("'=BAD()"));assert(csv.includes('실제 저장 시각'));
 let hits=0;const publicApi=load('app/api/inventory/route.ts',{'@/lib/http':auth,'@/lib/inventory':{rpc:()=>{hits++;return Response.json({products:[]});}}});assert.equal((await publicApi.GET()).status,200);assert.equal(hits,1);
 assert.equal((await publicApi.POST(new Request('http://localhost/api/inventory',{method:'POST',headers:{origin:'https://evil.example',host:'localhost'}}))).status,403);assert.equal(hits,1);hits=0;
 const cron=load('app/api/cron/daily/route.ts',{'@/lib/http':auth,'@/lib/daily-model':model,'@/lib/daily':{captureDaily:()=>{hits++;}}});delete process.env.CRON_SECRET;assert.equal((await cron.GET(new Request('http://localhost/api/cron/daily'))).status,401);assert.equal(hits,0);
 console.log('PASS: public API access, cross-origin write rejection, cron auth, KST dates, immutable private snapshots, source failure, CSV escaping.');
})().catch(e=>{console.error(e);process.exitCode=1});
