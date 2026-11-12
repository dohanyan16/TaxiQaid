/** Real broker handler/SDK with mocked SQL and Auth transport; no Cloudflare/Supabase hosted evidence. */
import postgres from 'npm:postgres@4.1.0';
import {signGateway,GATEWAY_TARGET} from './gateway-proof.mjs';
function assert(value:unknown):asserts value{if(!value)throw new Error('Signed broker assertion failed.');}
const uid='00000000-0000-4000-8000-000000000001',origin='https://review.example.workers.dev',secret='1'.repeat(64);
let loaded:typeof import('../../review/public-login/login-with-identifier.ts')|undefined;
async function candidate(){if(!loaded){const previous=Deno.serve;try{Deno.serve=(()=>({})) as unknown as typeof Deno.serve;loaded=await import('../../review/public-login/login-with-identifier.ts');}finally{Deno.serve=previous;}}return loaded;}
async function fixture(mode='success'){
 const {createSignedLogin}=await candidate(),events:string[]=[],seen=new Set<string>();
 const values:Record<string,string>={TAXIQAID_LOGIN_ENABLED:'true',TAXIQAID_SESSION_TRANSPORT_REVIEWED:'true',TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_REVIEWED:'true',TAXIQAID_TRUSTED_IP_HEADER_VERIFIED:'false',TAXIQAID_GATEWAY_SECRET:secret,TAXIQAID_RATE_SECRET:'SYNTHETIC_RATE_SECRET_32_CHARACTERS',TAXIQAID_AUTH_ORIGINS:origin,TAXIQAID_BROKER_DB_URL:'postgresql://taxiqaid_auth_login.mqkflwsvnzcaylxtvsje:SYNTHETIC_ONLY@aws-0-fixture.pooler.supabase.com:6543/postgres'};
 const query=async(parts:TemplateStringsArray,...args:unknown[])=>{
  const text=parts.join('?');if(text.includes('session_user'))return [{login:'taxiqaid_auth_login',actor:'taxiqaid_auth_login',restricted:true}];
  if(text.includes('begin_signed_login_attempt')){events.push('signed-sql');assert(args.length===6&&args[0]==='syntheticmanager'&&String(args[4]).length===64);const once=String(args[4]);const allowed=!seen.has(once)&&mode!=='rate-denied';seen.add(once);return [{allowed,uid:mode==='wrong-mapping'?'other':uid,email:'synthetic-private@example.invalid',status:'active',mapping_revision:'7'}];}
  if(text.includes('get_management_access')){events.push('revision-check');if(mode==='revision-race')throw new Error('SYNTHETIC_PRIVATE_REVISION');return [{access:{version:1,uid,account:{uid,status:'active',type:'management',fullName:'Synthetic Master'},permissions:{roleDefaults:[],overrides:{}}}}];}
  if(text.includes('SET LOCAL ROLE')||text.includes('set_config'))return [];throw new Error('Unexpected SQL.');
 };
 const sql=Object.assign(query,{begin:async(_kind:string,work:(tx:unknown)=>unknown)=>await work(query),end:async()=>{events.push('close');}});
 const connect=((options:ReturnType<typeof postgres>['options'])=>{assert(options.ssl&&options.prepare===false);events.push('open');return sql;}) as unknown as typeof postgres;
 const fetcher:typeof fetch=async(input,init)=>{const url=new URL(String(input));assert(url.origin==='https://mqkflwsvnzcaylxtvsje.supabase.co'&&init?.redirect==='error');
  if(url.pathname==='/auth/v1/token'){events.push('password-auth');return Response.json({access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH',token_type:'bearer',expires_in:3600,user:{id:uid,email:'synthetic-private@example.invalid'}});}
  if(url.pathname==='/auth/v1/logout'){events.push('signout');return new Response(null,{status:204});}throw new Error('Unexpected Auth request.');
 };
 const handler=createSignedLogin(name=>values[name],connect,fetcher);
 return {handler,events,values};
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
