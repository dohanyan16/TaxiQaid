// @ts-nocheck
// GENERATED REVIEW REPLACEMENT. Original modules are checked separately. Do not deploy without approval.
import {isIP} from 'node:net';
import postgres from 'npm:postgres@4.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
// Source: supabase/functions/_shared/security.mjs
/** Server-only request controls. No password, token, account identifier or database error logging. */
const FAILURE='Unable to sign in. Check your credentials or contact your administrator.';
function response(status,body,origin){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',Pragma:'no-cache',Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}:{})}});}
function originFor(request,allowed){const origin=request.headers.get('origin');return origin&&allowed.includes(origin)?origin:null;}
async function readCredentials(request){
 if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>4096)throw new Error('invalid');
 const reader=request.body?.getReader();if(!reader)throw new Error('invalid');let size=0,chunks=[],timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('invalid'));reader.cancel().catch(()=>{});},2000);});
 try{for(;;){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new Error('invalid');}chunks.push(value);}}finally{clearTimeout(timer);reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='identifier,password'||typeof body.identifier!=='string'||typeof body.password!=='string'||!body.password.length||body.password.length>1024)throw new Error('invalid');
 const identifier=body.identifier.trim().toLowerCase();if(!/^(?:[a-z][a-z0-9]{1,47}|\d{10})$/.test(identifier))throw new Error('invalid');
 return {identifier,password:body.password};
}
async function bucket(secret,value){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
function safeTokenSession(session){
 if(typeof session?.access_token!=='string'||!session.access_token||session.access_token.length>16384||typeof session.refresh_token!=='string'||!session.refresh_token||session.refresh_token.length>4096)throw new Error('session');
 return {access_token:session.access_token,refresh_token:session.refresh_token,...(Number.isFinite(session.expires_in)&&session.expires_in>0?{expires_in:session.expires_in}:{}),token_type:'bearer'};
}
/** A server readiness flag is not evidence of trust. Verify gateway overwrite on every reachable ingress first. */
function trustedClientIp(request,header,verified){
 if(verified!==true||!/^[a-z0-9-]+$/.test(header)||['forwarded','x-forwarded-for'].includes(header))return null;
 const value=request.headers.get(header);if(!value||!isIP(value))return null;
 if(isIP(value)===4)return value;
 const canonical=new URL('http://['+value+']/').hostname.slice(1,-1);
 const mapped=canonical.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
 return mapped?[Number.parseInt(mapped[1],16)>>8,Number.parseInt(mapped[1],16)&255,Number.parseInt(mapped[2],16)>>8,Number.parseInt(mapped[2],16)&255].join('.'):canonical;
}

function configuredOrigins(value,allowLoopback=false){return String(value||'').split(',').map(origin=>origin.trim()).filter(origin=>{try{const parsed=new URL(origin);return parsed.origin===origin&&(parsed.protocol==='https:'||allowLoopback&&parsed.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(parsed.hostname));}catch{return false;}});}

// Source: supabase/functions/_shared/handlers.mjs
/** Dependency-injected handlers. The SQL attempt API consumes counters before any private lookup. */
function createLoginHandler(deps){
 return async request=>{
  const origin=originFor(request,deps.origins);if(!origin)return response(403,{error:FAILURE});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin','Cache-Control':'no-store'}});
  const started=Date.now();let signedIn=false,phase='configuration';
  try{
   if(!deps.ready||new URL(request.url).search)throw new Error('not-ready');
   phase='input';const input=await readCredentials(request);
   phase='configuration';const clientIp=deps.clientIp(request);if(!clientIp)throw new Error('untrusted-client-address');
   const keys=await Promise.all([bucket(deps.rateSecret,'v1:ip:'+clientIp),bucket(deps.rateSecret,'v1:account:'+input.identifier),bucket(deps.rateSecret,'v1:global')]);
   phase='database';const attempt=await deps.beginAttempt(input.identifier,keys);
   if(!attempt||typeof attempt.allowed!=='boolean')throw new Error('attempt');
   if(!attempt.allowed)return response(429,{error:FAILURE},origin);
   const account=attempt.account;
   if(account&&(typeof account.mappingRevision!=='string'||!/^[1-9][0-9]{0,18}$/.test(account.mappingRevision)||BigInt(account.mappingRevision)>9223372036854775807n))throw new Error('mapping-not-verified');
   // Reserved .invalid domain is a server-only timing equalizer, never a provisioned identity or browser mapping.
   phase='auth';const result=await deps.passwordSignIn(account?.email||'unavailable@taxiqaid.invalid',input.password);input.password='';
   signedIn=Boolean(result?.session);
   if(result?.error){const status=Number(result.error.status);return response(status===429?429:status>=500||status===0?503:401,{error:FAILURE},origin);}
   phase='credentials';
   if(!result?.user?.id||!account||result.user.id!==account.uid||account.status!=='active'||!signedIn)throw new Error('credentials');
   phase='database';const access=await deps.loadAccess(result.user.id,account.mappingRevision);
   if(access?.uid!==account.uid||access.account?.status!=='active'||access.account?.type!=='management')throw new Error('access');
   phase='session';const body=safeTokenSession(result.session);const outgoing=response(200,body,origin);signedIn=false;return outgoing;
  }catch{
   return response(['configuration','database','auth','session'].includes(phase)?503:401,{error:FAILURE},origin);
  }finally{
   if(signedIn)try{await deps.signOut();}catch{}
   // This is timing padding, not a constant-time or anti-enumeration proof.
   const remaining=350+crypto.getRandomValues(new Uint8Array(1))[0]-(Date.now()-started);
   if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
  }
 };
}
function createAccessHandler(deps){
 return async(request,verifiedUid)=>{
  const origin=originFor(request,deps.origins);if(!origin)return response(403,{error:'Access unavailable.'});
  if(request.method!=='GET'||new URL(request.url).search)return response(400,{error:'Access unavailable.'},origin);
  if(!verifiedUid)return response(401,{error:'Access unavailable.'},origin);
  try{return response(200,await deps.loadAccess(verifiedUid),origin);}catch{return response(403,{error:'Access unavailable.'},origin);}
 };
}

// Source: supabase/functions/_shared/broker-store.ts
/** Restricted broker SQL API. No direct identity/Auth table reads or broad connection identities. */
const projectRef='mqkflwsvnzcaylxtvsje';
type Sql=ReturnType<typeof postgres>;
const validRevision=(value:unknown):value is string=>typeof value==='string'&&/^[1-9][0-9]{0,18}$/.test(value)&&BigInt(value)<=9223372036854775807n;
function brokerConnectionOptions(connection:string,ca?:string){
 let target:URL;try{target=new URL(connection);}catch{throw new Error('Restricted broker connection required.');}
 const pooler=target.hostname.endsWith('.pooler.supabase.com');
 const username=decodeURIComponent(target.username),expected=pooler?'taxiqaid_auth_login.'+projectRef:'taxiqaid_auth_login';
 if(!['postgres:','postgresql:'].includes(target.protocol)||target.hash||target.pathname!=='/postgres'||!target.password||username!==expected||
  !(target.hostname==='db.'+projectRef+'.supabase.co'&&!pooler&&(!target.port||target.port==='5432')||pooler&&['5432','6543'].includes(target.port))||
  [...target.searchParams].some(([key,value])=>key!=='sslmode'||!['require','verify-full'].includes(value)))throw new Error('Restricted broker connection required.');
 // Parse once; URL ssl/debug/options parameters cannot override these explicit TLS and pool controls.
 return {host:target.hostname,port:Number(target.port||5432),database:'postgres',username,password:decodeURIComponent(target.password),
  max:2,prepare:false,idle_timeout:10,connect_timeout:5,max_lifetime:300,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},debug:false as const,onnotice:()=>{}};
}
function createBrokerStore(sql:Sql){
 async function transaction<T>(readOnly:boolean,work:(tx:Sql)=>Promise<T>):Promise<T>{
  return await sql.begin(readOnly?'isolation level repeatable read read only':'isolation level read committed',async tx=>{
   const query=tx as unknown as Sql;
   const identity=await query`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_catalog.pg_roles WHERE rolname=session_user`;
   if(identity.length!==1||identity[0].login!=='taxiqaid_auth_login'||identity[0].actor!=='taxiqaid_auth_login'||identity[0].restricted!==true)throw new Error('Restricted broker connection required.');
   await query`SET LOCAL ROLE taxiqaid_auth_backend`;
   await query`SELECT pg_catalog.set_config('statement_timeout','3000',true),pg_catalog.set_config('lock_timeout','1000',true)`;
   return await work(query);
  }) as T;
 }
 async function beginAttempt(identifier:string,keys:string[]){
  if(keys.length!==3||keys.some(key=>!/^[0-9a-f]{64}$/.test(key))||new Set(keys).size!==3)throw new Error('Invalid attempt buckets.');
  const rows=await transaction(false,async tx=>await tx`SELECT allowed,uid,email,status,mapping_revision::text AS mapping_revision FROM taxiqaid_auth_api.begin_login_attempt(${identifier},${keys[0]},${keys[1]},${keys[2]})`);
  if(rows.length!==1||typeof rows[0].allowed!=='boolean')throw new Error('Login unavailable.');
  const row=rows[0];
  if(!row.allowed)return {allowed:false,account:null};
  if(row.uid===null&&row.email===null)return {allowed:true,account:null};
  if(typeof row.uid!=='string'||typeof row.email!=='string'||!row.email||row.status!=='active'||!validRevision(row.mapping_revision))throw new Error('Login unavailable.');
  return {allowed:true,account:{uid:row.uid,email:row.email,status:row.status,mappingRevision:row.mapping_revision}};
 }
 async function loadAccess(uid:string,mappingRevision:string){
  if(!validRevision(mappingRevision)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid))throw new Error('Access unavailable.');
  const rows=await transaction(true,async tx=>await tx`SELECT taxiqaid_auth_api.get_management_access(${uid}::uuid,${mappingRevision}::bigint) AS access`);
  const raw=rows.length===1?rows[0].access:null;
  if(raw?.version!==1||raw.uid!==uid||raw.account?.uid!==uid||raw.account?.status!=='active'||raw.account?.type!=='management'||!raw.account?.fullName||!Array.isArray(raw.permissions?.roleDefaults)||!raw.permissions?.overrides)throw new Error('Access unavailable.');
  return raw;
 }
 return {beginAttempt,loadAccess};
}
function openBrokerStore(env:(name:string)=>string|undefined){
 const connection=env('TAXIQAID_BROKER_DB_URL');if(!connection)throw new Error('Restricted broker connection required.');
 return createBrokerStore(postgres(brokerConnectionOptions(connection,env('TAXIQAID_BROKER_DB_CA'))));
}

// Source: supabase/functions/_shared/gateway-proof.mjs
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

// Source: supabase/functions/_shared/signed-broker-store.ts
/** Proposal adapter: same least-privilege transactions, one-use signed request and existing post-Auth access read. */
type SignedSql=ReturnType<typeof postgres>;
function signedBrokerStore(sql:SignedSql,proof:{nonce:string;issued:number},rateSecret:string){
 const base=createBrokerStore(sql);
 return {...base,beginAttempt:async(identifier:string,keys:string[])=>{
  if(keys.length!==3||new Set(keys).size!==3||keys.some(x=>!/^[0-9a-f]{64}$/.test(x))||!/^[0-9a-f]{32}$/.test(proof.nonce)||!Number.isInteger(proof.issued))throw new Error('REJECTED');
  const nonce=await bucket(rateSecret,'v1:gateway-nonce:'+proof.nonce);
  const rows=await sql.begin('isolation level read committed',async tx=>{
   const identity=await tx`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_catalog.pg_roles WHERE rolname=session_user`;
   if(identity.length!==1||identity[0].login!=='taxiqaid_auth_login'||identity[0].actor!=='taxiqaid_auth_login'||identity[0].restricted!==true)throw new Error('REJECTED');
   await tx`SET LOCAL ROLE taxiqaid_auth_backend`;
   await tx`SELECT pg_catalog.set_config('statement_timeout','3000',true),pg_catalog.set_config('lock_timeout','1000',true)`;
   return await tx`SELECT allowed,uid,email,status,mapping_revision::text AS mapping_revision FROM taxiqaid_auth_api.begin_signed_login_attempt(${identifier},${keys[0]},${keys[1]},${keys[2]},${nonce},${proof.issued}::bigint)`;
  });
  if(rows.length!==1||typeof rows[0].allowed!=='boolean')throw new Error('REJECTED');const row=rows[0];
  if(!row.allowed)return {allowed:false,account:null};if(row.uid===null&&row.email===null)return {allowed:true,account:null};
  if(typeof row.uid!=='string'||typeof row.email!=='string'||!row.email||row.status!=='active'||typeof row.mapping_revision!=='string'||!/^[1-9][0-9]{0,18}$/.test(row.mapping_revision)||BigInt(row.mapping_revision)>9223372036854775807n)throw new Error('REJECTED');
  return {allowed:true,account:{uid:row.uid,email:row.email,status:row.status,mappingRevision:row.mapping_revision}};
 }};
}

// Source: supabase/review/public-login/login-with-identifier.ts
/** REVIEW replacement only. Never deploy before approved SQL, signed gateway and direct-origin rejection tests. */
function createSignedLogin(env:(name:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch){return async(request:Request)=>{
 const origins=configuredOrigins(env('TAXIQAID_AUTH_ORIGINS')),origin=request.headers.get('origin'),rate=env('TAXIQAID_RATE_SECRET')||'';
 const configured=['TAXIQAID_LOGIN_ENABLED','TAXIQAID_SESSION_TRANSPORT_REVIEWED','TAXIQAID_GATEWAY_ENABLED','TAXIQAID_GATEWAY_REVIEWED'].every(key=>env(key)==='true')&&rate.length>=32&&env('TAXIQAID_TRUSTED_IP_HEADER_VERIFIED')==='false';
 const proof=await verifyGateway(request,env('TAXIQAID_GATEWAY_SECRET'));
 if(!proof||!origins.includes(proof.origin))return response(403,{error:FAILURE});
 if(!configured)return response(503,{error:FAILURE},proof.origin);
 let sql:ReturnType<typeof postgres>|null=null;
 try{
  sql=connect({...brokerConnectionOptions(env('TAXIQAID_BROKER_DB_URL')||'',env('TAXIQAID_BROKER_DB_CA')),max:1,idle_timeout:1,max_lifetime:60});
  const store=signedBrokerStore(sql,proof,rate),auth=createClient('https://mqkflwsvnzcaylxtvsje.supabase.co','sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:(input,init)=>fetcher(input,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)})}});
  return await createLoginHandler({origins,ready:true,rateSecret:rate,clientIp:()=>proof.ip,beginAttempt:store.beginAttempt,loadAccess:store.loadAccess,
   passwordSignIn:async(email:string,password:string)=>{const {data,error}=await auth.auth.signInWithPassword({email,password});return {...data,error:error?{status:error.status||0}:null};},signOut:()=>auth.auth.signOut({scope:'local'})})(request);
 }catch{return response(503,{error:FAILURE},proof.origin);}
 finally{if(sql)try{await sql.end({timeout:1});}catch{}}
};}
Deno.serve(createSignedLogin(name=>Deno.env.get(name)));
