/** Status-only validation. Never return profile fields, identifiers, permission lists or raw responses. */
const TaxiQaidLocalSmokeValidation=(()=>{
 const catalog=typeof TaxiQaidPermissionCatalog!=='undefined'?TaxiQaidPermissionCatalog:require('../../shared/permission-catalog.js');
 const model=typeof TaxiQaidPermissionModel!=='undefined'?TaxiQaidPermissionModel:require('../../shared/permission-model.js');
 const own=(object,key)=>Boolean(object&&Object.hasOwn(object,key));
 const fault=()=>{throw new Error('ACCESS_RESPONSE_UNSUPPORTED');};
 function permissionRows(rows){
  const allow=new Set(),deny=new Set();
  if(!Array.isArray(rows))fault();
  for(const row of rows){
   if(typeof row==='string'){allow.add(row);continue;}
   if(!row||typeof row.permission_key!=='string'||typeof row.is_allowed!=='boolean'||(own(row,'is_active')&&typeof row.is_active!=='boolean'))fault();
   if(row.is_active===false)continue;
   (row.is_allowed?allow:deny).add(row.permission_key);
  }
  return {allow,deny};
 }
 function permissionMap(object){
  if(!object||typeof object!=='object'||Array.isArray(object))fault();
  const allow=new Set(),deny=new Set();
  for(const [key,effect]of Object.entries(object)){
   if(effect===true||effect==='allow')allow.add(key);else if(effect===false||effect==='deny')deny.add(key);else if(effect!=='inherit')fault();
  }
  return {allow,deny};
 }
 function inspect(raw,authenticatedUid){
  try{
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||!authenticatedUid)fault();
   const profile=raw.account||raw.profile||raw.user_account||raw.user;
   if(!profile||typeof profile!=='object'||Array.isArray(profile))fault();
   const uids=[raw.uid,raw.user_id,profile.uid,profile.user_id].filter(value=>value!==undefined);
   const uidMatches=uids.length>0&&uids.every(value=>typeof value==='string'&&value===authenticatedUid);
   const active=profile.status==='active',master=(profile.role??profile.role_key)==='super_admin',management=(profile.type??profile.account_type)==='management';
   let defaults={allow:new Set(),deny:new Set()},overrides={allow:new Set(),deny:new Set()};
   const permissions=raw.permissions;
   if(permissions&&typeof permissions==='object'&&!Array.isArray(permissions)&&own(permissions,'roleDefaults')){
    defaults=permissionRows(permissions.roleDefaults);overrides=permissionMap(permissions.overrides??{});
   }else if(own(raw,'effective_permissions')){
    defaults=Array.isArray(raw.effective_permissions)?permissionRows(raw.effective_permissions):permissionMap(raw.effective_permissions);
   }else if(own(raw,'role_permissions')){
    defaults=permissionRows(raw.role_permissions);
    if(raw.user_permission_overrides)overrides=Array.isArray(raw.user_permission_overrides)?permissionRows(raw.user_permission_overrides):permissionMap(raw.user_permission_overrides);
   }else if(permissions){defaults=Array.isArray(permissions)?permissionRows(permissions):permissionMap(permissions);}
   else fault();
   const effectiveGrant=new Set(defaults.allow);
   for(const key of defaults.deny)effectiveGrant.delete(key);
   for(const key of overrides.allow)effectiveGrant.add(key);
   for(const key of overrides.deny)effectiveGrant.delete(key);
   const effects=Object.fromEntries([...overrides.allow].map(key=>[key,'allow']));for(const key of overrides.deny)effects[key]='deny';
   const draft={accountType:'Management',roleDefaults:[...defaults.allow].filter(key=>!defaults.deny.has(key)),overrides:effects};
   const managementCount=catalog.ALL.filter(permission=>permission.audience!=='Driver'&&model.draftDecision(permission.key,draft).allowed).length;
   const driverActions=catalog.ALL.filter(permission=>permission.audience==='Driver');
   const driverDenied=driverActions.filter(permission=>!effectiveGrant.has(permission.key)).length;
   const unknownGranted=[...effectiveGrant].filter(key=>!Object.hasOwn(catalog.BY_KEY,key)).length;
   return {supported:true,uidMatches,active,master,management,managementCount,driverDenied,unknownGranted,
    accessDataValidated:uidMatches&&active&&master&&management&&unknownGranted===0,
    passed:uidMatches&&active&&master&&management&&managementCount===101&&driverDenied===6&&unknownGranted===0};
  }catch{return {supported:false,passed:false,diagnostic:'ACCESS_RESPONSE_UNSUPPORTED'};}
 }
 return Object.freeze({inspect});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidLocalSmokeValidation;
