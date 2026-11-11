// @ts-nocheck
// GENERATED REVIEW-ONLY temporary diagnostic. No deployment or public login activation.
// Original typed modules are checked separately. Regenerate with scripts/build-pooler-diagnostic.cjs.
import postgres from 'npm:postgres@4.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
// Pure shared connection parser; no broker handler or identity queries are bundled.
const projectRef='mqkflwsvnzcaylxtvsje';
function brokerConnectionOptions(connection:string,ca?:string){
 let target:URL;try{target=new URL(connection);}catch{throw new Error('Restricted broker connection required.');}
 const pooler=target.hostname.endsWith('.pooler.supabase.com');
 const username=decodeURIComponent(target.username),expected=pooler?'taxiqaid_auth_login.'+projectRef:'taxiqaid_auth_login';
 if(!['postgres:','postgresql:'].includes(target.protocol)||target.hash||target.pathname!=='/postgres'||!target.password||username!==expected||
  !(target.hostname==='db.'+projectRef+'.supabase.co'&&!pooler&&(!target.port||target.port==='5432')||pooler&&['5432','6543'].includes(target.port))||
  [...target.searchParams].some(([key,value])=>key!=='sslmode'||!['require','verify-full'].includes(value)))throw new Error('Restricted broker connection required.');
 // Parse once; URL ssl/debug/options parameters cannot override these explicit TLS and pool controls.
 return {host:target.hostname,port:Number(target.port||5432),database:'postgres',username,password:decodeURIComponent(target.password),
  max:2,prepare:false,idle_timeout:10,connect_timeout:5,max_lifetime:300,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},debug:false as const,onnotice:()=>{}};
}

// Source: supabase/functions/_diagnostics/pooler-core.mjs
/** Temporary administrator capability. No caller metadata, key alone, or submitted UID grants access. */
const POOLER_CHECKS=Object.freeze(['configuration','administrator_authorization','pooler_configuration','connection','tls_to_pooler','login_role','role_membership','postgres_backend_tls','set_local_role','backend_role','transaction_rollback','role_reset','connection_closed','overall']);
const poolerFailure=()=>Object.fromEntries(POOLER_CHECKS.map(key=>[key,'FAIL']));
function diagnosticPolicy(env,now){
 const uid=env('TAXIQAID_POOLER_DIAGNOSTIC_ADMIN_UID'),expiry=env('TAXIQAID_POOLER_DIAGNOSTIC_EXPIRES_AT');
 if(env('TAXIQAID_POOLER_DIAGNOSTIC_ENABLED')!=='true'||typeof uid!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)||typeof expiry!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(expiry))return null;
 const until=Date.parse(expiry);return Number.isFinite(until)&&until>now&&until-now<=15*60000?{uid:uid.toLowerCase(),until}:null;
}
function reply(status,result,origin){return new Response(status===204?null:JSON.stringify(result),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',Pragma:'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; connect-src https://mqkflwsvnzcaylxtvsje.supabase.co; form-action 'none'; frame-ancestors 'none'",Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})}});}
async function emptyInput(request){
 if(request.body===null)return true;
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>16)return false;
 const reader=request.body.getReader();let size=0,chunks=[],timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('INPUT_REJECTED'));reader.cancel().catch(()=>{});},1000);});
 try{for(;;){const {value,done}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>16){await reader.cancel();return false;}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return /^\s*\{\s*\}\s*$/.test(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return false;}finally{clearTimeout(timer);reader.releaseLock();}
}
function createPoolerDiagnosticHandler({env,verifyUser,probe,now=Date.now}){
 const approvedOrigin='https://mqkflwsvnzcaylxtvsje.supabase.co';let active=false;
 return async request=>{
  const result=poolerFailure(),origin=request.headers.get('origin'),responseOrigin=origin===approvedOrigin?origin:null;
  if(origin&&origin!==approvedOrigin)return reply(403,result);
  if(request.method==='OPTIONS')return reply(204,null,responseOrigin);
  if(request.method!=='POST'||new URL(request.url).search)return reply(405,result,responseOrigin);
  const authorization=request.headers.get('authorization')||'',match=authorization.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  if(!match||match[1].length>16384)return reply(401,result,responseOrigin);
  const policy=diagnosticPolicy(env,now());if(!policy)return reply(503,result,responseOrigin);result.configuration='PASS';
  if(!await emptyInput(request))return reply(400,result,responseOrigin);
  let user;try{user=await verifyUser(match[1]);}catch{return reply(401,result,responseOrigin);}
  if(!user||typeof user.id!=='string'||user.id.toLowerCase()!==policy.uid||user.is_anonymous===true||user.aud!=='authenticated'||user.role!=='authenticated')return reply(403,result,responseOrigin);
  // The protected allowlist is an explicit temporary grant issued only after Dashboard administrator verification.
  if(now()>=policy.until)return reply(403,result,responseOrigin);result.administrator_authorization='PASS';
  if(active)return reply(429,result,responseOrigin);active=true;
  try{
   const checked=await probe();
   for(const key of POOLER_CHECKS)if(!['configuration','administrator_authorization','overall'].includes(key)&&checked?.[key]==='PASS')result[key]='PASS';
  }catch{}
  finally{active=false;}
  result.overall=POOLER_CHECKS.filter(key=>key!=='overall').every(key=>result[key]==='PASS')?'PASS':'FAIL';
  return reply(result.overall==='PASS'?200:503,result,responseOrigin);
 };
}

// Source: supabase/functions/_diagnostics/pooler-db.ts
/** Read-only pooler/socket diagnostic. Does not query identities, private tables, counters or business functions. */
type Sql=ReturnType<typeof postgres>;
function poolerDiagnosticOptions(connection:string,ca?:string){
 const base=brokerConnectionOptions(connection,ca);
 if(!base.host.endsWith('.pooler.supabase.com'))throw new Error('POOLER_CONFIGURATION_REJECTED');
 return {...base,max:1,idle_timeout:1,max_lifetime:20};
}
async function runPoolerDiagnostic(env:(name:string)=>string|undefined,connect:(options:ReturnType<typeof poolerDiagnosticOptions>)=>Sql=postgres){
 const result=poolerFailure();let sql:Sql|null=null,timer:ReturnType<typeof setTimeout>|undefined,closing:Promise<void>|null=null,timedOut=false;
 const close=()=>closing??=Promise.resolve().then(()=>sql?sql.end({timeout:1}):undefined);
 try{
  const options=poolerDiagnosticOptions(env('TAXIQAID_BROKER_DB_URL')||'',env('TAXIQAID_BROKER_DB_CA'));result.pooler_configuration='PASS';
  sql=connect(options);
  timer=setTimeout(()=>{timedOut=true;close().catch(()=>{});},15000);
  await sql.begin('read only',async tx=>{
   await tx`SELECT pg_catalog.set_config('statement_timeout','3000',true),pg_catalog.set_config('lock_timeout','1000',true)`;
   const identity=await tx`SELECT session_user='taxiqaid_auth_login' AS login_ok,current_user='taxiqaid_auth_login' AS actor_ok,pg_catalog.current_database()='postgres' AS database_ok,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AND rolcanlogin AS restricted_ok,pg_catalog.pg_has_role(session_user,'taxiqaid_auth_backend','MEMBER') AS member_ok FROM pg_catalog.pg_roles WHERE rolname=session_user`;
   result.connection='PASS';result.tls_to_pooler='PASS';
   if(identity.length!==1||!['login_ok','actor_ok','database_ok','restricted_ok'].every(key=>identity[0][key]===true))throw new Error('LOGIN_IDENTITY_REJECTED');result.login_role='PASS';
   if(identity[0].member_ok!==true)throw new Error('ROLE_MEMBERSHIP_REJECTED');result.role_membership='PASS';
   const tls=await tx`SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid=pg_catalog.pg_backend_pid()`;
   result.postgres_backend_tls=tls.length===1&&tls[0].ssl===true?'PASS':'FAIL';
   await tx`SET LOCAL ROLE taxiqaid_auth_backend`;result.set_local_role='PASS';
   const backend=await tx`SELECT session_user='taxiqaid_auth_login' AS login_ok,current_user='taxiqaid_auth_backend' AS actor_ok,NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AS restricted_ok FROM pg_catalog.pg_roles WHERE rolname=current_user`;
   if(backend.length!==1||!['login_ok','actor_ok','restricted_ok'].every(key=>backend[0][key]===true))throw new Error('BACKEND_IDENTITY_REJECTED');result.backend_role='PASS';
   await tx.rollback();result.transaction_rollback='PASS';
  });
  const reset=await sql`SELECT session_user='taxiqaid_auth_login' AS login_ok,current_user='taxiqaid_auth_login' AS actor_ok`;
  if(reset.length===1&&reset[0].login_ok===true&&reset[0].actor_ok===true)result.role_reset='PASS';
 }catch{}
 finally{if(timer)clearTimeout(timer);if(sql)try{await close();result.connection_closed='PASS';}catch{}}
 if(timedOut)result.connection='FAIL';
 return result;
}

// Source: supabase/functions/check-broker-pooler/index.ts
/** Review-only temporary endpoint. No login handler, private data queries, privileged keys or deployment action. */
const poolerProject='https://mqkflwsvnzcaylxtvsje.supabase.co';
const poolerPublicKey='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
const poolerEnv=(name:string)=>Deno.env.get(name);
const poolerHandler=createPoolerDiagnosticHandler({env:poolerEnv,
 verifyUser:async(token:string)=>{
  const auth=createClient(poolerProject,poolerPublicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:(input,init)=>fetch(input,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)})}});
  const {data,error}=await auth.auth.getUser(token);
  return !error&&data.user?{id:data.user.id,aud:data.user.aud,role:data.user.role,is_anonymous:data.user.is_anonymous}:null;
 },
 // The closure reads the existing connection secret only after the core authorizes the administrator.
 probe:()=>runPoolerDiagnostic(poolerEnv)
});
Deno.serve(poolerHandler);
