/** Staged read + opt-in transactional write service; SQL writer must be approved first. */
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createGoogleReader} from './google.mjs';
import {createGoogleWriteAdapter} from './google-write.mjs';
import {createDriverReceipts} from './write-receipts.mjs';
import {createDriverWriteEngine} from './write-engine.mjs';
import {createDataHandler} from './handler.mjs';
const project='https://mqkflwsvnzcaylxtvsje.supabase.co',key='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
const env=(name:string)=>Deno.env.get(name);
const client=createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(10000)})}});
const google=createGoogleReader(env);
// Server-only privileged client; never placed in public source or response.
// If the narrow SQL coordination functions have not been installed, writes fail closed.
const secret=(()=>{try{return JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default||env('SUPABASE_SERVICE_ROLE_KEY')||null;}catch{return null;}})();
const coordinator=secret?createDriverReceipts(createClient(project,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})):null;
const writeAuth=createGoogleReader(env,{oauthScope:'https://www.googleapis.com/auth/spreadsheets'});
const writer=coordinator?createDriverWriteEngine({google:createGoogleWriteAdapter(env,{auth:writeAuth}),receipts:coordinator,schema:TaxiQaidSheetsModel,permissions:TaxiQaidPermissionModel}):null;
// Local configuration/crypto only: no Google call, credential value or new diagnostic endpoint.
void google.inspectConfiguration().then(result=>console.log(JSON.stringify({event:'OPERATIONAL_CONFIG',...result})));
Deno.serve(createDataHandler({google,writer,verifyUser:async(token:string)=>{const {data,error}=await client.auth.getUser(token);if(error||!data.user||data.user.is_anonymous)return null;try{const value=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return {uid:data.user.id,expiresAt:value.exp};}catch{return null;}},loadAccess:async(token:string)=>{const reply=await fetch(project+'/functions/v1/get-my-access',{headers:{Authorization:'Bearer '+token,apikey:key,Origin:'https://dohanyan16.github.io'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!reply.ok){await reply.body?.cancel();throw new Error([401,403].includes(reply.status)?'ACCESS_DENIED':'ACCESS_UNAVAILABLE');}return await reply.json();},metric:(result:Record<string,unknown>)=>console.log(JSON.stringify(result))}));
