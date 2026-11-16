/** Dormant migration controller. Administrative admission follows verified access, never a submitted identifier. */
const TaxiQaidDedicatedLogin=(()=>{
 const $=id=>document.getElementById(id),settings=window.TAXIQAID_DEDICATED_AUTH;
 if(settings?.enabled !== true)return Object.freeze({active:false});
 let preferDriver=location.hash==='#driver-portal';
 const hide=()=>{$('erp-app').style.display='none';$('driver-portal').hidden=true;$('authenticated-role').hidden=true;$('authenticated-role').textContent='';TaxiQaidAccess.reset();loggedInUserName='';};
 function route(context,session){
  if(TaxiQaidAccess.renewAuthorizedContext(context)){loggedInUserName=context.fullName;return;}
  TaxiQaidAccess.observeIdentity('SIGNED_IN',session);TaxiQaidAccess.applyAuthorizedContext(context);loggedInUserName=context.fullName;
  $('authenticated-role').textContent=context.role==='super_admin'?'Master':'';$('authenticated-role').hidden=context.role!=='super_admin';
  $('login-screen').style.display='none';
  if(context.accountType==='Management'){$('erp-app').hidden=false;$('erp-app').style.display='flex';TaxiQaidPermissionBindings.reconcile();}
  else {$('erp-app').style.display='none';$('driver-portal').hidden=false;}
 }
 const auth=TaxiQaidAuthClient.create({client:supabaseClient,url:settings.url,key:settings.publicKey,brokerUrl:settings.brokerUrl??null,enabled:settings.enabled,
  onClear:()=>{hide();$('login-screen').style.display='flex';if(preferDriver&&typeof TaxiQaidDriverPortal!=='undefined')TaxiQaidDriverPortal.openLogin();},onAccess:route,
  onCleanup:result=>{if(!result.localCleared||!result.remoteRevoked){$('error-message').textContent='TaxiQaid is locked. Server session cleanup could not be confirmed. Contact your administrator.';$('error-message').hidden=false;}}});
 const toggle=$('sidebar-toggle');toggle.addEventListener('click',()=>{const collapsed=$('sidebar').classList.toggle('collapsed');toggle.textContent=collapsed?'›':'‹';toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');});
 async function submit(event,driver=false){
  event.preventDefault();preferDriver=driver;const identifier=$(driver?'portal-iqama':'username').value,password=$(driver?'portal-password':'password'),status=$(driver?'portal-login-status':'error-message');const value=password.value;password.value='';status.hidden=true;
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{await auth.login(identifier,value);}catch(error){const cleanup=auth.getCleanupState();status.textContent=cleanup.remoteRevoked===false||!cleanup.localCleared?'TaxiQaid is locked. Session cleanup could not be confirmed. Close this tab and contact your administrator.':error.message;status.hidden=false;if(driver){$('driver-portal').hidden=false;$('portal-login').hidden=false;$('portal-content').hidden=true;$('login-screen').style.display='none';}}
  finally{button.disabled=false;}
 }
 $('driver-signin-entry').addEventListener('click',()=>{preferDriver=true;});$('portal-management-login').addEventListener('click',()=>{preferDriver=false;});
 $('login-form').addEventListener('submit',event=>submit(event));$('portal-login-form').addEventListener('submit',event=>submit(event,true));
 $('logout-button').addEventListener('click',async()=>{await auth.logout();$('login-form').reset();});
 // Canonical department IDs are identity metadata, not automatic access grants.
 document.addEventListener('taxiqaid:app-ready',()=>{document.querySelector('label[for=um-create-login]').textContent='Username / Login Identifier';document.querySelectorAll('select option[value="Quality"]').forEach(option=>option.textContent='QHSE');document.querySelectorAll('select option[value="Super Administrator"]').forEach(option=>option.textContent='Master');auth.start();}, {once:true});
 return Object.freeze({auth});
})();
