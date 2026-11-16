// Administrator authorization/status-only boundary tests. All identities, tokens and errors are synthetic.
const {test}=require('node:test'),assert=require('node:assert/strict');
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',token='synthetic.header.signature',project='https://mqkflwsvnzcaylxtvsje.supabase.co',instant=Date.parse('2026-11-11T12:00:00Z');
const values={TAXIQAID_POOLER_DIAGNOSTIC_ENABLED:'true',TAXIQAID_POOLER_DIAGNOSTIC_ADMIN_UID:uid,TAXIQAID_POOLER_DIAGNOSTIC_EXPIRES_AT:'2026-11-11T12:10:00Z'};
function request(changes={}){return new Request(project+'/functions/v1/check-broker-pooler',{method:'POST',headers:{origin:project,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',...changes});}
async function setup(options={}){
 const core=await import('../supabase/functions/_diagnostics/pooler-core.mjs'),calls=[];
 const handler=core.createPoolerDiagnosticHandler({env:name=>(options.values||values)[name],now:options.now||(()=>instant),verifyUser:async jwt=>{calls.push('auth');assert.equal(jwt,token);return options.user===undefined?{id:uid,aud:'authenticated',role:'authenticated',is_anonymous:false}:options.user;},probe:async()=>{calls.push('database');return Object.fromEntries(core.POOLER_CHECKS.map(key=>[key,'PASS']));},...options.deps});
 return {handler,calls,core};
}
test('missing JWT, a publishable key and malformed Bearer input cannot reach Auth or the database',async()=>{
 for(const authorization of ['', 'Bearer sb_publishable_SYNTHETIC_PUBLIC','Bearer invalid']){const {handler,calls}=await setup(),response=await handler(request({headers:{authorization,'Content-Type':'application/json'}}));assert.equal(response.status,401);assert.deepEqual(calls,[]);assert.ok(Object.values(await response.json()).every(value=>value==='FAIL'));}
});
test('disabled, missing, expired or overly long diagnostic windows fail closed without authentication or DB work',async()=>{
 for(const changed of [{TAXIQAID_POOLER_DIAGNOSTIC_ENABLED:'false'},{TAXIQAID_POOLER_DIAGNOSTIC_ADMIN_UID:''},{TAXIQAID_POOLER_DIAGNOSTIC_EXPIRES_AT:'2026-11-11T11:59:59Z'},{TAXIQAID_POOLER_DIAGNOSTIC_EXPIRES_AT:'2026-11-11T12:16:00Z'}]){const {handler,calls}=await setup({values:{...values,...changed}});assert.equal((await handler(request())).status,503);assert.deepEqual(calls,[]);}
});
test('Auth must verify the exact administrator UID; metadata, anonymous users and other project identities grant nothing',async()=>{
 for(const user of [null,{id:other,aud:'authenticated',role:'authenticated',user_metadata:{id:uid,role:'super_admin'}},{id:uid,aud:'authenticated',role:'authenticated',is_anonymous:true},{id:uid,aud:'anon',role:'anon'}]){const {handler,calls}=await setup({user});assert.equal((await handler(request())).status,403);assert.deepEqual(calls,['auth']);}
});
test('the verified owner-authorized administrator is checked before probe and only fixed PASS/FAIL fields leave the endpoint',async()=>{
 const {handler,calls,core}=await setup(),response=await handler(request());assert.equal(response.status,200);assert.deepEqual(calls,['auth','database']);const body=await response.json();assert.deepEqual(Object.keys(body),core.POOLER_CHECKS);assert.ok(Object.values(body).every(value=>value==='PASS'));assert.match(response.headers.get('Cache-Control'),/no-store/);assert.equal(JSON.stringify(body).includes(uid),false);
});
test('only an empty POST and exact approved browser origin are accepted',async()=>{
 for(const changed of [{method:'GET',body:undefined},{headers:{origin:'https://unapproved.invalid',authorization:'Bearer '+token}},{body:JSON.stringify({uid})},{body:'{"role":"admin"}'}]){const {handler,calls}=await setup();assert.ok([400,403,405].includes((await handler(request(changed))).status));assert.deepEqual(calls,[]);}
 const {handler,calls}=await setup();assert.equal((await handler(new Request(project+'/functions/v1/check-broker-pooler?role=postgres',{method:'POST',headers:{authorization:'Bearer '+token}}))).status,405);assert.deepEqual(calls,[]);
});
test('a window expiring during Auth verification prevents opening the connection',async()=>{
 let current=instant;const {handler,calls}=await setup({now:()=>current,deps:{verifyUser:async()=>{current=instant+11*60000;return {id:uid,aud:'authenticated',role:'authenticated'};}}});assert.equal((await handler(request())).status,403);assert.deepEqual(calls,[]);
});
test('concurrent approved requests share only a per-isolate one-flight guard and do not open a second pool',async()=>{
 let finish,probes=0;const {handler,core}=await setup({deps:{probe:()=>{probes++;return new Promise(resolve=>finish=resolve);}}});const first=handler(request());await new Promise(resolve=>setImmediate(resolve));assert.equal((await handler(request())).status,429);finish(Object.fromEntries(core.POOLER_CHECKS.map(key=>[key,'PASS'])));assert.equal((await first).status,200);assert.equal(probes,1);
});
test('Auth/probe exceptions, unknown fields and private error text cannot leak through statuses',async()=>{
 for(const deps of [{verifyUser:async()=>{throw new Error('SYNTHETIC_PRIVATE_TOKEN_AND_EMAIL');}},{probe:async()=>{throw new Error('SYNTHETIC_PRIVATE_DATABASE_URL');}},{probe:async()=>({configuration:'PASS',administrator_authorization:'PASS',private_response:'SYNTHETIC_PRIVATE_RESPONSE'})}]){const {handler}=await setup({deps}),response=await handler(request());assert.ok([401,503].includes(response.status));const body=await response.json();assert.ok(Object.values(body).every(value=>['PASS','FAIL'].includes(value)));assert.equal(JSON.stringify(body).includes('SYNTHETIC'),false);assert.equal(body.overall,'FAIL');}
});
