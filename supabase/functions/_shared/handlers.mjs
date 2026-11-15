/** Dependency-injected handlers. The SQL attempt API consumes counters before any private lookup. */
import {response,originFor,readCredentials,bucket,FAILURE,safeTokenSession} from './security.mjs';
export function createLoginHandler(deps){
 return async request=>{
  const origin=originFor(request,deps.origins);if(!origin)return response(403,{error:FAILURE});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin','Cache-Control':'no-store'}});
  const started=Date.now();let signedIn=false,phase='configuration';
  const audit=(event,status)=>{try{deps.audit?.(event,status);}catch{/* A diagnostic sink never changes authorization. */}};
  try{
   if(!deps.ready||new URL(request.url).search)throw new Error('not-ready');
   phase='input';const input=await readCredentials(request);
   phase='configuration';const clientIp=deps.clientIp(request);if(!clientIp)throw new Error('untrusted-client-address');
   const keys=await Promise.all([bucket(deps.rateSecret,'v1:ip:'+clientIp),bucket(deps.rateSecret,'v1:account:'+input.identifier),bucket(deps.rateSecret,'v1:global')]);
   phase='database';const attempt=await deps.beginAttempt(input.identifier,keys);
   if(!attempt||typeof attempt.allowed!=='boolean')throw new Error('attempt');
   if(!attempt.allowed){audit('ADMISSION_DENIED',429);return response(429,{error:FAILURE},origin);}
   audit('ADMISSION_ALLOWED',200);
   const account=attempt.account;
   if(account&&(typeof account.mappingRevision!=='string'||!/^[1-9][0-9]{0,18}$/.test(account.mappingRevision)||BigInt(account.mappingRevision)>9223372036854775807n))throw new Error('mapping-not-verified');
   // Reserved .invalid domain is a server-only timing equalizer, never a provisioned identity or browser mapping.
   phase='auth';const result=await deps.passwordSignIn(account?.email||'unavailable@taxiqaid.invalid',input.password);input.password='';
   signedIn=Boolean(result?.session);
   if(result?.error){const status=Number(result.error.status),http=status===429?429:status>=500||status===0?503:401;audit(http===429?'AUTH_THROTTLED':http===503?'AUTH_UNAVAILABLE':'AUTH_REJECTED',http);return response(http,{error:FAILURE},origin);}
   phase='credentials';
   if(!result?.user?.id||!account||result.user.id!==account.uid||account.status!=='active'||!signedIn)throw new Error('credentials');
   phase='database';const access=await deps.loadAccess(result.user.id,account.mappingRevision);
   if(access?.uid!==account.uid||access.account?.status!=='active'||access.account?.type!=='management')throw new Error('access');
   phase='session';const body=safeTokenSession(result.session);const outgoing=response(200,body,origin);audit('SESSION_ISSUED',200);signedIn=false;return outgoing;
  }catch{
   const http=['configuration','database','auth','session'].includes(phase)?503:401;
   audit(phase==='input'?'INPUT_REJECTED':phase==='database'?'DATABASE_UNAVAILABLE':phase==='access'?'ACCESS_REJECTED':phase==='credentials'?'IDENTITY_REJECTED':'AUTH_UNAVAILABLE',http);
   return response(http,{error:FAILURE},origin);
  }finally{
   if(signedIn)try{const result=await deps.signOut();audit(result?.error?'SESSION_CLEANUP_UNCONFIRMED':'SESSION_CLEANUP_CONFIRMED',result?.error?503:200);}catch{audit('SESSION_CLEANUP_UNCONFIRMED',503);}
   // This is timing padding, not a constant-time or anti-enumeration proof.
   const remaining=350+crypto.getRandomValues(new Uint8Array(1))[0]-(Date.now()-started);
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
