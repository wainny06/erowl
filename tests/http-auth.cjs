const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3011'],{env:{...process.env,STOCK_PASSWORD:'Local-test-password-only-2026',SUPABASE_URL:'',SUPABASE_SECRET_KEY:''},stdio:['ignore','pipe','pipe']});
(async()=>{
 await new Promise((res,rej)=>{const timer=setTimeout(()=>rej(Error('startup timeout')),20000);server.stdout.on('data',d=>{if(d.toString().includes('Ready')){clearTimeout(timer);res()}});server.on('exit',c=>rej(Error('exit '+c)));server.stderr.on('data',d=>process.stderr.write(d));});
 const base='http://127.0.0.1:3011';const call=(p,o={})=>fetch(base+p,{...o,redirect:'manual'});
 assert.equal((await call('/')).status,307);assert.equal((await call('/api/inventory')).status,401);assert.equal((await call('/api/daily')).status,401);assert.equal((await call('/api/cron/daily')).status,401);
 const login=(password,origin=base)=>call('/api/login',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({password})});
 assert.equal((await login('wrong')).status,401);assert.equal((await login('Local-test-password-only-2026','https://evil.example')).status,403);
 const result=await login('Local-test-password-only-2026');assert.equal(result.status,200);const cookie=result.headers.get('set-cookie');assert(cookie.includes('HttpOnly')&&cookie.includes('SameSite=strict'));
 assert.equal((await call('/api/inventory',{headers:{cookie}})).status,503);
 assert.equal((await call('/api/inventory',{method:'POST',headers:{cookie,origin:'https://evil.example'},body:'{}'})).status,403);
 assert.equal((await call('/daily',{headers:{cookie}})).status,200);
 console.log('PASS: built HTTP server login, anonymous protection, cookies, protected page and cross-origin rejection.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
