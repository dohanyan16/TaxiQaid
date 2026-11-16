/** Fixed, synthetic-only owner validation. Configuration is inert until separately approved. */
export const VALIDATION_PATH='/auth-validation';
export const VALIDATION_HEADER='x-taxiqaid-validation';
export const VALIDATION_OWNER='dohanyan';
export const VALIDATION_PROJECT='https://mqkflwsvnzcaylxtvsje.supabase.co';
export const VALIDATION_KEY='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
export const VALIDATION_CASES=Object.freeze({'ip-base':10,'ip-spoof':2,replay:7,'identifier-base':3,'identifier-finish':9,'global-db':22});
export const VALIDATION_EXPECTATIONS=Object.freeze({
 'ip-base':['IP_BASE',10,0,false,30,2], 'ip-spoof':['IP_SPOOF',1,1,true,22,2],replay:['SIGNED_SQL_REPLAY',5,2,true,39,4],
 'identifier-base':['IDENTIFIER_BASE',3,0,false,23,2], 'identifier-finish':['IDENTIFIER_FINISH',8,1,true,29,2], 'global-db':['SQL_GLOBAL_ONLY',21,1,true,42,2]
});
export function validationGrant(value,now=Date.now()){
 try{const raw=JSON.parse(value||'null');if(!raw||Object.keys(raw).sort().join(',')!=='expiresAt,id,issuedAt,ownerUid')return null;
  const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
  if(!uuid(raw.id)||!uuid(raw.ownerUid)||!Number.isInteger(raw.issuedAt)||!Number.isInteger(raw.expiresAt)||raw.expiresAt<=raw.issuedAt||raw.expiresAt-raw.issuedAt>900||raw.issuedAt*1000>now+5000||raw.expiresAt*1000<=now)return null;
  // Existing nonce cleanup runs after two minutes. A full private identifier bucket retains each
  // consumed case for this entire grant, which must end before its fixed DB quarter expires.
  if(raw.expiresAt>(Math.floor(raw.issuedAt/900)+1)*900-10)return null;
  return {id:raw.id,ownerUid:raw.ownerUid,issuedAt:raw.issuedAt,expiresAt:raw.expiresAt};
 }catch{return null;}
}
export const grantText=grant=>JSON.stringify([grant.id,grant.ownerUid,grant.issuedAt,grant.expiresAt]);
export function validationToken(request){const match=(request.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);return match&&match[1].length<=16384?match[1]:null;}
export function verifiedValidationExpiry(token,uid){
 const part=token.split('.')[1].replaceAll('-','+').replaceAll('_','/'),raw=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));
 if(raw.sub!==uid||!Number.isFinite(raw.exp)||raw.exp*1000<=Date.now())throw new Error('DENIED');return raw.exp;
}
export async function validationCase(request){
 if(request.method!=='POST'||new URL(request.url).search||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new Error('DENIED');
 const reader=request.body?.getReader();if(!reader)throw new Error('DENIED');const chunks=[];let size=0,timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reader.cancel().catch(()=>{});reject(new Error('DENIED'));},2000);});
 try{for(;;){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>128)throw new Error('DENIED');chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!raw||Object.keys(raw).join(',')!=='case'||!Object.hasOwn(VALIDATION_CASES,raw.case))throw new Error('DENIED');return raw.case;
 }finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
const validationHex=bytes=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
async function validationKey(secret){if(typeof secret!=='string'||!/^[0-9a-f]{64}$/.test(secret))throw new Error('DENIED');return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),value=>parseInt(value,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function validationMessage(grant,token,mac){return new TextEncoder().encode(['taxiqaid-owner-validation-v1',grantText(grant),validationHex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),mac].join('\n'));}
export async function signValidation(secret,grant,token,mac){return validationHex(await crypto.subtle.sign('HMAC',await validationKey(secret),await validationMessage(grant,token,mac)));}
export async function verifyValidation(secret,grant,token,mac,signature){if(!/^[0-9a-f]{64}$/.test(signature||''))return false;try{return await crypto.subtle.verify('HMAC',await validationKey(secret),Uint8Array.from(signature.match(/../g),value=>parseInt(value,16)),await validationMessage(grant,token,mac));}catch{return false;}}
export function safeValidationResult(raw){
 const fields=['case','result','scope','probes','allowed','denied','canary','dbMinute','dbQuarter','expiresAt','sqlQueries','sqlTransactions'];
 if(!raw||Object.keys(raw).some(key=>!fields.includes(key))||!Object.hasOwn(VALIDATION_CASES,raw.case)||!['PASS','FAIL','INCONCLUSIVE'].includes(raw.result)||!['IP_BASE','IP_SPOOF','SIGNED_SQL_REPLAY','IDENTIFIER_BASE','IDENTIFIER_FINISH','SQL_GLOBAL_ONLY'].includes(raw.scope))throw new Error('DENIED');
 for(const key of fields.filter(key=>!['case','result','scope','canary'].includes(key)))if(!Number.isInteger(raw[key])||raw[key]<0)throw new Error('DENIED');
 if(typeof raw.canary!=='boolean'||raw.probes>VALIDATION_CASES[raw.case]||raw.allowed+raw.denied!==raw.probes||raw.sqlTransactions>4||raw.sqlQueries>50||raw.scope!==VALIDATION_EXPECTATIONS[raw.case][0])throw new Error('DENIED');
 if(raw.result==='PASS'&&JSON.stringify([raw.scope,raw.allowed,raw.denied,raw.canary,raw.sqlQueries,raw.sqlTransactions])!==JSON.stringify(VALIDATION_EXPECTATIONS[raw.case]))throw new Error('DENIED');return Object.fromEntries(fields.map(key=>[key,raw[key]]));
}
