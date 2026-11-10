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
