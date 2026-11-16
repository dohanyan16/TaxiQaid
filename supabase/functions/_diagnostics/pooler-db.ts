/** Read-only pooler/socket diagnostic. Does not query identities, private tables, counters or business functions. */
import postgres from 'npm:postgres@4.1.0';
import {brokerConnectionOptions} from '../_shared/broker-store.ts';
import {poolerFailure} from './pooler-core.mjs';
type Sql=ReturnType<typeof postgres>;
export function poolerDiagnosticOptions(connection:string,ca?:string){
 const base=brokerConnectionOptions(connection,ca);
 if(!base.host.endsWith('.pooler.supabase.com'))throw new Error('POOLER_CONFIGURATION_REJECTED');
 return {...base,max:1,idle_timeout:1,max_lifetime:20};
}
export async function runPoolerDiagnostic(env:(name:string)=>string|undefined,connect:(options:ReturnType<typeof poolerDiagnosticOptions>)=>Sql=postgres){
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
