/** Mocked SQL/TLS transport. This cannot establish genuine pooler connectivity. */
import postgres from 'npm:postgres@4.1.0';
import {poolerDiagnosticOptions,runPoolerDiagnostic} from './pooler-db.ts';
function assert(value:unknown):asserts value{if(!value)throw new Error('Pooler diagnostic assertion failed.');}
const url='postgresql://taxiqaid_auth_login.mqkflwsvnzcaylxtvsje:SYNTHETIC_ONLY@aws-0-fixture.pooler.supabase.com:6543/postgres';
function fixture(mode='success'){
 const calls:string[]=[];let closed=0,rolled=0;
 const query=async(parts:TemplateStringsArray)=>{const text=parts.join('?');calls.push(text);
  if(mode==='tls-failure')throw new Error('SYNTHETIC_PRIVATE_TLS_ERROR');
  if(text.includes("rolname=session_user"))return [{login_ok:mode!=='wrong-login',actor_ok:true,database_ok:true,restricted_ok:true,member_ok:mode!=='no-membership'}];
  if(text.includes('pg_stat_ssl'))return [{ssl:mode!=='backend-no-tls'}];
  if(text.includes('SET LOCAL ROLE')){if(mode==='set-denied')throw new Error('SYNTHETIC_PRIVATE_ROLE_ERROR');return [];}
  if(text.includes('rolname=current_user'))return [{login_ok:true,actor_ok:true,restricted_ok:mode!=='wrong-backend'}];
  if(text.includes('set_config'))return [];
  return [{login_ok:true,actor_ok:mode!=='reset-failed'}];
 };
 const tx=Object.assign(query,{rollback:async()=>{rolled++;if(mode==='rollback-failed')throw new Error('SYNTHETIC_PRIVATE_ROLLBACK_ERROR');}});
 const sql=Object.assign(query,{begin:async(kind:string,work:(tx:unknown)=>Promise<void>)=>{assert(kind==='read only');return await work(tx);},end:async()=>{closed++;if(mode==='close-failed')throw new Error('SYNTHETIC_PRIVATE_CLOSE_ERROR');}});
 const connect=(options:ReturnType<typeof poolerDiagnosticOptions>)=>{assert(options.max===1&&options.prepare===false&&options.ssl.rejectUnauthorized===true);return sql as unknown as ReturnType<typeof postgres>;};
 return {connect,calls,get closed(){return closed;},get rolled(){return rolled;}};
}
Deno.test('pooler configuration keeps strict certificate verification and rejects direct or elevated identities',()=>{
 const options=poolerDiagnosticOptions(url);assert(options.prepare===false&&options.ssl.rejectUnauthorized===true&&options.max===1);
 for(const bad of [url.replace('taxiqaid_auth_login.','postgres.'),url+'?sslmode=disable','postgresql://taxiqaid_auth_login:SYNTHETIC_ONLY@db.mqkflwsvnzcaylxtvsje.supabase.co/postgres']){let failed=false;try{poolerDiagnosticOptions(bad);}catch{failed=true;}assert(failed);}
});
Deno.test('read-only metadata verifies both roles, explicitly rolls back, observes reset and closes its sole client',async()=>{
 const mock=fixture(),result=await runPoolerDiagnostic(name=>name==='TAXIQAID_BROKER_DB_URL'?url:undefined,mock.connect);
 for(const key of ['pooler_configuration','connection','tls_to_pooler','login_role','role_membership','postgres_backend_tls','set_local_role','backend_role','transaction_rollback','role_reset','connection_closed'])assert(result[key]==='PASS');
 assert(mock.rolled===1&&mock.closed===1);assert(mock.calls.every(text=>!/(?:taxiqaid_private|auth\.users|INSERT|UPDATE|DELETE|GRANT|ALTER|CREATE)/.test(text)));
});
Deno.test('TLS, identity, membership, SET ROLE, rollback, reset and cleanup failures remain status-only and always close',async()=>{
 for(const [mode,key]of [['tls-failure','connection'],['wrong-login','login_role'],['no-membership','role_membership'],['backend-no-tls','postgres_backend_tls'],['set-denied','set_local_role'],['wrong-backend','backend_role'],['rollback-failed','transaction_rollback'],['reset-failed','role_reset'],['close-failed','connection_closed']]){
  const mock=fixture(mode),result=await runPoolerDiagnostic(name=>name==='TAXIQAID_BROKER_DB_URL'?url:undefined,mock.connect);assert(result[key]==='FAIL');assert(mock.closed===1);assert(Object.values(result).every(value=>value==='PASS'||value==='FAIL'));assert(!JSON.stringify(result).includes('SYNTHETIC'));
 }
});
