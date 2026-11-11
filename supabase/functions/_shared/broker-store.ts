/** Restricted broker SQL API. No direct identity/Auth table reads or broad connection identities. */
import postgres from 'npm:postgres@4.1.0';
const projectRef='mqkflwsvnzcaylxtvsje';
type Sql=ReturnType<typeof postgres>;
export function brokerConnectionOptions(connection:string,ca?:string){
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
export function createBrokerStore(sql:Sql){
 async function transaction<T>(readOnly:boolean,work:(tx:Sql)=>Promise<T>):Promise<T>{
  return await sql.begin(readOnly?'isolation level repeatable read read only':'isolation level read committed',async tx=>{
   const query=tx as unknown as Sql;
   const identity=await query`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_catalog.pg_roles WHERE rolname=session_user`;
   if(identity.length!==1||identity[0].login!=='taxiqaid_auth_login'||identity[0].actor!=='taxiqaid_auth_login'||identity[0].restricted!==true)throw new Error('Restricted broker connection required.');
   await query`SET LOCAL ROLE taxiqaid_auth_backend`;
   await query`SELECT pg_catalog.set_config('statement_timeout','3000',true),pg_catalog.set_config('lock_timeout','1000',true)`;
   return await work(query);
  }) as T;
 }
 async function beginAttempt(identifier:string,keys:string[]){
  if(keys.length!==3||keys.some(key=>!/^[0-9a-f]{64}$/.test(key))||new Set(keys).size!==3)throw new Error('Invalid attempt buckets.');
  const rows=await transaction(false,async tx=>await tx`SELECT allowed,uid,email,status FROM taxiqaid_auth_api.begin_login_attempt(${identifier},${keys[0]},${keys[1]},${keys[2]})`);
  if(rows.length!==1||typeof rows[0].allowed!=='boolean')throw new Error('Login unavailable.');
  const row=rows[0];
  if(!row.allowed)return {allowed:false,account:null};
  if(row.uid===null&&row.email===null)return {allowed:true,account:null};
  if(typeof row.uid!=='string'||typeof row.email!=='string'||!row.email||row.status!=='active')throw new Error('Login unavailable.');
  return {allowed:true,account:{uid:row.uid,email:row.email,status:row.status}};
 }
 async function loadAccess(uid:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid))throw new Error('Access unavailable.');
  const rows=await transaction(true,async tx=>await tx`SELECT taxiqaid_auth_api.get_management_access(${uid}::uuid) AS access`);
  const raw=rows.length===1?rows[0].access:null;
  if(raw?.version!==1||raw.uid!==uid||raw.account?.uid!==uid||raw.account?.status!=='active'||raw.account?.type!=='management'||!raw.account?.fullName||!Array.isArray(raw.permissions?.roleDefaults)||!raw.permissions?.overrides)throw new Error('Access unavailable.');
  return raw;
 }
 return {beginAttempt,loadAccess};
}
export function openBrokerStore(env:(name:string)=>string|undefined){
 const connection=env('TAXIQAID_BROKER_DB_URL');if(!connection)throw new Error('Restricted broker connection required.');
 return createBrokerStore(postgres(brokerConnectionOptions(connection,env('TAXIQAID_BROKER_DB_CA'))));
}
