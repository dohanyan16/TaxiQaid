/** Proposal only. Single purpose public gateway; never a general proxy or credential logger. */
import {GATEWAY_TARGET,GATEWAY_PATH,canonicalGatewayIp,gatewayBody,signGateway} from '../supabase/functions/_shared/gateway-proof.mjs';
function workerOrigins(value){return String(value||'').split(',').map(x=>x.trim()).filter(x=>{try{return new URL(x).origin===x&&x.startsWith('https://');}catch{return false;}});}
function workerReply(status,body,origin){return new Response(status===204?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',Pragma:'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; connect-src 'self' https://mqkflwsvnzcaylxtvsje.supabase.co; form-action 'none'; frame-ancestors 'none'",Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})}});}
export function createGateway(fetcher=fetch,now=Date.now){return async(request,env)=>{
 const url=new URL(request.url),origin=request.headers.get('origin'),approved=workerOrigins(env.TAXIQAID_GATEWAY_ORIGINS).includes(origin)?origin:null,error={error:'Unable to sign in. Check your credentials or contact your administrator.'};
 if(url.protocol!=='https:'||url.pathname!==GATEWAY_PATH||url.search||url.origin!==env.TAXIQAID_GATEWAY_ORIGIN)return workerReply(403,error);
 if(request.method==='GET')return workerReply(405,error); // A harmless same-origin document for the private browser Snippet.
 if(!approved)return workerReply(403,error);
 if(request.method==='OPTIONS')return workerReply(204,null,approved);
 if(env.TAXIQAID_GATEWAY_ENABLED!=='true'||request.method!=='POST')return workerReply(503,error,approved);
 // Only direct Cloudflare ingress. Block Worker subrequests, service bindings and ambiguous proxy provenance.
 const ip=canonicalGatewayIp(request.headers.get('cf-connecting-ip'));
 if(!request.cf||request.headers.has('cf-worker')||request.headers.has('cf-ew-via')||!ip||ip==='2a06:98c0:3600::103')return workerReply(403,error,approved);
 try{
  const body=await gatewayBody(request),proof={ip,origin:approved,issued:Math.floor(now()/1000),nonce:crypto.randomUUID().replaceAll('-','')},mac=await signGateway(env.TAXIQAID_GATEWAY_SECRET,proof,body);
  const upstream=await fetcher(GATEWAY_TARGET,{method:'POST',headers:{'Content-Type':'application/json',Origin:approved,'x-taxiqaid-ip':ip,'x-taxiqaid-issued':String(proof.issued),'x-taxiqaid-nonce':proof.nonce,'x-taxiqaid-mac':mac},body,credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(upstream.status!==200){await upstream.body?.cancel();return workerReply([401,403,429,503].includes(upstream.status)?upstream.status:503,error,approved);}
  const raw=await upstream.json();if(typeof raw?.access_token!=='string'||!raw.access_token||raw.access_token.length>16384||typeof raw.refresh_token!=='string'||!raw.refresh_token||raw.refresh_token.length>4096)throw new Error('REJECTED');
  // Only the official session whitelist is public; never forward upstream errors, debug fields or proof headers.
  return workerReply(200,{access_token:raw.access_token,refresh_token:raw.refresh_token,token_type:'bearer',...(Number.isFinite(raw.expires_in)&&raw.expires_in>0?{expires_in:raw.expires_in}:{})},approved);
 }catch{return workerReply(503,error,approved);}
};}
export default {fetch:createGateway()};
