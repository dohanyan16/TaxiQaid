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
let writer: ReturnType<typeof createDriverWriteEngine>|null=null;
if(env('TAXIQAID_OPERATIONAL_WRITES_ENABLED')==='true'&&env('TAXIQAID_GOOGLE_WRITERS_CONTROLLED')==='true'&&connection){
 try{const coordinator=createDriverReceipts(postgres(operationalConnectionOptions(connection,env('TAXIQAID_OPERATIONAL_DB_CA'))));
 const writeAuth=createGoogleReader(env,{oauthScope:'https://www.googleapis.com/auth/spreadsheets'});
 writer=createDriverWriteEngine({google:createGoogleWriteAdapter(env,{auth:writeAuth}),receipts:coordinator,schema,permissions});
 }catch{writer=null;}
}
// Local configuration/crypto only: no Google call, credential value or new diagnostic endpoint.
void google.inspectConfiguration().then(result=>console.log(JSON.stringify({event:'OPERATIONAL_CONFIG',...result})));
Deno.serve(createDataHandler({google,writer,verifyUser:async(token:string)=>{const {data,error}=await client.auth.getUser(token);if(error||!data.user||data.user.is_anonymous)return null;try{const value=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return {uid:data.user.id,expiresAt:value.exp};}catch{return null;}},loadAccess:async(token:string)=>{const reply=await fetch(project+'/functions/v1/get-my-access',{headers:{Authorization:'Bearer '+token,apikey:key,Origin:'https://dohanyan16.github.io'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!reply.ok){await reply.body?.cancel();throw new Error([401,403].includes(reply.status)?'ACCESS_DENIED':'ACCESS_UNAVAILABLE');}return await reply.json();},metric:(result:Record<string,unknown>)=>console.log(JSON.stringify(result))}));
