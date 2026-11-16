/** Official SDK sessions and UID-bound access. Logout fences late work before touching the network. */
const TaxiQaidAuthClient=(()=>{
 const contract=typeof TaxiQaidAuthContract!=='undefined'?TaxiQaidAuthContract:require('./auth-contract.js');
 function create({client,url,key,brokerUrl=null,enabled=false,accountType=null,fetcher=fetch,onAccess=()=>{},onClear=()=>{},onCleanup=()=>{},now=Date.now}){
  if(brokerUrl!==null){const target=new URL(brokerUrl);if(target.protocol!=='https:'||!target.hostname.endsWith('.workers.dev')||target.username||target.password||target.port||target.pathname!=='/login-with-identifier'||target.search||target.hash)throw new Error('Invalid authentication gateway configuration.');}
  if(enabled&&!brokerUrl)throw new Error('The signed authentication gateway must be configured before activation.');
  let generation=0,loggingIn=false,subscription=null,timer=null,leaseTimer=null,context=null,pending=null,cleanupTask=null,started=false,destroyed=false,acceptSession=true;
  let cleanupState={localCleared:true,remoteRevoked:null},sessionRevision=0,cleanupRevision=-1,brokerPending=false;
  const generic=()=>new Error('Unable to sign in. Check your credentials or contact your administrator.');
  const cleanupMessage='TaxiQaid is locked. Session cleanup could not be confirmed. Close this tab and contact your administrator.';
  async function request(path,{token,body}={}){
   let response;try{response=await fetcher(path==='login-with-identifier'?brokerUrl:url+'/functions/v1/'+path,{method:body?'POST':'GET',headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});}catch{const error=generic();error.transportUncertain=path==='login-with-identifier';throw error;}
   if(!response.ok)throw generic();try{return await response.json();}catch{const error=generic();error.transportUncertain=path==='login-with-identifier';throw error;}
  }
  function clear(){generation++;context=null;pending=null;clearTimeout(leaseTimer);leaseTimer=null;try{onClear();}catch{/* Internal authority is cleared even if rendering fails. */}}
  async function stopRefresh(){try{await client.auth.stopAutoRefresh?.();}catch{/* Authority is already cleared; cleanup remains explicit below. */}}
  async function discard(){
   acceptSession=false;clear();if(cleanupTask)return cleanupTask;
   if(cleanupRevision===sessionRevision)return {...cleanupState};
   const revision=sessionRevision,pendingLogin=brokerPending;
   const task=(async()=>{
    await stopRefresh();let remoteRevoked=false,localCleared=false;
    try{const result=await client.auth.signOut({scope:'local'});remoteRevoked=Boolean(result&&Object.hasOwn(result,'error')&&!result.error&&!pendingLogin);}catch{/* Never expose provider errors. */}
    await stopRefresh();
    try{const result=await client.auth.getSession();localCleared=!result.error&&!result.data?.session;}catch{/* Do not claim local cleanup from a failed read. */}
    cleanupRevision=revision;cleanupState={localCleared,remoteRevoked};try{onCleanup({...cleanupState});}catch{/* A rendering callback cannot undo the logout fence. */}
    return {...cleanupState};
   })();cleanupTask=task;
   try{return await task;}finally{if(cleanupTask===task)cleanupTask=null;}
  }
  function armLease(){
   clearTimeout(leaseTimer);const snapshot=context;
   leaseTimer=setTimeout(()=>{if(context!==snapshot||!snapshot)return;if(snapshot.expiresAt>now()){armLease();return;}void discard();},Math.max(1,context.expiresAt-now()+1));
   leaseTimer.unref?.();
  }
  async function refresh(){
   if(!enabled||destroyed||!acceptSession){if(!enabled)clear();throw new Error(!enabled?'Dedicated authentication is not activated. Secure broker validation is pending.':'No active authorized session.');}
   if(pending)return pending;const current=++generation;
   const task=(async()=>{
    const {data,error}=await client.auth.getSession();if(error||!data?.session?.access_token)throw generic();
    const session=data.session,{data:identity,error:identityError}=await client.auth.getUser();if(identityError||!identity?.user?.id)throw generic();
    const response=await request('get-my-access',{token:session.access_token});
    const next=contract.access(response,identity.user.id,session.expires_at,now());
    if(accountType&&next.accountType!==accountType)throw generic();
    if(current!==generation||!acceptSession||destroyed)throw generic();
    if(cleanupState.localCleared){sessionRevision++;cleanupState={localCleared:false,remoteRevoked:null};}
    context=next;armLease();onAccess(next,{user:{id:identity.user.id}});return next;
   })();pending=task;
   try{return await task;}catch{if(current===generation)await discard();throw generic();}finally{if(pending===task)pending=null;}
  }
  async function login(identifier,password){
   const input=contract.credentials(identifier,password);
   if(!enabled)throw new Error('Dedicated authentication is not activated. Secure broker validation is pending.');
   if(/^\d{10}$/.test(input.identifier))throw new Error('Driver sign-in is unavailable until secure account provisioning is complete.');
   if(loggingIn||destroyed||context)throw generic();loggingIn=true;
   try{
    if(pending)try{await pending;}catch{}
    if(cleanupTask)await cleanupTask;
    if(cleanupState.localCleared===false||cleanupState.remoteRevoked===false)throw new Error(cleanupMessage);
    clear();acceptSession=true;const attemptGeneration=generation;
    let result;brokerPending=true;try{result=await request('login-with-identifier',{body:input});}finally{brokerPending=false;input.password='';}
    if(typeof result?.access_token!=='string'||!result.access_token||result.access_token.length>16384||typeof result.refresh_token!=='string'||!result.refresh_token||result.refresh_token.length>4096){const error=generic();error.transportUncertain=true;throw error;}
    if(attemptGeneration!==generation||!acceptSession||destroyed){
     // Retire a cancelled late success through the SDK without granting UI access.
     if(cleanupTask)await cleanupTask;
     sessionRevision++;cleanupState={localCleared:false,remoteRevoked:null};
     try{await client.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});}finally{await discard();}
     throw generic();
    }
    sessionRevision++;cleanupState={localCleared:false,remoteRevoked:null};
    const {error}=await client.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});
    if(error||attemptGeneration!==generation||!acceptSession||destroyed)throw generic();
    const next=await refresh();if(acceptSession&&!destroyed)await client.auth.startAutoRefresh?.();return next;
   }catch(error){await discard();if(error?.transportUncertain){cleanupState={...cleanupState,remoteRevoked:false};try{onCleanup({...cleanupState});}catch{}}throw error?.message===cleanupMessage?new Error(cleanupMessage):generic();}
   finally{input.password='';loggingIn=false;}
  }
  async function start(){
   if(started||destroyed)return context;started=true;
   subscription=client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'){acceptSession=false;clear();return;}
    if(!enabled||!acceptSession||destroyed||cleanupTask)return;
    if(['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)&&!loggingIn){if(session?.user?.id&&context&&session.user.id!==context.uid){void discard();return;}queueMicrotask(()=>refresh().catch(()=>{}));}
   }).data.subscription;
   timer=setInterval(()=>{if(context&&acceptSession)refresh().catch(()=>{});},30000);timer.unref?.();
   if(!enabled){acceptSession=false;clear();return null;}
   try{return await refresh();}catch{return null;}
  }
  return Object.freeze({login,refresh,start,logout:discard,getCleanupState:()=>({...cleanupState}),getContext:()=>context&&context.expiresAt>now()?structuredClone(context):null,
   destroy(){destroyed=true;acceptSession=false;clearInterval(timer);subscription?.unsubscribe();clear();void stopRefresh();}});
 }
 return Object.freeze({create});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidAuthClient;
