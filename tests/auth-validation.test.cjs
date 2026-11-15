// Public source and synthetic cryptography only. No hosted request or private grant is used.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const policy=()=>import('../supabase/functions/_shared/validation-policy.mjs');
test('validation grant has an exact server-only identity and a maximum fifteen-minute lifetime',async()=>{
 const {validationGrant}=await policy(),now=Math.floor(Date.now()/900000)*900000+120000,grant={id:'00000000-0000-4000-8000-000000000001',ownerUid:'00000000-0000-4000-8000-000000000002',issuedAt:Math.floor(now/1000),expiresAt:Math.floor(now/900000)*900+890};
 assert.ok(validationGrant(JSON.stringify(grant),now));for(const value of [null,{}, {...grant,extra:true},{...grant,expiresAt:grant.expiresAt+1},{...grant,expiresAt:grant.issuedAt},{...grant,issuedAt:grant.issuedAt+20},{...grant,ownerUid:'super_admin'}])assert.equal(validationGrant(JSON.stringify(value),now),null);
 assert.equal(validationGrant(JSON.stringify(grant),grant.expiresAt*1000),null);
});
test('private validation MAC binds the verified bearer, grant and ordinary signed gateway proof',async()=>{
 const {signValidation,verifyValidation}=await policy(),secret='1'.repeat(64),grant={id:'synthetic',ownerUid:'synthetic-owner',issuedAt:1,expiresAt:901},token='synthetic.jwt.signature',mac='2'.repeat(64),signature=await signValidation(secret,grant,token,mac);
 assert.ok(await verifyValidation(secret,grant,token,mac,signature));for(const args of [[secret,{...grant,ownerUid:'other'},token,mac,signature],[secret,grant,token+'x',mac,signature],[secret,grant,token,'3'.repeat(64),signature],['4'.repeat(64),grant,token,mac,signature],[secret,grant,token,mac,'invalid']])assert.equal(await verifyValidation(...args),false);
});
test('validation accepts only six fixed cases and strictly filters status/count output',async()=>{
 const {validationCase,safeValidationResult,VALIDATION_CASES,VALIDATION_EXPECTATIONS}=await policy();assert.equal(Object.keys(VALIDATION_CASES).length,6);assert.equal(Object.values(VALIDATION_CASES).reduce((a,b)=>a+b),53);
 assert.equal(Object.values(VALIDATION_EXPECTATIONS).reduce((sum,value)=>sum+value[4]+2*value[5],0),213);
 for(const name of Object.keys(VALIDATION_CASES))assert.equal(await validationCase(new Request('https://fixture.invalid/auth-validation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({case:name})})),name);
 for(const input of [{case:'arbitrary'},{case:'ip-base',identifier:'dohanyan'},{case:'ip-base',password:'synthetic'}, {case:'x'.repeat(200)}])await assert.rejects(validationCase(new Request('https://fixture.invalid/auth-validation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})));
 const raw={case:'ip-base',result:'PASS',scope:'IP_BASE',probes:10,allowed:10,denied:0,canary:false,dbMinute:1,dbQuarter:0,expiresAt:900,sqlQueries:30,sqlTransactions:2};assert.deepEqual(safeValidationResult(raw),raw);
 for(const value of [{...raw,email:'private@example.invalid'},{...raw,ip:'192.0.2.1'},{...raw,token:'synthetic'},{...raw,probes:11},{...raw,sqlQueries:41},{...raw,sqlTransactions:5},{...raw,denied:1},{...raw,scope:'SQL_GLOBAL_ONLY'},{...raw,allowed:0,probes:0},{...raw,sqlQueries:0}])assert.throws(()=>safeValidationResult(value));
});
test('both gateways share provenance guards; validation is unavailable without owner authorization and closed gates',async()=>{
 const {createGatewayRouter}=await import('../gateway/worker.mjs');let calls=0;const router=createGatewayRouter(async()=>{calls++;throw new Error('Must not reach upstream.');}),origin='https://review.example.workers.dev';
 const request=()=>new Request(origin+'/auth-validation',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1'},body:'{"case":"ip-base"}'});
 for(const env of [{},{TAXIQAID_GATEWAY_ENABLED:'false'},{TAXIQAID_GATEWAY_ENABLED:'true'}])assert.equal((await router(request(),{...env,TAXIQAID_GATEWAY_ORIGIN:origin})).status,403);assert.equal(calls,0);
 assert.equal((await router(new Request(origin+'/login-with-identifier'),{TAXIQAID_GATEWAY_ORIGIN:origin})).status,405);
});
test('validation packaging is deterministic and its browser helper cannot activate public login or persist data',()=>{
 execFileSync(process.execPath,['scripts/build-auth-validation.cjs','--check'],{stdio:'pipe'});
 const browser=fs.readFileSync('scripts/_auth_validation/browser.js','utf8'),runtime=fs.readFileSync('supabase/functions/_diagnostics/validation-runtime.ts','utf8');
 assert.match(browser,/maximumHttpIncludingServerCalls:29/);assert.match(browser,/bootstrap:1,control:6,logout:2/);assert.match(browser,/autoRefreshToken:false/);assert.match(browser,/persistSession:false/);assert.match(browser,/issuedToken|token=null/);
 assert.doesNotMatch(browser,/['"]cf-connecting-ip['"]\s*:/);for(const header of ['x-real-ip','x-forwarded-for','x-taxiqaid-ip'])assert.ok(browser.includes("'"+header+"':"));
 assert.doesNotMatch(runtime,/signInWithPassword|service_role|BYPASSRLS|CREATE TABLE|ALTER ROLE|DELETE FROM|\.unsafe\(/);assert.match(runtime,/fetch_types:false/);assert.match(runtime,/scope:scopes\[caseId\]/);
});
test('protected Worker retains Cloudflare source and maps broker 403 to 503; a bare 403 is not broker attribution',async()=>{
 const {createValidationGateway}=await import('../gateway/validation.mjs'),{verifyGateway,GATEWAY_TARGET}=await import('../supabase/functions/_shared/gateway-proof.mjs'),{VALIDATION_PROJECT}=await policy();
 const now=Math.floor(Date.now()/900000)*900000+120000,uid='00000000-0000-4000-8000-000000000001',origin='https://review.example.workers.dev',secret='1'.repeat(64),grant={id:'00000000-0000-4000-8000-000000000002',ownerUid:uid,issuedAt:now/1000,expiresAt:now/1000+600};
 const env={TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ENABLED:'false',TAXIQAID_GATEWAY_SECRET:secret,TAXIQAID_VALIDATION_GRANT:JSON.stringify(grant)};
 const request=(ip='192.0.2.5')=>{const r=new Request(origin+'/auth-validation',{method:'POST',headers:{Origin:origin,Authorization:'Bearer c3ludGhldGlj.anNvbmludGVybmFs.c2lnbmF0dXJl','Content-Type':'application/json','cf-connecting-ip':ip,'x-real-ip':'198.51.100.42','x-forwarded-for':'198.51.100.43','x-taxiqaid-ip':'198.51.100.44'},body:'{"case":"ip-spoof"}'});Object.defineProperty(r,'cf',{value:{colo:'SYNTHETIC'}});return r;};
 for(const mode of ['broker-403','auth-403','malformed-upstream','valid-control']){
  let calls=0;const handler=createValidationGateway(async(input,init)=>{
   calls++;if(String(input)===VALIDATION_PROJECT+'/auth/v1/user')return Response.json({id:uid,aud:'authenticated',role:'authenticated'}, {status:mode==='auth-403'?403:200});
   assert.equal(String(input),GATEWAY_TARGET);const headers=new Headers(init.headers);assert.equal(headers.get('x-real-ip'),null);assert.equal(headers.get('x-forwarded-for'),null);assert.equal(headers.get('cf-connecting-ip'),null);assert.equal(headers.get('x-taxiqaid-ip'),'192.0.2.5');assert.ok(await verifyGateway(new Request(String(input),init),secret,now));
   if(mode==='valid-control')return Response.json({case:'ip-spoof',result:'PASS',scope:'IP_SPOOF',probes:2,allowed:1,denied:1,canary:true,dbMinute:Math.floor(now/60000),dbQuarter:Math.floor(now/900000),expiresAt:grant.expiresAt,sqlQueries:22,sqlTransactions:2});
   return mode==='malformed-upstream'?Response.json({private:'SYNTHETIC_PRIVATE'}):Response.json({result:'FAIL'},{status:403});
  },()=>now);
  const response=await handler(request(),env);assert.equal(response.status,mode==='broker-403'?503:mode==='valid-control'?200:403);const raw=await response.json();if(mode==='valid-control'){assert.equal(raw.result,'PASS');assert.equal(raw.denied,1);assert.equal(raw.canary,true);}else assert.deepEqual(raw,{result:'FAIL'});assert.equal(calls,mode==='auth-403'?1:2);
 }
 let calls=0;const denied=createValidationGateway(async()=>{calls++;throw new Error('Must fail before Auth.');},()=>now);
 assert.equal((await denied(request('198.51.100.41, 192.0.2.5'),env)).status,403);assert.equal(calls,0);
});
