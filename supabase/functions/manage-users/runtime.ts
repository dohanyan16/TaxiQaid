/** Administrative service, inert by default. Official online Auth + SQL Master/capability checks before Admin API use. */
import postgres from 'npm:postgres@4.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createRequire} from 'node:module';
import {brokerConnectionOptions} from '../_shared/broker-store.ts';
import {configuredOrigins,response,originFor} from '../_shared/security.mjs';
import {syncSheets} from './sheets.mjs';
const require=createRequire(import.meta.url),model=require('../../../shared/user-admin-model.js');
const project='https://mqkflwsvnzcaylxtvsje.supabase.co',key='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
export function adminConnectionOptions(connection:string,ca?:string){
 const target=new URL(connection),pooler=target.hostname.endsWith('.pooler.supabase.com'),username=decodeURIComponent(target.username),expected='taxiqaid_user_admin_login'+(pooler?'.mqkflwsvnzcaylxtvsje':'');
 if(username!==expected)throw new Error('Restricted administration connection required.');target.username='taxiqaid_auth_login'+(pooler?'.mqkflwsvnzcaylxtvsje':'');return {...brokerConnectionOptions(target.toString(),ca),username,max:2,fetch_types:false};
}
export function adminStore(sql:ReturnType<typeof postgres>){return async(actor:string,action:string,data:unknown)=>await sql.begin('isolation level serializable',async tx=>{
 const rows=await tx`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_roles WHERE rolname=session_user`;
 if(rows.length!==1||rows[0].login!=='taxiqaid_user_admin_login'||rows[0].actor!=='taxiqaid_user_admin_login'||rows[0].restricted!==true)throw new Error('Restricted administration connection required.');
 await tx`SET LOCAL ROLE taxiqaid_user_admin_backend`;await tx`SELECT set_config('statement_timeout','5000',true),set_config('lock_timeout','1000',true)`;
 const result=await tx`SELECT taxiqaid_auth_api.admin_dispatch(${actor}::uuid,${action},${sql.json(data as never)}::jsonb) AS result`;return result[0].result;
 });}
const publicActions=['list','create','edit','permissions','requests','request-enqueue','request-approve','request-reject','reset-password','sync-auth','sync-sheets','recover-create','operations'];
const capability=(action:string)=>({'list':'user-management.view',create:'user-management.create-user','recover-create':'user-management.create-user',permissions:'user-management.manage-permissions',requests:'user-management.profile-requests.view','request-enqueue':'user-management.profile-requests.view','request-approve':'driver-profile.approve','request-reject':'driver-profile.reject'} as Record<string,string>)[action]||'user-management.edit-user';
async function readInput(request:Request){
 if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new Error('INVALID_INPUT');
 const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_INPUT');let bytes=new Uint8Array(),timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reader.cancel().catch(()=>{});reject(new Error('INVALID_INPUT'));},2000);});
 try{for(;;){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;if(bytes.length+value.length>16384)throw new Error('INVALID_INPUT');bytes=new Uint8Array([...bytes,...value]);}try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('INVALID_INPUT');}}finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
function input(raw:Record<string,unknown>){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.action!=='string'||!publicActions.includes(raw.action))throw new Error('INVALID_INPUT');
 const allowed:Record<string,string[]>={list:['search','after','limit'],requests:['search','after','status','field'],create:['operation','account'],edit:['operation','uid','version','etag','account'],permissions:['operation','uid','version','etag','patch'],'reset-password':['operation','uid','version','etag'],'sync-auth':['operation','uid','version','etag'],'sync-sheets':[],operations:[],'recover-create':['operation'],'request-enqueue':['operation','driverRef','iqama','name','field','oldValue','proposedValue'],'request-approve':['operation','uid','version','note'],'request-reject':['operation','uid','version','note']};
 if(Object.keys(raw).some(k=>k!=='action'&&!allowed[String(raw.action)].includes(k)))throw new Error('INVALID_INPUT');const {action,...data}=raw;
 if(data.operation!==undefined&&!model.uuid(data.operation)||data.uid!==undefined&&!model.uuid(data.uid)||data.after!==undefined&&data.after!==null&&!model.uuid(data.after)||data.version!==undefined&&(!Number.isSafeInteger(data.version)||Number(data.version)<1)||data.etag!==undefined&&!(typeof data.etag==='string'&&/^[0-9a-f]{64}$/.test(data.etag)))throw new Error('INVALID_INPUT');
 if(!['list','requests','sync-sheets','operations'].includes(String(action))&&!model.uuid(data.operation))throw new Error('INVALID_INPUT');
 if(['edit','permissions','reset-password','sync-auth','request-approve','request-reject'].includes(String(action))&&(!model.uuid(data.uid)||!Number.isSafeInteger(data.version)))throw new Error('INVALID_INPUT');
 if(['edit','permissions','reset-password','sync-auth'].includes(String(action))&&typeof data.etag!=='string')throw new Error('INVALID_INPUT');
 if(['create','edit'].includes(String(action)))data.account=model.account(data.account);
 for(const k of ['search','note','name','oldValue','proposedValue','driverRef','iqama'])if(data[k]!==undefined&&data[k]!==null&&(typeof data[k]!=='string'||String(data[k]).length>(k==='note'?2000:k==='search'||k==='driverRef'?100:150)))throw new Error('INVALID_INPUT');
 return {action:String(action),data};
}
type Rpc=(actor:string,action:string,data:Record<string,unknown>)=>Promise<any>;
export async function administrativeAction(actor:string,action:string,data:Record<string,any>,rpc:Rpc,auth:any,env:(k:string)=>string|undefined,fetcher:typeof fetch=fetch){
 await rpc(actor,'authorize',{capability:capability(action),read:['list','requests'].includes(action)});
 if(action==='recover-create'){const pending=await rpc(actor,'create-pending',data);return await administrativeAction(actor,'create',pending,rpc,auth,env,fetcher);}
 const credential=()=>{const bytes=crypto.getRandomValues(new Uint8Array(24));return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')+'aA9!';};
 if(action==='create'){
  const lease=crypto.randomUUID(),operation=data.operation,account=model.account(data.account);
  // Management accounts use the real employee email rather than a fictitious technical mailbox.
  if(!account.contactEmail)throw new Error('INVALID_INPUT');
  const email=account.contactEmail.toLowerCase();
  const reserved=await rpc(actor,'create-reserve',{operation,lease,account});if(reserved.completed)return {...reserved,credentialDelivery:'unavailable-on-replay'};let password=credential(),owned=false;
  try{
   let found=await auth.getUserById(operation);
   if(found.error&&found.error.status!==404)throw new Error('AUTH_UNAVAILABLE');
   if(!found.data?.user){const created=await auth.createUser({id:operation,email,password,email_confirm:true,ban_duration:'876000h',app_metadata:{taxiqaid_provisioning_operation:operation}});if(created.error){found=await auth.getUserById(operation);if(found.error)throw new Error('AUTH_UNAVAILABLE');}else found=created;}
   const user=found.data?.user;if(user?.id!==operation||user.email!==email||user.app_metadata?.taxiqaid_provisioning_operation!==operation)throw new Error('AUTH_IDENTITY_MISMATCH');owned=true;
   // Retries replace an undelivered credential only while SQL still reserves this incomplete operation.
   const updated=await auth.updateUserById(operation,{password,ban_duration:account.status==='active'?'none':'876000h'});if(updated.error||updated.data?.user?.id!==operation||updated.data?.user?.email!==email)throw new Error('AUTH_UNAVAILABLE');
   const result=await rpc(actor,'create-finish',{operation,lease,authUid:operation,technicalEmail:email});return {...result,temporaryPassword:password,credentialDelivery:'one-time'};
  }catch{
   try{const recovered=await rpc(actor,'create-recover',{operation,lease});if(recovered.completed)return {...recovered,credentialDelivery:'unavailable-on-replay'};}catch{/* Ambiguous commit remains recovery-required, never a claimed success. */}
   if(owned)try{await auth.updateUserById(operation,{ban_duration:'876000h'});}catch{/* Never delete an uncertain/existing Auth identity. */}
   try{await rpc(actor,'create-recover',{operation,lease});}catch{/* Reserved recovery state remains private and retryable after lease expiry. */}throw new Error('PROVISIONING_RECOVERY_REQUIRED');
  }finally{password='';}
 }
 if(action==='permissions'){
  // SQL independently validates every boolean, capability and dependency under the target row lock.
  if(!data.patch||typeof data.patch!=='object'||Array.isArray(data.patch)||Object.values(data.patch).some(v=>typeof v!=='boolean'))throw new Error('INVALID_INPUT');return await rpc(actor,action,data);
 }
 if(action==='edit'||action==='sync-auth'){
  // Email changes need a separate, verified Auth/SQL migration: never silently desynchronize identities.
  if(action==='edit'&&data.account){
   const identity=await rpc(actor,'identity',{uid:data.uid});
   if(!identity?.email||typeof data.account.contactEmail!=='string'||data.account.contactEmail.trim().toLowerCase()!==identity.email.toLowerCase())throw new Error('INVALID_INPUT');
  }
  const result=await rpc(actor,action==='edit'?'edit':'reset-reserve',data);if(result.replayed)return {...result,authSyncPending:true};const user=result.user,identity=await rpc(actor,'identity',{uid:data.uid});
  try{const existing=await auth.getUserById(data.uid);if(existing.error||existing.data?.user?.id!==data.uid||existing.data?.user?.email!==identity?.email)throw new Error('AUTH_IDENTITY_MISMATCH');const updated=await auth.updateUserById(data.uid,{ban_duration:user.status==='active'?'none':'876000h'});if(updated.error||updated.data?.user?.id!==data.uid||updated.data?.user?.email!==identity.email)throw new Error('AUTH_UNAVAILABLE');
   return await rpc(actor,'auth-synced',{operation:crypto.randomUUID(),uid:user.uid,etag:user.etag,version:user.version});
  }catch{return {...result,authSyncPending:true};}
 }
 if(action==='reset-password'){
  const result=await rpc(actor,'reset-reserve',data);if(result.replayed)return {...result,credentialDelivery:'unavailable-on-replay'};const identity=await rpc(actor,'identity',{uid:data.uid});let password=credential();
  try{const found=await auth.getUserById(data.uid);if(found.error||found.data?.user?.id!==data.uid||found.data?.user?.email!==identity?.email)throw new Error('AUTH_IDENTITY_MISMATCH');const updated=await auth.updateUserById(data.uid,{password,ban_duration:result.user.status==='active'?'none':'876000h'});if(updated.error||updated.data?.user?.id!==data.uid||updated.data?.user?.email!==identity.email)throw new Error('AUTH_UNAVAILABLE');return {...result,temporaryPassword:password,credentialDelivery:'one-time'};}finally{password='';}
 }
 if(action==='sync-sheets'){
  if(env('TAXIQAID_SHEETS_SYNC_ENABLED')!=='true')return {sync:'DISABLED',sent:0};const lease=crypto.randomUUID(),job=await rpc(actor,'mirror-claim',{lease});let receipts:{kind:string;entity:string;version:number;ok:boolean}[]=[];
  try{receipts=await syncSheets(job.batch,job.leaseUntil,env,fetcher);return {sync:receipts.every((r:any)=>r.ok)?'COMPLETE':'PENDING_RETRY',sent:receipts.filter((r:any)=>r.ok).length};}
  finally{await rpc(actor,'mirror-ack',{lease,receipts});}
 }
 return await rpc(actor,action,data);
}
export function createAdminHandler(env:(k:string)=>string|undefined,deps:{rpc?:Rpc;verify?:(jwt:string)=>Promise<any>;admin?:any;fetcher?:typeof fetch;connect?:(options:ReturnType<typeof adminConnectionOptions>)=>ReturnType<typeof postgres>}={}){return async(request:Request)=>{
 const origin=originFor(request,configuredOrigins(env('TAXIQAID_AUTH_ORIGINS')));if(!origin)return response(403,{error:'Administration unavailable.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store',Vary:'Origin'}});
 let sql:ReturnType<typeof postgres>|null=null;
 try{
  if(env('TAXIQAID_USER_ADMIN_ENABLED')!=='true')return response(503,{error:'Administration is not activated.'},origin);
  if(new URL(request.url).search)throw new Error('INVALID_INPUT');const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];if(!token||token.length>16384)return response(401,{error:'Administration unavailable.'},origin);
  const fetcher=deps.fetcher||fetch,options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:(url:RequestInfo|URL,init?:RequestInit)=>fetcher(url,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)})}};
  const verify=deps.verify||((jwt:string)=>createClient(project,key,options).auth.getUser(jwt));const checked=await verify(token),user=checked?.data?.user;if(checked?.error||!model.uuid(user?.id)||user.aud!=='authenticated'||user.role!=='authenticated'||user.is_anonymous===true)return response(401,{error:'Administration unavailable.'},origin);
  const {action,data}=input(await readInput(request));
  const rpc=deps.rpc||(sql=(deps.connect||postgres)(adminConnectionOptions(env('TAXIQAID_USER_ADMIN_DB_URL')||'',env('TAXIQAID_USER_ADMIN_DB_CA'))),adminStore(sql));
  // Construct Admin client lazily only after online identity and SQL authorization, never in the browser.
  await rpc(user.id,'authorize',{capability:capability(action),read:['list','requests'].includes(action)});
  let privileged:any;const admin=deps.admin||{getUserById:(...args:any[])=>{privileged??=createClient(project,env('TAXIQAID_AUTH_ADMIN_KEY')||'',options).auth.admin;return privileged.getUserById(...args);},createUser:(...args:any[])=>{privileged??=createClient(project,env('TAXIQAID_AUTH_ADMIN_KEY')||'',options).auth.admin;return privileged.createUser(...args);},updateUserById:(...args:any[])=>{privileged??=createClient(project,env('TAXIQAID_AUTH_ADMIN_KEY')||'',options).auth.admin;return privileged.updateUserById(...args);}};
  return response(200,await administrativeAction(user.id,action,data,rpc,admin,env,fetcher),origin);
 }catch(error){const code=(error as {code?:string}).code,message=(error as Error).message,status=code==='40001'||code==='23505'?409:code==='42501'?403:message==='INVALID_INPUT'||/valid|Invalid|requires/.test(message)?400:503;return response(status,{error:status===409?'Conflict. Refresh before retrying.':status===400?'Invalid administrative request.':'Administration unavailable.',...(message==='PROVISIONING_RECOVERY_REQUIRED'?{recoveryRequired:true}:{})},origin);}
 finally{if(sql)try{await sql.end({timeout:1});}catch{}}
};}
