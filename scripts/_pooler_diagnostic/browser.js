/** Private, one-run administrator diagnostic. No connection secret, account response or token is rendered. */
(()=>{
 'use strict';
 const project='https://mqkflwsvnzcaylxtvsje.supabase.co',key='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
 if(location.origin!==project||!/^\/functions\/v1\/check-broker-pooler\/?$/.test(location.pathname)||globalThis.TAXIQAID_POOLER_DIAGNOSTIC_RUNNING)return;
 Object.defineProperty(globalThis,'TAXIQAID_POOLER_DIAGNOSTIC_RUNNING',{value:true});
 const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
 const main=el('main'),form=el('form'),email=el('input'),password=el('input'),run=el('button','Run Once and Sign Out'),output=el('pre'),summary=el('textarea'),copy=el('button','Copy PASS/FAIL Summary');
 email.id='pooler-email';email.type='password';email.inputMode='email';email.autocomplete='off';email.autocapitalize='none';email.spellcheck=false;password.id='pooler-password';password.type='password';password.autocomplete='off';
 const emailLabel=el('label','Existing administrator Auth email (masked)'),passwordLabel=el('label','Existing password');emailLabel.htmlFor=email.id;passwordLabel.htmlFor=password.id;
 run.type='submit';copy.type='button';copy.disabled=true;form.autocomplete='off';summary.id='pooler-summary';summary.rows=20;summary.readOnly=true;summary.spellcheck=false;output.id='pooler-result';output.textContent='READY';
 form.append(emailLabel,el('br'),email,el('br'),passwordLabel,el('br'),password,el('br'),run);main.append(el('h1','TaxiQaid Private Pooler Diagnostic'),el('p','Temporary technical test. Both inputs are masked. Keep this tab open until automatic sign-out finishes.'),form,output,summary,el('br'),copy);document.body.replaceChildren(main);
 const result={browser_authentication:'FAIL',...Object.fromEntries(POOLER_CHECKS.map(name=>[name,'FAIL'])),sign_out:'FAIL'};
 let started=false,issuedToken=null,lastLogout=null;
 const originalFetch=globalThis.fetch.bind(globalThis);
 async function guardedFetch(input,init={}){
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(url.origin!==project||url.username||url.password||!['/auth/v1/token','/auth/v1/user','/auth/v1/logout','/functions/v1/check-broker-pooler'].includes(url.pathname)||[...url.searchParams.keys()].some(name=>!['scope','grant_type'].includes(name))||url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')!=='password')throw new Error('REQUEST_REJECTED');
  if(url.pathname==='/auth/v1/logout')lastLogout=null;
  const response=await originalFetch(input,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:init.signal||AbortSignal.timeout(30000)});
  if(url.pathname==='/auth/v1/logout')lastLogout=response.status;return response;
 }
 const client=supabase.createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:guardedFetch}});
 const render=()=>{summary.value=JSON.stringify(result,null,2);output.textContent=result.overall;};
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(summary.value);}catch{summary.focus();summary.select();}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(started)return;let privateEmail=email.value.trim(),privatePassword=password.value;email.value='';password.value='';
  if(!privateEmail||!privatePassword){render();return;}started=true;run.disabled=true;email.disabled=true;password.disabled=true;
  try{
   const signedIn=await client.auth.signInWithPassword({email:privateEmail,password:privatePassword});privateEmail='';privatePassword='';issuedToken=signedIn.data?.session?.access_token||null;
   if(signedIn.error||!issuedToken)throw new Error('AUTH_FAILED');result.browser_authentication='PASS';
   const response=await guardedFetch(project+'/functions/v1/check-broker-pooler',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+issuedToken,'Content-Type':'application/json'},body:'{}'});
   let checked;try{checked=await response.json();}catch{throw new Error('RESULT_REJECTED');}
   if(!checked||typeof checked!=='object'||Array.isArray(checked)||Object.keys(checked).length!==POOLER_CHECKS.length||!POOLER_CHECKS.every(name=>Object.hasOwn(checked,name)&&['PASS','FAIL'].includes(checked[name])))throw new Error('RESULT_REJECTED');
   for(const name of POOLER_CHECKS)result[name]=checked[name];
   if(response.status!==200)result.overall='FAIL';
  }catch{result.overall='FAIL';}
  finally{
   privateEmail='';privatePassword='';
   if(issuedToken){
    try{const signedOut=await client.auth.signOut({scope:'local'});result.sign_out=!signedOut.error&&[200,204].includes(lastLogout)?'PASS':'FAIL';}catch{result.sign_out='FAIL';}
    if(result.sign_out!=='PASS')try{const logout=await guardedFetch(project+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+issuedToken}});result.sign_out=[200,204].includes(logout.status)?'PASS':'FAIL';await logout.body?.cancel();}catch{result.sign_out='FAIL';}
   }else result.sign_out='PASS';
   issuedToken=null;await client.auth.stopAutoRefresh().catch(()=>{});
   result.overall=Object.entries(result).filter(([name])=>name!=='overall').every(([,value])=>value==='PASS')?'PASS':'FAIL';render();copy.disabled=false;
  }
 });
 addEventListener('pagehide',()=>{form.reset();if(issuedToken)originalFetch(project+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+issuedToken},keepalive:true,credentials:'omit',redirect:'error',cache:'no-store'}).catch(()=>{});issuedToken=null;});
})();
