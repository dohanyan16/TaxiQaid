/** Separate owner capability; never returns a session, identity, mapping or raw error. */
import {readCredentials,bucket,safeTokenSession} from '../_shared/security.mjs';
export const OWNER_CHECKS=Object.freeze(['configuration','administrator_jwt','administrator_authorization','attempt_limits','private_mapping','password_authentication','mapping_revision','sdk_session','verified_uid','active_master','access_compatibility','management_permissions','driver_denials','password_only','server_signout','database_closed','grant_valid','overall']);
export const ownerFailure=()=>({...Object.fromEntries(OWNER_CHECKS.map(key=>[key,'FAIL'])),management_count:0,driver_denied_count:0});
export function ownerPolicy(env,now){
 const uid=env('TAXIQAID_USERNAME_DIAGNOSTIC_ADMIN_UID'),expiry=env('TAXIQAID_USERNAME_DIAGNOSTIC_EXPIRES_AT');
 if(env('TAXIQAID_USERNAME_DIAGNOSTIC_ENABLED')!=='true'||!['TAXIQAID_LOGIN_ENABLED','TAXIQAID_SESSION_TRANSPORT_REVIEWED','TAXIQAID_TRUSTED_IP_HEADER_VERIFIED'].every(key=>env(key)==='false')||typeof uid!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)||typeof expiry!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(expiry))return null;
 const until=Date.parse(expiry);return Number.isFinite(until)&&until>now&&until-now<=900000?{uid:uid.toLowerCase(),until}:null;
}
const ownerOrigin='https://mqkflwsvnzcaylxtvsje.supabase.co';
function ownerReply(status,result,origin){return new Response(status===204?null:JSON.stringify(result),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',Pragma:'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; connect-src https://mqkflwsvnzcaylxtvsje.supabase.co; form-action 'none'; frame-ancestors 'none'",...(origin===ownerOrigin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{}),Vary:'Origin'}});}
export function createOwnerUsernameHandler({env,verifyUser,verifyAdministrator,open,now=Date.now}){
 let active=false;
 return async request=>{
  const result=ownerFailure(),origin=request.headers.get('origin');
  if(origin&&origin!==ownerOrigin)return ownerReply(403,result,origin);
  if(request.method==='OPTIONS')return ownerReply(204,null,origin);
  if(request.method!=='POST'||new URL(request.url).search)return ownerReply(405,result,origin);
  const match=(request.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  if(!match||match[1].length>16384)return ownerReply(401,result,origin);
  const policy=ownerPolicy(env,now());if(!policy)return ownerReply(503,result,origin);result.configuration='PASS';
  const stillValid=()=>{const current=ownerPolicy(env,now());return current?.uid===policy.uid&&current.until===policy.until;};
  let user;
  try{user=await verifyUser(match[1]);}catch{return ownerReply(401,result,origin);}
  if(!user||user.id!==policy.uid||user.aud!=='authenticated'||user.role!=='authenticated'||user.is_anonymous===true)return ownerReply(403,result,origin);result.administrator_jwt='PASS';
  try{if(!stillValid()||!await verifyAdministrator(match[1],policy.uid))return ownerReply(403,result,origin);}catch{return ownerReply(403,result,origin);}
  if(!stillValid())return ownerReply(403,result,origin);result.administrator_authorization='PASS';
  if(active)return ownerReply(429,result,origin);active=true;
  let input=null,runtime=null;
  try{
   input=await readCredentials(request);if(input.identifier!=='dohanyan'||!stillValid())throw new Error('REJECTED');
   const secret=env('TAXIQAID_RATE_SECRET');if(typeof secret!=='string'||secret.length<32)throw new Error('REJECTED');
   // Existing three-bucket SQL API: the legacy IP slot holds an owner-principal bucket, never an invented IP.
   const keys=await Promise.all([bucket(secret,'v1:owner-diagnostic:'+policy.uid),bucket(secret,'v1:account:dohanyan'),bucket(secret,'v1:global')]);
   if(!stillValid())throw new Error('REJECTED');
   runtime=await open();if(!stillValid())throw new Error('REJECTED');
   const attempt=await runtime.beginAttempt('dohanyan',keys);
   if(!attempt||attempt.allowed!==true)throw new Error('REJECTED');result.attempt_limits='PASS';
   const account=attempt.account;
   if(!account||account.uid!==policy.uid||account.status!=='active'||typeof account.email!=='string'||!account.email||typeof account.mappingRevision!=='string'||!/^[1-9][0-9]{0,18}$/.test(account.mappingRevision)||BigInt(account.mappingRevision)>9223372036854775807n||!stillValid())throw new Error('REJECTED');result.private_mapping='PASS';
   const authenticated=await runtime.passwordSignIn(account.email,input.password);input.password='';
   if(authenticated?.error||authenticated?.user?.id!==policy.uid||!authenticated.session)throw new Error('REJECTED');const validatedSession=safeTokenSession(authenticated.session);result.password_authentication='PASS';
   if(!stillValid())throw new Error('REJECTED');
   const snapshot=await runtime.loadAccess(policy.uid,account.mappingRevision);
   if(snapshot?.uid!==policy.uid||snapshot.account?.uid!==policy.uid||snapshot.account.status!=='active'||snapshot.account.type!=='management'||snapshot.account.role!=='super_admin'||snapshot.account.username!=='dohanyan')throw new Error('REJECTED');result.mapping_revision='PASS';
   if(!stillValid())throw new Error('REJECTED');
   const installed=await runtime.setSession(validatedSession);if(!installed)throw new Error('REJECTED');result.sdk_session='PASS';
   if(!stillValid())throw new Error('REJECTED');
   const identity=await runtime.getUser();if(identity?.id!==policy.uid||identity.aud!=='authenticated'||identity.role!=='authenticated'||identity.is_anonymous===true)throw new Error('REJECTED');result.verified_uid='PASS';
   if(!stillValid())throw new Error('REJECTED');
   const checked=await runtime.inspectAccess(policy.uid);
   if(checked?.activeMaster!==true)throw new Error('REJECTED');result.active_master='PASS';
   if(checked.compatible!==true)throw new Error('REJECTED');result.access_compatibility='PASS';
   if(Number.isInteger(checked.management)&&checked.management>=0&&checked.management<=101)result.management_count=checked.management;
   if(Number.isInteger(checked.driverDenied)&&checked.driverDenied>=0&&checked.driverDenied<=6)result.driver_denied_count=checked.driverDenied;
   if(result.management_count===101)result.management_permissions='PASS';if(result.driver_denied_count===6)result.driver_denials='PASS';
   if(await runtime.passwordOnly())result.password_only='PASS';
  }catch{}
  finally{
   if(input)input.password='';
   if(runtime){try{if(await runtime.signOut())result.server_signout='PASS';}catch{}try{await runtime.close();result.database_closed='PASS';}catch{}}
   if(stillValid())result.grant_valid='PASS';active=false;
  }
  result.overall=OWNER_CHECKS.filter(key=>key!=='overall').every(key=>result[key]==='PASS')?'PASS':'FAIL';
  return ownerReply(result.overall==='PASS'?200:503,result,origin);
 };
}
