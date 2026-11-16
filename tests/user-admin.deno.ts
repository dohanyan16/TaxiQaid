// Mocked official Auth and SQL boundaries; no network or hosted account operations.
import {administrativeAction,createAdminHandler,adminConnectionOptions} from '../supabase/functions/manage-users/runtime.ts';
import {syncSheets} from '../supabase/functions/manage-users/sheets.mjs';
import assert from 'node:assert/strict';
const actor='00000000-0000-4000-8000-000000000154',target='10000000-0000-4000-8000-000000000001',origin='https://dohanyan16.github.io';
const account={username:'syntheticmanager',fullName:'Synthetic Manager',contactEmail:'manager@example.invalid',role:'manager',status:'active',departments:['fleet']};
const values:Record<string,string>={TAXIQAID_USER_ADMIN_ENABLED:'true',TAXIQAID_AUTH_ORIGINS:origin},env=(key:string)=>values[key];
const user={id:actor,role:'authenticated',aud:'authenticated'},request=(body:unknown,headers:Record<string,string>={})=>new Request('https://local.invalid/functions/v1/manage-users',{method:'POST',headers:{origin,authorization:'Bearer synthetic.jwt','content-type':'application/json',...headers},body:JSON.stringify(body)});
Deno.test('online JWT is mandatory, submitted authority rejected, disabled/origin failures precede SQL',async()=>{
 let queries=0,verified=0;const rpc=async()=>{queries++;return {users:[]};},verify=async()=>{verified++;return {data:{user}};};
 const handler=createAdminHandler(env,{rpc,verify});assert.equal((await handler(request({action:'list'}))).status,200);assert.ok(queries>=2);assert.equal(verified,1);
 queries=0;assert.equal((await handler(request({action:'list',actorUid:target}))).status,400);assert.equal(queries,0);
 assert.equal((await handler(request({action:'list'},{authorization:'apikey-only'}))).status,401);
 assert.equal((await handler(request({action:'list'},{origin:'https://unapproved.invalid'}))).status,403);
 assert.equal((await createAdminHandler(()=>undefined,{rpc,verify})(request({action:'list'}))).status,403);
 assert.equal((await createAdminHandler(k=>k==='TAXIQAID_USER_ADMIN_ENABLED'?'false':env(k),{rpc,verify})(request({action:'list'}))).status,503);
 assert.equal((await createAdminHandler(env,{rpc,verify:async()=>({data:{user:{...user,role:'service_role'}}})})(request({action:'list'}))).status,401);
 const denied=createAdminHandler(env,{verify,rpc:async()=>{throw Object.assign(new Error('PRIVATE SQL PASSWORD'),{code:'42501'});}});const response=await denied(request({action:'create',operation:target,account}));assert.equal(response.status,403);assert.equal((await response.text()).includes('PRIVATE'),false);
 const malformed=new Request('https://local.invalid/functions/v1/manage-users',{method:'POST',headers:{origin,authorization:'Bearer synthetic.jwt','content-type':'application/json'},body:'{'});assert.equal((await handler(malformed)).status,400);
});
function fixture(options:{mismatch?:boolean;finishFailure?:boolean;ambiguous?:boolean;createFailure?:boolean}={}){
 const calls:{action:string;data:any}[]=[],authCalls:any[]=[],identities=new Map<string,any>();let completed=false;
 const rpc=async(_actor:string,action:string,data:any)=>{assert.equal(_actor,actor);calls.push({action,data:structuredClone(data)});if(action==='create-reserve')return {completed};if(action==='create-finish'){if(options.ambiguous){completed=true;throw new Error('lost response');}if(options.finishFailure)throw new Error('database failure');completed=true;return {completed:true,user:{uid:target,...account}};}if(action==='create-recover')return {completed,recoveryRequired:!completed};return {};};
 const auth={getUserById:async(id:string)=>identities.has(id)?{data:{user:identities.get(id)}}:{error:{status:404}},createUser:async(data:any)=>{authCalls.push(structuredClone(data));if(options.createFailure)return {error:{status:500}};const value={...data,id:options.mismatch?actor:data.id};identities.set(data.id,value);return {data:{user:value}};},updateUserById:async(id:string,data:any)=>{authCalls.push({id,...structuredClone(data)});const value={...identities.get(id),...data};identities.set(id,value);return {data:{user:value}};}};
 return {rpc,auth,calls,authCalls,identities};
}
Deno.test('provisioning reserves before Auth, preserves UID mapping, returns credential once without SQL persistence',async()=>{
 const f=fixture(),result=await administrativeAction(actor,'create',{operation:target,account},f.rpc,f.auth,env);assert.equal(result.credentialDelivery,'one-time');assert.ok(result.temporaryPassword.length>=48);assert.equal(f.calls[1].action,'create-reserve');assert.equal(f.authCalls[0].id,target);assert.equal(f.authCalls[0].ban_duration,'876000h');assert.equal(f.authCalls[1].ban_duration,'none');assert.equal(JSON.stringify(f.calls).includes(result.temporaryPassword),false);assert.equal(f.authCalls[0].email,account.contactEmail);assert.equal(f.calls.find(c=>c.action==='create-finish')!.data.technicalEmail,account.contactEmail);assert.equal(f.calls.find(c=>c.action==='create-finish')!.data.authUid,target);
 const count=f.authCalls.length,replay=await administrativeAction(actor,'create',{operation:target,account},f.rpc,f.auth,env);assert.equal(replay.temporaryPassword,undefined);assert.equal(f.authCalls.length,count);
});
Deno.test('mismatched identities, Auth failure and private commit failure fail closed with recovery; ambiguous commit is not duplicated',async()=>{
 for(const options of [{mismatch:true},{finishFailure:true},{createFailure:true}]){const f=fixture(options);await assert.rejects(administrativeAction(actor,'create',{operation:target,account},f.rpc,f.auth,env),/RECOVERY_REQUIRED/);assert.equal(f.calls.some(c=>c.action==='create-recover'),true);if(options.finishFailure)assert.equal(f.authCalls.at(-1).ban_duration,'876000h');if(options.mismatch)assert.equal(f.authCalls.length,1);}
 const f=fixture({ambiguous:true}),result=await administrativeAction(actor,'create',{operation:target,account},f.rpc,f.auth,env);assert.equal(result.completed,true);assert.equal(result.temporaryPassword,undefined);assert.equal(f.authCalls.at(-1).ban_duration,'none');
 const bad=fixture();await assert.rejects(administrativeAction(actor,'create',{operation:target,account:{...account,contactEmail:null}},bad.rpc,bad.auth,env),/INVALID_INPUT/);assert.equal(bad.authCalls.length,0);assert.equal(bad.calls.length,1);
});
Deno.test('replayed edits never reapply stale Auth status; sync failures remain pending',async()=>{
 let called=0;const auth={getUserById:async()=>{called++;throw new Error('offline');}};
 for(const action of ['edit','sync-auth']){const result=await administrativeAction(actor,action,{uid:target},async(_a,a)=>a==='authorize'?{}:{replayed:true,user:{uid:target,status:'active'}},auth,env);assert.equal(result.temporaryPassword,undefined);assert.equal(called,0);}
 const result=await administrativeAction(actor,'edit',{uid:target},async(_a,a)=>a==='authorize'?{}:a==='identity'?{email:'private@example.invalid'}:{user:{uid:target,status:'disabled'}},auth,env);assert.equal(result.authSyncPending,true);
});

Deno.test('Master requests recovery mail only for an active, version-matched, exact Auth office identity',async()=>{
 const email='manager@example.invalid',etag='a'.repeat(64),changes:any[]=[];
 const snapshot:any={uid:target,role:'manager',status:'active',version:4,etag};
 const calls:string[]=[],sent:any[]=[];
 const rpc=async(_actor:string,action:string,data:any)=>{assert.equal(_actor,actor);calls.push(action);
  if(action==='authorize')return {authorized:true};
  if(action==='list'){assert.deepEqual(data,{search:target,limit:1});return {users:[snapshot]};}
  if(action==='identity')return {uid:target,email};
  throw new Error('SQL must not reserve, mutate or audit password data');
 };
 const admin={getUserById:async(id:string)=>({data:{user:{id,email}}}),updateUserById:async(...args:any[])=>{changes.push(args);throw new Error('Credential mutation forbidden');}};
 const send=async(address:string,redirect:string)=>{sent.push({address,redirect});return {error:null};};
 const input={operation:target,uid:target,version:4,etag};
 const ok=await administrativeAction(actor,'reset-password',input,rpc,admin,env,fetch,send);
 assert.deepEqual(ok,{delivery:'requested'});
 assert.deepEqual(calls,['authorize','list','identity']);
 assert.deepEqual(sent,[{address:email,redirect:'https://dohanyan16.github.io/TaxiQaid/reset-password.html'}]);
 assert.equal(changes.length,0);assert.equal(JSON.stringify(ok).includes(email),false);
 snapshot.status='disabled';
 await assert.rejects(administrativeAction(actor,'reset-password',input,rpc,admin,env,fetch,send),/INVALID_INPUT/);
 snapshot.status='active';snapshot.etag='b'.repeat(64);
 await assert.rejects(administrativeAction(actor,'reset-password',input,rpc,admin,env,fetch,send),/STALE_ACCOUNT/);
 assert.equal(sent.length,1);
 snapshot.etag=etag;
 const wrongAuth={getUserById:async()=>({data:{user:{id:target,email:'wrong@example.invalid'}}})};
 await assert.rejects(administrativeAction(actor,'reset-password',input,rpc,wrongAuth,env,fetch,send),/AUTH_IDENTITY_MISMATCH/);
 assert.equal(sent.length,1);
 await assert.rejects(administrativeAction(actor,'reset-password',input,rpc,admin,env,fetch,async()=>({error:{status:429}})),/RECOVERY_EMAIL_UNAVAILABLE/);
});

Deno.test('office email is immutable: reject changes before private SQL write or Auth mutation',async()=>{
 const calls:string[]=[],auth=fixture().auth;
 const rpc=async(_actor:string,action:string)=>{calls.push(action);if(action==='identity')return {email:account.contactEmail};return {};};
 await assert.rejects(administrativeAction(actor,'edit',{uid:target,account:{...account,contactEmail:'other@example.invalid'}},rpc,auth,env),/INVALID_INPUT/);
 assert.deepEqual(calls,['authorize','identity']);
});
Deno.test('Sheets remains disconnected; fixed-row RAW retries are idempotent and payload secrets rejected',async()=>{
 let calls:any[]=[];const fake:typeof fetch=async(url,init)=>{calls.push({url:String(url),init});return new Response('{}',{status:200});};
 assert.deepEqual(await syncSheets([],Date.now()/1000+120,env,fake),[]);assert.equal(calls.length,0);
 assert.deepEqual(await administrativeAction(actor,'sync-sheets',{},async()=>({}),{},env,fake),{sync:'DISABLED',sent:0});
 const config={...values,TAXIQAID_SHEETS_SYNC_ENABLED:'true',TAXIQAID_GOOGLE_SPREADSHEET_ID:'SYNTHETIC_SPREADSHEET_NOT_LIVE',TAXIQAID_GOOGLE_ACCESS_TOKEN:'SYNTHETIC_ONLY',TAXIQAID_GOOGLE_USERS_TAB:'Users',TAXIQAID_GOOGLE_REQUESTS_TAB:'Requests'},settings=(k:string)=>(config as Record<string,string>)[k],entry={kind:'user',entity:target,sheet_row:2,version:1,payload:{uid:target,username:'syntheticmanager',contactEmail:null}};
 for(let i=0;i<2;i++)assert.equal((await syncSheets([entry],Date.now()/1000+120,settings,fake))[0].ok,true);assert.equal(calls[0].url,calls[1].url);assert.equal(calls[0].init.method,'PUT');assert.match(calls[0].url,/valueInputOption=RAW/);
 for(const name of ['password','technical_email','refresh_token']){const result=await syncSheets([{...entry,payload:{...entry.payload,[name]:'REJECT'}}],Date.now()/1000+120,settings,fake);assert.equal(result[0].ok,false);}assert.equal(calls.length,2);
 calls=[];const failed=await syncSheets([entry],Date.now()/1000+120,settings,async()=>new Response('PRIVATE_PROVIDER_DETAIL',{status:403}));assert.equal(failed[0].ok,false);assert.equal(JSON.stringify(failed).includes('PRIVATE'),false);
});
Deno.test('separate restricted database role and TLS; broad/broker/browser roles rejected',()=>{
 const options=adminConnectionOptions('postgresql://taxiqaid_user_admin_login:SYNTHETIC@db.mqkflwsvnzcaylxtvsje.supabase.co:5432/postgres');assert.equal(options.username,'taxiqaid_user_admin_login');assert.equal(options.ssl.rejectUnauthorized,true);for(const role of ['postgres','taxiqaid_auth_login','service_role','authenticated'])assert.throws(()=>adminConnectionOptions('postgresql://'+role+':SYNTHETIC@db.mqkflwsvnzcaylxtvsje.supabase.co:5432/postgres'));
});

Deno.test('frontend cutover cannot activate the administrative backend: closed gates perform no Auth or SQL work',async()=>{
 for(const gate of [undefined,'false','TRUE','1']){
  let calls=0,keyReads=0;const forbidden=async()=>{calls++;throw new Error('Unexpected administrative operation');};
  const handler=createAdminHandler(k=>{if(k==='TAXIQAID_AUTH_ADMIN_KEY')keyReads++;return k==='TAXIQAID_USER_ADMIN_ENABLED'?gate:env(k);},{verify:forbidden,rpc:forbidden,admin:{createUser:forbidden,updateUserById:forbidden}});
  for(const body of [{action:'list'},{action:'create',operation:target,account},{action:'permissions',operation:target,uid:target,version:1,etag:'a'.repeat(64),patch:{'fuel.view':true}}]){const result=await handler(request(body));assert.equal(result.status,503);assert.equal((await result.json()).error,'Administration is not activated.');}
  assert.equal(calls,0);assert.equal(keyReads,0);
 }
});
