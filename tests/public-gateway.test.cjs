// Synthetic gateway transport/route tests. These do not establish Cloudflare header provenance.
const {test}=require('node:test'),assert=require('node:assert/strict'),clientFactory=require('../shared/auth-client.js');
const secret='1'.repeat(64),origin='https://review.example.workers.dev',now=Date.now();
async function setup(){return {...await import('../supabase/functions/_shared/gateway-proof.mjs'),...await import('../gateway/worker.mjs')};}
const bytes=()=>new TextEncoder().encode(JSON.stringify({identifier:'syntheticmanager',password:'SYNTHETIC_PRIVATE_PASSWORD'}));
async function signed(change={}){const m=await setup(),proof={ip:'192.0.2.1',origin,issued:Math.floor(now/1000),nonce:'a'.repeat(32),...change.proof},body=bytes(),mac=await m.signGateway(secret,proof,body);return new Request(m.GATEWAY_TARGET,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-taxiqaid-ip':proof.ip,'x-taxiqaid-issued':String(proof.issued),'x-taxiqaid-nonce':proof.nonce,'x-taxiqaid-mac':mac,...change.headers},body:change.body??body});}
test('a valid gateway proof binds exact body, origin, IP, time, nonce, method and route',async()=>{
 const m=await setup(),r=await signed();assert.ok(await m.verifyGateway(r,secret,now));assert.ok(await m.verifyGateway(new Request('http://internal/login-with-identifier',await signed()),secret,now));assert.equal(await m.verifyGateway(new Request('http://internal/get-my-access',await signed()),secret,now),null);
 for(const options of [{body:'{}'},{headers:{'x-taxiqaid-ip':'192.0.2.2'}},{headers:{origin:'https://unapproved.invalid'}},{headers:{'x-taxiqaid-nonce':'b'.repeat(32)}},{headers:{'x-taxiqaid-issued':String(Math.floor(now/1000)+1)}},{headers:{'x-taxiqaid-mac':'0'.repeat(64)}}])assert.equal(await m.verifyGateway(await signed(options),secret,now),null);
 assert.equal(await m.verifyGateway(await signed(),'2'.repeat(64),now),null);assert.equal(await m.verifyGateway(await signed(),secret,now+61000),null);assert.equal(await m.verifyGateway(await signed({proof:{issued:Math.floor(now/1000)+10}}),secret,now),null);
 const good=await signed();assert.equal(await m.verifyGateway(new Request(m.GATEWAY_TARGET+'?bypass=1',good),secret,now),null);
 assert.equal(await m.verifyGateway(new Request(m.GATEWAY_TARGET,{method:'POST',headers:{Origin:origin,apikey:'sb_publishable_SYNTHETIC','x-taxiqaid-ip':'192.0.2.1','Content-Type':'application/json'},body:bytes()}),secret,now),null);
});
test('IP validation canonicalizes aliases without using forwarded lists or treating DNS/zone IDs as addresses',async()=>{
 const {canonicalGatewayIp}=await setup();for(const value of ['1.2.3.999','192.168.001.1','localhost','192.0.2.1,192.0.2.2','fe80::1%lo0',''])assert.equal(canonicalGatewayIp(value),null);assert.equal(canonicalGatewayIp('::ffff:192.0.2.1'),'192.0.2.1');assert.equal(canonicalGatewayIp('2001:0db8:0:0::1'),'2001:db8::1');
});
test('Worker forwards only authenticated edge IP and a fixed target, discarding attacker gateway/forwarding headers',async()=>{
 const m=await setup();let forwarded=0;
 const worker=m.createGateway(async(url,init)=>{forwarded++;assert.equal(url,m.GATEWAY_TARGET);const req=new Request(url,init);assert.equal(req.headers.get('x-forwarded-for'),null);assert.equal(req.headers.get('authorization'),null);assert.equal(req.headers.get('x-taxiqaid-ip'),'192.0.2.3');assert.ok(await m.verifyGateway(req,secret,now));return Response.json({access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH',email:'SYNTHETIC_PRIVATE_EMAIL',debug:'SYNTHETIC_PRIVATE_DB_URL'});},()=>now);
 const req=new Request(origin+'/login-with-identifier',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.3','x-forwarded-for':'198.51.100.2','x-taxiqaid-ip':'198.51.100.2','x-taxiqaid-mac':'bad',authorization:'Bearer untrusted'},body:bytes()});Object.defineProperty(req,'cf',{value:{colo:'SYNTHETIC'}});
 const response=await worker(req,{TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_SECRET:secret});assert.equal(response.status,200);assert.deepEqual(Object.keys(await response.json()),['access_token','refresh_token','token_type']);assert.equal(forwarded,1);
});
test('missing platform context, Worker subrequests, special Worker IP and unknown routes never contact Supabase',async()=>{
 const m=await setup();let calls=0;const worker=m.createGateway(async()=>{calls++;throw new Error('Unexpected.');},()=>now),env={TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_SECRET:secret};
 for(const [cf,extra,path]of [[false,{},'/login-with-identifier'],[true,{'cf-worker':'untrusted'},'/login-with-identifier'],[true,{'cf-connecting-ip':'2a06:98c0:3600::103'},'/login-with-identifier'],[true,{},'/anything']]){const req=new Request(origin+path,{method:'POST',headers:{Origin:origin,'cf-connecting-ip':'192.0.2.3','Content-Type':'application/json',...extra},body:bytes()});if(cf)Object.defineProperty(req,'cf',{value:{}});assert.equal((await worker(req,env)).status,403);}assert.equal(calls,0);
});
test('gateway failures have a generic non-cached body without secrets and cannot redirect credentials',async()=>{
 const m=await setup(),worker=m.createGateway(async()=>{throw new Error('SYNTHETIC_PRIVATE_PASSWORD_AND_URL');},()=>now),req=new Request(origin+'/login-with-identifier',{method:'POST',headers:{Origin:origin,'cf-connecting-ip':'192.0.2.3','Content-Type':'application/json'},body:bytes()});Object.defineProperty(req,'cf',{value:{}});const r=await worker(req,{TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_SECRET:secret});assert.equal(r.status,503);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal((await r.text()).includes('SYNTHETIC'),false);
});
test('frontend optional gateway configuration rejects unsafe/ambiguous URLs and never routes access/identity through it',()=>{
 const client={auth:{}};for(const brokerUrl of ['http://review.workers.dev/login-with-identifier','https://user:pass@review.workers.dev/login-with-identifier','https://review.workers.dev/other','https://review.workers.dev/login-with-identifier?x=1'])assert.throws(()=>clientFactory.create({client,url:'https://example.invalid',key:'public',brokerUrl}));
});
test('frontend sends credentials only to the configured gateway and verified access only to Supabase',async()=>{
 const catalog=require('../shared/permission-catalog.js'),uid='synthetic-uid',session={access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH',expires_at:Math.floor(Date.now()/1000)+3600},calls=[];
 const client={auth:{setSession:async()=>({error:null}),getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:{id:uid}}}),signOut:async()=>({error:null})}};
 const url='https://mqkflwsvnzcaylxtvsje.supabase.co',brokerUrl=origin+'/login-with-identifier';
 const auth=clientFactory.create({client,url,key:'public',brokerUrl,enabled:true,fetcher:async(target,init)=>{calls.push(target);if(target===brokerUrl)return Response.json({access_token:session.access_token,refresh_token:session.refresh_token});assert.equal(target,url+'/functions/v1/get-my-access');assert.equal(init.headers.Authorization,'Bearer '+session.access_token);return Response.json({uid,accountType:'management',status:'active',role:'super_admin',username:'syntheticmanager',fullName:'Synthetic Master',roleDefaults:catalog.ALL.filter(p=>p.audience!=='Driver').map(p=>p.key),overrides:{},departments:['it']});}});
 const context=await auth.login('syntheticmanager','SYNTHETIC_PASSWORD');assert.equal(context.uid,uid);assert.deepEqual(calls,[brokerUrl,url+'/functions/v1/get-my-access']);await auth.logout();
});
