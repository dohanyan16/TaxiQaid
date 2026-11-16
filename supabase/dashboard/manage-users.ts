// @ts-nocheck
// GENERATED REVIEW-ONLY administrative bundle. Source modules receive strict Deno checking.
// Default gate is disabled; no deployment or account operation is authorized.
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
  const MANAGEMENT_ROLES=Object.freeze({manager:'Manager',supervisor:'Supervisor'});
  const DEPARTMENTS=Object.freeze({operation:'Operation',fleet:'Fleet',maintenance:'Maintenance',finance:'Finance',hr:'HR',qhse:'QHSE',it:'IT'});
  return Object.freeze({MODULES,ALL,BY_KEY,ROLE_TEMPLATES,MANAGEMENT_ROLES,DEPARTMENTS});
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

// Source: shared/user-admin-model.js
/** Administrative input/permission contract. Server and database enforce these rules independently. */
const TaxiQaidUserAdminModel=(()=>{
 const catalog=typeof TaxiQaidPermissionCatalog!=='undefined'?TaxiQaidPermissionCatalog:require('./permission-catalog.js'),model=typeof TaxiQaidPermissionModel!=='undefined'?TaxiQaidPermissionModel:require('./permission-model.js');
 const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
 function account(raw){
  if(!raw||typeof raw.username!=='string'||typeof raw.fullName!=='string'||raw.contactEmail!==null&&typeof raw.contactEmail!=='string'||Object.keys(raw).sort().join(',')!=='contactEmail,departments,fullName,role,status,username')throw new Error('Invalid account fields.');
  const username=String(raw.username||'').trim().toLowerCase(),fullName=String(raw.fullName||'').trim(),contactEmail=raw.contactEmail===null||raw.contactEmail===''?null:String(raw.contactEmail).trim();
  if(!/^[a-z][a-z0-9]{1,47}$/.test(username)||!fullName||fullName.length>150||contactEmail!==null&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)||contactEmail.length>254)||!Object.hasOwn(catalog.MANAGEMENT_ROLES,raw.role)||!['active','disabled'].includes(raw.status)||!Array.isArray(raw.departments)||!raw.departments.length||raw.departments.length>7||raw.departments.some(key=>!Object.hasOwn(catalog.DEPARTMENTS,key))||new Set(raw.departments).size!==raw.departments.length)throw new Error('Provide valid account details, role and departments.');
  return {username,fullName,contactEmail,role:raw.role,status:raw.status,departments:[...raw.departments].sort()};
 }
 function changes(user,draft){return Object.fromEntries(Object.entries(draft).filter(([key,value])=>typeof value==='boolean'&&value!==model.draftDecision(key,{accountType:'Management',roleDefaults:user.roleDefaults,overrides:Object.fromEntries(Object.entries(user.overrides).map(([k,v])=>[k,v?'allow':'deny']))}).allowed));}
 function permissions(user,patch){
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).length>101)throw new Error('Invalid permissions.');
  for(const [key,value]of Object.entries(patch))if(!Object.hasOwn(catalog.BY_KEY,key)||catalog.BY_KEY[key].audience==='Driver'||typeof value!=='boolean')throw new Error('Invalid capability.');
  const overrides={...user.overrides,...patch},context={accountType:'Management',roleDefaults:user.roleDefaults,overrides:Object.fromEntries(Object.entries(overrides).map(([key,value])=>[key,value?'allow':'deny']))};
  for(const [key,value]of Object.entries(patch))if(value&&!model.draftDecision(key,context).allowed)throw new Error('Allowed capability requires its module and dependencies.');return patch;
 }
 return Object.freeze({uuid,account,changes,permissions});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidUserAdminModel;

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

// Source: supabase/functions/manage-users/sheets.mjs
/** Disabled-by-default metadata mirror. Fixed durable rows, RAW values, no Auth identities/credentials. */
async function syncSheets(batch,leaseUntil,env,fetcher=fetch,now=Date.now){
 if(env('TAXIQAID_SHEETS_SYNC_ENABLED')!=='true')return [];
 const id=env('TAXIQAID_GOOGLE_SPREADSHEET_ID'),token=env('TAXIQAID_GOOGLE_ACCESS_TOKEN'),users=env('TAXIQAID_GOOGLE_USERS_TAB'),requests=env('TAXIQAID_GOOGLE_REQUESTS_TAB'),deadline=now()+20000;
 if(!/^[A-Za-z0-9_-]{20,200}$/.test(id||'')||!token||![users,requests].every(v=>/^[A-Za-z0-9 _-]{1,50}$/.test(v||''))||users===requests||!Array.isArray(batch)||batch.length>10)throw new Error('SHEETS_CONFIGURATION_REQUIRED');
 const receipts=[];
 for(const entry of batch){
  const receipt={kind:entry.kind,entity:entry.entity,version:entry.version,ok:false};receipts.push(receipt);
  try{
   if(now()>=deadline||now()>leaseUntil*1000-15000||!Number.isSafeInteger(Number(entry.sheet_row))||Number(entry.sheet_row)<2)throw new Error('LEASE_EXPIRED');
   const p=entry.payload;let values,tab;
   if(entry.kind==='user'){
    const keys=['uid','username','fullName','contactEmail','role','departments','status','version','createdAt','updatedAt'];if(Object.keys(p).some(k=>!keys.includes(k)))throw new Error('UNAPPROVED_METADATA');
    values=keys.map(k=>Array.isArray(p[k])?p[k].join(', '):p[k]??'');tab=users;
   }else if(entry.kind==='profile-request'){
    const allowed=['id','mirror_row','driver_ref','field','status','version','requested_at','reviewed_by','reviewed_at','history'];if(Object.keys(p).some(k=>!allowed.includes(k)))throw new Error('UNAPPROVED_METADATA');
    values=allowed.filter(k=>k!=='mirror_row').map(k=>typeof p[k]==='object'&&p[k]!==null?JSON.stringify(p[k]):p[k]??'');tab=requests;
   }else throw new Error('UNAPPROVED_METADATA');
   const range="'"+tab+"'!A"+entry.sheet_row+':'+String.fromCharCode(64+values.length)+entry.sheet_row;
   const reply=await fetcher('https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/'+encodeURIComponent(range)+'?valueInputOption=RAW',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({range,majorDimension:'ROWS',values:[values]}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(Math.min(5000,Math.max(1,deadline-now())))});
   receipt.ok=reply.status===200;await reply.body?.cancel();
  }catch{/* Fixed error state only; outbox retains metadata and uses bounded exponential backoff. */}
 }
 return receipts;
}

// Source: supabase/functions/manage-users/runtime.ts
/** Administrative service, inert by default. Official online Auth + SQL Master/capability checks before Admin API use. */
const model=TaxiQaidUserAdminModel;
const project='https://mqkflwsvnzcaylxtvsje.supabase.co',key='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
const recoveryRedirect='https://dohanyan16.github.io/TaxiQaid/reset-password.html';
type RecoverySender=(email:string,redirectTo:string)=>Promise<{error?:unknown}>;
function adminConnectionOptions(connection:string,ca?:string){
 const target=new URL(connection),pooler=target.hostname.endsWith('.pooler.supabase.com'),username=decodeURIComponent(target.username),expected='taxiqaid_user_admin_login'+(pooler?'.mqkflwsvnzcaylxtvsje':'');
 if(username!==expected)throw new Error('Restricted administration connection required.');target.username='taxiqaid_auth_login'+(pooler?'.mqkflwsvnzcaylxtvsje':'');return {...brokerConnectionOptions(target.toString(),ca),username,max:2,fetch_types:false};
}
function adminStore(sql:ReturnType<typeof postgres>){return async(actor:string,action:string,data:unknown)=>await sql.begin('isolation level serializable',async tx=>{
 const rows=await tx`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_roles WHERE rolname=session_user`;
 if(rows.length!==1||rows[0].login!=='taxiqaid_user_admin_login'||rows[0].actor!=='taxiqaid_user_admin_login'||rows[0].restricted!==true)throw new Error('Restricted administration connection required.');
 await tx`SET LOCAL ROLE taxiqaid_user_admin_backend`;await tx`SELECT set_config('statement_timeout','5000',true),set_config('lock_timeout','1000',true)`;
 const result=action.startsWith('hard-delete:')?await tx`SELECT taxiqaid_auth_api.admin_delete_user(${actor}::uuid,${action.slice(12)},${sql.json(data as never)}::jsonb) AS result`:await tx`SELECT taxiqaid_auth_api.admin_dispatch(${actor}::uuid,${action},${sql.json(data as never)}::jsonb) AS result`;return result[0].result;
 });}
const publicActions=['list','create','edit','permissions','requests','request-enqueue','request-approve','request-reject','reset-password','archive-user','delete-user','pending-deletions','sync-auth','sync-sheets','recover-create','operations'];
const capability=(action:string)=>({'list':'user-management.view',create:'user-management.create-user','recover-create':'user-management.create-user',permissions:'user-management.manage-permissions',requests:'user-management.profile-requests.view','request-enqueue':'user-management.profile-requests.view','request-approve':'driver-profile.approve','request-reject':'driver-profile.reject'} as Record<string,string>)[action]||'user-management.edit-user';
async function readInput(request:Request){
 if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new Error('INVALID_INPUT');
 const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_INPUT');let bytes=new Uint8Array(),timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reader.cancel().catch(()=>{});reject(new Error('INVALID_INPUT'));},2000);});
 try{for(;;){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;if(bytes.length+value.length>16384)throw new Error('INVALID_INPUT');bytes=new Uint8Array([...bytes,...value]);}try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('INVALID_INPUT');}}finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
function input(raw:Record<string,unknown>){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.action!=='string'||!publicActions.includes(raw.action))throw new Error('INVALID_INPUT');
 const allowed:Record<string,string[]>={list:['search','after','limit'],requests:['search','after','status','field'],create:['operation','account'],edit:['operation','uid','version','etag','account'],permissions:['operation','uid','version','etag','patch'],'reset-password':['operation','uid','version','etag'],'archive-user':['operation','uid','version','etag'],'delete-user':['operation','uid','version','etag','confirmedUsername'],'pending-deletions':[],'sync-auth':['operation','uid','version','etag'],'sync-sheets':[],operations:[],'recover-create':['operation'],'request-enqueue':['operation','driverRef','iqama','name','field','oldValue','proposedValue'],'request-approve':['operation','uid','version','note'],'request-reject':['operation','uid','version','note']};
 if(Object.keys(raw).some(k=>k!=='action'&&!allowed[String(raw.action)].includes(k)))throw new Error('INVALID_INPUT');const {action,...data}=raw;
 if(data.operation!==undefined&&!model.uuid(data.operation)||data.uid!==undefined&&!model.uuid(data.uid)||data.after!==undefined&&data.after!==null&&!model.uuid(data.after)||data.version!==undefined&&(!Number.isSafeInteger(data.version)||Number(data.version)<1)||data.etag!==undefined&&!(typeof data.etag==='string'&&/^[0-9a-f]{64}$/.test(data.etag)))throw new Error('INVALID_INPUT');
 if(!['list','requests','sync-sheets','operations','pending-deletions'].includes(String(action))&&!model.uuid(data.operation))throw new Error('INVALID_INPUT');
 if(['edit','permissions','reset-password','archive-user','delete-user','sync-auth','request-approve','request-reject'].includes(String(action))&&(!model.uuid(data.uid)||!Number.isSafeInteger(data.version)))throw new Error('INVALID_INPUT');
 if(['edit','permissions','reset-password','archive-user','delete-user','sync-auth'].includes(String(action))&&typeof data.etag!=='string')throw new Error('INVALID_INPUT');
 if(['create','edit'].includes(String(action)))data.account=model.account(data.account);
 for(const k of ['search','note','name','oldValue','proposedValue','driverRef','iqama'])if(data[k]!==undefined&&data[k]!==null&&(typeof data[k]!=='string'||String(data[k]).length>(k==='note'?2000:k==='search'||k==='driverRef'?100:150)))throw new Error('INVALID_INPUT');
 if(action==='delete-user'&&(typeof data.confirmedUsername!=='string'||!/^[a-z][a-z0-9]{1,47}$/.test(data.confirmedUsername)))throw new Error('INVALID_INPUT');
 return {action:String(action),data};
}
type Rpc=(actor:string,action:string,data:Record<string,unknown>)=>Promise<any>;
const authUserAbsent=(result:any)=>result?.error?.status===404&&result.error.code==='user_not_found';
async function permanentlyDelete(actor:string,data:Record<string,any>,rpc:Rpc,auth:any){
 const lease=crypto.randomUUID(),payload={...data,lease},known=await rpc(actor,'hard-delete:inspect',data);
 if(known.uid!==data.uid)throw new Error('DELETE_IDENTITY_MISMATCH');
 if(known.deleted===true)return {deleted:true,operation:data.operation};
 if(typeof known.email!=='string'||!known.email.includes('@'))throw new Error('AUTH_IDENTITY_MISMATCH');
 const found=await auth.getUserById(data.uid);let absent=authUserAbsent(found);
 if(!absent&&(found.error||found.data?.user?.id!==data.uid||found.data.user.email?.toLowerCase()!==known.email?.toLowerCase()))throw new Error('AUTH_IDENTITY_MISMATCH');
 if(found.data?.user?.app_metadata?.taxiqaid_protected===true)throw Object.assign(new Error('PROTECTED_ACCOUNT'),{code:'42501'});
 await rpc(actor,'hard-delete:reserve',payload);let stage='auth-ban';
 try{
  if(!absent){const banned=await auth.updateUserById(data.uid,{ban_duration:'876000h'});absent=authUserAbsent(banned);if(!absent&&(banned.error||banned.data?.user?.id!==data.uid||banned.data.user.email?.toLowerCase()!==known.email.toLowerCase()))throw new Error('AUTH_BAN_UNCONFIRMED');}
  stage='private-detachment';const checked=await rpc(actor,'hard-delete:detach',payload);if(checked.uid!==data.uid||checked.email!==known.email)throw new Error('DELETE_IDENTITY_MISMATCH');
  stage='auth-deletion';if(!absent){const removed=await auth.deleteUser(data.uid,false);if(removed.error&&!authUserAbsent(removed))throw new Error('AUTH_DELETE_UNCONFIRMED');}
  const confirmation=await auth.getUserById(data.uid);if(!authUserAbsent(confirmation))throw new Error('AUTH_ABSENCE_UNCONFIRMED');
  stage='private-cleanup';const completed=await rpc(actor,'hard-delete:finalize',{...payload,authAbsent:true});if(completed.deleted!==true||completed.uid!==data.uid)throw new Error('PRIVATE_DELETE_UNCONFIRMED');
  return {deleted:true,operation:data.operation};
 }catch{try{await rpc(actor,'hard-delete:release',payload);}catch{/* The same receipt remains recoverable after its lease expires. */}return {deleted:false,pending:true,operation:data.operation,stage};}
}
async function administrativeAction(actor:string,action:string,data:Record<string,any>,rpc:Rpc,auth:any,env:(k:string)=>string|undefined,fetcher:typeof fetch=fetch,sendRecovery?:RecoverySender){
 await rpc(actor,'authorize',{capability:capability(action),read:['list','requests'].includes(action)});
 if(action==='delete-user'||action==='pending-deletions'){if(![undefined,'true'].includes(env('TAXIQAID_HARD_DELETE_ENABLED'))||(await rpc(actor,'hard-delete:ready',{})).version!==2)throw new Error('HARD_DELETE_NOT_ENABLED');return action==='delete-user'?await permanentlyDelete(actor,data,rpc,auth):await rpc(actor,'hard-delete:pending',{});}
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
 if(action==='archive-user'){
  // Archive only an exact version-matched office account; never delete Auth or audit records.
  const listed=await rpc(actor,'list',{search:data.uid,limit:1});
  const target=listed?.users?.find((entry:any)=>entry.uid===data.uid);
  if(!target||!['manager','supervisor'].includes(target.role)||target.version!==data.version||target.etag!==data.etag)throw Object.assign(new Error('STALE_ACCOUNT'),{code:'40001'});
  const identity=await rpc(actor,'identity',{uid:data.uid});
  if(identity?.uid!==data.uid||typeof identity.email!=='string')throw new Error('AUTH_IDENTITY_MISMATCH');
  const found=await auth.getUserById(data.uid);
  if(found.error||found.data?.user?.id!==data.uid||found.data?.user?.email?.toLowerCase()!==identity.email.toLowerCase())throw new Error('AUTH_IDENTITY_MISMATCH');
  const result=await rpc(actor,'archive-user',data);
  if(result?.archived!==true||result.user?.uid!==data.uid||result.user?.status!=='disabled')throw new Error('ARCHIVE_UNCONFIRMED');
  // SQL has revoked app access before attempting the additional provider-side ban.
  try{
   const updated=await auth.updateUserById(data.uid,{ban_duration:'876000h'});
   if(updated.error||updated.data?.user?.id!==data.uid||updated.data?.user?.email?.toLowerCase()!==identity.email.toLowerCase())throw new Error('AUTH_UNAVAILABLE');
   const synced=await rpc(actor,'auth-synced',{operation:crypto.randomUUID(),uid:data.uid,version:result.user.version,etag:result.user.etag});
   if(synced?.user?.status!=='disabled'||synced.user.uid!==data.uid)throw new Error('AUTH_SYNC_UNCONFIRMED');
   return {archived:true,authSyncPending:false};
  }catch{return {archived:true,authSyncPending:true};}
 }
 if(action==='reset-password'){
  // Master requests an Auth recovery message; never replace or reveal employee credentials.
  // Recheck authoritative private status/CAS and the exact Auth identity before any mail request.
  const listed=await rpc(actor,'list',{search:data.uid,limit:1});
  const target=listed?.users?.find((entry:any)=>entry.uid===data.uid);
  if(!target||!['manager','supervisor'].includes(target.role)||target.status!=='active')throw new Error('INVALID_INPUT');
  if(target.version!==data.version||target.etag!==data.etag)throw Object.assign(new Error('STALE_ACCOUNT'),{code:'40001'});
  const identity=await rpc(actor,'identity',{uid:data.uid});
  if(identity?.uid!==data.uid||typeof identity.email!=='string'||!identity.email.includes('@'))throw new Error('AUTH_IDENTITY_MISMATCH');
  const found=await auth.getUserById(data.uid);
  if(found.error||found.data?.user?.id!==data.uid||found.data?.user?.email?.toLowerCase()!==identity.email.toLowerCase())throw new Error('AUTH_IDENTITY_MISMATCH');
  const send=sendRecovery||((email:string,redirectTo:string)=>createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url:RequestInfo|URL,init?:RequestInit)=>fetcher(url,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)})}}).auth.resetPasswordForEmail(email,{redirectTo}));
  const delivery=await send(identity.email,recoveryRedirect);
  if(delivery.error)throw new Error('RECOVERY_EMAIL_UNAVAILABLE');
  return {delivery:'requested'};
 }
 if(action==='sync-sheets'){
  if(env('TAXIQAID_SHEETS_SYNC_ENABLED')!=='true')return {sync:'DISABLED',sent:0};const lease=crypto.randomUUID(),job=await rpc(actor,'mirror-claim',{lease});let receipts:{kind:string;entity:string;version:number;ok:boolean}[]=[];
  try{receipts=await syncSheets(job.batch,job.leaseUntil,env,fetcher);return {sync:receipts.every((r:any)=>r.ok)?'COMPLETE':'PENDING_RETRY',sent:receipts.filter((r:any)=>r.ok).length};}
  finally{await rpc(actor,'mirror-ack',{lease,receipts});}
 }
 const result=await rpc(actor,action,data);if(action==='list'){let ready=false;if([undefined,'true'].includes(env('TAXIQAID_HARD_DELETE_ENABLED')))try{ready=(await rpc(actor,'hard-delete:ready',{})).version===2;}catch{/* Existing services stay usable while the reviewed upgrade is pending. */}return {...result,features:{hardDelete:ready}};}return result;
}
function createAdminHandler(env:(k:string)=>string|undefined,deps:{rpc?:Rpc;verify?:(jwt:string)=>Promise<any>;admin?:any;fetcher?:typeof fetch;sendRecovery?:RecoverySender;connect?:(options:ReturnType<typeof adminConnectionOptions>)=>ReturnType<typeof postgres>}={}){return async(request:Request)=>{
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
  let privileged:any;const admin=deps.admin||{getUserById:(...args:any[])=>{privileged??=createClient(project,env('TAXIQAID_AUTH_ADMIN_KEY')||'',options).auth.admin;return privileged.getUserById(...args);},createUser:(...args:any[])=>{privileged??=createClient(project,env('TAXIQAID_AUTH_ADMIN_KEY')||'',options).auth.admin;return privileged.createUser(...args);},updateUserById:(...args:any[])=>{privileged??=createClient(project,env('TAXIQAID_AUTH_ADMIN_KEY')||'',options).auth.admin;return privileged.updateUserById(...args);},deleteUser:(...args:any[])=>{privileged??=createClient(project,env('TAXIQAID_AUTH_ADMIN_KEY')||'',options).auth.admin;return privileged.deleteUser(...args);}};
  return response(200,await administrativeAction(user.id,action,data,rpc,admin,env,fetcher,deps.sendRecovery),origin);
 }catch(error){const code=(error as {code?:string}).code,message=(error as Error).message,status=code==='40001'||code==='23505'?409:code==='42501'?403:message==='INVALID_INPUT'||/valid|Invalid|requires/.test(message)?400:503;return response(status,{error:status===409?'Conflict. Refresh before retrying.':status===400?'Invalid administrative request.':'Administration unavailable.',...(message==='PROVISIONING_RECOVERY_REQUIRED'?{recoveryRequired:true}:{})},origin);}
 finally{if(sql)try{await sql.end({timeout:1});}catch{}}
};}

// Source: supabase/functions/manage-users/index.ts
/** Proposal only. No automatic deployment or activation. */
Deno.serve(createAdminHandler(name=>Deno.env.get(name)));
