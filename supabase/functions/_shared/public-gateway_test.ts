/** Real broker handler/SDK with mocked SQL and Auth transport; no Cloudflare/Supabase hosted evidence. */
import postgres from 'npm:postgres@4.1.0';
import {signGateway,GATEWAY_TARGET} from './gateway-proof.mjs';
function assert(value:unknown):asserts value{if(!value)throw new Error('Signed broker assertion failed.');}
const uid='00000000-0000-4000-8000-000000000001',origin='https://review.example.workers.dev',secret='1'.repeat(64);
let loaded:typeof import('../login-with-identifier/index.ts')|undefined;
async function candidate(){if(!loaded){const previous=Deno.serve;try{Deno.serve=(()=>({})) as unknown as typeof Deno.serve;loaded=await import('../login-with-identifier/index.ts');}finally{Deno.serve=previous;}}return loaded;}
async function fixture(mode='success'){
 const {createSignedLogin}=await candidate(),events:string[]=[],auditEvents:Record<string,unknown>[]=[],sqlInputs:unknown[][]=[],seen=new Set<string>();
 const values:Record<string,string>={TAXIQAID_LOGIN_ENABLED:'true',TAXIQAID_SESSION_TRANSPORT_REVIEWED:'true',TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_REVIEWED:'true',TAXIQAID_TRUSTED_IP_HEADER_VERIFIED:'false',TAXIQAID_GATEWAY_SECRET:secret,TAXIQAID_RATE_SECRET:'SYNTHETIC_RATE_SECRET_32_CHARACTERS',TAXIQAID_AUTH_ORIGINS:origin,TAXIQAID_BROKER_DB_URL:'postgresql://taxiqaid_auth_login.mqkflwsvnzcaylxtvsje:SYNTHETIC_ONLY@aws-0-fixture.pooler.supabase.com:6543/postgres'};
 const query=async(parts:TemplateStringsArray,...args:unknown[])=>{
  const text=parts.join('?');if(text.includes('session_user'))return [{login:'taxiqaid_auth_login',actor:'taxiqaid_auth_login',restricted:true}];
  if(text.includes('begin_signed_login_attempt')){events.push('signed-sql');sqlInputs.push(args);assert(args.length===6&&args[0]==='syntheticmanager'&&String(args[4]).length===64);const once=String(args[4]);const allowed=!seen.has(once)&&mode!=='rate-denied';seen.add(once);return [{allowed,uid:mode==='wrong-mapping'?'other':uid,email:'synthetic-private@example.invalid',status:'active',mapping_revision:'7'}];}
  if(text.includes('get_management_access')){events.push('revision-check');if(mode.startsWith('revision-race'))throw new Error('SYNTHETIC_PRIVATE_REVISION');return [{access:{version:1,uid,account:{uid,status:'active',type:'management',fullName:'Synthetic Master'},permissions:{roleDefaults:[],overrides:{}}}}];}
  if(text.includes('SET LOCAL ROLE')||text.includes('set_config'))return [];throw new Error('Unexpected SQL.');
 };
 const sql=Object.assign(query,{begin:async(_kind:string,work:(tx:unknown)=>unknown)=>await work(query),end:async()=>{events.push('close');}});
 const connect=((options:ReturnType<typeof postgres>['options'])=>{assert(options.ssl&&options.prepare===false);events.push('open');return sql;}) as unknown as typeof postgres;
 const fetcher:typeof fetch=async(input,init)=>{const url=new URL(String(input));assert(url.origin==='https://mqkflwsvnzcaylxtvsje.supabase.co'&&init?.redirect==='error');
  if(url.pathname==='/auth/v1/token'){events.push('password-auth');if(mode==='native-throttled')return Response.json({msg:'SYNTHETIC_PRIVATE_AUTH_ERROR'},{status:429});return Response.json({access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH',token_type:'bearer',expires_in:3600,user:{id:uid,email:'synthetic-private@example.invalid'}});}
  if(url.pathname==='/auth/v1/logout'){events.push('signout');return mode==='revision-race-logout-error'?Response.json({msg:'SYNTHETIC_PRIVATE_LOGOUT_ERROR'},{status:500}):new Response(null,{status:204});}throw new Error('Unexpected Auth request.');
 };
 const handler=createSignedLogin(name=>values[name],connect,fetcher,value=>auditEvents.push(JSON.parse(value)));
 return {handler,events,values,auditEvents,sqlInputs};
}
async function request(nonce='a'.repeat(32)){
 const body=new TextEncoder().encode(JSON.stringify({identifier:'syntheticmanager',password:'SYNTHETIC_PASSWORD'})),proof={ip:'192.0.2.1',origin,issued:Math.floor(Date.now()/1000),nonce},mac=await signGateway(secret,proof,body);
 return new Request(GATEWAY_TARGET,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-taxiqaid-ip':proof.ip,'x-taxiqaid-issued':String(proof.issued),'x-taxiqaid-nonce':nonce,'x-taxiqaid-mac':mac},body});
}
Deno.test('signed request alone reaches the unchanged password/UID/revision/session handler and closes SQL',async()=>{
 const {handler,events}=await fixture();const response=await handler(await request()),body=await response.json();assert(response.status===200&&body.access_token==='SYNTHETIC_ACCESS');assert(Object.keys(body).sort().join(',')==='access_token,expires_in,refresh_token,token_type');assert(events.indexOf('signed-sql')<events.indexOf('password-auth'));assert(events.includes('revision-check')&&events.at(-1)==='close');
});
Deno.test('direct default origin calls with forged IP/API key fail before opening DB even while public flags are true',async()=>{
 const {handler,events}=await fixture();const response=await handler(new Request(GATEWAY_TARGET,{method:'POST',headers:{Origin:origin,apikey:'sb_publishable_SYNTHETIC','x-taxiqaid-ip':'192.0.2.1','Content-Type':'application/json'},body:'{}'}));assert(response.status===403&&events.length===0);
});
Deno.test('disabled deployment can prove signature gating without enabling Auth',async()=>{
 const {handler,events,values}=await fixture();values.TAXIQAID_LOGIN_ENABLED='false';assert((await handler(await request())).status===503);assert(events.length===0);
});
Deno.test('replay/rate denial and mapping/revision failures release no usable session',async()=>{
 const replay=await fixture();assert((await replay.handler(await request())).status===200);const count=replay.events.filter(x=>x==='password-auth').length;assert((await replay.handler(await request())).status===429);assert(replay.events.filter(x=>x==='password-auth').length===count);
 for(const mode of ['rate-denied','wrong-mapping','revision-race']){const {handler,events}=await fixture(mode),response=await handler(await request());assert(response.status!==200);assert(!(await response.text()).includes('SYNTHETIC'));if(mode==='rate-denied')assert(!events.includes('password-auth'));else assert(events.includes('signout'));assert(events.at(-1)==='close');}
});

Deno.test('compatibility import shares the canonical factory without registering a second server',async()=>{
 const canonical=await candidate(),previous=Deno.serve;let registrations=0;
 try{
  Deno.serve=(()=>{registrations++;return {};}) as unknown as typeof Deno.serve;
  const compatibility=await import('../../review/public-login/login-with-identifier.ts');
  assert(compatibility.createSignedLogin===canonical.createSignedLogin&&registrations===0);
 }finally{Deno.serve=previous;}
});
Deno.test('every readiness gate fails closed before SQL/Auth and never bypasses proof validation',async()=>{
 for(const key of ['TAXIQAID_LOGIN_ENABLED','TAXIQAID_SESSION_TRANSPORT_REVIEWED','TAXIQAID_GATEWAY_ENABLED','TAXIQAID_GATEWAY_REVIEWED']){
  for(const state of ['false','missing']){
   const {handler,events,values}=await fixture();if(state==='missing')delete values[key];else values[key]='false';
   assert((await handler(await request())).status===503&&events.length===0);
   const forged=await request();forged.headers.set('x-taxiqaid-mac','0'.repeat(64));
   assert((await handler(forged)).status===403&&events.length===0);
  }
 }
 for(const [key,value,status]of [['TAXIQAID_TRUSTED_IP_HEADER_VERIFIED','true',503],['TAXIQAID_RATE_SECRET','short',503],['TAXIQAID_GATEWAY_SECRET','',403]] as const){
  const {handler,events,values}=await fixture();values[key]=value;assert((await handler(await request())).status===status&&events.length===0);
 }
});
Deno.test('canonical proof rejection covers body/origin/IP/nonce/time/MAC/query before opening SQL',async()=>{
 for(const mutation of ['body','origin','ip','nonce','stale','future','mac','query','unapproved']){
  const {handler,events,values}=await fixture();let input=await request();
  if(mutation==='body')input=new Request(GATEWAY_TARGET,{method:'POST',headers:input.headers,body:'{}'});
  if(mutation==='origin')input.headers.set('origin','https://unapproved.invalid');
  if(mutation==='ip')input.headers.set('x-taxiqaid-ip','192.0.2.2');
  if(mutation==='nonce')input.headers.set('x-taxiqaid-nonce','b'.repeat(32));
  if(mutation==='stale')input.headers.set('x-taxiqaid-issued',String(Math.floor(Date.now()/1000)-61));
  if(mutation==='future')input.headers.set('x-taxiqaid-issued',String(Math.floor(Date.now()/1000)+10));
  if(mutation==='mac')input.headers.set('x-taxiqaid-mac','0'.repeat(64));
  if(mutation==='query')input=new Request(GATEWAY_TARGET+'?bypass=1',input);
  if(mutation==='unapproved')values.TAXIQAID_AUTH_ORIGINS='https://unapproved.invalid';
  const result=await handler(input);assert(result.status===403&&events.length===0);assert(!(await result.text()).includes('SYNTHETIC'));
 }
});

Deno.test('actual Worker and canonical broker share an authenticated v2 trace without trusting client headers',async()=>{
 const {createGateway}=await import('../../../gateway/worker.mjs'),f=await fixture(),gatewayEvents:Record<string,unknown>[]=[];
 const worker=createGateway((target,init)=>f.handler(new Request(String(target),init)),Date.now,(value:string)=>gatewayEvents.push(JSON.parse(value)));
 const env={TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_GATEWAY_SECRET:secret};
 for(const spoof of ['198.51.100.1','198.51.100.2']){
  const input=new Request(origin+'/login-with-identifier',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1','x-real-ip':spoof,'x-forwarded-for':spoof,'x-taxiqaid-ip':spoof,'x-taxiqaid-trace':'11111111-1111-4111-8111-111111111111'},body:JSON.stringify({identifier:'syntheticmanager',password:'SYNTHETIC_PASSWORD'})});Object.defineProperty(input,'cf',{value:{colo:'SYNTHETIC'}});
  assert((await worker(input,env)).status===200);
 }
 assert(f.sqlInputs.length===2&&JSON.stringify(f.sqlInputs[0].slice(1,4))===JSON.stringify(f.sqlInputs[1].slice(1,4)));
 assert(gatewayEvents.length===2&&gatewayEvents.every(event=>f.auditEvents.some(row=>row.trace===event.trace&&row.event==='PROOF_VERIFIED')));
 const serialized=JSON.stringify([...gatewayEvents,...f.auditEvents]);for(const value of [secret,'192.0.2.1','198.51.100.',uid,'SYNTHETIC_PASSWORD','SYNTHETIC_ACCESS','synthetic-private'])assert(!serialized.includes(value));
});
Deno.test('proof acceptance and disabled admission are distinct private events; trace forgery has no positive linkage',async()=>{
 const {createGateway}=await import('../../../gateway/worker.mjs'),f=await fixture();f.values.TAXIQAID_LOGIN_ENABLED='false';let signed:Request|undefined;
 const worker=createGateway((target,init)=>{signed=new Request(String(target),init);return f.handler(signed.clone());},Date.now,()=>{});
 const input=new Request(origin+'/login-with-identifier',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1'},body:'{}'});Object.defineProperty(input,'cf',{value:{}});
 assert((await worker(input,{TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_GATEWAY_SECRET:secret})).status===503);
 assert(f.events.length===0&&f.auditEvents.some(row=>row.event==='PROOF_VERIFIED')&&f.auditEvents.some(row=>row.event==='BROKER_DISABLED'));
 assert(signed);const forged=signed.clone(),trace=signed.headers.get('x-taxiqaid-trace');forged.headers.set('x-taxiqaid-trace','22222222-2222-4222-8222-222222222222');assert((await f.handler(forged)).status===403);const last=f.auditEvents.at(-1);assert(last?.event==='PROOF_REJECTED'&&last.trace!==trace&&last.trace!==forged.headers.get('x-taxiqaid-trace'));
});
Deno.test('private outcome events distinguish atomic limiter denial from native Auth throttling',async()=>{
 for(const mode of ['rate-denied','native-throttled']){const f=await fixture(mode);assert((await f.handler(await request())).status===429);assert(f.auditEvents.some(row=>row.event===(mode==='rate-denied'?'ADMISSION_DENIED':'AUTH_THROTTLED')));assert(!f.auditEvents.some(row=>row.event===(mode==='rate-denied'?'AUTH_THROTTLED':'ADMISSION_DENIED')));}
});
Deno.test('failed-flow SDK signOut returned errors are recorded as unconfirmed and never release a session',async()=>{
 const f=await fixture('revision-race-logout-error'),response=await f.handler(await request());assert(response.status!==200&&f.events.includes('signout'));assert(f.auditEvents.some(row=>row.event==='SESSION_CLEANUP_UNCONFIRMED'));assert(!f.auditEvents.some(row=>row.event==='SESSION_CLEANUP_CONFIRMED'));assert(!(await response.text()).includes('SYNTHETIC'));
});
