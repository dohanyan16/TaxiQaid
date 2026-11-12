// GENERATED REVIEW ONLY. No secrets, deployment or activation.
/** Review-only authenticated gateway transport. IP headers alone never authorize the Supabase origin. */
const GATEWAY_TARGET='https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/login-with-identifier';
const GATEWAY_PATH='/login-with-identifier';
function canonicalGatewayIp(value){
 if(typeof value!=='string'||value.length>64)return null;
 if(/^(0|[1-9][0-9]{0,2})(\.(0|[1-9][0-9]{0,2})){3}$/.test(value))return value.split('.').every(x=>Number(x)<=255)?value:null;
 if(!/^[0-9a-fA-F:.]+$/.test(value)||!value.includes(':'))return null;
 try{const ip=new URL('http://['+value+']/').hostname.slice(1,-1),mapped=ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);return mapped?[parseInt(mapped[1],16)>>8,parseInt(mapped[1],16)&255,parseInt(mapped[2],16)>>8,parseInt(mapped[2],16)&255].join('.'):ip;}catch{return null;}
}
async function gatewayBody(request){
 if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>4096)throw new Error('REJECTED');
 const reader=request.body?.getReader();if(!reader)throw new Error('REJECTED');let bytes=[],size=0,timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('REJECTED'));reader.cancel().catch(()=>{});},2000);});
 try{for(;;){const {value,done}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.length;if(size>4096)throw new Error('REJECTED');bytes.push(value);}const result=new Uint8Array(size);let offset=0;for(const part of bytes){result.set(part,offset);offset+=part.length;}return result;}finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
const gatewayHex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function gatewayKey(secret){if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw new Error('REJECTED');return await crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),x=>parseInt(x,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function gatewayMessage({ip,origin,issued,nonce},body){return new TextEncoder().encode(['taxiqaid-gateway-v1','POST',GATEWAY_TARGET,origin,ip,String(issued),nonce,gatewayHex(await crypto.subtle.digest('SHA-256',body))].join('\n'));}
async function signGateway(secret,proof,body){return gatewayHex(await crypto.subtle.sign('HMAC',await gatewayKey(secret),await gatewayMessage(proof,body)));}
async function verifyGateway(request,secret,now=Date.now()){
 const target=new URL(request.url);if(![new URL(GATEWAY_TARGET).pathname,GATEWAY_PATH].includes(target.pathname)||target.search||request.method!=='POST')return null;
 const h=request.headers,ip=canonicalGatewayIp(h.get('x-taxiqaid-ip')),origin=h.get('origin'),stamp=h.get('x-taxiqaid-issued'),nonce=h.get('x-taxiqaid-nonce'),mac=h.get('x-taxiqaid-mac');
 if(!ip||ip!==h.get('x-taxiqaid-ip')||typeof origin!=='string'||!/^https:\/\/[^\s\n]+$/.test(origin)||!/^\d{10}$/.test(stamp||'')||!/^[0-9a-f]{32}$/.test(nonce||'')||!/^[0-9a-f]{64}$/.test(mac||''))return null;
 try{if(new URL(origin).origin!==origin)return null;}catch{return null;}
 const issued=Number(stamp);if(issued*1000>now+5000||issued*1000<now-60000)return null;
 try{const body=await gatewayBody(request.clone()),valid=await crypto.subtle.verify('HMAC',await gatewayKey(secret),Uint8Array.from(mac.match(/../g),x=>parseInt(x,16)),await gatewayMessage({ip,origin,issued,nonce},body));return valid?{ip,origin,issued,nonce}:null;}catch{return null;}
}

/** Proposal only. Single purpose public gateway; never a general proxy or credential logger. */
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
