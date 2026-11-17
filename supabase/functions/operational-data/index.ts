/** Staged read + opt-in transactional write service; SQL writer must be approved first. */
import {createRequire} from 'node:module';
import postgres from 'npm:postgres@4.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createGoogleReader} from './google.mjs';
import {createGoogleWriteAdapter} from './google-write.mjs';
import {operationalConnectionOptions,createDriverReceipts} from './write-receipts.mjs';
import {createDriverWriteEngine} from './write-engine.mjs';
import {createDataHandler} from './handler.mjs';
const require=createRequire(import.meta.url),schema=require('../../../shared/sheets-model.js'),permissions=require('../../../shared/permission-model.js');
const project='https://mqkflwsvnzcaylxtvsje.supabase.co',key='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
const env=(name:string)=>Deno.env.get(name);
const client=createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(10000)})}});
const google=createGoogleReader(env);
// Inert unless a separately approved restricted SQL coordinator and source-writer controls exist.
// Presence of a platform service-role key never enables operational writes.
const connection=env('TAXIQAID_OPERATIONAL_DB_URL');
const writesFlag=env('TAXIQAID_OPERATIONAL_WRITES_ENABLED')==='true';
const controlledFlag=env('TAXIQAID_GOOGLE_WRITERS_CONTROLLED')==='true';
let writer: ReturnType<typeof createDriverWriteEngine>|null=null;
let writerBoot='GATE_DISABLED',writerReason='NONE';
if(writesFlag&&controlledFlag&&connection){
 try{
  const db=postgres(operationalConnectionOptions(connection,env('TAXIQAID_OPERATIONAL_DB_CA')));
  const coordinator=createDriverReceipts(db);
  const writeAuth=createGoogleReader(env,{oauthScope:'https://www.googleapis.com/auth/spreadsheets'});
  writer=createDriverWriteEngine({google:createGoogleWriteAdapter(env,{auth:writeAuth}),receipts:coordinator,schema,permissions});
  writerBoot='CLIENT_CREATED';
  // No UID, password, connection URL or SQL result is logged. This is a SELECT-only probe.
  void db`SELECT 1 AS connection_test`.then(()=>console.log(JSON.stringify({event:'OPERATIONAL_DB_PROBE',result:'CONNECTED'})))
    .catch(()=>console.log(JSON.stringify({event:'OPERATIONAL_DB_PROBE',result:'CONNECTION_FAILED'})));
 }catch(error){
  writerBoot='CONFIGURATION_REJECTED';
  const safe=['OPDB_URL_INVALID','OPDB_URL_FORMAT','OPDB_PASSWORD_MISSING','OPDB_ROLE_MISMATCH','OPDB_HOST_OR_PORT','OPDB_QUERY_UNSUPPORTED'];
  writerReason=safe.includes(error?.message)?error.message:'OPDB_CLIENT_INIT';
 }
}else if(writesFlag&&controlledFlag&&!connection)writerBoot='DB_URL_MISSING';
console.log(JSON.stringify({event:'OPERATIONAL_WRITER_BOOT',status:writerBoot,reason:writerReason,writesFlag,controlledFlag,hasConnection:Boolean(connection)}));
// Local configuration/crypto only: no Google call, credential value or new diagnostic endpoint.
void google.inspectConfiguration().then(result=>console.log(JSON.stringify({event:'OPERATIONAL_CONFIG',...result})));
Deno.serve(createDataHandler({google,writer,verifyUser:async(token:string)=>{const {data,error}=await client.auth.getUser(token);if(error||!data.user||data.user.is_anonymous)return null;try{const value=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return {uid:data.user.id,expiresAt:value.exp};}catch{return null;}},loadAccess:async(token:string)=>{const reply=await fetch(project+'/functions/v1/get-my-access',{headers:{Authorization:'Bearer '+token,apikey:key,Origin:'https://dohanyan16.github.io'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!reply.ok){await reply.body?.cancel();throw new Error([401,403].includes(reply.status)?'ACCESS_DENIED':'ACCESS_UNAVAILABLE');}return await reply.json();},metric:(result:Record<string,unknown>)=>console.log(JSON.stringify(result))}));
