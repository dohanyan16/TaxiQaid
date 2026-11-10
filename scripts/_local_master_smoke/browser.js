/** Loopback-only, single-run test. Private values stay in browser memory and approved Supabase requests. */
(()=>{
 'use strict';
 const configuration=globalThis.LOCAL_MASTER_SMOKE;
 const form=document.getElementById('credentials'),output=document.getElementById('results'),summary=document.getElementById('summary'),fields=document.getElementById('private-fields');
 const safeOrigin=location.protocol==='http:'&&location.hostname==='127.0.0.1'&&location.origin===configuration?.localOrigin;
 if(!safeOrigin||globalThis.LOCAL_SMOKE_PRIVACY_READY!==true||configuration?.url!=='https://mqkflwsvnzcaylxtvsje.supabase.co'||!configuration?.key?.startsWith('sb_publishable_')){output.textContent='LOCAL_CONFIGURATION_REJECTED';return;}
 const statuses={},http={},counts={};let sessionToken=null,started=false;
 const allowedPaths=new Map([['/auth/v1/token','authentication'],['/auth/v1/user','identity'],['/auth/v1/logout','signout'],['/functions/v1/get-my-access','access']]);
 const nativeFetch=globalThis.fetch.bind(globalThis);
 async function protectedFetch(input,init={}){
  const target=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  const stage=allowedPaths.get(target.pathname);
  if(target.origin!==configuration.url||!stage||target.username||target.password||[...target.searchParams.keys()].some(key=>!['grant_type','scope'].includes(key))||target.pathname==='/auth/v1/token'&&target.searchParams.get('grant_type')!=='password')throw new Error('REQUEST_REJECTED');
  http[stage]=null;
  const result=await nativeFetch(input,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:init.signal||AbortSignal.timeout(30000)});
  http[stage]=result.status;return result;
 }
 function render(){
  output.replaceChildren();
  const labels={authentication:'Supabase password authentication',identity:'Verified Auth identity',access:'Authenticated Edge Function',database:'Database-backed access data',uid:'Returned UID matches',account:'Active management account',role:'Super Administrator role',permissions:'101 effective management permissions',driver:'Six driver-only actions denied',mfa:'Password-only access accepted (AAL1)',signout:'Automatic sign-out'};
  for(const [key,label]of Object.entries(labels)){
   const item=document.createElement('li');item.textContent=label+': '+(statuses[key]||'NOT RUN');
   const stage=({authentication:'authentication',identity:'identity',access:'access',signout:'signout'})[key];if(stage&&own(http,stage))item.textContent+=' — HTTP '+(http[stage]??'unavailable');
   output.append(item);
  }
  const body={test:'local_master_smoke',...Object.fromEntries(Object.entries(statuses)),http:{...http},counts:{...counts}};
  summary.value=JSON.stringify(body,null,2);
 }
 const own=(object,key)=>Object.hasOwn(object,key);
 function fail(stage,code){statuses[stage]='FAIL';statuses.diagnostic=code;render();throw new Error('SANITIZED_FAILURE');}
 let client;
 try{client=supabase.createClient(configuration.url,configuration.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false,storageKey:'taxiqaid-local-master-smoke'},global:{fetch:protectedFetch}});}catch{output.textContent='SDK_UNAVAILABLE';return;}
 form.addEventListener('submit',event=>{event.preventDefault();run();});
 document.getElementById('run').addEventListener('click',run);
 document.getElementById('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(summary.value);document.getElementById('copy-status').textContent='Sanitized summary copied.';}catch{document.getElementById('copy-status').textContent='Select and copy the sanitized summary manually.';}});
 async function run(){
  if(started)return;
  const emailField=document.getElementById('technical-email'),passwordField=document.getElementById('technical-password');
  let email=emailField.value.trim(),password=passwordField.value;emailField.value='';passwordField.value='';
  if(!email||!password){statuses.diagnostic='ENTER_BOTH_PRIVATE_FIELDS';render();return;}
  delete statuses.diagnostic;started=true;fields.disabled=true;document.getElementById('run').disabled=true;document.getElementById('overall').textContent='Testing. Keep this tab open until sign-out finishes.';
  let phase='authentication',authenticated=false,raw=null;
  try{
   const signedIn=await client.auth.signInWithPassword({email,password});email='';password='';
   authenticated=Boolean(signedIn.data?.session?.access_token);sessionToken=signedIn.data?.session?.access_token||null;
   if(signedIn.error||!authenticated||!signedIn.data?.user?.id)fail('authentication',http.authentication?'AUTHENTICATION_REJECTED':'NETWORK_OR_CORS');
   statuses.authentication='PASS';render();
   phase='identity';const identity=await client.auth.getUser(sessionToken);
   if(identity.error||identity.data?.user?.id!==signedIn.data.user.id)fail('identity',http.identity?'AUTH_IDENTITY_NOT_VERIFIED':'NETWORK_OR_CORS');
   statuses.identity='PASS';const uid=identity.data.user.id;render();
   phase='access';const response=await protectedFetch(configuration.url+'/functions/v1/get-my-access',{method:'GET',headers:{apikey:configuration.key,Authorization:'Bearer '+sessionToken}});
   if(response.status!==200){await response.body?.cancel();fail('access','ACCESS_HTTP_REJECTED');}
   statuses.access='PASS';phase='database';try{raw=await response.json();}catch{fail('database','ACCESS_RESPONSE_UNSUPPORTED');}const checked=TaxiQaidLocalSmokeValidation.inspect(raw,uid);raw=null;
   if(!checked.supported)fail('database','ACCESS_RESPONSE_UNSUPPORTED');
   statuses.uid=checked.uidMatches?'PASS':'FAIL';statuses.account=checked.active&&checked.management?'PASS':'FAIL';statuses.role=checked.master?'PASS':'FAIL';
   counts.management=checked.managementCount;counts.driverDenied=checked.driverDenied;counts.unknownGranted=checked.unknownGranted;
   statuses.permissions=checked.managementCount===101&&checked.unknownGranted===0?'PASS':'FAIL';statuses.driver=checked.driverDenied===6?'PASS':'FAIL';
   statuses.database=checked.accessDataValidated?'PASS (via function response)':'NOT CONFIRMED';render();
   phase='mfa';const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
   statuses.mfa=!assurance.error&&assurance.data?.currentLevel==='aal1'?'PASS':'NOT CONFIRMED';render();
  }catch{
   if(!statuses.diagnostic){statuses[phase]='FAIL';statuses.diagnostic=http[phase]===null?'NETWORK_OR_CORS':'SANITIZED_TEST_FAILURE';}
  }finally{
   email='';password='';raw=null;
   if(authenticated){try{const signedOut=await client.auth.signOut({scope:'local'});statuses.signout=!signedOut.error&&[200,204].includes(http.signout)?'PASS':'FAIL';if(statuses.signout==='FAIL')statuses.diagnostic='SIGNOUT_NOT_CONFIRMED';}catch{statuses.signout='FAIL';statuses.diagnostic='SIGNOUT_NOT_CONFIRMED';}}
   else statuses.signout='NOT NEEDED (no session obtained)';
   sessionToken=null;await client.auth.stopAutoRefresh().catch(()=>{});
   const required=['authentication','identity','access','uid','account','role','permissions','driver','mfa','signout'];
   const passed=required.every(key=>statuses[key]==='PASS')&&statuses.database==='PASS (via function response)';
   statuses.overall=passed?'PASS':'FAIL / NOT VERIFIED';render();document.getElementById('overall').textContent='Test '+statuses.overall+'. Close this tab and stop the local server when finished.';
   document.getElementById('copy').disabled=false;
  }
 }
 // Best-effort cleanup if the owner closes a tab during an established session; normal completion awaits sign-out.
 addEventListener('pagehide',()=>{form.reset();if(sessionToken)nativeFetch(configuration.url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:configuration.key,Authorization:'Bearer '+sessionToken},credentials:'omit',redirect:'error',cache:'no-store',keepalive:true}).catch(()=>{});sessionToken=null;});
 fields.disabled=false;render();
})();
