// Sanitized offline fixtures, never genuine username authentication.
const {test}=require('node:test'),assert=require('node:assert/strict');
const contract=require('../shared/auth-contract.js'),catalog=require('../shared/permission-catalog.js'),model=require('../shared/permission-model.js'),clients=require('../shared/auth-client.js');
const uid='synthetic-uid',origin='https://review.example.invalid';
const flat=()=>({uid,accountType:'management',status:'active',role:'super_admin',username:'syntheticmanager',fullName:'Synthetic Manager',roleDefaults:catalog.ALL.filter(p=>p.audience!=='Driver').map(p=>p.key),overrides:{},departments:['it'],scope:{departments:[],driverRecordRefs:[],documentIds:[]}});
const nested=()=>({version:1,uid,account:{uid,type:'management',status:'active',role:'super_admin',username:'syntheticmanager',fullName:'Synthetic Manager'},permissions:{roleDefaults:flat().roleDefaults,overrides:{}},departments:['it']});
const request=(body={identifier:'syntheticmanager',password:'SYNTHETIC_PASSWORD'})=>new Request(origin+'/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
async function harness(changes={}){
 const {createLoginHandler}=await import('../supabase/functions/_shared/handlers.mjs');const events=[];
 const deps={origins:[origin],ready:true,rateSecret:'SYNTHETIC_RATE_SECRET_32_CHARACTERS_ONLY',clientIp:()=> '192.0.2.1',beginAttempt:async(identifier,keys)=>{events.push('attempt');assert.equal(identifier,'syntheticmanager');assert.equal(new Set(keys).size,3);assert.ok(keys.every(k=>/^[0-9a-f]{64}$/.test(k)));return {allowed:true,account:{uid,email:'synthetic-private@example.invalid',status:'active',mappingRevision:'1'}};},passwordSignIn:async()=>{events.push('auth');return {user:{id:uid},session:{access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH',user:{email:'synthetic-private@example.invalid'}}};},loadAccess:async()=>{events.push('access');return nested();},signOut:async()=>{events.push('revoke');return {error:null};},...changes};
 return {events,handler:createLoginHandler(deps)};
}
test('existing top-level access response normalizes without granting role-name or department bypasses',()=>{
 const raw=flat(),context=contract.access(raw,uid,Date.now()/1000+3600);assert.equal(context.fullName,'Synthetic Manager');assert.equal(catalog.ALL.filter(p=>model.draftDecision(p.key,context).allowed).length,101);assert.equal(model.can(context,'driver-portal.sign',{ownerUid:uid}),false);assert.equal(model.can(context,'helpdesk.update-status',{assignedDepartment:'HR'}),false);assert.equal(context.expiresAt<=Date.now()+60000,true);
});
test('flat boolean overrides preserve denial and dependencies; missing metadata is never invented',()=>{
 const raw=flat();raw.overrides={'fuel.view':false,'fuel.create':true};assert.equal(model.can(contract.access(raw,uid,Date.now()/1000+3600),'fuel.create'),false);
 raw.overrides=[{permission_key:'fuel.view',is_allowed:true},{permission_key:'fuel.view',is_allowed:false}];assert.equal(contract.access(raw,uid,Date.now()/1000+3600).overrides['fuel.view'],'deny');
 for(const field of ['status','fullName','username','roleDefaults','overrides','departments']){const incomplete=flat();delete incomplete[field];assert.throws(()=>contract.access(incomplete,uid,Date.now()/1000+3600));}
 assert.throws(()=>contract.access({...flat(),uid:'another'},uid,Date.now()/1000+3600));assert.throws(()=>contract.access({...flat(),accountType:'driver',iqama:'1000000001',driverRecordRef:'invented'},uid,Date.now()/1000+3600));
});
test('enabled development client rejects Iqama without calling broker or creating identities',async()=>{
 let calls=0;const client=clients.create({client:{auth:{}},url:origin,key:'public',enabled:true,fetcher:async()=>{calls++;throw new Error('Forbidden.');}});await assert.rejects(client.login('1000000001','synthetic'),/provisioning/);assert.equal(calls,0);client.destroy();
});
test('successful broker returns only official session transport fields after committed attempt and own access',async()=>{
 const {handler,events}=await harness(),response=await handler(request()),data=await response.json();assert.equal(response.status,200);assert.deepEqual(events,['attempt','auth','access']);assert.deepEqual(Object.keys(data).sort(),['access_token','refresh_token','token_type']);assert.equal(JSON.stringify(data).includes('@'),false);assert.match(response.headers.get('Cache-Control'),/no-store/);
});
test('unknown and disabled identifiers use the same generic response and no private mapping output',async()=>{
 for(const reason of ['unknown','disabled']){const {handler,events}=await harness({beginAttempt:async()=>({allowed:true,account:null}),passwordSignIn:async(email)=>{assert.equal(email,'unavailable@taxiqaid.invalid');return {error:{status:400}};}});const response=await handler(request());assert.equal(response.status,401);assert.equal((await response.text()).includes(reason),false);assert.equal(events.includes('access'),false);}
});
test('wrong credentials and native Auth throttling/outages preserve sanitized HTTP outcomes',async()=>{
 for(const [upstream,expected]of [[400,401],[401,401],[429,429],[500,503],[0,503]]){const {handler}=await harness({passwordSignIn:async()=>({error:{status:upstream,message:'SYNTHETIC_PRIVATE_ERROR'}})});const response=await handler(request());assert.equal(response.status,expected);assert.equal((await response.text()).includes('SYNTHETIC'),false);}
});
test('counter denial, counter outage and missing trusted IP never reach Auth',async()=>{
 for(const [change,expected]of [[{beginAttempt:async()=>({allowed:false,account:null})},429],[{beginAttempt:async()=>{throw new Error('SYNTHETIC_DATABASE_ERROR');}},503],[{clientIp:()=>null},503],[{ready:false},503]]){let authCalls=0;const {handler}=await harness({...change,passwordSignIn:async()=>{authCalls++;throw new Error('Forbidden.');}});const response=await handler(request());assert.equal(response.status,expected);assert.equal(authCalls,0);assert.equal((await response.text()).includes('SYNTHETIC'),false);}
});
test('created sessions are revoked on UID mismatch, private-access failure and malformed session response',async()=>{
 for(const change of [{passwordSignIn:async()=>({user:{id:'another'},session:{access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH'}})},{loadAccess:async()=>{throw new Error('SYNTHETIC_SQL_ERROR');}},{passwordSignIn:async()=>({user:{id:uid},session:{access_token:'SYNTHETIC_ACCESS'}})}]){const {handler,events}=await harness(change),response=await handler(request());assert.ok([401,503].includes(response.status));assert.equal(events.at(-1),'revoke');assert.equal((await response.text()).includes('SYNTHETIC'),false);}
});
test('trusted IP requires reviewed server configuration, rejects forwarded lists and canonicalizes IPv6',async()=>{
 const {trustedClientIp}=await import('../supabase/functions/_shared/security.mjs');const make=headers=>new Request(origin,{headers});
 assert.equal(trustedClientIp(make({'cf-connecting-ip':'192.0.2.1'}),'cf-connecting-ip',false),null);assert.equal(trustedClientIp(make({'x-forwarded-for':'192.0.2.1'}),'x-forwarded-for',true),null);assert.equal(trustedClientIp(make({'cf-connecting-ip':'192.0.2.1, 198.51.100.1'}),'cf-connecting-ip',true),null);assert.equal(trustedClientIp(make({'cf-connecting-ip':'2001:0db8:0000::1'}),'cf-connecting-ip',true),'2001:db8::1');assert.equal(trustedClientIp(make({'cf-connecting-ip':'::ffff:192.0.2.1'}),'cf-connecting-ip',true),'192.0.2.1');
});
test('a broker response arriving after logout cannot restore authority and its SDK session is discarded',async()=>{
 let finish,session=null,accessCalls=0;const client=clients.create({client:{auth:{setSession:async value=>{session=value;return {error:null};},signOut:async()=>{session=null;return {error:null};}}},url:origin,key:'public',enabled:true,fetcher:async url=>{if(url.endsWith('get-my-access')){accessCalls++;throw new Error('Late authority forbidden.');}return new Promise(resolve=>finish=resolve);}});
 const pending=client.login('syntheticmanager','synthetic');await new Promise(resolve=>setImmediate(resolve));await client.logout();finish(Response.json({access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH'}));await assert.rejects(pending,/Unable to sign in/);assert.equal(session,null);assert.equal(client.getContext(),null);assert.equal(accessCalls,0);client.destroy();
});
test('malformed or inherited department/scope identifiers cannot create record authority',()=>{
 assert.equal(contract.department('__proto__'),null);
 for(const patch of [{departments:['__proto__']},{scope:{departments:['constructor']}},{scope:{driverRecordRefs:'some-reference'}},{scope:{documentIds:[null]}},{scope:{departments:'it'}}])assert.throws(()=>contract.access({...flat(),...patch},uid,Date.now()/1000+3600));
 const context=contract.access({...flat(),scope:{departments:[],driverRecordRefs:['driver-ref'],documentIds:['document-ref']}},uid,Date.now()/1000+3600);assert.equal(model.can(context,'driver-portal.files.view',{driverRecordRef:'different-ref',documentId:'document-ref'}),false);
});
