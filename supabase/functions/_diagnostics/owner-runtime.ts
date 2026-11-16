/** Review-only owner diagnostic. Public login flags must remain false. Sessions never leave this handler. */
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import postgres from 'npm:postgres@4.1.0';
import {inspectMasterAccess} from './master-access.ts';
import {brokerConnectionOptions,createBrokerStore} from '../_shared/broker-store.ts';
const ownerProject='https://mqkflwsvnzcaylxtvsje.supabase.co';
const ownerKey='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
export function ownerDependencies(ownerEnv:(name:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch){
function ownerClient(){
 let logoutStatus=0;
 const client=createClient(ownerProject,ownerKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:async(input,init)=>{
  const target=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(target.origin!==ownerProject||!['/auth/v1/token','/auth/v1/user','/auth/v1/logout','/auth/v1/factors'].includes(target.pathname))throw new Error('REQUEST_REJECTED');
  if(target.pathname==='/auth/v1/logout')logoutStatus=0;
  const reply=await fetcher(input,{...init,credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  if(target.pathname==='/auth/v1/logout')logoutStatus=reply.status;return reply;
 }}});
 return {client,logoutConfirmed:()=>[200,204].includes(logoutStatus)};
}
// Called only after online getUser verified this same JWT; decoding alone never authorizes a caller.
function verifiedTokenExpiry(token:string){
 const part=token.split('.')[1].replaceAll('-','+').replaceAll('_','/');
 const payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')),c=>c.charCodeAt(0))));
 if(!Number.isFinite(payload.exp))throw new Error('SESSION_REJECTED');return payload.exp as number;
}
async function ownerAccess(token:string){
 const reply=await fetcher(ownerProject+'/functions/v1/get-my-access',{method:'GET',headers:{apikey:ownerKey,Authorization:'Bearer '+token,Origin:ownerProject},credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(reply.status!==200){await reply.body?.cancel();throw new Error('ACCESS_REJECTED');}return await reply.json();
}
return {env:ownerEnv,
 verifyUser:async(token:string)=>{const {client}=ownerClient();const {data,error}=await client.auth.getUser(token);return !error&&data.user?{id:data.user.id,aud:data.user.aud,role:data.user.role,is_anonymous:data.user.is_anonymous}:null;},
 verifyAdministrator:async(token:string,uid:string)=>{const checked=inspectMasterAccess(await ownerAccess(token),uid,verifiedTokenExpiry(token));return checked.activeMaster&&checked.management===101&&checked.driverDenied===6;},
 open:async()=>{
  const sql=connect({...brokerConnectionOptions(ownerEnv('TAXIQAID_BROKER_DB_URL')||'',ownerEnv('TAXIQAID_BROKER_DB_CA')),max:1,idle_timeout:1,max_lifetime:60});
  const deadline=setTimeout(()=>{sql.end({timeout:1}).catch(()=>{});},75000);
  const store=createBrokerStore(sql),{client,logoutConfirmed}=ownerClient();let created=false,installed:Awaited<ReturnType<typeof client.auth.setSession>>['data']['session']=null;
  return {...store,
   passwordSignIn:async(email:string,password:string)=>{const {data,error}=await client.auth.signInWithPassword({email,password});created=Boolean(data.session);return {...data,error:!!error};},
   setSession:async(session:{access_token:string;refresh_token:string})=>{const {data,error}=await client.auth.setSession(session);installed=data.session;return !error&&!!installed;},
   getUser:async()=>{const {data,error}=await client.auth.getUser();return !error?data.user:null;},
   inspectAccess:async(uid:string)=>{if(!installed)throw new Error('SESSION_REJECTED');return inspectMasterAccess(await ownerAccess(installed.access_token),uid,installed.expires_at||0);},
   passwordOnly:async()=>{const {data,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();return !error&&data?.currentLevel==='aal1';},
   signOut:async()=>{try{if(!created)return false;const {error}=await client.auth.signOut({scope:'local'});return !error&&logoutConfirmed();}finally{await client.auth.stopAutoRefresh();installed=null;}},
   close:async()=>{clearTimeout(deadline);await sql.end({timeout:1});}
  };
 }
};
}
