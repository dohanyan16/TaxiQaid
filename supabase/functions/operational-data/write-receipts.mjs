/** Restricted coordinator only. Never use a service-role key or a browser RPC. */
export function operationalConnectionOptions(connection,ca){
 let url;try{url=new URL(connection);}catch{throw new Error('WRITE_COORDINATOR_NOT_READY');}
 const pooler=url.hostname.endsWith('.pooler.supabase.com'),project='mqkflwsvnzcaylxtvsje';
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.pathname!=='/postgres'||!url.password||url.hash||
 decodeURIComponent(url.username)!=='taxiqaid_operational_login'+(pooler?'.'+project:'')||
 !(pooler&&['5432','6543'].includes(url.port)||url.hostname==='db.'+project+'.supabase.co'&&(!url.port||url.port==='5432'))||
 [...url.searchParams].some(([k,v])=>k!=='sslmode'||!['require','verify-full'].includes(v)))throw new Error('WRITE_COORDINATOR_NOT_READY');
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
  });}catch{throw new Error('WRITE_COORDINATOR_UNAVAILABLE');}
 }
 return Object.freeze({ready:payload=>dispatch('ready',payload),claim:payload=>dispatch('claim',payload),seal:payload=>dispatch('seal',payload),advance:payload=>dispatch('advance',payload),finish:payload=>dispatch('finish',payload)});
}
