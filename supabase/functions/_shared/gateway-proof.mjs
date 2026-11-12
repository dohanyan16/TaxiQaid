/** Review-only authenticated gateway transport. IP headers alone never authorize the Supabase origin. */
export const GATEWAY_TARGET='https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/login-with-identifier';
export const GATEWAY_PATH='/login-with-identifier';
export function canonicalGatewayIp(value){
 if(typeof value!=='string'||value.length>64)return null;
 if(/^(0|[1-9][0-9]{0,2})(\.(0|[1-9][0-9]{0,2})){3}$/.test(value))return value.split('.').every(x=>Number(x)<=255)?value:null;
 if(!/^[0-9a-fA-F:.]+$/.test(value)||!value.includes(':'))return null;
 try{const ip=new URL('http://['+value+']/').hostname.slice(1,-1),mapped=ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);return mapped?[parseInt(mapped[1],16)>>8,parseInt(mapped[1],16)&255,parseInt(mapped[2],16)>>8,parseInt(mapped[2],16)&255].join('.'):ip;}catch{return null;}
}
export async function gatewayBody(request){
 if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>4096)throw new Error('REJECTED');
 const reader=request.body?.getReader();if(!reader)throw new Error('REJECTED');let bytes=[],size=0,timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('REJECTED'));reader.cancel().catch(()=>{});},2000);});
 try{for(;;){const {value,done}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.length;if(size>4096)throw new Error('REJECTED');bytes.push(value);}const result=new Uint8Array(size);let offset=0;for(const part of bytes){result.set(part,offset);offset+=part.length;}return result;}finally{clearTimeout(timer);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
const gatewayHex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function gatewayKey(secret){if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw new Error('REJECTED');return await crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),x=>parseInt(x,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function gatewayMessage({ip,origin,issued,nonce},body){return new TextEncoder().encode(['taxiqaid-gateway-v1','POST',GATEWAY_TARGET,origin,ip,String(issued),nonce,gatewayHex(await crypto.subtle.digest('SHA-256',body))].join('\n'));}
export async function signGateway(secret,proof,body){return gatewayHex(await crypto.subtle.sign('HMAC',await gatewayKey(secret),await gatewayMessage(proof,body)));}
export async function verifyGateway(request,secret,now=Date.now()){
 const target=new URL(request.url);if(![new URL(GATEWAY_TARGET).pathname,GATEWAY_PATH].includes(target.pathname)||target.search||request.method!=='POST')return null;
 const h=request.headers,ip=canonicalGatewayIp(h.get('x-taxiqaid-ip')),origin=h.get('origin'),stamp=h.get('x-taxiqaid-issued'),nonce=h.get('x-taxiqaid-nonce'),mac=h.get('x-taxiqaid-mac');
 if(!ip||ip!==h.get('x-taxiqaid-ip')||typeof origin!=='string'||!/^https:\/\/[^\s\n]+$/.test(origin)||!/^\d{10}$/.test(stamp||'')||!/^[0-9a-f]{32}$/.test(nonce||'')||!/^[0-9a-f]{64}$/.test(mac||''))return null;
 try{if(new URL(origin).origin!==origin)return null;}catch{return null;}
 const issued=Number(stamp);if(issued*1000>now+5000||issued*1000<now-60000)return null;
 try{const body=await gatewayBody(request.clone()),valid=await crypto.subtle.verify('HMAC',await gatewayKey(secret),Uint8Array.from(mac.match(/../g),x=>parseInt(x,16)),await gatewayMessage({ip,origin,issued,nonce},body));return valid?{ip,origin,issued,nonce}:null;}catch{return null;}
}
