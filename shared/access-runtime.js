/** Rendering adapter only. No role writes, permission provisioning or backend access is implemented. */
const TaxiQaidAccess = (() => {
  let uid=null,legacyManagement=false,context=null;
  const subscribers=new Set();
  function notify() {subscribers.forEach(callback=>callback());document.dispatchEvent(new CustomEvent('taxiqaid:access-changed'));}
  function reset(){uid=null;legacyManagement=false;context=null;notify();}
  document.addEventListener('taxiqaid:management-session',event=>{uid=event.detail.uid;legacyManagement=true;context=null;notify();});
  function applyAuthorizedContext(packet) {
    if(!uid||packet.uid!==uid||packet.verified!==true||packet.source!=='authorized-backend'||!['Driver','Management'].includes(packet.accountType))throw new Error('An authorized permission response for the current authenticated account is required.');
    context=structuredClone(packet);notify();
  }
  function renewAuthorizedContext(packet){
    const comparable=value=>JSON.stringify({...value,expiresAt:0});
    if(!context||!uid||packet.uid!==uid||packet.source!=='authorized-backend'||packet.verified!==true||comparable(context)!==comparable(packet))return false;
    context=structuredClone(packet);return true;
  }
  function observeIdentity(event,session) {
    const next=session?.user?.id||null;
    if(event==='SIGNED_OUT'){reset();return;}
    if(next&&next!==uid){uid=next;legacyManagement=false;context=null;notify();}
  }
  function legacyRoleIsDriver(role){return String(role??'').trim().toLowerCase()==='driver';}
  return Object.freeze({applyAuthorizedContext,renewAuthorizedContext,observeIdentity,legacyRoleIsDriver,reset,
    can:(key,resource={})=>TaxiQaidPermissionModel.can(context,key,resource),
    getContext:()=>context?structuredClone(context):null,getUid:()=>uid,hasLegacyManagementSession:()=>legacyManagement,
    subscribe(callback){subscribers.add(callback);return()=>subscribers.delete(callback);}});
})();
