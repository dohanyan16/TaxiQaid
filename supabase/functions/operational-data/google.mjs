import {operationalDomain} from './domain-model.mjs';
/** Fixed-host readonly Google transport. Diagnostics contain codes/phases, never credential values. */
const scope='https://www.googleapis.com/auth/spreadsheets.readonly';
const base64=value=>btoa(String.fromCharCode(...value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encode=value=>base64(new TextEncoder().encode(JSON.stringify(value)));
const failures=Object.freeze({
 GOOGLE_SECRET_UNAVAILABLE:'secret',GOOGLE_SECRET_MISSING:'secret',GOOGLE_SECRET_TOO_LARGE:'secret',
 GOOGLE_JSON_INVALID:'json',GOOGLE_JSON_ROOT_INVALID:'json',GOOGLE_TYPE_INVALID:'fields',GOOGLE_CLIENT_EMAIL_INVALID:'fields',GOOGLE_PRIVATE_KEY_MISSING:'fields',
 GOOGLE_PRIVATE_KEY_FORMAT_INVALID:'pem',GOOGLE_PRIVATE_KEY_BASE64_INVALID:'pem',GOOGLE_PRIVATE_KEY_IMPORT_FAILED:'crypto',GOOGLE_ASSERTION_SIGN_FAILED:'crypto',
 GOOGLE_OAUTH_NETWORK:'oauth',GOOGLE_OAUTH_HTTP:'oauth',GOOGLE_OAUTH_INVALID_GRANT:'oauth',GOOGLE_OAUTH_INVALID_CLIENT:'oauth',GOOGLE_OAUTH_UNAUTHORIZED_CLIENT:'oauth',GOOGLE_OAUTH_ACCESS_DENIED:'oauth',GOOGLE_OAUTH_INVALID_SCOPE:'oauth',GOOGLE_OAUTH_TEMPORARILY_UNAVAILABLE:'oauth',GOOGLE_OAUTH_RESPONSE_INVALID:'oauth',GOOGLE_OAUTH_TOKEN_INVALID:'oauth',
 GOOGLE_SHEET_ID_MISSING:'sheet_config',GOOGLE_SHEET_ID_INVALID:'sheet_config',GOOGLE_SHEETS_NETWORK:'sheets',GOOGLE_SHEETS_API_DISABLED:'sheets',GOOGLE_SHEETS_PERMISSION_DENIED:'sheets',GOOGLE_SHEET_NOT_FOUND_OR_NOT_SHARED:'sheets',GOOGLE_SHEETS_TOKEN_REJECTED:'sheets',GOOGLE_SHEETS_HTTP:'sheets',GOOGLE_SHEETS_RESPONSE_INVALID:'sheets',GOOGLE_QUOTA:'sheets',SOURCE_TOO_LARGE:'sheets',READ_BUSY:'sheets',GOOGLE_READ_DEADLINE:'sheets'
});
class GoogleReadError extends Error {
 constructor(code,httpStatus){super(code);if(!Object.hasOwn(failures,code))throw new Error('Invalid diagnostic code');this.phase=failures[code];if(Number.isSafeInteger(httpStatus)&&httpStatus>=100&&httpStatus<=599)this.upstreamStatus=httpStatus;}
}
export function safeGoogleFailure(error){return error instanceof GoogleReadError&&Object.hasOwn(failures,error.message)&&error.phase===failures[error.message]?{error:error.message,phase:error.phase,...(error.upstreamStatus?{upstreamStatus:error.upstreamStatus}:{})}:null;}
const fail=(code,status)=>{throw new GoogleReadError(code,status);};

export function parseGoogleAccount(raw){
 if(raw===undefined||raw===null||typeof raw==='string'&&!raw.trim())fail('GOOGLE_SECRET_MISSING');
 if(typeof raw!=='string')fail('GOOGLE_JSON_ROOT_INVALID');
 if(raw.length>65536)fail('GOOGLE_SECRET_TOO_LARGE');
 const normalization=[];if(/^\s*\uFEFF/.test(raw))normalization.push('UTF8_BOM_REMOVED');
 let account;try{account=JSON.parse(raw.trim());}catch{fail('GOOGLE_JSON_INVALID');}
 // A single JSON string envelope is a serialization boundary, not an alternate credential type.
 if(typeof account==='string'){normalization.push('JSON_STRING_UNWRAPPED');try{account=JSON.parse(account.trim());}catch{fail('GOOGLE_JSON_INVALID');}}
 if(!account||typeof account!=='object'||Array.isArray(account))fail('GOOGLE_JSON_ROOT_INVALID');
 if(account.type!=='service_account')fail('GOOGLE_TYPE_INVALID');
 if(typeof account.client_email!=='string'||!/^[^\s@]+@[a-z0-9.-]+\.gserviceaccount\.com$/i.test(account.client_email))fail('GOOGLE_CLIENT_EMAIL_INVALID');
 if(typeof account.private_key!=='string'||!account.private_key.trim())fail('GOOGLE_PRIVATE_KEY_MISSING');
 let pem=account.private_key.trim();if(/\\[nr]/.test(pem)){normalization.push('PEM_LINE_BREAKS_NORMALIZED');pem=pem.replace(/\\r\\n/g,'\n').replace(/\\n/g,'\n');}
 pem=pem.trim();const match=pem.match(/^-----BEGIN PRIVATE KEY-----\s*([A-Za-z0-9+/=\s]+)\s*-----END PRIVATE KEY-----$/);
 if(!match)fail('GOOGLE_PRIVATE_KEY_FORMAT_INVALID');
 const text=match[1].replace(/\s/g,'');let der;try{if(text.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw 0;der=Uint8Array.from(atob(text),c=>c.charCodeAt(0));}catch{fail('GOOGLE_PRIVATE_KEY_BASE64_INVALID');}
 if(der.length>16384)fail('GOOGLE_PRIVATE_KEY_FORMAT_INVALID');
 return {email:account.client_email,der,normalization};
}

export function createGoogleReader(env,{fetcher=fetch,now=Date.now,pause=ms=>new Promise(r=>setTimeout(r,ms)),oauthScope=scope}={}){
 let access=null,tokenTask=null,configTask=null,active=0;const snapshots=new Map(),inflight=new Map();
 const sheet=module=>{let id;try{id=env(module==='drivers'?'TAXIQAID_DRIVERS_SHEET_ID':module==='fleet'?'TAXIQAID_FLEET_SHEET_ID':operationalDomain(module).secret);}catch{fail('GOOGLE_SECRET_UNAVAILABLE');}if(!id)fail('GOOGLE_SHEET_ID_MISSING');if(!/^[A-Za-z0-9_-]{20,200}$/.test(id))fail('GOOGLE_SHEET_ID_INVALID');return id;};
 async function configuration(){
  if(configTask)return configTask;
  const task=(async()=>{let raw;try{raw=env('TAXIQAID_GOOGLE_SERVICE_ACCOUNT_JSON');}catch{fail('GOOGLE_SECRET_UNAVAILABLE');}
   const parsed=parseGoogleAccount(raw);let key;try{key=await crypto.subtle.importKey('pkcs8',parsed.der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);if(key.algorithm.modulusLength<2048)throw 0;}catch{fail('GOOGLE_PRIVATE_KEY_IMPORT_FAILED');}
   return {email:parsed.email,key,normalization:parsed.normalization};})();configTask=task;try{return await task;}finally{if(configTask===task)configTask=null;}
 }
 async function inspectConfiguration(){try{const value=await configuration();return {code:'GOOGLE_CONFIG_READY',phase:'configuration',normalization:value.normalization};}catch(error){const safe=safeGoogleFailure(error);return safe?{code:safe.error,phase:safe.phase}:{code:'GOOGLE_CONFIG_CHECK_FAILED',phase:'configuration'};}}
 async function bounded(reply,max,phase){
  const invalid=phase==='oauth'?'GOOGLE_OAUTH_RESPONSE_INVALID':'GOOGLE_SHEETS_RESPONSE_INVALID';
  if(Number(reply.headers.get('content-length'))>max)fail(phase==='oauth'?invalid:'SOURCE_TOO_LARGE');
  const reader=reply.body?.getReader();if(!reader)fail(invalid);const chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)fail(phase==='oauth'?invalid:'SOURCE_TOO_LARGE');chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail(invalid);}}catch(error){if(safeGoogleFailure(error))throw error;fail(invalid);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 async function token(){
  if(access&&access.until>now()+60000)return access.value;if(tokenTask)return tokenTask;
  tokenTask=(async()=>{const {email,key}=await configuration(),seconds=Math.floor(now()/1000),unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:email,scope:oauthScope,aud:'https://oauth2.googleapis.com/token',iat:seconds,exp:seconds+300});let signature;
   try{signature=base64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned))));}catch{fail('GOOGLE_ASSERTION_SIGN_FAILED');}
   let reply;try{reply=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signature}),redirect:'error',signal:AbortSignal.timeout(10000)});}catch{fail('GOOGLE_OAUTH_NETWORK');}
   let data;try{data=await bounded(reply,16384,'oauth');}catch(error){if(!reply.ok)fail('GOOGLE_OAUTH_HTTP',reply.status);throw error;}
   if(!reply.ok){const codes={invalid_grant:'GOOGLE_OAUTH_INVALID_GRANT',invalid_client:'GOOGLE_OAUTH_INVALID_CLIENT',unauthorized_client:'GOOGLE_OAUTH_UNAUTHORIZED_CLIENT',access_denied:'GOOGLE_OAUTH_ACCESS_DENIED',invalid_scope:'GOOGLE_OAUTH_INVALID_SCOPE',temporarily_unavailable:'GOOGLE_OAUTH_TEMPORARILY_UNAVAILABLE'};fail(Object.hasOwn(codes,data?.error)?codes[data.error]:'GOOGLE_OAUTH_HTTP',reply.status);}
   if(typeof data?.access_token!=='string'||!data.access_token||data.access_token.length>16384||!Number.isFinite(data.expires_in)||data.expires_in<60)fail('GOOGLE_OAUTH_TOKEN_INVALID');
   access={value:data.access_token,until:now()+Math.min(data.expires_in,3600)*1000};return access.value;
  })().finally(()=>{tokenTask=null;});return tokenTask;
 }
 async function sheetFailure(reply){
  const status=reply.status;let data;try{data=await bounded(reply,16384,'sheets');}catch{/* Non-JSON upstream errors still have a safe HTTP classification. */}
  const disabled=Array.isArray(data?.error?.errors)&&data.error.errors.some(e=>e?.reason==='accessNotConfigured')||Array.isArray(data?.error?.details)&&data.error.details.some(e=>e?.reason==='SERVICE_DISABLED');
  if(status===403&&disabled)fail('GOOGLE_SHEETS_API_DISABLED',status);
  fail(status===401?'GOOGLE_SHEETS_TOKEN_REJECTED':status===403?'GOOGLE_SHEETS_PERMISSION_DENIED':status===404?'GOOGLE_SHEET_NOT_FOUND_OR_NOT_SHARED':status===429?'GOOGLE_QUOTA':'GOOGLE_SHEETS_HTTP',status);
 }
 async function read(module,{continuation=false}={}){
  if(!['drivers','fleet'].includes(module)){operationalDomain(module);if(!(env('TAXIQAID_OPERATIONAL_READ_DOMAINS')||'').split(',').map(s=>s.trim()).includes(module))throw new Error('SOURCE_NOT_CONNECTED');}if(continuation&&snapshots.get(module)?.until>now())return snapshots.get(module).values;if(inflight.has(module))return inflight.get(module);if(active>=2)fail('READ_BUSY');active++;
  const task=(async()=>{const deadline=now()+20000,id=sheet(module),range=module==='drivers'?"'DATA'!A:V":module==='fleet'?"'DATA'!A:R":"'DATA'!A:AZ",url='https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/'+encodeURIComponent(range)+'?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS';
   for(let attempt=0;attempt<3;attempt++){const bearer=await token();if(now()>=deadline)fail('GOOGLE_READ_DEADLINE');let reply;
    try{reply=await fetcher(url,{headers:{Authorization:'Bearer '+bearer},redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(15000,deadline-now())))});}catch{fail('GOOGLE_SHEETS_NETWORK');}
    if(reply.ok){const data=await bounded(reply,8*1024*1024,'sheets'),values=data?.values??[];if(!Array.isArray(values))fail('GOOGLE_SHEETS_RESPONSE_INVALID');if(values.length>10001)fail('SOURCE_TOO_LARGE');snapshots.set(module,{values,until:now()+15000});return values;}
    const status=reply.status,delay=Number(reply.headers.get('retry-after')||0);if(attempt===2||![429,500,502,503,504].includes(status)||!Number.isFinite(delay)||delay>2||delay<0)await sheetFailure(reply);
    await reply.body?.cancel();await pause(Math.max(attempt?500:200,delay*1000));
   }fail('GOOGLE_READ_DEADLINE');
  })().finally(()=>{active--;inflight.delete(module);});inflight.set(module,task);return task;
 }
 return Object.freeze({read,inspectConfiguration,accessToken:token});
}
