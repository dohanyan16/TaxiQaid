// @ts-nocheck
// GENERATED SIGNED BROKER. Both Dashboard filenames use the canonical signed entry.
// Source modules are checked separately. No deployment or activation is authorized.
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

// Source: supabase/functions/_shared/auth-audit.mjs
/** Fixed private telemetry only. Never accept caller payloads, errors, identifiers, IPs or proof values. */
const AUTH_TRACE_HEADER='x-taxiqaid-trace';
function validAuthTrace(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);}
const AUTH_EVENTS=new Set(['ROUTE_REJECTED','ORIGIN_REJECTED','GATEWAY_DISABLED','PROVENANCE_REJECTED','UPSTREAM_RESPONSE','UPSTREAM_REDIRECT_REJECTED','UPSTREAM_UNAVAILABLE','SESSION_FILTER_REJECTED','PROOF_REJECTED','PROOF_VERIFIED','BROKER_DISABLED','DATABASE_UNAVAILABLE','INPUT_REJECTED','ADMISSION_ALLOWED','ADMISSION_DENIED','AUTH_REJECTED','AUTH_THROTTLED','AUTH_UNAVAILABLE','IDENTITY_REJECTED','ACCESS_REJECTED','SESSION_ISSUED','SESSION_CLEANUP_CONFIRMED','SESSION_CLEANUP_UNCONFIRMED']);
function authAudit(component,trace,sink=value=>console.info(value)){
 return (event,http)=>{if(!['gateway','broker'].includes(component)||!validAuthTrace(trace)||!AUTH_EVENTS.has(event)||!Number.isInteger(http)||http<100||http>599)return;
  try{sink(JSON.stringify({schema:'taxiqaid-auth-audit-v1',component,trace,event,http}));}catch{/* Telemetry must not change admission or leak a logger error. */}
 };
}

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

// Source: supabase/functions/_shared/handlers.mjs
/** Dependency-injected handlers. The SQL attempt API consumes counters before any private lookup. */
function createLoginHandler(deps){
 return async request=>{
  const origin=originFor(request,deps.origins);if(!origin)return response(403,{error:FAILURE});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin','Cache-Control':'no-store'}});
  const started=Date.now();let signedIn=false,phase='configuration';
  const audit=(event,status)=>{try{deps.audit?.(event,status);}catch{/* A diagnostic sink never changes authorization. */}};
  try{
   if(!deps.ready||new URL(request.url).search)throw new Error('not-ready');
   phase='input';const input=await readCredentials(request);
   phase='configuration';const clientIp=deps.clientIp(request);if(!clientIp)throw new Error('untrusted-client-address');
   const keys=await Promise.all([bucket(deps.rateSecret,'v1:ip:'+clientIp),bucket(deps.rateSecret,'v1:account:'+input.identifier),bucket(deps.rateSecret,'v1:global')]);
   phase='database';const attempt=await deps.beginAttempt(input.identifier,keys);
   if(!attempt||typeof attempt.allowed!=='boolean')throw new Error('attempt');
   if(!attempt.allowed){audit('ADMISSION_DENIED',429);return response(429,{error:FAILURE},origin);}
   audit('ADMISSION_ALLOWED',200);
   const account=attempt.account;
   if(account&&(typeof account.mappingRevision!=='string'||!/^[1-9][0-9]{0,18}$/.test(account.mappingRevision)||BigInt(account.mappingRevision)>9223372036854775807n))throw new Error('mapping-not-verified');
   // Reserved .invalid domain is a server-only timing equalizer, never a provisioned identity or browser mapping.
   phase='auth';const result=await deps.passwordSignIn(account?.email||'unavailable@taxiqaid.invalid',input.password);input.password='';
   signedIn=Boolean(result?.session);
   if(result?.error){const status=Number(result.error.status),http=status===429?429:status>=500||status===0?503:401;audit(http===429?'AUTH_THROTTLED':http===503?'AUTH_UNAVAILABLE':'AUTH_REJECTED',http);return response(http,{error:FAILURE},origin);}
   phase='credentials';
   if(!result?.user?.id||!account||result.user.id!==account.uid||account.status!=='active'||!signedIn)throw new Error('credentials');
   phase='database';const access=await deps.loadAccess(result.user.id,account.mappingRevision);
   if(access?.uid!==account.uid||access.account?.status!=='active'||access.account?.type!=='management')throw new Error('access');
   phase='session';const body=safeTokenSession(result.session);const outgoing=response(200,body,origin);audit('SESSION_ISSUED',200);signedIn=false;return outgoing;
  }catch{
   const http=['configuration','database','auth','session'].includes(phase)?503:401;
   audit(phase==='input'?'INPUT_REJECTED':phase==='database'?'DATABASE_UNAVAILABLE':phase==='access'?'ACCESS_REJECTED':phase==='credentials'?'IDENTITY_REJECTED':'AUTH_UNAVAILABLE',http);
   return response(http,{error:FAILURE},origin);
  }finally{
   if(signedIn)try{const result=await deps.signOut();audit(result?.error?'SESSION_CLEANUP_UNCONFIRMED':'SESSION_CLEANUP_CONFIRMED',result?.error?503:200);}catch{audit('SESSION_CLEANUP_UNCONFIRMED',503);}
   // This is timing padding, not a constant-time or anti-enumeration proof.
   const remaining=350+crypto.getRandomValues(new Uint8Array(1))[0]-(Date.now()-started);
   if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
  }
 };
}
function createAccessHandler(deps){
 return async(request,verifiedUid)=>{
  const origin=originFor(request,deps.origins);if(!origin)return response(403,{error:'Access unavailable.'});
  if(request.method!=='GET'||new URL(request.url).search)return response(400,{error:'Access unavailable.'},origin);
  if(!verifiedUid)return response(401,{error:'Access unavailable.'},origin);
  try{return response(200,await deps.loadAccess(verifiedUid),origin);}catch{return response(403,{error:'Access unavailable.'},origin);}
 };
}

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

// Source: supabase/functions/_shared/gateway-proof.mjs
/** Review-only authenticated gateway transport. IP headers alone never authorize the Supabase origin. */
const GATEWAY_TARGET='https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/login-with-identifier';
const GATEWAY_PATH='/login-with-identifier';
function canonicalGatewayIp(value){
 if(typeof value!=='string'||value.length>64)return null;
 if(/^(0|[1-9][0-9]{0,2})(\.(0|[1-9][0-9]{0,2})){3}$/.test(value))return value.split('.').every(x=>Number(x)<=255)?value:null;
 if(!/^[0-9a-fA-F:.]+$/.test(value)||!value.includes(':'))return null;
 try{const ip=new URL('http://['+value+']/').hostname.slice(1,-1),mapped=ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);return mapped?[parseInt(mapped[1],16)>>8,parseInt(mapped[1],16)&255,parseInt(mapped[2],16)>>8,parseInt(mapped[2],16)&255].join('.'):ip;}catch{return null;}
}
function gatewaySource(request){const ip=canonicalGatewayIp(request.headers.get('cf-connecting-ip'));return !request.cf||request.headers.has('cf-worker')||request.headers.has('cf-ew-via')||!ip||ip==='2a06:98c0:3600::103'?null:ip;}
async function gatewayBody(request){
 if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>4096)throw new Error('REJECTED');
 const reader=request.body?.getReader();if(!reader)throw new Error('REJECTED');let bytes=[],size=0,timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('REJECTED'));reader.cancel().catch(()=>{});},2000);});
 try{for(;;){const {value,done}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.length;if(size>4096)throw new Error('REJECTED');bytes.push(value);}const result=new Uint8Array(size);let offset=0;for(const part of bytes){result.set(part,offset);offset+=part.length;}return result;}finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
const gatewayHex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function gatewayKey(secret){if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw new Error('REJECTED');return await crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),x=>parseInt(x,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function gatewayMessage({ip,origin,issued,nonce,trace},body){
 if(trace!==undefined&&!validAuthTrace(trace))throw new Error('REJECTED');
 // v1 remains verifiable for the existing deployment; v2 binds an independent, non-secret trace.
 return new TextEncoder().encode([trace===undefined?'taxiqaid-gateway-v1':'taxiqaid-gateway-v2','POST',GATEWAY_TARGET,origin,ip,String(issued),nonce,gatewayHex(await crypto.subtle.digest('SHA-256',body)),...(trace===undefined?[]:[trace])].join('\n'));
}
async function signGateway(secret,proof,body){return gatewayHex(await crypto.subtle.sign('HMAC',await gatewayKey(secret),await gatewayMessage(proof,body)));}
async function verifyGateway(request,secret,now=Date.now()){
 const target=new URL(request.url);if(![new URL(GATEWAY_TARGET).pathname,GATEWAY_PATH].includes(target.pathname)||target.search||request.method!=='POST')return null;
 const h=request.headers,ip=canonicalGatewayIp(h.get('x-taxiqaid-ip')),origin=h.get('origin'),stamp=h.get('x-taxiqaid-issued'),nonce=h.get('x-taxiqaid-nonce'),mac=h.get('x-taxiqaid-mac'),trace=h.get(AUTH_TRACE_HEADER)??undefined;
 if(trace!==undefined&&!validAuthTrace(trace))return null;
 if(!ip||ip!==h.get('x-taxiqaid-ip')||typeof origin!=='string'||!/^https:\/\/[^\s\n]+$/.test(origin)||!/^\d{10}$/.test(stamp||'')||!/^[0-9a-f]{32}$/.test(nonce||'')||!/^[0-9a-f]{64}$/.test(mac||''))return null;
 try{if(new URL(origin).origin!==origin)return null;}catch{return null;}
 const issued=Number(stamp);if(issued*1000>now+5000||issued*1000<now-60000)return null;
 try{const body=await gatewayBody(request.clone()),valid=await crypto.subtle.verify('HMAC',await gatewayKey(secret),Uint8Array.from(mac.match(/../g),x=>parseInt(x,16)),await gatewayMessage({ip,origin,issued,nonce,trace},body));return valid?{ip,origin,issued,nonce,...(trace===undefined?{}:{trace})}:null;}catch{return null;}
}

// Source: supabase/functions/_shared/signed-broker-store.ts
/** Proposal adapter: same least-privilege transactions, one-use signed request and existing post-Auth access read. */
type SignedSql=ReturnType<typeof postgres>;
function signedBrokerStore(sql:SignedSql,proof:{nonce:string;issued:number},rateSecret:string){
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

// Source: supabase/functions/_shared/validation-policy.mjs
/** Fixed, synthetic-only owner validation. Configuration is inert until separately approved. */
const VALIDATION_PATH='/auth-validation';
const VALIDATION_HEADER='x-taxiqaid-validation';
const VALIDATION_OWNER='dohanyan';
const VALIDATION_PROJECT='https://mqkflwsvnzcaylxtvsje.supabase.co';
const VALIDATION_KEY='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
const VALIDATION_CASES=Object.freeze({'ip-base':10,'ip-spoof':2,replay:7,'identifier-base':3,'identifier-finish':9,'global-db':22});
const VALIDATION_EXPECTATIONS=Object.freeze({
 'ip-base':['IP_BASE',10,0,false,30,2], 'ip-spoof':['IP_SPOOF',1,1,true,22,2],replay:['SIGNED_SQL_REPLAY',5,2,true,39,4],
 'identifier-base':['IDENTIFIER_BASE',3,0,false,23,2], 'identifier-finish':['IDENTIFIER_FINISH',8,1,true,29,2], 'global-db':['SQL_GLOBAL_ONLY',21,1,true,42,2]
});
function validationGrant(value,now=Date.now()){
 try{const raw=JSON.parse(value||'null');if(!raw||Object.keys(raw).sort().join(',')!=='expiresAt,id,issuedAt,ownerUid')return null;
  const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
  if(!uuid(raw.id)||!uuid(raw.ownerUid)||!Number.isInteger(raw.issuedAt)||!Number.isInteger(raw.expiresAt)||raw.expiresAt<=raw.issuedAt||raw.expiresAt-raw.issuedAt>900||raw.issuedAt*1000>now+5000||raw.expiresAt*1000<=now)return null;
  // Existing nonce cleanup runs after two minutes. A full private identifier bucket retains each
  // consumed case for this entire grant, which must end before its fixed DB quarter expires.
  if(raw.expiresAt>(Math.floor(raw.issuedAt/900)+1)*900-10)return null;
  return {id:raw.id,ownerUid:raw.ownerUid,issuedAt:raw.issuedAt,expiresAt:raw.expiresAt};
 }catch{return null;}
}
const grantText=grant=>JSON.stringify([grant.id,grant.ownerUid,grant.issuedAt,grant.expiresAt]);
function validationToken(request){const match=(request.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);return match&&match[1].length<=16384?match[1]:null;}
function verifiedValidationExpiry(token,uid){
 const part=token.split('.')[1].replaceAll('-','+').replaceAll('_','/'),raw=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));
 if(raw.sub!==uid||!Number.isFinite(raw.exp)||raw.exp*1000<=Date.now())throw new Error('DENIED');return raw.exp;
}
async function validationCase(request){
 if(request.method!=='POST'||new URL(request.url).search||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new Error('DENIED');
 const reader=request.body?.getReader();if(!reader)throw new Error('DENIED');const chunks=[];let size=0,timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reader.cancel().catch(()=>{});reject(new Error('DENIED'));},2000);});
 try{for(;;){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>128)throw new Error('DENIED');chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!raw||Object.keys(raw).join(',')!=='case'||!Object.hasOwn(VALIDATION_CASES,raw.case))throw new Error('DENIED');return raw.case;
 }finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
const validationHex=bytes=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
async function validationKey(secret){if(typeof secret!=='string'||!/^[0-9a-f]{64}$/.test(secret))throw new Error('DENIED');return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),value=>parseInt(value,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function validationMessage(grant,token,mac){return new TextEncoder().encode(['taxiqaid-owner-validation-v1',grantText(grant),validationHex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),mac].join('\n'));}
async function signValidation(secret,grant,token,mac){return validationHex(await crypto.subtle.sign('HMAC',await validationKey(secret),await validationMessage(grant,token,mac)));}
async function verifyValidation(secret,grant,token,mac,signature){if(!/^[0-9a-f]{64}$/.test(signature||''))return false;try{return await crypto.subtle.verify('HMAC',await validationKey(secret),Uint8Array.from(signature.match(/../g),value=>parseInt(value,16)),await validationMessage(grant,token,mac));}catch{return false;}}
function safeValidationResult(raw){
 const fields=['case','result','scope','probes','allowed','denied','canary','dbMinute','dbQuarter','expiresAt','sqlQueries','sqlTransactions'];
 if(!raw||Object.keys(raw).some(key=>!fields.includes(key))||!Object.hasOwn(VALIDATION_CASES,raw.case)||!['PASS','FAIL','INCONCLUSIVE'].includes(raw.result)||!['IP_BASE','IP_SPOOF','SIGNED_SQL_REPLAY','IDENTIFIER_BASE','IDENTIFIER_FINISH','SQL_GLOBAL_ONLY'].includes(raw.scope))throw new Error('DENIED');
 for(const key of fields.filter(key=>!['case','result','scope','canary'].includes(key)))if(!Number.isInteger(raw[key])||raw[key]<0)throw new Error('DENIED');
 if(typeof raw.canary!=='boolean'||raw.probes>VALIDATION_CASES[raw.case]||raw.allowed+raw.denied!==raw.probes||raw.sqlTransactions>4||raw.sqlQueries>50||raw.scope!==VALIDATION_EXPECTATIONS[raw.case][0])throw new Error('DENIED');
 if(raw.result==='PASS'&&JSON.stringify([raw.scope,raw.allowed,raw.denied,raw.canary,raw.sqlQueries,raw.sqlTransactions])!==JSON.stringify(VALIDATION_EXPECTATIONS[raw.case]))throw new Error('DENIED');return Object.fromEntries(fields.map(key=>[key,raw[key]]));
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

// Source: supabase/functions/_diagnostics/validation-runtime.ts
/** Temporary owner-only SQL/proof validation. No password verification, session issuance or DDL. */
type Sql=ReturnType<typeof postgres>;
type Grant={id:string;ownerUid:string;issuedAt:number;expiresAt:number};
type Proof={ip:string;origin:string;issued:number;nonce:string;trace?:string};
const scopes:Record<string,string>={'ip-base':'IP_BASE','ip-spoof':'IP_SPOOF',replay:'SIGNED_SQL_REPLAY','identifier-base':'IDENTIFIER_BASE','identifier-finish':'IDENTIFIER_FINISH','global-db':'SQL_GLOBAL_ONLY'};
function validationResponse(status:number,value:unknown){return Response.json(value,{status,headers:{'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}});}
function createValidationHandler(env:(key:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch,now:()=>number=Date.now){return async(request:Request)=>{
 const deadline=now()+20000;
 let sql:Sql|null=null;
 try{
  const grant:Grant|null=validationGrant(env('TAXIQAID_VALIDATION_GRANT'),now()),token=validationToken(request),secret=env('TAXIQAID_GATEWAY_SECRET')||'',rate=env('TAXIQAID_RATE_SECRET')||'';
  if(!grant||!token||env('TAXIQAID_LOGIN_ENABLED')!=='false'||env('TAXIQAID_TRUSTED_IP_HEADER_VERIFIED')!=='false'||rate.length<32)throw new Error('DENIED');
  const proof=await verifyGateway(request,secret,now()) as Proof|null;
  if(!proof?.trace||!configuredOrigins(env('TAXIQAID_AUTH_ORIGINS')).includes(proof.origin)||!await verifyValidation(secret,grant,token,request.headers.get('x-taxiqaid-mac'),request.headers.get(VALIDATION_HEADER)))throw new Error('DENIED');
  const caseId:string=await validationCase(request);
  const userResponse=await fetcher(VALIDATION_PROJECT+'/auth/v1/user',{method:'GET',headers:{apikey:VALIDATION_KEY,Authorization:'Bearer '+token},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(userResponse.status!==200){await userResponse.body?.cancel();throw new Error('DENIED');}
  const user=await userResponse.json();if(user.id!==grant.ownerUid||user.aud!=='authenticated'||user.role!=='authenticated'||user.is_anonymous===true)throw new Error('DENIED');
  const expiry=verifiedValidationExpiry(token,grant.ownerUid);
  let sqlQueries=0,sqlTransactions=0,probes=0,allowed=0,denied=0;
  const live=()=>{const current=validationGrant(env('TAXIQAID_VALIDATION_GRANT'),now());if(!current||grantText(current)!==grantText(grant)||env('TAXIQAID_LOGIN_ENABLED')!=='false'||now()>=deadline)throw new Error('DENIED');};
  live();sql=connect({...brokerConnectionOptions(env('TAXIQAID_BROKER_DB_URL')||'',env('TAXIQAID_BROKER_DB_CA')),max:caseId==='replay'?2:1,fetch_types:false,idle_timeout:1,max_lifetime:30});
  const run=async<T>(mode:string,work:(query:Sql)=>Promise<T>):Promise<T>=>{
   live();if(++sqlTransactions>4)throw new Error('DENIED');
   return await sql!.begin(mode,async tx=>{
    const query=((strings:TemplateStringsArray,...values:unknown[])=>{live();if(++sqlQueries>50)throw new Error('DENIED');return (tx as unknown as Sql)(strings,...values as never[]);}) as unknown as Sql;
    const identity=await query`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_catalog.pg_roles WHERE rolname=session_user`;
    if(identity.length!==1||identity[0].login!=='taxiqaid_auth_login'||identity[0].actor!=='taxiqaid_auth_login'||identity[0].restricted!==true)throw new Error('DENIED');
    await query`SET LOCAL ROLE taxiqaid_auth_backend`;
    await query`SELECT pg_catalog.set_config('statement_timeout','3000',true),pg_catalog.set_config('lock_timeout','1000',true)`;
    return await work(query);
   }) as T;
  };
  const key=(label:string)=>bucket(rate,'v1:owner-validation:'+grant.id+':'+label);
  // Commit the one-use case ledger before any probe. No browser-controlled lookup or SQL key.
  const ledger=await run('isolation level read committed',async query=>{
   const clock=await query`SELECT floor(extract(epoch from clock_timestamp()))::bigint AS epoch`,epoch=Number(clock[0]?.epoch);
   if(!Number.isSafeInteger(epoch)||Math.abs(epoch-Math.floor(now()/1000))>5||epoch>=grant.expiresAt||Math.floor(epoch/900)!==Math.floor(grant.issuedAt/900))throw new Error('DENIED');
   const keys=await Promise.all(['source','identifier','global'].map(label=>key('guard:'+caseId+':'+label)));
   let revision='';
   // Fill the case's private 10/quarter identifier quota atomically. Its lifetime exceeds nonce
   // cleanup, so a consumed case cannot be repeated after its two-minute nonce has been pruned.
   for(let n=0;n<10;n++){
    const nonce=await key('case:'+caseId+':'+n),identifier=n===0?VALIDATION_OWNER:'validation'+(await key('guard-absent:'+caseId)).slice(0,32);
    const rows=await query`SELECT allowed,uid,email,status,mapping_revision::text AS mapping_revision FROM taxiqaid_auth_api.begin_signed_login_attempt(${identifier},${keys[0]},${keys[1]},${keys[2]},${nonce},${proof.issued}::bigint)`;
    if(rows.length!==1||rows[0].allowed!==true)throw new Error('DENIED');
    if(n===0){if(rows[0].uid!==grant.ownerUid||rows[0].status!=='active'||typeof rows[0].email!=='string'||!rows[0].email||typeof rows[0].mapping_revision!=='string'||!/^[1-9][0-9]{0,18}$/.test(rows[0].mapping_revision)||BigInt(rows[0].mapping_revision)>9223372036854775807n)throw new Error('DENIED');revision=rows[0].mapping_revision as string;}
    else if(rows[0].uid!==null||rows[0].email!==null||rows[0].status!==null||rows[0].mapping_revision!==null)throw new Error('DENIED');
   }
   return {revision};
  });
  const global=await bucket(rate,'v1:global'),ip=await bucket(rate,'v1:ip:'+proof.ip);
  let ordinal=0;
  const envelope=async(label:string)=>{
   const identifier='validation'+(await key('identifier:'+label)).slice(0,32),body=new TextEncoder().encode(JSON.stringify({identifier,password:'NOT_A_PASSWORD_TEST'}));
   const signed={ip:proof.ip,origin:proof.origin,issued:Math.floor(now()/1000),nonce:crypto.randomUUID().replaceAll('-',''),trace:crypto.randomUUID()},mac=await signGateway(secret,signed,body);
   return {identifier,body,signed,mac};
  };
  type Envelope=Awaited<ReturnType<typeof envelope>>;
  const proofRequest=(item:Envelope)=>new Request(GATEWAY_TARGET,{method:'POST',headers:{'Content-Type':'application/json',Origin:item.signed.origin,'x-taxiqaid-ip':item.signed.ip,'x-taxiqaid-issued':String(item.signed.issued),'x-taxiqaid-nonce':item.signed.nonce,'x-taxiqaid-trace':item.signed.trace,'x-taxiqaid-mac':item.mac},body:item.body});
  const probe=async(query:Sql,item:Envelope,source=ip,aggregate=global)=>{
   if(++probes>VALIDATION_CASES[caseId as keyof typeof VALIDATION_CASES])throw new Error('DENIED');
   const verified=await verifyGateway(proofRequest(item),secret,now());
   if(!verified)throw new Error('DENIED');const identifier=await bucket(rate,'v1:account:'+item.identifier),nonce=await bucket(rate,'v1:gateway-nonce:'+verified.nonce);
   const rows=await query`SELECT allowed,uid,email,status,mapping_revision::text AS mapping_revision FROM taxiqaid_auth_api.begin_signed_login_attempt(${item.identifier},${source},${identifier},${aggregate},${nonce},${verified.issued}::bigint)`;
   if(rows.length!==1||typeof rows[0].allowed!=='boolean'||rows[0].uid!==null||rows[0].email!==null||rows[0].status!==null||rows[0].mapping_revision!==null)throw new Error('DENIED');
   if(rows[0].allowed)allowed++;else denied++;return rows[0].allowed as boolean;
  };
  const fresh=(label:string)=>envelope(label+':'+(++ordinal));
  const batch=async<T>(mode:string,work:(query:Sql)=>Promise<T>)=>run(mode,async query=>{
   const rows=await query`SELECT taxiqaid_auth_api.get_management_access(${grant.ownerUid}::uuid,${ledger.revision}::bigint) AS access`;
   const access=inspectMasterAccess(rows.length===1?rows[0].access:null,grant.ownerUid,expiry);
   if(!access.activeMaster||access.management!==101||access.driverDenied!==6)throw new Error('DENIED');
   const before=await query`SELECT floor(extract(epoch from clock_timestamp())/60)::bigint AS minute`;
   const minute=Number(before[0]?.minute);if(!Number.isSafeInteger(minute))throw new Error('DENIED');
   const result=await work(query),after=await query`SELECT floor(extract(epoch from clock_timestamp())/60)::bigint AS minute`;
   return {result,minute,stable:Number(after[0]?.minute)===minute};
  });
  let result='FAIL',canary=false,dbMinute=0,stable=true;
  if(caseId==='replay'){
   const first=await envelope('replay-sequential'),second=await envelope('replay-concurrent');
   // Execute the deployed shared verifier with modified body, IP, trace and stale signed time.
   // This is not an external replay of the public HTTP entry or a browser-accessible signing oracle.
   for(const altered of [{...first,body:new TextEncoder().encode('{}')},{...first,signed:{...first.signed,ip:proof.ip==='192.0.2.9'?'192.0.2.8':'192.0.2.9'}},{...first,signed:{...first.signed,trace:crypto.randomUUID()}},{...first,signed:{...first.signed,issued:Math.floor(now()/1000)-61}}]){
    if(await verifyGateway(proofRequest(altered),secret,now()))throw new Error('DENIED');
   }
   const serial=await batch('isolation level repeatable read',async query=>{
    const a=await probe(query,first),b=await probe(query,first),c=await probe(query,await fresh('replay-canary'));return a&&!b&&c;
   });
   // Two real transactions/connections: READ COMMITTED permits the losing INSERT to observe its winner.
   const concurrent=await Promise.all([0,1].map(()=>batch('isolation level read committed',async query=>{
    const admitted=await probe(query,second),healthy=await probe(query,await fresh('replay-canary'));return {admitted,healthy};
   })));
   stable=serial.stable&&concurrent.every(value=>value.stable&&value.minute===serial.minute);dbMinute=serial.minute;
   canary=concurrent.every(value=>value.result.healthy);result=serial.result&&canary&&concurrent.filter(value=>value.result.admitted).length===1?'PASS':'FAIL';
  }else{
   const tested=await batch('isolation level repeatable read',async query=>{
    if(caseId==='ip-base'){const values=[];for(let i=0;i<10;i++)values.push(await probe(query,await fresh('ip-base')));return values.every(Boolean);}
    if(caseId==='ip-spoof'){
     const rejected=!await probe(query,await fresh('ip-spoof'));
     // Same public global key, isolated source: rules out global exhaustion and unhealthy maintenance.
     canary=await probe(query,await fresh('ip-canary'),await key('ip-canary'));return rejected&&canary;
    }
    if(caseId==='identifier-base'){const values=[];for(let i=0;i<3;i++)values.push(await probe(query,await envelope('shared-identifier')));return values.every(Boolean);}
    if(caseId==='identifier-finish'){
     const values=[];for(let i=0;i<8;i++)values.push(await probe(query,await envelope('shared-identifier')));
     canary=await probe(query,await fresh('identifier-canary'));return values.slice(0,7).every(Boolean)&&values[7]===false&&canary;
    }
    const values=[];for(let i=0;i<21;i++)values.push(await probe(query,await fresh('global'),await key('global-source:'+i)));
    canary=await probe(query,await fresh('health-canary'),await key('health-source'),await key('health-global'));
    return values.slice(0,20).every(Boolean)&&values[20]===false&&canary;
   });
   stable=tested.stable;dbMinute=tested.minute;result=tested.result?'PASS':'FAIL';
  }
  live();if(!stable)result='INCONCLUSIVE';
  return validationResponse(200,safeValidationResult({case:caseId,result,scope:scopes[caseId],probes,allowed,denied,canary,dbMinute,dbQuarter:Math.floor(dbMinute/15),expiresAt:grant.expiresAt,sqlQueries,sqlTransactions}));
 }catch{return validationResponse(403,{result:'FAIL'});}
 finally{if(sql)try{await sql.end({timeout:1});}catch{}}
};}

// Source: supabase/functions/login-with-identifier/index.ts
/** Canonical signed broker. Deployment and activation require separate owner approval. */
function createSignedLogin(env:(name:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch,auditSink:((value:string)=>void)|undefined=undefined){return async(request:Request)=>{
 const origins=configuredOrigins(env('TAXIQAID_AUTH_ORIGINS')),origin=request.headers.get('origin'),rate=env('TAXIQAID_RATE_SECRET')||'';
 const configured=['TAXIQAID_LOGIN_ENABLED','TAXIQAID_SESSION_TRANSPORT_REVIEWED','TAXIQAID_GATEWAY_ENABLED','TAXIQAID_GATEWAY_REVIEWED'].every(key=>env(key)==='true')&&rate.length>=32&&env('TAXIQAID_TRUSTED_IP_HEADER_VERIFIED')==='false';
 const proof=await verifyGateway(request,env('TAXIQAID_GATEWAY_SECRET'));
 const audit=authAudit('broker',proof?.trace??crypto.randomUUID(),auditSink);
 if(!proof||!origins.includes(proof.origin)){audit('PROOF_REJECTED',403);return response(403,{error:FAILURE});}
 audit('PROOF_VERIFIED',200);
 if(!configured){audit('BROKER_DISABLED',503);return response(503,{error:FAILURE},proof.origin);}
 let sql:ReturnType<typeof postgres>|null=null;
 try{
  sql=connect({...brokerConnectionOptions(env('TAXIQAID_BROKER_DB_URL')||'',env('TAXIQAID_BROKER_DB_CA')),max:1,idle_timeout:1,max_lifetime:60});
  const store=signedBrokerStore(sql,proof,rate),auth=createClient('https://mqkflwsvnzcaylxtvsje.supabase.co','sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:(input,init)=>fetcher(input,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)})}});
  return await createLoginHandler({origins,ready:true,rateSecret:rate,audit,clientIp:()=>proof.ip,beginAttempt:store.beginAttempt,loadAccess:store.loadAccess,
   passwordSignIn:async(email:string,password:string)=>{const {data,error}=await auth.auth.signInWithPassword({email,password});return {...data,error:error?{status:error.status||0}:null};},signOut:()=>auth.auth.signOut({scope:'local'})})(request);
 }catch{audit('DATABASE_UNAVAILABLE',503);return response(503,{error:FAILURE},proof.origin);}
 finally{if(sql)try{await sql.end({timeout:1});}catch{}}
};}
function createLoginRouter(env:(name:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch,auditSink:((value:string)=>void)|undefined=undefined){
 const login=createSignedLogin(env,connect,fetcher,auditSink),validation=createValidationHandler(env,connect,fetcher);
 return (request:Request)=>request.headers.has(VALIDATION_HEADER)?validation(request):login(request);
}
Deno.serve(createLoginRouter(name=>Deno.env.get(name)));
