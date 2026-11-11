/** Restricted adapter fixtures; real PostgreSQL policy/concurrency verification is separate. */
import postgres from 'npm:postgres@4.1.0';
import {brokerConnectionOptions,createBrokerStore} from './broker-store.ts';
function assert(value:unknown):asserts value{if(!value)throw new Error('Restricted store assertion failed.');}
function equal(actual:unknown,expected:unknown){assert(JSON.stringify(actual)===JSON.stringify(expected));}
function rejectsSync(callback:()=>unknown){let failed=false;try{callback();}catch{failed=true;}assert(failed);}
const uid='00000000-0000-4000-8000-000000000001',keys=['1'.repeat(64),'2'.repeat(64),'3'.repeat(64)];
function harness(options:{identity?:unknown;attempt?:unknown;access?:unknown;failure?:boolean}={}){
 const calls:{text:string;values:unknown[]}[]=[],transactions:{mode:string;committed:boolean}[]=[];
 const query=async(parts:TemplateStringsArray,...values:unknown[])=>{
  const text=parts.join('?');calls.push({text,values});
  if(text.includes('session_user'))return options.identity??[{login:'taxiqaid_auth_login',actor:'taxiqaid_auth_login',restricted:true}];
  if(text.includes('begin_login_attempt')){if(options.failure)throw new Error('Synthetic outage.');return options.attempt??[{allowed:true,uid,email:'synthetic@example.invalid',status:'active'}];}
  if(text.includes('get_management_access'))return [{access:options.access??{version:1,uid,account:{uid,status:'active',type:'management',fullName:'Synthetic Manager'},permissions:{roleDefaults:[],overrides:{}}}}];
  if(text.includes('SET LOCAL ROLE')||text.includes('set_config'))return [];
  throw new Error('Unexpected SQL.');
 };
 const sql=Object.assign(query,{begin:async(mode:string,callback:(q:unknown)=>Promise<unknown>)=>{const tx={mode,committed:false};transactions.push(tx);const value=await callback(query);tx.committed=true;return value;}});
 return {store:createBrokerStore(sql as unknown as ReturnType<typeof postgres>),calls,transactions};
}
Deno.test('broker refuses postgres/NOLOGIN/old-project URLs and URL options that weaken TLS',()=>{
 const envUrl='postgresql://taxiqaid_auth_login:synthetic-only@db.mqkflwsvnzcaylxtvsje.supabase.co/postgres';
 const options=brokerConnectionOptions(envUrl);equal(options.ssl,{rejectUnauthorized:true});assert(options.prepare===false&&options.max===2);
 const pool=brokerConnectionOptions('postgresql://taxiqaid_auth_login.mqkflwsvnzcaylxtvsje:synthetic-only@aws-0-test.pooler.supabase.com:6543/postgres');assert(pool.prepare===false);
 for(const bad of [envUrl.replace('taxiqaid_auth_login:','postgres:'),envUrl.replace('taxiqaid_auth_login:','taxiqaid_auth_backend:'),envUrl.replace('mqkflwsvnzcaylxtvsje','gycijhgmmaznvcoxphlh'),envUrl+'?sslmode=disable',envUrl+'?options=unsafe',envUrl.replace('supabase.co','attacker.invalid'),envUrl.replace('/postgres','/other'),envUrl.replace(':synthetic-only@',':@')])rejectsSync(()=>brokerConnectionOptions(bad));
});
Deno.test('each transaction checks actual connection identity before a local role switch',async()=>{
 for(const identity of [[{login:'postgres',actor:'postgres',restricted:false}],[{login:'taxiqaid_auth_login',actor:'taxiqaid_auth_backend',restricted:true}],[{login:'taxiqaid_auth_login',actor:'taxiqaid_auth_login',restricted:false}]]){
  const fixture=harness({identity});let failed=false;try{await fixture.store.beginAttempt('syntheticmanager',keys);}catch{failed=true;}assert(failed);assert(fixture.calls.length===1);assert(!fixture.transactions[0].committed);
 }
});
Deno.test('attempt uses only protected function, parameterized arguments and committed transaction result',async()=>{
 const fixture=harness(),attempt=await fixture.store.beginAttempt('syntheticmanager',keys);assert(attempt.allowed&&attempt.account?.uid===uid);assert(fixture.transactions[0].committed);equal(fixture.calls.at(-1)?.values,['syntheticmanager',...keys]);assert(fixture.calls.some(q=>q.text==='SET LOCAL ROLE taxiqaid_auth_backend'));assert(fixture.calls.every(q=>!q.text.includes('auth.users')&&!q.text.includes('taxiqaid_private')));
 const denied=harness({attempt:[{allowed:false,uid:null,email:null,status:null}]});equal(await denied.store.beginAttempt('syntheticmanager',keys),{allowed:false,account:null});
 const unknown=harness({attempt:[{allowed:true,uid:null,email:null,status:null}]});equal(await unknown.store.beginAttempt('syntheticmanager',keys),{allowed:true,account:null});
});
Deno.test('outages and malformed private replies never produce a usable attempt or partially commit',async()=>{
 for(const options of [{failure:true},{attempt:[]},{attempt:[{allowed:'true'}]},{attempt:[{allowed:true,uid,email:'synthetic@example.invalid',status:'disabled'}]}]){
  const fixture=harness(options);let failed=false;try{await fixture.store.beginAttempt('syntheticmanager',keys);}catch{failed=true;}assert(failed);if(options.failure)assert(!fixture.transactions[0].committed);
 }
});
Deno.test('post-Auth access uses repeatable-read readonly transaction and exact UID; driver access fails closed',async()=>{
 const fixture=harness(),access=await fixture.store.loadAccess(uid);assert(access.uid===uid);assert(fixture.transactions[0].mode==='isolation level repeatable read read only');equal(fixture.calls.at(-1)?.values,[uid]);
 for(const access of [{version:1,uid:'other'},{version:1,uid,account:{uid,type:'driver',status:'active',fullName:'Synthetic Driver'},permissions:{roleDefaults:[],overrides:{}}}]){
  let failed=false;try{await harness({access}).store.loadAccess(uid);}catch{failed=true;}assert(failed);
 }
});
