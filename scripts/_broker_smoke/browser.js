/** Owner-only browser diagnostic. No credentials/session/private response is displayed, logged or persisted. */
(()=>{
 'use strict';
 const project='https://mqkflwsvnzcaylxtvsje.supabase.co',publishable='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
 if(location.origin!==project||!/^\/functions\/v1\/login-with-identifier\/?$/.test(location.pathname)||globalThis.TAXIQAID_BROKER_TEST_RUNNING)return;
 Object.defineProperty(globalThis,'TAXIQAID_BROKER_TEST_RUNNING',{value:true});
 const node=(tag,text)=>{const element=document.createElement(tag);if(text)element.textContent=text;return element;};
 const main=node('main'),title=node('h1','TaxiQaid Private Username Login Test'),intro=node('p','Technical test only. Keep this tab open until automatic sign-out finishes.'),form=node('form');
 const userLabel=node('label','Username'),user=node('input'),passwordLabel=node('label','Password'),password=node('input'),run=node('button','Run Once and Sign Out'),output=node('pre'),summary=node('textarea'),copy=node('button','Copy Sanitized Summary');
 user.id='broker-username';user.autocomplete='off';user.spellcheck=false;user.autocapitalize='none';userLabel.htmlFor=user.id;
 password.id='broker-password';password.type='password';password.autocomplete='off';passwordLabel.htmlFor=password.id;
 form.autocomplete='off';run.type='submit';copy.type='button';copy.disabled=true;summary.readOnly=true;summary.rows=22;summary.id='broker-summary';output.id='broker-result';output.textContent='READY';
 form.append(userLabel,node('br'),user,node('br'),passwordLabel,node('br'),password,node('br'),run);main.append(title,intro,form,output,summary,node('br'),copy);document.body.replaceChildren(main);
 const statuses={},http={},counts={},presence={};let started=false,issuedToken=null,client=null;
 const nativeFetch=globalThis.fetch.bind(globalThis),stages=new Map([['/functions/v1/login-with-identifier','broker'],['/functions/v1/get-my-access','access'],['/auth/v1/user','identity'],['/auth/v1/logout','signout'],['/auth/v1/token','session']]);
 async function guardedFetch(input,init={}){
  const target=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url),stage=stages.get(target.pathname);
  if(target.origin!==project||!stage||target.username||target.password||[...target.searchParams.keys()].some(key=>!['scope','grant_type'].includes(key))||target.pathname==='/auth/v1/token'&&target.searchParams.get('grant_type')!=='refresh_token')throw new Error('REQUEST_REJECTED');
  http[stage]=null;const response=await nativeFetch(input,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:init.signal||AbortSignal.timeout(15000)});http[stage]=response.status;return response;
 }
 function render(){const sanitized={test:'username_broker',statuses:{...statuses},http:{...http},counts:{...counts},fieldPresence:{...presence}};summary.value=JSON.stringify(sanitized,null,2);output.textContent=statuses.overall||'RUNNING';}
 function reject(stage,code){statuses[stage]='FAIL';statuses.diagnostic=code;throw new Error('SANITIZED_FAILURE');}
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(summary.value);}catch{summary.focus();summary.select();}});
 try{client=supabase.createClient(project,publishable,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:guardedFetch}});}catch{output.textContent='SDK_NOT_AVAILABLE';run.disabled=true;return;}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(started)return;
  let identifier=user.value.trim().toLowerCase(),privatePassword=password.value,tokens=null,raw=null;user.value='';password.value='';
  if(!/^[a-z][a-z0-9]{1,47}$/.test(identifier)||!privatePassword){output.textContent='ENTER_USERNAME_AND_PASSWORD';return;}
  started=true;run.disabled=true;user.disabled=true;password.disabled=true;render();let phase='broker';
  try{
   const response=await guardedFetch(project+'/functions/v1/login-with-identifier',{method:'POST',headers:{apikey:publishable,'Content-Type':'application/json'},body:JSON.stringify({identifier,password:privatePassword})});identifier='';privatePassword='';
   if(response.status!==200){await response.body?.cancel();reject('broker',response.status===429?'RATE_LIMITED':response.status===503?'BROKER_UNAVAILABLE':'LOGIN_REJECTED');}
   tokens=await response.json();if(typeof tokens?.access_token!=='string'||typeof tokens.refresh_token!=='string')reject('broker','SESSION_RESPONSE_UNSUPPORTED');
   issuedToken=tokens.access_token;statuses.broker='PASS';render();phase='identity';
   const session=await client.auth.setSession({access_token:tokens.access_token,refresh_token:tokens.refresh_token});tokens=null;if(session.error||!session.data?.session)reject('identity','SESSION_NOT_ESTABLISHED');
   const identity=await client.auth.getUser();if(identity.error||!identity.data?.user?.id)reject('identity','AUTH_IDENTITY_NOT_VERIFIED');statuses.identity='PASS';const uid=identity.data.user.id;render();
   phase='access';const access=await guardedFetch(project+'/functions/v1/get-my-access',{method:'GET',headers:{apikey:publishable,Authorization:'Bearer '+issuedToken}});
   if(access.status!==200){await access.body?.cancel();reject('access','ACCESS_HTTP_REJECTED');}statuses.access='PASS';raw=await access.json();
   presence.activeStatus=typeof (raw?.account?.status??raw?.status??raw?.accountStatus)==='string';presence.fullName=typeof (raw?.account?.fullName??raw?.fullName??raw?.full_name)==='string';presence.username=typeof (raw?.account?.username??raw?.username)==='string';
   phase='profile';let context;try{context=TaxiQaidAuthContract.access(raw,uid,session.data.session.expires_at);}catch{reject('profile','ACCESS_CONTRACT_NOT_VERIFIED');}raw=null;
   statuses.profile='PASS';statuses.uid=context.uid===uid?'PASS':'FAIL';statuses.active=context.accountStatus==='Active'?'PASS':'FAIL';statuses.master=context.role==='super_admin'?'PASS':'FAIL';
   const grants=new Set(context.roleDefaults);for(const [key,effect]of Object.entries(context.overrides)){if(effect==='allow')grants.add(key);if(effect==='deny')grants.delete(key);}
   counts.management=TaxiQaidPermissionCatalog.ALL.filter(p=>p.audience!=='Driver'&&TaxiQaidPermissionModel.draftDecision(p.key,context).allowed).length;
   counts.driverDenied=TaxiQaidPermissionCatalog.ALL.filter(p=>p.audience==='Driver'&&!grants.has(p.key)).length;statuses.permissions=counts.management===101&&counts.driverDenied===6?'PASS':'FAIL';
   phase='mfa';const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();statuses.passwordOnly=!assurance.error&&assurance.data?.currentLevel==='aal1'?'PASS':'NOT VERIFIED';render();
  }catch{if(!statuses.diagnostic){statuses[phase]='FAIL';statuses.diagnostic=Object.values(http).some(value=>value===null)?'NETWORK_OR_CORS':'SANITIZED_TEST_FAILURE';}}
  finally{
   identifier='';privatePassword='';tokens=null;raw=null;
   if(issuedToken){
    try{const signedOut=await client.auth.signOut({scope:'local'});statuses.signout=!signedOut.error&&[200,204].includes(http.signout)?'PASS':'FAIL';}catch{statuses.signout='FAIL';}
    if(statuses.signout!=='PASS')try{const cleanup=await guardedFetch(project+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:publishable,Authorization:'Bearer '+issuedToken}});statuses.signout=[200,204].includes(cleanup.status)?'PASS':'FAIL';await cleanup.body?.cancel();}catch{statuses.signout='FAIL';}
   }else statuses.signout='NOT NEEDED';
   issuedToken=null;await client.auth.stopAutoRefresh().catch(()=>{});if(statuses.signout==='FAIL')statuses.diagnostic='SIGNOUT_NOT_CONFIRMED';
   statuses.overall=['broker','identity','access','profile','uid','active','master','permissions','passwordOnly','signout'].every(key=>statuses[key]==='PASS')?'PASS':'FAIL / NOT VERIFIED';render();copy.disabled=false;
  }
 });
 addEventListener('pagehide',()=>{form.reset();if(issuedToken)nativeFetch(project+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:publishable,Authorization:'Bearer '+issuedToken},keepalive:true,credentials:'omit',redirect:'error',cache:'no-store'}).catch(()=>{});issuedToken=null;});
})();
