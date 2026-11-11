/** Official Supabase sessions plus uncached, UID-bound access. No private-table queries or custom tokens. */
const TaxiQaidAuthClient=(()=>{
 const contract=typeof TaxiQaidAuthContract!=='undefined'?TaxiQaidAuthContract:require('./auth-contract.js');
 function create({client,url,key,enabled=false,fetcher=fetch,onAccess=()=>{},onClear=()=>{},now=Date.now}){
  let generation=0,loggingIn=false,subscription=null,timer=null,context=null,pending=null;
  const generic=()=>new Error('Unable to sign in. Check your credentials or contact your administrator.');
  async function request(path,{token,body}={}){
   const response=await fetcher(url+'/functions/v1/'+path,{method:body?'POST':'GET',headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw generic();return response.json();
  }
  function clear(){generation++;context=null;pending=null;onClear();}
  async function discard(){clear();try{await client.auth.signOut({scope:'local'});}catch{}}
  async function refresh(){
   if(!enabled){clear();throw new Error('Dedicated authentication is not activated. Secure broker validation is pending.');}
   if(pending)return pending;const current=++generation;if(!context||context.expiresAt<=now()){context=null;onClear();}
   const task=(async()=>{
    const {data,error}=await client.auth.getSession();if(error||!data?.session?.access_token)throw generic();
    const session=data.session,{data:identity,error:identityError}=await client.auth.getUser();if(identityError||!identity?.user?.id)throw generic();
    if(context&&context.uid!==identity.user.id){context=null;onClear();}
    const response=await request('get-my-access',{token:session.access_token});
    const next=contract.access(response,identity.user.id,session.expires_at,now());
    if(current!==generation)throw generic();context=next;onAccess(next,{user:{id:identity.user.id}});return next;
   })();pending=task;
   try{return await task;}catch{if(current===generation)await discard();throw generic();}finally{if(pending===task)pending=null;}
  }
  async function login(identifier,password){
   const input=contract.credentials(identifier,password);
   if(!enabled)throw new Error('Dedicated authentication is not activated. Secure broker validation is pending.');
   if(/^\d{10}$/.test(input.identifier))throw new Error('Driver sign-in is unavailable until secure account provisioning is complete.');
   if(loggingIn)throw generic();loggingIn=true;clear();const attemptGeneration=generation;
   try{
    const result=await request('login-with-identifier',{body:input});
    if(typeof result.access_token!=='string'||typeof result.refresh_token!=='string')throw generic();
    const {error}=await client.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});if(error||generation!==attemptGeneration)throw generic();
    return await refresh();
   }catch(error){await discard();throw error.message.startsWith('Dedicated authentication')?error:generic();}finally{loggingIn=false;}
  }
  async function start(){
   subscription=client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'){clear();return;}
    if(!enabled)return;
    if(['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)&&!loggingIn){if(session?.user?.id&&context&&session.user.id!==context.uid)clear();queueMicrotask(()=>refresh().catch(()=>{}));}
   }).data.subscription;
   timer=setInterval(()=>{if(context)refresh().catch(()=>{});},30000);
   if(!enabled){clear();return null;}
   try{return await refresh();}catch{return null;}
  }
  return Object.freeze({login,refresh,start,logout:discard,getContext:()=>context&&context.expiresAt>now()?structuredClone(context):null,destroy(){clearInterval(timer);subscription?.unsubscribe();clear();}});
 }
 return Object.freeze({create});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidAuthClient;
