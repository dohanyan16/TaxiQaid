/** Proposal adapter: same least-privilege transactions, one-use signed request and existing post-Auth access read. */
import postgres from 'npm:postgres@4.1.0';
import {createBrokerStore} from './broker-store.ts';
import {bucket} from './security.mjs';
type SignedSql=ReturnType<typeof postgres>;
export function signedBrokerStore(sql:SignedSql,proof:{nonce:string;issued:number},rateSecret:string){
 const base=createBrokerStore(sql);
 return {...base,beginAttempt:async(identifier:string,keys:string[])=>{
  if(keys.length!==3||new Set(keys).size!==3||keys.some(x=>!/^[0-9a-f]{64}$/.test(x))||!/^[0-9a-f]{32}$/.test(proof.nonce)||!Number.isInteger(proof.issued))throw new Error('REJECTED');
  const nonce=await bucket(rateSecret,'v1:gateway-nonce:'+proof.nonce);
  const rows=await sql.begin('isolation level read committed',async tx=>{
   const identity=await tx`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_catalog.pg_roles WHERE rolname=session_user`;
   if(identity.length!==1||identity[0].login!=='taxiqaid_auth_login'||identity[0].actor!=='taxiqaid_auth_login'||identity[0].restricted!==true)throw new Error('REJECTED');
   await tx`SET LOCAL ROLE taxiqaid_auth_backend`;
   await tx`SELECT pg_catalog.set_config('statement_timeout','3000',true),pg_catalog.set_config('lock_timeout','1000',true)`;
   return await tx`SELECT allowed,uid,email,status,mapping_revision::text AS mapping_revision FROM taxiqaid_auth_api.begin_signed_login_attempt(${identifier},${keys[0]},${keys[1]},${keys[2]},${nonce},${proof.issued}::bigint)`;
  });
  if(rows.length!==1||typeof rows[0].allowed!=='boolean')throw new Error('REJECTED');const row=rows[0];
  if(!row.allowed)return {allowed:false,account:null};if(row.uid===null&&row.email===null)return {allowed:true,account:null};
  if(typeof row.uid!=='string'||typeof row.email!=='string'||!row.email||row.status!=='active'||typeof row.mapping_revision!=='string'||!/^[1-9][0-9]{0,18}$/.test(row.mapping_revision)||BigInt(row.mapping_revision)>9223372036854775807n)throw new Error('REJECTED');
  return {allowed:true,account:{uid:row.uid,email:row.email,status:row.status,mappingRevision:row.mapping_revision}};
 }};
}
