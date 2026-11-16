/** Owner-only control plane; no public login, password verification, signer API or arbitrary target. */
import {GATEWAY_TARGET,gatewaySource,signGateway} from '../supabase/functions/_shared/gateway-proof.mjs';
import {VALIDATION_PATH,VALIDATION_HEADER,VALIDATION_PROJECT,VALIDATION_KEY,validationGrant,validationToken,validationCase,signValidation,safeValidationResult,grantText} from '../supabase/functions/_shared/validation-policy.mjs';
function validationReply(status,result){return Response.json(result,{status,headers:{'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}});}
/** @param {typeof fetch} [fetcher] @param {()=>number} [now] */
export function createValidationGateway(fetcher=fetch,now=Date.now){return async(request,env)=>{
 let grant,token,caseId,ip;
 try{
  const url=new URL(request.url);if(url.protocol!=='https:'||url.origin!==env.TAXIQAID_GATEWAY_ORIGIN||url.pathname!==VALIDATION_PATH||url.search||request.headers.get('origin')!==url.origin||env.TAXIQAID_GATEWAY_ENABLED!=='false')throw new Error('DENIED');
  grant=validationGrant(env.TAXIQAID_VALIDATION_GRANT,now());token=validationToken(request);ip=gatewaySource(request);if(!grant||!token||!ip)throw new Error('DENIED');caseId=await validationCase(request);
  const reply=await fetcher(VALIDATION_PROJECT+'/auth/v1/user',{method:'GET',headers:{apikey:VALIDATION_KEY,Authorization:'Bearer '+token},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(reply.status!==200){await reply.body?.cancel();throw new Error('DENIED');}const user=await reply.json();if(user.id!==grant.ownerUid||user.aud!=='authenticated'||user.role!=='authenticated'||user.is_anonymous===true)throw new Error('DENIED');
  const current=validationGrant(env.TAXIQAID_VALIDATION_GRANT,now());if(!current||grantText(current)!==grantText(grant))throw new Error('DENIED');
  const body=new TextEncoder().encode(JSON.stringify({case:caseId})),proof={ip,origin:url.origin,issued:Math.floor(now()/1000),nonce:crypto.randomUUID().replaceAll('-',''),trace:crypto.randomUUID()},mac=await signGateway(env.TAXIQAID_GATEWAY_SECRET,proof,body);
  const upstream=await fetcher(GATEWAY_TARGET,{method:'POST',headers:{Origin:url.origin,'Content-Type':'application/json',Authorization:'Bearer '+token,'x-taxiqaid-ip':ip,'x-taxiqaid-issued':String(proof.issued),'x-taxiqaid-nonce':proof.nonce,'x-taxiqaid-trace':proof.trace,'x-taxiqaid-mac':mac,[VALIDATION_HEADER]:await signValidation(env.TAXIQAID_GATEWAY_SECRET,grant,token,mac)},body,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(upstream.status!==200){await upstream.body?.cancel();return validationReply(503,{result:'FAIL'});}const result=safeValidationResult(await upstream.json());if(result.case!==caseId||!validationGrant(env.TAXIQAID_VALIDATION_GRANT,now()))throw new Error('DENIED');return validationReply(200,result);
 }catch{return validationReply(403,{result:'FAIL'});}
};}
