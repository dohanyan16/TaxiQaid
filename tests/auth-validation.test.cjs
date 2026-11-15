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
 const {validationCase,safeValidationResult,VALIDATION_CASES}=await policy();assert.equal(Object.keys(VALIDATION_CASES).length,6);assert.equal(Object.values(VALIDATION_CASES).reduce((a,b)=>a+b),53);
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
 assert.doesNotMatch(runtime,/signInWithPassword|service_role|BYPASSRLS|CREATE TABLE|ALTER ROLE|DELETE FROM|\.unsafe\(/);assert.match(runtime,/fetch_types:false/);assert.match(runtime,/scope:scopes\[caseId\]/);
});
