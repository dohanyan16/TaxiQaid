/** Actual validation handlers; synthetic SQL/Auth/cf only, never hosted evidence. */
import postgres from 'npm:postgres@4.1.0';
import {createRequire} from 'node:module';
import {createValidationHandler} from './validation-runtime.ts';
import {createGatewayRouter} from '../../../gateway/worker.mjs';
import {VALIDATION_HEADER,VALIDATION_PATH,signValidation} from '../_shared/validation-policy.mjs';
import {GATEWAY_TARGET,signGateway} from '../_shared/gateway-proof.mjs';
const require=createRequire(import.meta.url),catalog=require('../../../shared/permission-catalog.js');
function assert(value:unknown):asserts value{if(!value)throw new Error('Synthetic protected validation assertion failed.');}
const origin='https://review.example.workers.dev',uid='00000000-0000-4000-8000-000000000001',secret='1'.repeat(64);
function fixture(mode='success'){
 const time=Math.floor(Date.now()/900000)*900000+120000,grant={id:crypto.randomUUID(),ownerUid:uid,issuedAt:Math.floor(time/1000),expiresAt:Math.floor(time/900000)*900+890};
 const jwt=['eyJhbGciOiJIUzI1NiJ9',btoa(JSON.stringify({sub:uid,exp:Math.floor(time/1000)+3600})).replaceAll('=',''),'c3ludGhldGlj'].join('.');
 const values:Record<string,string>={TAXIQAID_VALIDATION_GRANT:JSON.stringify(grant),TAXIQAID_LOGIN_ENABLED:'false',TAXIQAID_GATEWAY_ENABLED:'false',TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_TRUSTED_IP_HEADER_VERIFIED:'false',TAXIQAID_GATEWAY_SECRET:secret,TAXIQAID_RATE_SECRET:'SYNTHETIC_PRIVATE_RATE_32_CHARACTERS',TAXIQAID_AUTH_ORIGINS:origin,TAXIQAID_BROKER_DB_URL:'postgresql://taxiqaid_auth_login.mqkflwsvnzcaylxtvsje:SYNTHETIC_ONLY@aws-0-fixture.pooler.supabase.com:6543/postgres'};
 const counters=new Map<string,number>(),nonces=new Set<string>(),guardSources=new Set<string>(),events:string[]=[],sources:string[]=[],modes:string[]=[];
 let minute=Math.floor(time/900000)*15+2,active=0,maxActive=0,queries=0,authCalls=0,brokerCalls=0,closed=0;
 const query=async(parts:TemplateStringsArray,...args:unknown[])=>{
  const text=parts.join('?');queries++;
  if(text.includes('session_user'))return [{login:mode==='role'?'postgres':'taxiqaid_auth_login',actor:'taxiqaid_auth_login',restricted:true}];
  if(text.includes('SET LOCAL ROLE')||text.includes('set_config'))return [];
  if(text.includes('get_management_access'))return [{access:{version:1,uid,account:{uid,username:'dohanyan',fullName:'Synthetic Owner',status:mode==='disabled'?'disabled':'active',type:'management',role:'super_admin'},departments:[],permissions:{roleDefaults:catalog.ALL.filter((p:{audience:string})=>p.audience!=='Driver').map((p:{key:string})=>p.key),overrides:mode==='permission'?{'fuel.view':'deny'}:{}},scope:{kind:'management'},validUntil:Date.now()+60000}}];
  if(text.includes('clock_timestamp'))return [{epoch:minute*60+2,minute:String(mode==='rollover'&&events.includes('probe')?minute+1:minute)}];
  if(text.includes('begin_signed_login_attempt')){
   const [identifier,source,account,global,nonce]=args.map(String),master=identifier==='dohanyan';if(master)guardSources.add(source);events.push(guardSources.has(source)?'guard':'probe');
   if(!guardSources.has(source))sources.push(source);
   if(mode==='sql-error')throw new Error('SYNTHETIC_PRIVATE_DATABASE_ERROR');
   let allowed=mode!=='health';
   for(const [key,window,limit]of [[global,minute,20],[source,minute,10],[account,Math.floor(minute/15),10]] as const){if(!allowed)break;const ref=key+':'+window,count=(counters.get(ref)||0)+1;counters.set(ref,count);if(count>limit)allowed=false;}
   if(allowed&&nonces.has(nonce))allowed=false;else if(allowed)nonces.add(nonce);
   if(master&&mode==='wrong-uid')return [{allowed,uid:'00000000-0000-4000-8000-000000000002',email:'synthetic-private@example.invalid',status:'active',mapping_revision:'3'}];
   return [{allowed,uid:allowed&&master?uid:null,email:allowed&&master?'synthetic-private@example.invalid':null,status:allowed&&master?'active':null,mapping_revision:allowed&&master?'3':null}];
  }
  throw new Error('Unexpected synthetic SQL.');
 };
 const sql={begin:async(kind:string,work:(query:unknown)=>unknown)=>{active++;maxActive=Math.max(maxActive,active);modes.push(kind);try{return await work(query);}finally{active--;}},end:async()=>{closed++;}};
 const connect=((options:ReturnType<typeof postgres>['options'])=>{assert(options.ssl&&options.prepare===false&&options.fetch_types===false&&[1,2].includes(options.max));return sql;}) as unknown as typeof postgres;
 const fetcher:typeof fetch=async(input,init)=>{
  const target=String(input);assert(init?.redirect==='manual');
  if(target.endsWith('/auth/v1/user')){authCalls++;events.push('online-auth');assert(new Headers(init?.headers).get('Authorization')==='Bearer '+jwt);return Response.json({id:mode==='auth-uid'?'other':uid,aud:'authenticated',role:'authenticated',is_anonymous:false});}
  if(target===GATEWAY_TARGET){brokerCalls++;return handler(new Request(target,init));}throw new Error('Unexpected synthetic HTTP.');
 };
 const handler=createValidationHandler(name=>values[name],connect,fetcher,()=>minute*60000+2000),worker=createGatewayRouter(fetcher,()=>minute*60000+2000);
 async function control(caseId:string,extra:Record<string,string>={}){
  const request=new Request(origin+VALIDATION_PATH,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+jwt,'cf-connecting-ip':'192.0.2.1',...extra},body:JSON.stringify({case:caseId})});Object.defineProperty(request,'cf',{value:{colo:'SYNTHETIC'}});return worker(request,values);
 }
 async function signed(caseId='ip-base'){
  const body=new TextEncoder().encode(JSON.stringify({case:caseId})),proof={ip:'192.0.2.1',origin,issued:minute*60+2,nonce:crypto.randomUUID().replaceAll('-',''),trace:crypto.randomUUID()},mac=await signGateway(secret,proof,body);
  return new Request(GATEWAY_TARGET,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+jwt,'x-taxiqaid-ip':proof.ip,'x-taxiqaid-issued':String(proof.issued),'x-taxiqaid-nonce':proof.nonce,'x-taxiqaid-trace':proof.trace,'x-taxiqaid-mac':mac,[VALIDATION_HEADER]:await signValidation(secret,grant,jwt,mac)},body});
 }
 return {forgetNonces:()=>nonces.clear(),values,grant,handler,control,signed,events,sources,modes,nextMinute:()=>minute++,stats:()=>({queries,authCalls,brokerCalls,maxActive,closed})};
}
Deno.test('protected six-case device enforces scopes, real-source bucket, genuine parallel nonce race and exact caps',async()=>{
 const f=fixture(),results=[];for(const name of ['ip-base','ip-spoof','global-db','replay','identifier-base','identifier-finish']){
  if(['global-db','replay','identifier-finish'].includes(name))f.nextMinute();const reply=await f.control(name,name==='ip-spoof'?{'x-real-ip':'198.51.100.1','x-forwarded-for':'198.51.100.2','x-taxiqaid-ip':'198.51.100.3'}:{});assert(reply.status===200);const raw=await reply.json();assert(raw.result==='PASS');results.push(raw);
 }
 const stats=f.stats();assert(stats.authCalls===12&&stats.brokerCalls===6&&stats.queries===185&&stats.maxActive===2&&stats.closed===6);assert(results.reduce((n,value)=>n+value.probes,0)===53);assert(results.reduce((n,value)=>n+value.sqlTransactions,0)===14);
 assert(f.sources[0]===f.sources[10]);assert(f.modes.filter(value=>value==='isolation level read committed').length===8);assert(f.events.indexOf('online-auth')<f.events.indexOf('guard'));
 const output=JSON.stringify(results);for(const privateValue of [uid,'192.0.2.1','synthetic-private',secret,f.grant.id,'SYNTHETIC_PRIVATE'])assert(!output.includes(privateValue));
});
Deno.test('case grant is one-use across requests; unknown/expired/disabled grants cannot create an alternative public login',async()=>{
 const f=fixture();assert((await f.control('ip-base')).status===200);assert((await f.control('ip-base')).status!==200);
 const before=f.events.filter(event=>event==='probe').length;f.forgetNonces();for(let i=0;i<7;i++)f.nextMinute();assert((await f.control('ip-base')).status!==200);assert(f.events.filter(event=>event==='probe').length===before);
 for(const mutate of [(v:Record<string,string>)=>delete v.TAXIQAID_VALIDATION_GRANT,(v:Record<string,string>)=>v.TAXIQAID_GATEWAY_ENABLED='true',(v:Record<string,string>)=>v.TAXIQAID_LOGIN_ENABLED='true',(v:Record<string,string>)=>v.TAXIQAID_VALIDATION_GRANT=JSON.stringify({...f.grant,expiresAt:1})]){const x=fixture();mutate(x.values);assert((await x.control('ip-base')).status!==200);assert(!x.events.includes('probe'));}
});
Deno.test('online UID, restricted role, active Master, 101/6, health and SQL failures fail closed without sessions or private errors',async()=>{
 for(const mode of ['auth-uid','role','disabled','permission','health','wrong-uid','sql-error']){const f=fixture(mode),reply=await f.control('ip-base'),raw=await reply.json();assert(reply.status!==200||raw.result!=='PASS');assert(!JSON.stringify(raw).includes('PRIVATE'));}
 const rolling=fixture('rollover'),reply=await rolling.control('ip-base');assert((await reply.json()).result==='INCONCLUSIVE');
});
Deno.test('private diagnostic rejects absent/bad extra MAC, bearer substitution, proof mutation and forged Worker provenance before SQL',async()=>{
 const f=fixture();for(const headers of [{'cf-worker':'foreign.example'},{'cf-ew-via':'1'}] as Record<string,string>[])assert((await f.control('ip-base',headers)).status===403);
 for(const field of [VALIDATION_HEADER,'authorization','x-taxiqaid-mac','x-taxiqaid-ip']){const request=await f.signed();request.headers.set(field,'forged');assert((await f.handler(request)).status===403);}assert(!f.events.includes('guard'));
});
Deno.test('generated canonical broker boots with the protected router closed and no implicit environment/network access',async()=>{
 const previous=Deno.serve;let captured:((request:Request)=>Promise<Response>)|undefined;
 try{
  Deno.serve=((handler:unknown)=>{captured=handler as typeof captured;return {};}) as unknown as typeof Deno.serve;
  await import('../../dashboard/login-with-identifier.ts');assert(captured);
 }finally{Deno.serve=previous;}
 // This execution needs no env grant. A malformed private request fails before opening SQL or Auth.
 const response=await captured!(new Request(GATEWAY_TARGET,{method:'POST',headers:{[VALIDATION_HEADER]:'forged'},body:'{}'}));assert(response.status===403);assert(JSON.stringify(await response.json())==='{"result":"FAIL"}');
});
