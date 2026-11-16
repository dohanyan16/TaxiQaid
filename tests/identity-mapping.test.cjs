// Mapping-boundary fixtures only. No real password, UID, Auth request or database connection.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',origin='https://mapping-review.example.invalid';
const request=()=>new Request(origin+'/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({identifier:'syntheticmanager',password:'SYNTHETIC_PRIVATE_PASSWORD'})});
async function setup(overrides={}){
 const {createLoginHandler}=await import('../supabase/functions/_shared/handlers.mjs');const events=[];
 const account={uid,email:'synthetic-private@example.invalid',status:'active',mappingRevision:'7'};
 const handler=createLoginHandler({origins:[origin],ready:true,rateSecret:'SYNTHETIC_MAPPING_RATE_SECRET_32_CHARS',clientIp:()=> '192.0.2.1',beginAttempt:async()=>({allowed:true,account}),passwordSignIn:async()=>{events.push('auth');return {user:{id:uid},session:{access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH'}};},loadAccess:async(subject,revision)=>{events.push('access');assert.equal(subject,uid);assert.equal(revision,'7');return {uid,account:{uid,status:'active',type:'management'}};},signOut:async()=>{events.push('revoke');return {error:null};},...overrides});
 return {handler,events,account};
}
test('an unprovisioned or legacy mapping reply cannot reach password Auth',async()=>{
 for(const revision of [undefined,null,'0','-1','1.5','9223372036854775808']){const {handler,events}=await setup({beginAttempt:async()=>({allowed:true,account:{uid,email:'synthetic-private@example.invalid',status:'active',mappingRevision:revision}})});const response=await handler(request());assert.equal(response.status,503);assert.deepEqual(events,[]);assert.equal((await response.text()).includes(uid),false);}
});
test('mapping revision is bound through official UID verification to the protected post-Auth access read',async()=>{
 const {handler,events}=await setup(),response=await handler(request());assert.equal(response.status,200);assert.deepEqual(events,['auth','access']);const body=await response.text();for(const value of [uid,'synthetic-private@example.invalid','mappingRevision','SYNTHETIC_PRIVATE_PASSWORD'])assert.equal(body.includes(value),false);
});
test('an email incorrectly associated with a different Auth UID never authenticates the requested account',async()=>{
 const {handler,events}=await setup({passwordSignIn:async()=>({user:{id:other},session:{access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH'}})});const response=await handler(request());assert.equal(response.status,401);assert.deepEqual(events,['revoke']);for(const value of [uid,other,'@example.invalid'])assert.equal((await response.clone().text()).includes(value),false);
});
test('an unknown identifier cannot return a directory entry even if the dummy Auth input unexpectedly creates a session',async()=>{
 const {handler,events}=await setup({beginAttempt:async()=>({allowed:true,account:null})});const response=await handler(request());assert.equal(response.status,401);assert.deepEqual(events,['auth','revoke']);const text=await response.text();assert.equal(text.includes(uid),false);assert.equal(text.includes('email'),false);assert.equal(text.includes('SYNTHETIC_ACCESS'),false);
});
test('mapping suspension or resynchronization during Auth denies admission and revokes its newly created session',async()=>{
 const {handler,events}=await setup({loadAccess:async(subject,revision)=>{assert.equal(subject,uid);assert.equal(revision,'7');throw new Error('SYNTHETIC_STALE_MAPPING');}});const response=await handler(request());assert.equal(response.status,503);assert.deepEqual(events,['auth','revoke']);assert.equal((await response.text()).includes('SYNTHETIC'),false);
});
test('disabled accounts remain denied even if a defective private adapter supplies a ready mapping',async()=>{
 const {handler,events}=await setup({beginAttempt:async()=>({allowed:true,account:{uid,email:'synthetic-private@example.invalid',status:'disabled',mappingRevision:'7'}})});const response=await handler(request());assert.equal(response.status,401);assert.deepEqual(events,['auth','revoke']);
});
test('review artifacts contain no managed Auth RLS mutation, runtime Auth grant or embedded private credential',()=>{
 const root=path.resolve(__dirname,'..'),review=path.join(root,'supabase/review/username-broker');
 for(const name of fs.readdirSync(review).filter(name=>name.endsWith('.sql'))){const source=fs.readFileSync(path.join(review,name),'utf8');assert.doesNotMatch(source,/ALTER\s+TABLE\s+auth\.users\s+(?:ENABLE|DISABLE|FORCE|NO\s+FORCE)\s+ROW\s+LEVEL\s+SECURITY/i);assert.doesNotMatch(source,/(?:CREATE|ALTER|DROP)\s+POLICY[^;]*ON\s+auth\.users/i);assert.doesNotMatch(source,/GRANT\s+SELECT[^;]*ON\s+auth\.users/i);assert.doesNotMatch(source,/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+auth\.users/i);}
 for(const file of ['supabase/functions/login-with-identifier/index.ts','supabase/functions/_shared/broker-store.ts','supabase/dashboard/login-with-identifier.ts']){const source=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(source,/sb_secret_[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY|postgres(?:ql)?:\/\/[^'"\s]+:[^'"\s]+@/);assert.doesNotMatch(source,/FROM\s+auth\.users|JOIN\s+auth\.users/i);}
});
