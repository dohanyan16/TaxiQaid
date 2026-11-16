// GENERATED REVIEW ONLY. No secrets, deployment or activation.
/** Fixed private telemetry only. Never accept caller payloads, errors, identifiers, IPs or proof values. */
const AUTH_TRACE_HEADER='x-taxiqaid-trace';
function validAuthTrace(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);}
const AUTH_EVENTS=new Set(['ROUTE_REJECTED','ORIGIN_REJECTED','GATEWAY_DISABLED','PROVENANCE_REJECTED','UPSTREAM_RESPONSE','UPSTREAM_REDIRECT_REJECTED','UPSTREAM_UNAVAILABLE','SESSION_FILTER_REJECTED','PROOF_REJECTED','PROOF_VERIFIED','BROKER_DISABLED','DATABASE_UNAVAILABLE','INPUT_REJECTED','ADMISSION_ALLOWED','ADMISSION_DENIED','AUTH_REJECTED','AUTH_THROTTLED','AUTH_UNAVAILABLE','IDENTITY_REJECTED','ACCESS_REJECTED','SESSION_ISSUED','SESSION_CLEANUP_CONFIRMED','SESSION_CLEANUP_UNCONFIRMED']);
function authAudit(component,trace,sink=value=>console.info(value)){
 return (event,http)=>{if(!['gateway','broker'].includes(component)||!validAuthTrace(trace)||!AUTH_EVENTS.has(event)||!Number.isInteger(http)||http<100||http>599)return;
  try{sink(JSON.stringify({schema:'taxiqaid-auth-audit-v1',component,trace,event,http}));}catch{/* Telemetry must not change admission or leak a logger error. */}
 };
}

/** Review-only authenticated gateway transport. IP headers alone never authorize the Supabase origin. */
const GATEWAY_TARGET='https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/login-with-identifier';
const GATEWAY_PATH='/login-with-identifier';
function canonicalGatewayIp(value){
 if(typeof value!=='string'||value.length>64)return null;
 if(/^(0|[1-9][0-9]{0,2})(\.(0|[1-9][0-9]{0,2})){3}$/.test(value))return value.split('.').every(x=>Number(x)<=255)?value:null;
 if(!/^[0-9a-fA-F:.]+$/.test(value)||!value.includes(':'))return null;
 try{const ip=new URL('http://['+value+']/').hostname.slice(1,-1),mapped=ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);return mapped?[parseInt(mapped[1],16)>>8,parseInt(mapped[1],16)&255,parseInt(mapped[2],16)>>8,parseInt(mapped[2],16)&255].join('.'):ip;}catch{return null;}
}
function gatewaySource(request){const ip=canonicalGatewayIp(request.headers.get('cf-connecting-ip'));return !request.cf||request.headers.has('cf-worker')||request.headers.has('cf-ew-via')||!ip||ip==='2a06:98c0:3600::103'?null:ip;}
async function gatewayBody(request){
 if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>4096)throw new Error('REJECTED');
 const reader=request.body?.getReader();if(!reader)throw new Error('REJECTED');let bytes=[],size=0,timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('REJECTED'));reader.cancel().catch(()=>{});},2000);});
 try{for(;;){const {value,done}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.length;if(size>4096)throw new Error('REJECTED');bytes.push(value);}const result=new Uint8Array(size);let offset=0;for(const part of bytes){result.set(part,offset);offset+=part.length;}return result;}finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
const gatewayHex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function gatewayKey(secret){if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw new Error('REJECTED');return await crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),x=>parseInt(x,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function gatewayMessage({ip,origin,issued,nonce,trace},body){
 if(trace!==undefined&&!validAuthTrace(trace))throw new Error('REJECTED');
 // v1 remains verifiable for the existing deployment; v2 binds an independent, non-secret trace.
 return new TextEncoder().encode([trace===undefined?'taxiqaid-gateway-v1':'taxiqaid-gateway-v2','POST',GATEWAY_TARGET,origin,ip,String(issued),nonce,gatewayHex(await crypto.subtle.digest('SHA-256',body)),...(trace===undefined?[]:[trace])].join('\n'));
}
async function signGateway(secret,proof,body){return gatewayHex(await crypto.subtle.sign('HMAC',await gatewayKey(secret),await gatewayMessage(proof,body)));}
async function verifyGateway(request,secret,now=Date.now()){
 const target=new URL(request.url);if(![new URL(GATEWAY_TARGET).pathname,GATEWAY_PATH].includes(target.pathname)||target.search||request.method!=='POST')return null;
 const h=request.headers,ip=canonicalGatewayIp(h.get('x-taxiqaid-ip')),origin=h.get('origin'),stamp=h.get('x-taxiqaid-issued'),nonce=h.get('x-taxiqaid-nonce'),mac=h.get('x-taxiqaid-mac'),trace=h.get(AUTH_TRACE_HEADER)??undefined;
 if(trace!==undefined&&!validAuthTrace(trace))return null;
 if(!ip||ip!==h.get('x-taxiqaid-ip')||typeof origin!=='string'||!/^https:\/\/[^\s\n]+$/.test(origin)||!/^\d{10}$/.test(stamp||'')||!/^[0-9a-f]{32}$/.test(nonce||'')||!/^[0-9a-f]{64}$/.test(mac||''))return null;
 try{if(new URL(origin).origin!==origin)return null;}catch{return null;}
 const issued=Number(stamp);if(issued*1000>now+5000||issued*1000<now-60000)return null;
 try{const body=await gatewayBody(request.clone()),valid=await crypto.subtle.verify('HMAC',await gatewayKey(secret),Uint8Array.from(mac.match(/../g),x=>parseInt(x,16)),await gatewayMessage({ip,origin,issued,nonce,trace},body));return valid?{ip,origin,issued,nonce,...(trace===undefined?{}:{trace})}:null;}catch{return null;}
}

/** Fixed, synthetic-only owner validation. Configuration is inert until separately approved. */
const VALIDATION_PATH='/auth-validation';
const VALIDATION_HEADER='x-taxiqaid-validation';
const VALIDATION_OWNER='dohanyan';
const VALIDATION_PROJECT='https://mqkflwsvnzcaylxtvsje.supabase.co';
const VALIDATION_KEY='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
const VALIDATION_CASES=Object.freeze({'ip-base':10,'ip-spoof':2,replay:7,'identifier-base':3,'identifier-finish':9,'global-db':22});
const VALIDATION_EXPECTATIONS=Object.freeze({
 'ip-base':['IP_BASE',10,0,false,30,2], 'ip-spoof':['IP_SPOOF',1,1,true,22,2],replay:['SIGNED_SQL_REPLAY',5,2,true,39,4],
 'identifier-base':['IDENTIFIER_BASE',3,0,false,23,2], 'identifier-finish':['IDENTIFIER_FINISH',8,1,true,29,2], 'global-db':['SQL_GLOBAL_ONLY',21,1,true,42,2]
});
function validationGrant(value,now=Date.now()){
 try{const raw=JSON.parse(value||'null');if(!raw||Object.keys(raw).sort().join(',')!=='expiresAt,id,issuedAt,ownerUid')return null;
  const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
  if(!uuid(raw.id)||!uuid(raw.ownerUid)||!Number.isInteger(raw.issuedAt)||!Number.isInteger(raw.expiresAt)||raw.expiresAt<=raw.issuedAt||raw.expiresAt-raw.issuedAt>900||raw.issuedAt*1000>now+5000||raw.expiresAt*1000<=now)return null;
  // Existing nonce cleanup runs after two minutes. A full private identifier bucket retains each
  // consumed case for this entire grant, which must end before its fixed DB quarter expires.
  if(raw.expiresAt>(Math.floor(raw.issuedAt/900)+1)*900-10)return null;
  return {id:raw.id,ownerUid:raw.ownerUid,issuedAt:raw.issuedAt,expiresAt:raw.expiresAt};
 }catch{return null;}
}
const grantText=grant=>JSON.stringify([grant.id,grant.ownerUid,grant.issuedAt,grant.expiresAt]);
function validationToken(request){const match=(request.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);return match&&match[1].length<=16384?match[1]:null;}
function verifiedValidationExpiry(token,uid){
 const part=token.split('.')[1].replaceAll('-','+').replaceAll('_','/'),raw=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));
 if(raw.sub!==uid||!Number.isFinite(raw.exp)||raw.exp*1000<=Date.now())throw new Error('DENIED');return raw.exp;
}
async function validationCase(request){
 if(request.method!=='POST'||new URL(request.url).search||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new Error('DENIED');
 const reader=request.body?.getReader();if(!reader)throw new Error('DENIED');const chunks=[];let size=0,timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reader.cancel().catch(()=>{});reject(new Error('DENIED'));},2000);});
 try{for(;;){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>128)throw new Error('DENIED');chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!raw||Object.keys(raw).join(',')!=='case'||!Object.hasOwn(VALIDATION_CASES,raw.case))throw new Error('DENIED');return raw.case;
 }finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
const validationHex=bytes=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
async function validationKey(secret){if(typeof secret!=='string'||!/^[0-9a-f]{64}$/.test(secret))throw new Error('DENIED');return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),value=>parseInt(value,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function validationMessage(grant,token,mac){return new TextEncoder().encode(['taxiqaid-owner-validation-v1',grantText(grant),validationHex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),mac].join('\n'));}
async function signValidation(secret,grant,token,mac){return validationHex(await crypto.subtle.sign('HMAC',await validationKey(secret),await validationMessage(grant,token,mac)));}
async function verifyValidation(secret,grant,token,mac,signature){if(!/^[0-9a-f]{64}$/.test(signature||''))return false;try{return await crypto.subtle.verify('HMAC',await validationKey(secret),Uint8Array.from(signature.match(/../g),value=>parseInt(value,16)),await validationMessage(grant,token,mac));}catch{return false;}}
function safeValidationResult(raw){
 const fields=['case','result','scope','probes','allowed','denied','canary','dbMinute','dbQuarter','expiresAt','sqlQueries','sqlTransactions'];
 if(!raw||Object.keys(raw).some(key=>!fields.includes(key))||!Object.hasOwn(VALIDATION_CASES,raw.case)||!['PASS','FAIL','INCONCLUSIVE'].includes(raw.result)||!['IP_BASE','IP_SPOOF','SIGNED_SQL_REPLAY','IDENTIFIER_BASE','IDENTIFIER_FINISH','SQL_GLOBAL_ONLY'].includes(raw.scope))throw new Error('DENIED');
 for(const key of fields.filter(key=>!['case','result','scope','canary'].includes(key)))if(!Number.isInteger(raw[key])||raw[key]<0)throw new Error('DENIED');
 if(typeof raw.canary!=='boolean'||raw.probes>VALIDATION_CASES[raw.case]||raw.allowed+raw.denied!==raw.probes||raw.sqlTransactions>4||raw.sqlQueries>50||raw.scope!==VALIDATION_EXPECTATIONS[raw.case][0])throw new Error('DENIED');
 if(raw.result==='PASS'&&JSON.stringify([raw.scope,raw.allowed,raw.denied,raw.canary,raw.sqlQueries,raw.sqlTransactions])!==JSON.stringify(VALIDATION_EXPECTATIONS[raw.case]))throw new Error('DENIED');return Object.fromEntries(fields.map(key=>[key,raw[key]]));
}

/** Owner-only control plane; no public login, password verification, signer API or arbitrary target. */
function validationReply(status,result){return Response.json(result,{status,headers:{'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}});}
/** @param {typeof fetch} [fetcher] @param {()=>number} [now] */
function createValidationGateway(fetcher=fetch,now=Date.now){return async(request,env)=>{
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

/** Proposal only. Single purpose public gateway; never a general proxy or credential logger. */
function workerOrigins(value){return String(value||'').split(',').map(x=>x.trim()).filter(x=>{try{return new URL(x).origin===x&&x.startsWith('https://');}catch{return false;}});}
function workerReply(status,body,origin){return new Response(status===204?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',Pragma:'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; connect-src 'self' https://mqkflwsvnzcaylxtvsje.supabase.co; form-action 'none'; frame-ancestors 'none'",Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})}});}
/** @param {typeof fetch} [fetcher] @param {()=>number} [now] @param {(value:string)=>void} [auditSink] */
export function createGateway(fetcher=fetch,now=Date.now,auditSink=undefined){return async(request,env)=>{
 const trace=crypto.randomUUID(),audit=authAudit('gateway',trace,auditSink);
 const url=new URL(request.url),origin=request.headers.get('origin'),approved=workerOrigins(env.TAXIQAID_GATEWAY_ORIGINS).includes(origin)?origin:null,error={error:'Unable to sign in. Check your credentials or contact your administrator.'};
 if(url.protocol!=='https:'||url.pathname!==GATEWAY_PATH||url.search||url.origin!==env.TAXIQAID_GATEWAY_ORIGIN){audit('ROUTE_REJECTED',403);return workerReply(403,error);}
 if(request.method==='GET')return workerReply(405,error); // A harmless same-origin document for the private browser Snippet.
 if(!approved){audit('ORIGIN_REJECTED',403);return workerReply(403,error);}
 if(request.method==='OPTIONS')return workerReply(204,null,approved);
 if(env.TAXIQAID_GATEWAY_ENABLED!=='true'||request.method!=='POST'){audit('GATEWAY_DISABLED',503);return workerReply(503,error,approved);}
 // Only direct Cloudflare ingress. Block Worker subrequests, service bindings and ambiguous proxy provenance.
 const ip=gatewaySource(request);
 if(!ip){audit('PROVENANCE_REJECTED',403);return workerReply(403,error,approved);}
 try{
  const body=await gatewayBody(request),proof={ip,origin:approved,issued:Math.floor(now()/1000),nonce:crypto.randomUUID().replaceAll('-',''),trace},mac=await signGateway(env.TAXIQAID_GATEWAY_SECRET,proof,body);
  const upstream=await fetcher(GATEWAY_TARGET,{method:'POST',headers:{'Content-Type':'application/json',Origin:approved,'x-taxiqaid-ip':ip,'x-taxiqaid-issued':String(proof.issued),'x-taxiqaid-nonce':proof.nonce,'x-taxiqaid-mac':mac,[AUTH_TRACE_HEADER]:trace},body,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(20000)});
  audit('UPSTREAM_RESPONSE',upstream.status);
  // Never follow or expose a redirect, including one back to the approved host.
  if(upstream.status>=300&&upstream.status<400){audit('UPSTREAM_REDIRECT_REJECTED',503);await upstream.body?.cancel();return workerReply(503,error,approved);}
  if(upstream.status!==200){await upstream.body?.cancel();return workerReply([401,403,429,503].includes(upstream.status)?upstream.status:503,error,approved);}
  const raw=await upstream.json();if(typeof raw?.access_token!=='string'||!raw.access_token||raw.access_token.length>16384||typeof raw.refresh_token!=='string'||!raw.refresh_token||raw.refresh_token.length>4096){audit('SESSION_FILTER_REJECTED',503);throw new Error('REJECTED');}
  // Only the official session whitelist is public; never forward upstream errors, debug fields or proof headers.
  return workerReply(200,{access_token:raw.access_token,refresh_token:raw.refresh_token,token_type:'bearer',...(Number.isFinite(raw.expires_in)&&raw.expires_in>0?{expires_in:raw.expires_in}:{})},approved);
 }catch{audit('UPSTREAM_UNAVAILABLE',503);return workerReply(503,error,approved);}
};}
/** @param {typeof fetch} [fetcher] @param {()=>number} [now] @param {(value:string)=>void} [auditSink] */
export function createGatewayRouter(fetcher=fetch,now=Date.now,auditSink=undefined){const login=createGateway(fetcher,now,auditSink),validation=createValidationGateway(fetcher,now);return (request,env)=>new URL(request.url).pathname===VALIDATION_PATH?validation(request,env):login(request,env);}
export default {fetch:createGatewayRouter()};
