// @ts-nocheck
// GENERATED REVIEW ONLY. Original typed modules are checked separately. No deployment is performed.
import {isIP} from 'node:net';
import postgres from 'npm:postgres@4.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
// Source: shared/permission-catalog.js
/** Stable operational capabilities. Labels are presentation; keys are future backend contracts. */
const TaxiQaidPermissionCatalog = (() => {
  const modules=[];
  function add(id,label,actions,view=id,scope='authorized-records') {
    const list=[{key:id+'.view',label:'View Module',audience:'Management',scope,requires:[]}];
    actions.forEach(item=>{
      const [suffix,title,extra={}]=item;
      list.push({key:extra.key||id+'.'+suffix,label:title,audience:extra.audience||'Management',scope:extra.scope||scope,
        ...extra,requires:[id+'.view',...(extra.requires||[])]});
    });
    modules.push({id,label,view,permissions:list});
  }
  add('dashboard','Dashboard',[]);
  add('fleet','Fleet Management',[['edit','Edit / Save Vehicle Details'],['export','Export Fleet']]);
  add('drivers','Drivers Management',[['edit','Edit / Save Driver Details'],['export','Export Drivers']]);
  add('tripcheck','Trip Check',[['create','Create / Save Inspection'],['edit','Edit / Save Inspection'],['sign','Confirm Inspection Signature'],['export','Export Excel'],['generate-pdf','Generate / Download Filtered PDFs']]);
  add('accidents','Accident Tracker',[['create','Create / Save Accident'],['edit','Edit / Save Accident'],['delete','Delete Accident'],['export','Export Accidents'],['send-maintenance','Request Maintenance']]);
  add('breakdowns','Breakdown Tracker',[['create','Create / Save Breakdown'],['edit','Edit / Save Breakdown'],['delete','Delete Breakdown'],['export','Export Breakdowns'],['send-maintenance','Request Maintenance']]);
  add('maintenance','Maintenance Tracker',[['requests.view','View Maintenance Requests'],['requests.edit','Update Request Status',{requires:['maintenance.requests.view']}],['requests.export','Export Requests',{requires:['maintenance.requests.view']}],['accept','Accept / Assign Work Order',{requires:['maintenance.requests.view']}],['overview.view','View Work Orders'],['edit','Edit / Save Work Order',{requires:['maintenance.overview.view']}],['export','Export Work Orders',{requires:['maintenance.overview.view']}]]);
  add('fuel','Fuel Tracker',[['create','Create / Save Fuel Record'],['edit','Edit / Save Fuel Record'],['export','Export Fuel Records']]);
  add('ncr','NCR Tracker',[['scores.view','View Driver Scores'],['records.view','View NCR Records'],['create','Create / Save NCR',{requires:['ncr.records.view']}],['edit','Edit / Save NCR',{requires:['ncr.records.view']}],['delete','Delete NCR',{requires:['ncr.records.view']}],['export','Export NCRs',{requires:['ncr.records.view']}],['scores.export','Export Driver Scores',{requires:['ncr.scores.view']}]]);
  add('penalties','Penalties Tracker',[['export','Export Authorized Penalties']]);
  add('training','Training Tracker',[['overview.view','View Compliance'],['sessions.view','View Sessions'],['attendance.view','View Attendance'],['create-session','Create / Save Training Session',{requires:['training.sessions.view']}],['manage-enrollment','Assign / Remove Session Drivers',{requires:['training.sessions.view']}],['verify-attendance','Verify Attendance',{requires:['training.attendance.view']}],['export','Export Full Training Reports']]);
  add('customer-care','Customer Care Tracker',[['create','Create / Save Case'],['edit','Edit / Save Case'],['assign','Assign / Reassign Case'],['close','Close Case'],['export','Export Authorized Cases']]);
  add('driver-deductions','Drivers Deduction',[['expenses.view','View Driver Expenses'],['deductions.view','View Applied Deductions'],['add-expense','Add Authorized Expense',{requires:['driver-deductions.expenses.view']}],['apply-deduction','Apply Deduction',{requires:['driver-deductions.deductions.view']}],['approve-reversal','Approve Financial Reversal / Adjustment'],['export','Export Financial Records']]);
  add('driver-appeals','Driver Appeals',[['assign','Assign / Reassign Department'],['classify','Classify Appeal Type'],['update-status','Update / Resolve Appeal'],['export','Export Appeals']]);
  add('helpdesk','Helpdesk',[['create','Create Ticket'],['view-department','View Assigned Department Tickets',{scope:'department'}],['view-all','View Explicitly Authorized Departments',{scope:'authorized-departments'}],['update-status','Update / Resolve Ticket',{scope:'department'}]]);
  add('roster','Roster Management',[['import','Import / Validate Roster'],['generate-pdf','Generate Personal / All PDFs'],['download-pdf','View / Download Personal PDF'],['download-zip','Download Company ZIP'],['manage-stops','Add / Edit Stops'],['catalog-import','Import Location Catalog'],['catalog-export','Export Location Catalog'],['whatsapp-config','Manage Delivery Configuration'],['whatsapp-send','Send Personal WhatsApp Schedules']]);
  add('driver-portal','Driver Portal Preview',[
    ['preview','Preview Authorized Driver',{scope:'selected-driver'}],['preview-documents','Preview Assigned Documents',{scope:'selected-document',requires:['driver-portal.preview']}],['preview-schedule','Preview Published Schedule',{scope:'selected-driver',requires:['driver-portal.preview']}],['preview-download','Download Preview Personal PDF',{scope:'selected-driver',requires:['driver-portal.preview-schedule']}],
    ['request-changes','Request Name / Phone Changes',{audience:'Driver',scope:'own-driver'}],['files.view','View Own Assigned Files',{audience:'Driver',scope:'own-driver'}],['sign','Confirm & Sign Own Document',{audience:'Driver',scope:'own-document',requires:['driver-portal.files.view']}],['schedule.view','View Own Published Schedule',{audience:'Driver',scope:'own-driver'}],['schedule.download','Download Own Weekly PDF',{audience:'Driver',scope:'own-driver',requires:['driver-portal.schedule.view']}],['submit-appeal','Submit Own Appeal',{audience:'Driver',scope:'own-driver'}]
  ],'driver-portal-preview');
  // View Module applies to both account types; self-service and preview actions never share audiences.
  modules.at(-1).permissions[0].audience='Both';
  add('user-management','User Management',[['create-user','Create Account'],['edit-user','Edit Account / Role / Departments'],['change-status','Enable / Disable Account'],['manage-permissions','Edit / Save Permissions'],['profile-requests.view','View Driver Profile Requests'],['profile-approve','Approve Driver Profile Change',{key:'driver-profile.approve',requires:['user-management.profile-requests.view']}],['profile-reject','Reject Driver Profile Change',{key:'driver-profile.reject',requires:['user-management.profile-requests.view']}]]);
  modules.forEach(module=>{module.permissions.forEach(permission=>{Object.freeze(permission.requires);Object.freeze(permission);});Object.freeze(module.permissions);Object.freeze(module);});
  const MODULES=Object.freeze(modules),ALL=Object.freeze(modules.flatMap(module=>module.permissions.map(permission=>Object.freeze({...permission,module:module.id}))));
  const BY_KEY=Object.freeze(Object.fromEntries(ALL.map(permission=>[permission.key,permission])));
  const ROLE_TEMPLATES=Object.freeze(['Super Administrator','Administrator','Department Manager','Supervisor','Staff','Driver']);
  return Object.freeze({MODULES,ALL,BY_KEY,ROLE_TEMPLATES});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidPermissionCatalog;

// Source: shared/permission-model.js
/** Deny-by-default evaluation, separate from unsaved target-user drafts and legacy shell admission. */
const TaxiQaidPermissionModel = (() => {
  const catalog=typeof TaxiQaidPermissionCatalog!=='undefined'?TaxiQaidPermissionCatalog:require('./permission-catalog.js');
  function draftDecision(key,{accountType='Management',roleDefaults=[],overrides={}}={},seen=new Set()) {
    const item=catalog.BY_KEY[key];
    if(!item)return {allowed:false,source:'Unknown / inapplicable action'};
    if(!['Management','Driver'].includes(accountType))return {allowed:false,source:'Account type unavailable'};
    if(accountType==='Driver'&&item.module!=='driver-portal')return {allowed:false,source:'Management module unavailable to drivers'};
    if(item.audience!=='Both'&&item.audience!==accountType)return {allowed:false,source:'Action belongs to another account type'};
    if(seen.has(key))return {allowed:false,source:'Invalid permission dependency'};
    const own=overrides[key],inherited=roleDefaults.includes(key);
    if(![undefined,'inherit','allow','deny'].includes(own))return {allowed:false,source:'Invalid override'};
    if(own==='deny')return {allowed:false,source:'Explicit deny'};
    const allowed=own==='allow'||inherited;
    if(!allowed)return {allowed:false,source:'No explicit grant'};
    const path=new Set(seen);path.add(key);
    for(const dependency of item.requires) {
      if(!draftDecision(dependency,{accountType,roleDefaults,overrides},path).allowed)return {allowed:false,source:'Missing dependency: '+dependency};
    }
    return {allowed:true,source:own==='allow'?'Explicit allow':'Inherited role default'};
  }
  function decision(context,key,resource={}) {
    if(context?.expiresAt!==undefined&&context.expiresAt<=Date.now())return {allowed:false,source:'Access context expired'};
    if(!context||context.verified!==true||context.source!=='authorized-backend'||!context.uid||context.accountStatus!=='Active')return {allowed:false,source:'Verified active account permissions unavailable'};
    const result=draftDecision(key,context);if(!result.allowed)return result;
    const permission=catalog.BY_KEY[key],scope=context.scope||{};
    if(context.accountType==='Driver') {
      if(!context.driverRecordRef||!context.iqama)return {allowed:false,source:'Verified driver link unavailable'};
      if(key!=='driver-portal.view'&&(resource.ownerUid!==context.uid||resource.driverRecordRef!==context.driverRecordRef))return {allowed:false,source:'Personal resource ownership mismatch'};
      if(resource.mode==='management-preview')return {allowed:false,source:'Management preview is read-only'};
    }
    if(permission.scope==='selected-driver'||permission.scope==='selected-document') {
      if(!resource.driverRecordRef||!scope.driverRecordRefs?.includes(resource.driverRecordRef))return {allowed:false,source:'Selected driver outside authorized scope'};
      if(permission.scope==='selected-document'&&(!resource.documentId||!scope.documentIds?.includes(resource.documentId)))return {allowed:false,source:'Document preview requires separate scope'};
    }
    if(permission.scope==='authorized-departments'&&!scope.departments?.length)return {allowed:false,source:'Explicit cross-department scope unavailable'};
    if(permission.scope==='department') {
      const normalize=value=>{const raw=String(value||'').trim().toLowerCase().replace(/[ -]+/g,'_');return ({quality:'qhse',customer_care:'customer_service'})[raw]||raw;};
      const department=resource.assignedDepartment&&normalize(resource.assignedDepartment);
      const member=department?context.departments?.map(normalize).includes(department):key==='helpdesk.view-department'&&Boolean(context.departments?.length);
      const cross=department&&scope.departments?.map(normalize).includes(department)&&draftDecision('helpdesk.view-all',context).allowed;
      if(!member&&!cross)return {allowed:false,source:'Assigned department outside authorized scope'};
    }
    return result;
  }
  function validateDraft(draft) {
    const errors=[];
    for(const [key,value] of Object.entries(draft.overrides||{})) {
      if(!catalog.BY_KEY[key])errors.push('Unknown permission: '+key);
      else if(!['inherit','allow','deny'].includes(value))errors.push('Invalid override: '+key);
      else if(value==='allow'&&!draftDecision(key,draft).allowed)errors.push(key+': '+draftDecision(key,draft).source);
    }
    return errors;
  }
  return Object.freeze({draftDecision,decision,can:(context,key,resource)=>decision(context,key,resource).allowed,validateDraft});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidPermissionModel;

// Source: shared/auth-contract.js
/** Dedicated-project wire contract. A parsed response is never a substitute for backend authorization. */
const TaxiQaidAuthContract=(()=>{
 const catalog=typeof TaxiQaidPermissionCatalog!=='undefined'?TaxiQaidPermissionCatalog:require('./permission-catalog.js');
 const DEPARTMENTS=Object.freeze({customer_service:'Customer Service',finance:'Finance',financial:'Financial',hr:'HR',it:'IT',maintenance:'Maintenance',operation:'Operation',planning:'Planning',qhse:'QHSE'});
 const department=value=>{const key=String(value||'').trim().toLowerCase().replace(/[ -]+/g,'_'),aliases={quality:'qhse',customer_care:'customer_service'};return Object.hasOwn(aliases,key)?aliases[key]:(Object.hasOwn(DEPARTMENTS,key)?key:null);};
 function identifier(value){const normalized=String(value||'').trim().toLowerCase();if(!/^(?:[a-z][a-z0-9]{1,47}|\d{10})$/.test(normalized))throw new Error('Enter a valid username or ten-digit Driver Iqama.');return normalized;}
 function credentials(value,password){const normalized=identifier(value);if(typeof password!=='string'||!password.length||password.length>1024)throw new Error('Enter your password.');return {identifier:normalized,password};}
 function normalize(raw,now){
  if(raw?.account)return raw;
  // Existing deployed get-my-access uses top-level fields. Never guess missing profile/status metadata.
  if(!raw||raw.version!==undefined&&raw.version!==1||!Object.hasOwn(raw,'accountType'))throw new Error('Invalid access response.');
  const type=typeof raw.accountType==='string'?raw.accountType.toLowerCase():null;
  const suppliedStatus=raw.status??raw.accountStatus,status=typeof suppliedStatus==='string'?suppliedStatus.toLowerCase():null;
  let overrides=raw.overrides;
  if(Array.isArray(overrides)){
   const effects={};for(const row of overrides){if(typeof row?.permission_key!=='string'||typeof row.is_allowed!=='boolean')throw new Error('Invalid permission override.');if(!row.is_allowed||effects[row.permission_key]!=='deny')effects[row.permission_key]=row.is_allowed?'allow':'deny';}overrides=effects;
  }else if(overrides&&typeof overrides==='object')overrides=Object.fromEntries(Object.entries(overrides).map(([key,effect])=>[key,effect===true?'allow':effect===false?'deny':effect]));
  return {version:1,uid:raw.uid,account:{uid:raw.uid,type,status,role:raw.role,fullName:raw.fullName??raw.full_name,username:raw.username},
   departments:raw.departments,permissions:{roleDefaults:raw.roleDefaults,overrides},scope:raw.scope,
   // A fresh authenticated legacy response without a lease receives only a bounded local read lease.
   validUntil:raw.validUntil===undefined?now+60000:raw.validUntil};
 }
 function access(raw,uid,sessionExpiresAt,now=Date.now()){
  raw=normalize(raw,now);const account=raw?.account;
  if(raw?.version!==1||raw.uid!==uid||typeof uid!=='string'||!uid||!account||account.status!=='active'||account.type!=='management'||typeof account.fullName!=='string'||!account.fullName.trim())throw new Error('Authorized active account information is unavailable.');
  if(!Number.isFinite(raw.validUntil)||raw.validUntil<=now||raw.validUntil>now+120000||!Number.isFinite(sessionExpiresAt)||sessionExpiresAt*1000<=now)throw new Error('Access information has expired.');
  const defaults=raw.permissions?.roleDefaults,overrides=raw.permissions?.overrides;
  if(!Array.isArray(defaults)||!overrides||typeof overrides!=='object'||Array.isArray(overrides)||!Array.isArray(raw.departments)||raw.departments.some(id=>typeof id!=='string'||!Object.hasOwn(DEPARTMENTS,id)))throw new Error('Invalid access response.');
  for(const effect of Object.values(overrides))if(!['inherit','allow','deny'].includes(effect))throw new Error('Invalid permission override.');
  if(account.uid!==undefined&&account.uid!==uid)throw new Error('Account identity does not match.');
  if(typeof account.role!=='string'||!account.role||typeof account.username!=='string'||!account.username)throw new Error('Verified account metadata unavailable.');
  const scope=raw.scope??{};for(const key of ['departments','driverRecordRefs','documentIds'])if(scope[key]!==undefined&&(!Array.isArray(scope[key])||scope[key].some(id=>typeof id!=='string'||!id)))throw new Error('Invalid record scope.');
  if((scope.departments||[]).some(id=>!Object.hasOwn(DEPARTMENTS,id)))throw new Error('Invalid department scope.');
  const known=key=>typeof key==='string'&&Object.hasOwn(catalog.BY_KEY,key);
  return {source:'authorized-backend',verified:true,uid,accountType:account.type==='management'?'Management':'Driver',accountStatus:'Active',role:account.role,username:account.username,fullName:account.fullName,
   departments:[...new Set(raw.departments)].sort(),roleDefaults:[...new Set(defaults.filter(known))].sort(),overrides:Object.fromEntries(Object.entries(overrides).filter(([key])=>known(key)).sort(([a],[b])=>a.localeCompare(b))),
   driverRecordRef:account.driverRecordRef||null,iqama:account.iqama||null,expiresAt:Math.min(raw.validUntil,sessionExpiresAt*1000),
   scope:{departments:[...(scope.departments||[])],driverRecordRefs:[...(scope.driverRecordRefs||[])],documentIds:[...(scope.documentIds||[])]}};
 }
 return Object.freeze({DEPARTMENTS,department,identifier,credentials,access});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidAuthContract;

// Source: supabase/functions/_shared/security.mjs
/** Server-only request controls. No password, token, account identifier or database error logging. */
const FAILURE='Unable to sign in. Check your credentials or contact your administrator.';
function response(status,body,origin){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',Pragma:'no-cache',Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}:{})}});}
function originFor(request,allowed){const origin=request.headers.get('origin');return origin&&allowed.includes(origin)?origin:null;}
async function readCredentials(request){
 if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>4096)throw new Error('invalid');
 const reader=request.body?.getReader();if(!reader)throw new Error('invalid');let size=0,chunks=[],timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('invalid'));reader.cancel().catch(()=>{});},2000);});
 try{for(;;){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new Error('invalid');}chunks.push(value);}}finally{clearTimeout(timer);reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='identifier,password'||typeof body.identifier!=='string'||typeof body.password!=='string'||!body.password.length||body.password.length>1024)throw new Error('invalid');
 const identifier=body.identifier.trim().toLowerCase();if(!/^(?:[a-z][a-z0-9]{1,47}|\d{10})$/.test(identifier))throw new Error('invalid');
 return {identifier,password:body.password};
}
async function bucket(secret,value){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
function safeTokenSession(session){
 if(typeof session?.access_token!=='string'||!session.access_token||session.access_token.length>16384||typeof session.refresh_token!=='string'||!session.refresh_token||session.refresh_token.length>4096)throw new Error('session');
 return {access_token:session.access_token,refresh_token:session.refresh_token,...(Number.isFinite(session.expires_in)&&session.expires_in>0?{expires_in:session.expires_in}:{}),token_type:'bearer'};
}
/** A server readiness flag is not evidence of trust. Verify gateway overwrite on every reachable ingress first. */
function trustedClientIp(request,header,verified){
 if(verified!==true||!/^[a-z0-9-]+$/.test(header)||['forwarded','x-forwarded-for'].includes(header))return null;
 const value=request.headers.get(header);if(!value||!isIP(value))return null;
 if(isIP(value)===4)return value;
 const canonical=new URL('http://['+value+']/').hostname.slice(1,-1);
 const mapped=canonical.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
 return mapped?[Number.parseInt(mapped[1],16)>>8,Number.parseInt(mapped[1],16)&255,Number.parseInt(mapped[2],16)>>8,Number.parseInt(mapped[2],16)&255].join('.'):canonical;
}

function configuredOrigins(value,allowLoopback=false){return String(value||'').split(',').map(origin=>origin.trim()).filter(origin=>{try{const parsed=new URL(origin);return parsed.origin===origin&&(parsed.protocol==='https:'||allowLoopback&&parsed.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(parsed.hostname));}catch{return false;}});}

// Source: supabase/functions/_shared/broker-store.ts
/** Restricted broker SQL API. No direct identity/Auth table reads or broad connection identities. */
const projectRef='mqkflwsvnzcaylxtvsje';
type Sql=ReturnType<typeof postgres>;
const validRevision=(value:unknown):value is string=>typeof value==='string'&&/^[1-9][0-9]{0,18}$/.test(value)&&BigInt(value)<=9223372036854775807n;
function brokerConnectionOptions(connection:string,ca?:string){
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
function createBrokerStore(sql:Sql){
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
  const rows=await transaction(false,async tx=>await tx`SELECT allowed,uid,email,status,mapping_revision::text AS mapping_revision FROM taxiqaid_auth_api.begin_login_attempt(${identifier},${keys[0]},${keys[1]},${keys[2]})`);
  if(rows.length!==1||typeof rows[0].allowed!=='boolean')throw new Error('Login unavailable.');
  const row=rows[0];
  if(!row.allowed)return {allowed:false,account:null};
  if(row.uid===null&&row.email===null)return {allowed:true,account:null};
  if(typeof row.uid!=='string'||typeof row.email!=='string'||!row.email||row.status!=='active'||!validRevision(row.mapping_revision))throw new Error('Login unavailable.');
  return {allowed:true,account:{uid:row.uid,email:row.email,status:row.status,mappingRevision:row.mapping_revision}};
 }
 async function loadAccess(uid:string,mappingRevision:string){
  if(!validRevision(mappingRevision)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid))throw new Error('Access unavailable.');
  const rows=await transaction(true,async tx=>await tx`SELECT taxiqaid_auth_api.get_management_access(${uid}::uuid,${mappingRevision}::bigint) AS access`);
  const raw=rows.length===1?rows[0].access:null;
  if(raw?.version!==1||raw.uid!==uid||raw.account?.uid!==uid||raw.account?.status!=='active'||raw.account?.type!=='management'||!raw.account?.fullName||!Array.isArray(raw.permissions?.roleDefaults)||!raw.permissions?.overrides)throw new Error('Access unavailable.');
  return raw;
 }
 return {beginAttempt,loadAccess};
}
function openBrokerStore(env:(name:string)=>string|undefined){
 const connection=env('TAXIQAID_BROKER_DB_URL');if(!connection)throw new Error('Restricted broker connection required.');
 return createBrokerStore(postgres(brokerConnectionOptions(connection,env('TAXIQAID_BROKER_DB_CA'))));
}

// Source: supabase/functions/_diagnostics/owner-username-core.mjs
/** Separate owner capability; never returns a session, identity, mapping or raw error. */
const OWNER_CHECKS=Object.freeze(['configuration','administrator_jwt','administrator_authorization','attempt_limits','private_mapping','password_authentication','mapping_revision','sdk_session','verified_uid','active_master','access_compatibility','management_permissions','driver_denials','password_only','server_signout','database_closed','grant_valid','overall']);
const ownerFailure=()=>({...Object.fromEntries(OWNER_CHECKS.map(key=>[key,'FAIL'])),management_count:0,driver_denied_count:0});
function ownerPolicy(env,now){
 const uid=env('TAXIQAID_USERNAME_DIAGNOSTIC_ADMIN_UID'),expiry=env('TAXIQAID_USERNAME_DIAGNOSTIC_EXPIRES_AT');
 if(env('TAXIQAID_USERNAME_DIAGNOSTIC_ENABLED')!=='true'||!['TAXIQAID_LOGIN_ENABLED','TAXIQAID_SESSION_TRANSPORT_REVIEWED','TAXIQAID_TRUSTED_IP_HEADER_VERIFIED'].every(key=>env(key)==='false')||typeof uid!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)||typeof expiry!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(expiry))return null;
 const until=Date.parse(expiry);return Number.isFinite(until)&&until>now&&until-now<=900000?{uid:uid.toLowerCase(),until}:null;
}
const ownerOrigin='https://mqkflwsvnzcaylxtvsje.supabase.co';
function ownerReply(status,result,origin){return new Response(status===204?null:JSON.stringify(result),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',Pragma:'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; connect-src https://mqkflwsvnzcaylxtvsje.supabase.co; form-action 'none'; frame-ancestors 'none'",...(origin===ownerOrigin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{}),Vary:'Origin'}});}
function createOwnerUsernameHandler({env,verifyUser,verifyAdministrator,open,now=Date.now}){
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

// Source: supabase/functions/_diagnostics/master-access.ts
/** Exact existing frontend contract/evaluator, evaluated privately without returning account data. */
const ownerContract=TaxiQaidAuthContract;
const ownerCatalog=TaxiQaidPermissionCatalog;
const ownerModel=TaxiQaidPermissionModel;
function inspectMasterAccess(raw:unknown,uid:string,expiresAt:number){
 const context=ownerContract.access(raw,uid,expiresAt);
 const activeMaster=context.role==='super_admin'&&context.username==='dohanyan'&&context.accountStatus==='Active'&&context.accountType==='Management';
 const grants=new Set(context.roleDefaults);for(const [key,effect]of Object.entries(context.overrides)){if(effect==='allow')grants.add(key);if(effect==='deny')grants.delete(key);}
 const management=ownerCatalog.ALL.filter((p:{key:string;audience:string})=>p.audience!=='Driver'&&ownerModel.draftDecision(p.key,context).allowed).length;
 // Check both effective denial and absence of a direct driver-only grant.
 const driverDenied=ownerCatalog.ALL.filter((p:{key:string;audience:string})=>p.audience==='Driver'&&!grants.has(p.key)&&!ownerModel.draftDecision(p.key,context).allowed).length;
 return {activeMaster,compatible:true,management,driverDenied};
}

// Source: supabase/functions/_diagnostics/owner-runtime.ts
/** Review-only owner diagnostic. Public login flags must remain false. Sessions never leave this handler. */
const ownerProject='https://mqkflwsvnzcaylxtvsje.supabase.co';
const ownerKey='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
function ownerDependencies(ownerEnv:(name:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch){
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

// Source: supabase/functions/check-owner-username/index.ts
/** Independent review-only entry. Online Auth, active Master authorization and expiry are mandatory. */
Deno.serve(createOwnerUsernameHandler(ownerDependencies(name=>Deno.env.get(name))));
