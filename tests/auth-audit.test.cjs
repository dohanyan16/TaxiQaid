// Local proof/telemetry tests only. Runtime cf metadata here is synthetic, not hosted provenance evidence.
const {test}=require('node:test'),assert=require('node:assert/strict');
const origin='https://review.example.workers.dev',secret='1'.repeat(64),trace='11111111-1111-4111-8111-111111111111',body=new TextEncoder().encode('{"identifier":"syntheticmaster","password":"SYNTHETIC_PRIVATE"}');
test('v2 trace is independent and HMAC-bound; trace stripping, replacement and v1 upgrade fail closed',async()=>{
 const m=await import('../supabase/functions/_shared/gateway-proof.mjs');
 async function request(include=true){const proof={ip:'192.0.2.1',origin,issued:Math.floor(Date.now()/1000),nonce:'a'.repeat(32),...(include?{trace}:{})};return new Request(m.GATEWAY_TARGET,{method:'POST',body,headers:{Origin:origin,'Content-Type':'application/json','x-taxiqaid-ip':proof.ip,'x-taxiqaid-issued':String(proof.issued),'x-taxiqaid-nonce':proof.nonce,'x-taxiqaid-mac':await m.signGateway(secret,proof,body),...(include?{'x-taxiqaid-trace':trace}:{})}});}
 assert.equal((await m.verifyGateway(await request(),secret)).trace,trace);assert.ok(await m.verifyGateway(await request(false),secret));
 for(const value of [null,'22222222-2222-4222-8222-222222222222','not-a-trace',trace+', '+trace]){const r=await request();if(value===null)r.headers.delete('x-taxiqaid-trace');else r.headers.set('x-taxiqaid-trace',value);assert.equal(await m.verifyGateway(r,secret),null);}
 const old=await request(false);old.headers.set('x-taxiqaid-trace',trace);assert.equal(await m.verifyGateway(old,secret),null);
});
test('gateway overwrites incoming trace; private audit only emits fixed fields/enums and verified non-secret linkage',async()=>{
 const {createGateway}=await import('../gateway/worker.mjs'),{verifyGateway}=await import('../supabase/functions/_shared/gateway-proof.mjs'),logs=[];let proof;
 const worker=createGateway(async(target,init)=>{proof=await verifyGateway(new Request(target,init),secret);return Response.json({error:'SYNTHETIC_PRIVATE'},{status:503});},Date.now,value=>logs.push(JSON.parse(value)));
 const r=new Request(origin+'/login-with-identifier',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1','x-taxiqaid-trace':trace,'x-forwarded-for':'198.51.100.1'},body});Object.defineProperty(r,'cf',{value:{colo:'SYNTHETIC'}});
 const response=await worker(r,{TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_GATEWAY_SECRET:secret});assert.equal(response.status,503);assert.ok(proof);assert.notEqual(proof.trace,trace);assert.equal(logs[0].trace,proof.trace);assert.notEqual(proof.trace.replaceAll('-',''),proof.nonce);assert.deepEqual(Object.keys(logs[0]),['schema','component','trace','event','http']);assert.equal(logs[0].event,'UPSTREAM_RESPONSE');assert.equal(response.headers.has('x-taxiqaid-trace'),false);
 for(const value of ['192.0.2.1','198.51.100.1',secret,proof.nonce,'SYNTHETIC_PRIVATE','syntheticmaster'])assert.equal(JSON.stringify(logs).includes(value),false);
});
test('audit rejects arbitrary fields/events and logging failure never affects admission',async()=>{
 const {authAudit}=await import('../supabase/functions/_shared/auth-audit.mjs'),logs=[],audit=authAudit('broker',trace,v=>logs.push(v));audit('SYNTHETIC_PRIVATE',200);audit('PROOF_VERIFIED','200');authAudit('unknown',trace,v=>logs.push(v))('PROOF_VERIFIED',200);authAudit('broker','192.0.2.1',v=>logs.push(v))('PROOF_VERIFIED',200);assert.equal(logs.length,0);authAudit('broker',trace,()=>{throw new Error('SYNTHETIC_PRIVATE');})('PROOF_VERIFIED',200);audit('PROOF_VERIFIED',200);assert.equal(logs.length,1);
});
