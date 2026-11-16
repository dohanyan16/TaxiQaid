/** One private bootstrap session, six bounded controls, automatic sign-out. No public login. */
(()=>{
 'use strict';
 const origin='REPLACE_WITH_REVIEWED_WORKER_ORIGIN',project=VALIDATION_PROJECT,key=VALIDATION_KEY;
 if(location.origin!==origin||location.pathname!=='/login-with-identifier'||location.search||location.hash||globalThis.TAXIQAID_VALIDATION_RUNNING)return;
 Object.defineProperty(globalThis,'TAXIQAID_VALIDATION_RUNNING',{value:true});
 const node=(tag,text)=>{const value=document.createElement(tag);if(text)value.textContent=text;return value;};
 const form=node('form'),email=node('input'),password=node('input'),run=node('button','Run Approved Checks Once'),output=node('pre'),summary=node('textarea'),copy=node('button','Copy Sanitized Summary');
 email.id='validation-email';email.type='password';email.autocomplete='off';email.spellcheck=false;password.id='validation-password';password.type='password';password.autocomplete='off';run.type='submit';copy.type='button';copy.disabled=true;summary.id='validation-summary';summary.readOnly=true;summary.rows=24;output.id='validation-status';output.textContent='READY';
 const emailLabel=node('label','Existing owner Auth email (masked, temporary administrator bootstrap)'),passwordLabel=node('label','Existing password');emailLabel.htmlFor=email.id;passwordLabel.htmlFor=password.id;
 form.autocomplete='off';form.append(emailLabel,node('br'),email,node('br'),passwordLabel,node('br'),password,node('br'),run);
 const main=node('main');main.append(node('h1','TaxiQaid Protected Admission Checks'),node('p','Both public gates must stay false. Keep this tab open for approximately four minutes, until automatic sign-out finishes. No Master username login is performed by these checks.'),form,output,summary,node('br'),copy);document.body.replaceChildren(main);
 const report={bootstrap:'NOT_RUN',cases:{},cleanup:'NOT_RUN',result:'NOT_RUN',http:{bootstrap:0,control:0,logout:0},maximumHttpIncludingServerCalls:29};
 let started=false,token=null,lastLogout=null,bootstrapStatus=null;const used=new Set(),nativeFetch=globalThis.fetch.bind(globalThis);
 function render(){summary.value=JSON.stringify(report,null,2);output.textContent=report.result;}
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(summary.value);}catch{summary.focus();summary.select();}});
 async function guardedFetch(input,init={}){
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url),headers=new Headers(init.headers),method=init.method||'GET';
  let stage;
  if(url.origin===project&&url.pathname==='/auth/v1/token'&&url.search==='?grant_type=password'&&method==='POST')stage='bootstrap';
  else if(url.origin===project&&url.pathname==='/auth/v1/logout'&&['','?scope=local'].includes(url.search)&&method==='POST')stage='logout';
  else if(url.origin===origin&&url.pathname===VALIDATION_PATH&&!url.search&&method==='POST')stage='control';
  else throw new Error('DENIED');
  if(url.username||url.password||url.hash||report.http[stage]>={bootstrap:1,control:6,logout:2}[stage])throw new Error('DENIED');
  report.http[stage]++;if(stage==='logout')lastLogout=null;
  const reply=await nativeFetch(input,{...init,headers,credentials:'omit',redirect:'error',cache:'no-store',signal:init.signal||AbortSignal.timeout(stage==='control'?35000:15000)});
  if(stage==='logout')lastLogout=reply.status;if(stage==='bootstrap')bootstrapStatus=reply.status;return reply;
 }
 const client=supabase.createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:guardedFetch}});
 const wait=async milliseconds=>{if(milliseconds>0){report.result='WAITING_FOR_SAFE_WINDOW';render();await new Promise(resolve=>setTimeout(resolve,milliseconds));}};
 const nextMinute=()=>wait(62000-Date.now()%60000);
 async function control(caseId,spoof=false){
  if(used.has(caseId))throw new Error('DENIED');used.add(caseId);report.result='RUNNING';render();
  // Leave CF-Connecting-IP to Cloudflare ingress: supplying it can trigger edge error 1000.
  const response=await guardedFetch(origin+VALIDATION_PATH,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(spoof?{'x-real-ip':'198.51.100.42','x-forwarded-for':'198.51.100.43','x-taxiqaid-ip':'198.51.100.44'}:{})},body:JSON.stringify({case:caseId})});
  if(response.status!==200){await response.body?.cancel();report.cases[caseId]={result:'FAIL',http:response.status};throw new Error('DENIED');}
  const value=safeValidationResult(await response.json());if(value.case!==caseId||value.expiresAt*1000<=Date.now())throw new Error('DENIED');report.cases[caseId]=value;render();if(value.result!=='PASS')throw new Error('DENIED');return value;
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(started)return;let privateEmail=email.value.trim(),privatePassword=password.value;email.value='';password.value='';if(!privateEmail||!privatePassword)return;
  started=true;run.disabled=true;email.disabled=true;password.disabled=true;report.result='RUNNING';render();
  try{
   const session=await client.auth.signInWithPassword({email:privateEmail,password:privatePassword});privateEmail='';privatePassword='';token=session.data?.session?.access_token||null;
   if(session.error||!token)throw new Error('DENIED');report.bootstrap='PASS';
   // A shared identifier window must survive all four batches. No polling or Auth refresh.
   if(Math.floor(Date.now()/60000)%15>10)await wait(902000-Date.now()%900000);
   await nextMinute();const ipBase=await control('ip-base'),ipSpoof=await control('ip-spoof',true);
   if(ipBase.dbMinute!==ipSpoof.dbMinute)throw new Error('WINDOW_CHANGED');
   await nextMinute();await control('global-db');
   await nextMinute();const replay=await control('replay'),identifierBase=await control('identifier-base');
   if(replay.dbMinute!==identifierBase.dbMinute)throw new Error('WINDOW_CHANGED');
   await nextMinute();const identifierFinish=await control('identifier-finish');
   if(identifierBase.dbQuarter!==identifierFinish.dbQuarter||identifierBase.dbMinute>=identifierFinish.dbMinute)throw new Error('WINDOW_CHANGED');
   report.result='PASS';
  }catch{report.result='FAIL_OR_INCONCLUSIVE';}
  finally{
   privateEmail='';privatePassword='';
   if(token){
    try{const closed=await client.auth.signOut({scope:'local'});report.cleanup=!closed.error&&[200,204].includes(lastLogout)?'PASS':'FAIL';}catch{report.cleanup='FAIL';}
    if(report.cleanup!=='PASS')try{const closed=await guardedFetch(project+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token}});report.cleanup=[200,204].includes(closed.status)?'PASS':'FAIL';await closed.body?.cancel();}catch{report.cleanup='FAIL';}
   }else report.cleanup=bootstrapStatus!==null&&bootstrapStatus>=400?'NOT_NEEDED':'UNCONFIRMED';
   token=null;await client.auth.stopAutoRefresh().catch(()=>{});try{if((await client.auth.getSession()).data.session)report.cleanup='FAIL';}catch{report.cleanup='FAIL';}
   if(['FAIL','UNCONFIRMED'].includes(report.cleanup))report.result='FAIL_OR_INCONCLUSIVE';render();copy.disabled=false;
  }
 });
 addEventListener('pagehide',()=>{form.reset();if(token)guardedFetch(project+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token},keepalive:true}).catch(()=>{});token=null;});
})();
