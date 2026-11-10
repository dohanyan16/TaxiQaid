/** Dependency-injected handlers are testable without creating users or contacting an Auth project. */
import {response,originFor,readCredentials,bucket,FAILURE,safeTokenSession} from './security.mjs';
export function createLoginHandler(deps){
 return async request=>{
  const origin=originFor(request,deps.origins);if(!origin)return response(403,{error:FAILURE});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin','Cache-Control':'no-store'}});
  const started=Date.now();let signedIn=false;
  try{
   if(!deps.ready||new URL(request.url).search)throw new Error('not-ready');
   const input=await readCredentials(request);
   const clientIp=deps.clientIp(request);if(!clientIp)throw new Error('untrusted-client-address');
   const keys=await Promise.all([bucket(deps.rateSecret,'ip:'+clientIp),bucket(deps.rateSecret,'account:'+input.identifier),bucket(deps.rateSecret,'global')]);
   if(!await deps.consume(keys))return response(429,{error:FAILURE},origin);
   const account=await deps.resolve(input.identifier);
   const email=account?.email||'unavailable-'+await bucket(deps.rateSecret,input.identifier)+'@invalid.example';
   const result=await deps.passwordSignIn(email,input.password);
   signedIn=Boolean(result?.session);
   if(!result?.user?.id||!account||result.user.id!==account.uid||account.status!=='active')throw new Error('credentials');
   await deps.loadAccess(result.user.id);
   const body=safeTokenSession(result.session);signedIn=false;
   return response(200,body,origin);
  }catch{
   if(signedIn)try{await deps.signOut();}catch{}
   return response(deps.ready?401:503,{error:FAILURE},origin);
  }finally{
   // A minimum response duration reduces obvious timing differences; rate limiting is still mandatory.
   const remaining=350+crypto.getRandomValues(new Uint8Array(1))[0]- (Date.now()-started);
   if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
  }
 };
}
export function createAccessHandler(deps){
 return async(request,verifiedUid)=>{
  const origin=originFor(request,deps.origins);if(!origin)return response(403,{error:'Access unavailable.'});
  if(request.method!=='GET'||new URL(request.url).search)return response(400,{error:'Access unavailable.'},origin);
  if(!verifiedUid)return response(401,{error:'Access unavailable.'},origin);
  try{return response(200,await deps.loadAccess(verifiedUid),origin);}catch{return response(403,{error:'Access unavailable.'},origin);}
 };
}
