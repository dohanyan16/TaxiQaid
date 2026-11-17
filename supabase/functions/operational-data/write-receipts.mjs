/** Restricted coordinator only. Never use a service-role key or a browser RPC. */
export function operationalConnectionOptions(connection,ca){
 // Keep connection secrets opaque. Only predeclared, non-sensitive error classes
 // are logged by the caller; never expose the URL, hostname or username.
 let url;try{url=new URL(String(connection).trim());}catch{throw new Error('OPDB_URL_INVALID');}
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.pathname!=='/postgres'||url.hash)
  throw new Error('OPDB_URL_FORMAT');
 if(!url.password)throw new Error('OPDB_PASSWORD_MISSING');
 const project='mqkflwsvnzcaylxtvsje',pooler=url.hostname.endsWith('.pooler.supabase.com');
 let username;try{username=decodeURIComponent(url.username);}catch{throw new Error('OPDB_URL_INVALID');}
 if(!(pooler&&['5432','6543'].includes(url.port)||url.hostname==='db.'+project+'.supabase.co'&&(!url.port||url.port==='5432')))
  throw new Error('OPDB_HOST_OR_PORT');
 if(username!=='taxiqaid_operational_login'+(pooler?'.'+project:''))
  throw new Error('OPDB_ROLE_MISMATCH');
 if([...url.searchParams].some(([k,v])=>k!=='sslmode'||!['require','verify-full'].includes(v)))
  throw new Error('OPDB_QUERY_UNSUPPORTED');
 return {host:url.hostname,port:Number(url.port||5432),database:'postgres',username:decodeURIComponent(url.username),password:decodeURIComponent(url.password),max:2,prepare:false,connect_timeout:5,idle_timeout:10,max_lifetime:300,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},debug:false,onnotice:()=>{}};
}
export function createDriverReceipts(sql){
 async function dispatch(action,payload){
  try{return await sql.begin('isolation level read committed',async tx=>{
   const rows=await tx`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_catalog.pg_roles WHERE rolname=session_user`;
   if(rows.length!==1||rows[0].login!=='taxiqaid_operational_login'||rows[0].actor!=='taxiqaid_operational_login'||rows[0].restricted!==true)throw new Error('Restricted coordinator required');
   await tx`SET LOCAL ROLE taxiqaid_operational_backend`;
   await tx`SELECT pg_catalog.set_config('statement_timeout','3000',true),pg_catalog.set_config('lock_timeout','1000',true)`;
   const result=await tx`SELECT taxiqaid_auth_api.operational_dispatch(${payload.actor}::uuid,${action},${JSON.stringify(payload)}::jsonb) AS result`;
   if(result.length!==1||!result[0].result||typeof result[0].result!=='object')throw new Error('Coordinator response invalid');
   return result[0].result;
  });}catch(error){
   // The database adapter hides private connection details from HTTP responses.
   // Only predefined status classes may reach server logs; never log exception text.
   const pgCode=typeof error?.code==='string'?error.code:'';
   const category=pgCode==='28P01'?'PASSWORD_REJECTED':pgCode==='28000'?'LOGIN_REJECTED':
     pgCode==='42501'?'POLICY_DENIED':pgCode==='3D000'?'DATABASE_REJECTED':
     pgCode==='42P01'?'COORDINATOR_MISSING':pgCode==='57014'?'QUERY_TIMEOUT':
     pgCode.startsWith('08')?'NETWORK_UNAVAILABLE':'COORDINATOR_UNAVAILABLE';
   console.log(JSON.stringify({event:'OPERATIONAL_DB_DISPATCH',status:category}));
   throw new Error('WRITE_COORDINATOR_UNAVAILABLE');
  }
 }
 return Object.freeze({ready:payload=>dispatch('ready',payload),claim:payload=>dispatch('claim',payload),seal:payload=>dispatch('seal',payload),advance:payload=>dispatch('advance',payload),finish:payload=>dispatch('finish',payload)});
}
