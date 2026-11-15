/** Actual Worker -> canonical broker -> restricted PostgreSQL. Auth/cloud provenance are synthetic. */
import postgres from 'npm:postgres@4.1.0';
import {createRequire} from 'node:module';
import {createGateway} from '../gateway/worker.mjs';
import {GATEWAY_TARGET,signGateway} from '../supabase/functions/_shared/gateway-proof.mjs';
import {bucket} from '../supabase/functions/_shared/security.mjs';
const require=createRequire(import.meta.url),catalog=require('../shared/permission-catalog.js'),model=require('../shared/permission-model.js'),contract=require('../shared/auth-contract.js');
function assert(value:unknown):asserts value{if(!value)throw new Error('Local signed/PostgreSQL assertion failed.');}
const port=Number(Deno.env.get('TAXIQAID_LOCAL_PG_PORT'));if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('A disposable loopback PostgreSQL port is required.');
const previous=Deno.serve;let candidate:typeof import('../supabase/functions/login-with-identifier/index.ts');
try{Deno.serve=(()=>({})) as unknown as typeof Deno.serve;candidate=await import('../supabase/functions/login-with-identifier/index.ts');}finally{Deno.serve=previous;}
const origin='https://review.example.workers.dev',secret='1'.repeat(64),uid='00000000-0000-4000-8000-000000000001';
function setup(){
 const audit:Record<string,unknown>[]=[],rate='SYNTHETIC_LOCAL_RATE_'+crypto.randomUUID();let authCalls=0;
 const values:Record<string,string>={TAXIQAID_LOGIN_ENABLED:'true',TAXIQAID_SESSION_TRANSPORT_REVIEWED:'true',TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_REVIEWED:'true',TAXIQAID_TRUSTED_IP_HEADER_VERIFIED:'false',TAXIQAID_GATEWAY_SECRET:secret,TAXIQAID_RATE_SECRET:rate,TAXIQAID_AUTH_ORIGINS:origin,TAXIQAID_BROKER_DB_URL:'postgresql://taxiqaid_auth_login.mqkflwsvnzcaylxtvsje:SYNTHETIC_ONLY@aws-0-fixture.pooler.supabase.com:6543/postgres'};
 // Production connection validation still runs. Only this injected test connector maps it to loopback.
 const connect=((options:ReturnType<typeof postgres>['options'])=>{assert(options.ssl&&options.prepare===false&&options.max===1);return postgres({host:'127.0.0.1',port,username:'taxiqaid_auth_login',database:'postgres',ssl:false,prepare:false,max:1,idle_timeout:1});}) as unknown as typeof postgres;
 const fetcher:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));assert(url.origin==='https://mqkflwsvnzcaylxtvsje.supabase.co');
  if(url.pathname==='/auth/v1/token'){authCalls++;const body=JSON.parse(String(init?.body));assert(url.searchParams.get('grant_type')==='password');
   if(body.email!=='synthetic-updated@example.invalid')return Response.json({msg:'Synthetic invalid credentials.'},{status:400});
   return Response.json({access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH',token_type:'bearer',expires_in:3600,user:{id:uid,email:body.email}});
  }
  if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});throw new Error('Unexpected simulated Auth operation.');
 };
 const handler=candidate.createSignedLogin(name=>values[name],connect,fetcher,value=>audit.push(JSON.parse(value))),worker=createGateway((target,init)=>handler(new Request(String(target),init)),Date.now,value=>audit.push(JSON.parse(value)));
 const env={TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_GATEWAY_SECRET:secret};
 async function attempt(identifier:string,ip='192.0.2.1',spoof='198.51.100.1'){
  const input=new Request(origin+'/login-with-identifier',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':ip,'x-forwarded-for':spoof,'x-real-ip':spoof,'x-taxiqaid-ip':spoof,'x-taxiqaid-mac':'CLIENT_FORGERY'},body:JSON.stringify({identifier,password:'SYNTHETIC_PASSWORD'})});Object.defineProperty(input,'cf',{value:{colo:'SYNTHETIC'}});return worker(input,env);
 }
 async function envelope(){const body=new TextEncoder().encode(JSON.stringify({identifier:'absentreplay',password:'SYNTHETIC_PASSWORD'})),proof={ip:'192.0.2.1',origin,issued:Math.floor(Date.now()/1000),nonce:crypto.randomUUID().replaceAll('-',''),trace:crypto.randomUUID()};return new Request(GATEWAY_TARGET,{method:'POST',body,headers:{Origin:origin,'Content-Type':'application/json','x-taxiqaid-ip':proof.ip,'x-taxiqaid-issued':String(proof.issued),'x-taxiqaid-nonce':proof.nonce,'x-taxiqaid-trace':proof.trace,'x-taxiqaid-mac':await signGateway(secret,proof,body)}});}
 return {handler,attempt,envelope,audit,rate,values,authCalls:()=>authCalls};
}
Deno.test('signed JS pipeline enforces actual 20/10/10 and replay before simulated password Auth',async()=>{
 const observer=postgres({host:'127.0.0.1',port,username:'supabase_admin',database:'postgres',ssl:false,prepare:false,max:1});
 try{
  for(const [scope,limit]of [['ip',10],['global',20],['account',10]] as const){
   const f=setup(),key=await bucket(f.rate,scope==='global'?'v1:global':scope==='ip'?'v1:ip:192.0.2.1':'v1:account:absentfixed'),permitted=new Map<string,number>();let denied=false;
   for(let n=0;n<(limit+1)*3&&!denied;n++){
    const response=await f.attempt(scope==='account'?'absentfixed':'absentprobe'+n,scope==='ip'?'192.0.2.1':'192.0.2.'+(n%3+1),'198.51.100.'+(n+1));
    const rows=await observer`SELECT max(window_start)::text AS window FROM taxiqaid_private.login_attempt_counters WHERE bucket=${key}`;const window=String(rows[0].window),count=permitted.get(window)||0;
    if(response.status===429){assert(count===limit&&f.audit.at(-2)?.event==='ADMISSION_DENIED');denied=true;}else{assert(response.status===401&&count<limit);permitted.set(window,count+1);}
   }
   assert(denied&&f.audit.some(event=>event.event==='ADMISSION_DENIED')&&!f.audit.some(event=>event.event==='AUTH_THROTTLED'));
  }
  const f=setup(),one=await f.envelope();assert((await f.handler(one.clone())).status===401);const calls=f.authCalls();assert((await f.handler(one.clone())).status===429&&f.authCalls()===calls);
  const pair=await f.envelope(),out=await Promise.all([f.handler(pair.clone()),f.handler(pair.clone())]);assert(out.filter(row=>row.status===401).length===1&&out.filter(row=>row.status===429).length===1&&f.authCalls()===calls+1);
  const master=setup(),response=await master.attempt('dohanyan');assert(response.status===200);const body=await response.json();assert(Object.keys(body).sort().join(',')==='access_token,expires_in,refresh_token,token_type');
  const access=await observer`SELECT taxiqaid_auth_api.get_management_access(${uid},3::bigint) AS payload`,context=contract.access(access[0].payload,uid,Date.now()/1000+3600);
  assert(catalog.ALL.filter((permission:{key:string})=>model.draftDecision(permission.key,context).allowed).length===101);
  assert(catalog.ALL.filter((permission:{key:string;audience:string})=>permission.audience==='Driver').every((permission:{key:string})=>!model.can(context,permission.key)));
  const data=JSON.stringify(master.audit);for(const value of ['192.0.2.1','synthetic-updated','SYNTHETIC_PASSWORD','SYNTHETIC_ACCESS','SYNTHETIC_REFRESH',secret,uid])assert(!data.includes(value));
  console.info('PASS: actual signed Worker/broker/SQL adapter, restricted local PostgreSQL, 20/10/10, replay race, 101 grants/six denials. Auth and cf metadata synthetic; no new hosted or transport-TLS evidence claimed.');
 }finally{await observer.end({timeout:1});}
});
