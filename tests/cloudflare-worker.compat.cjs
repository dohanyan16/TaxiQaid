// Developer-only official-type and local workerd checks. No Cloudflare account, live secret or upstream network.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
(async()=>{
 const tools=process.env.TAXIQAID_CLOUDFLARE_TOOLS;if(!tools)throw new Error('Set TAXIQAID_CLOUDFLARE_TOOLS to a developer directory containing typescript, @cloudflare/workers-types and miniflare.');
 const deps=createRequire(path.join(path.resolve(tools),'package.json')),root=path.resolve(__dirname,'..'),folder=fs.mkdtempSync(path.join(os.tmpdir(),'taxiqaid-cf-compat-'));
 const tsPackage=deps.resolve('typescript/package.json'),tsMeta=JSON.parse(fs.readFileSync(tsPackage,'utf8')),tsCli=path.resolve(path.dirname(tsPackage),tsMeta.bin.tsc),types=path.join(path.resolve(tools),'node_modules/@cloudflare/workers-types/index.d.ts');
 try{
  // Check the ACTUAL fetch expression, rather than replacing untyped security helpers or weakening JS diagnostics.
  // No DOM/Node RequestInit merging, compiler suppression or ts-nocheck is used.
  for(const file of ['gateway/worker.mjs','gateway/dashboard-worker.mjs']){
   const source=fs.readFileSync(path.join(root,file),'utf8'),expression=source.slice(source.indexOf('function createGateway(')).match(/const upstream=await (fetcher\(GATEWAY_TARGET,[\s\S]*?\));/);assert.ok(expression,'Upstream fetch expression missing');
   const declarations="declare const fetcher: typeof fetch; declare const GATEWAY_TARGET: string; declare const AUTH_TRACE_HEADER: string; declare const trace: string; declare const approved: string; declare const ip: string; declare const proof: {issued:number;nonce:string}; declare const mac: string; const body=new Uint8Array(1);\n";
   const fixture=path.join(folder,path.basename(file)+'.ts');fs.writeFileSync(fixture,declarations+'async function check(){return await '+expression[1]+';}\n');
   const args=['--strict','--noEmit','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022',fixture,types];execFileSync(process.execPath,[tsCli,...args],{stdio:'pipe'});
   const broken=declarations+'async function check(){return await '+expression[1].replace("redirect:'manual'","credentials:'omit',redirect:'manual'")+';}\n';fs.writeFileSync(fixture,broken);let rejected=false;
   try{execFileSync(process.execPath,[tsCli,...args],{stdio:'pipe'});}catch(error){rejected=String(error.stdout).includes('TS2353')&&String(error.stdout).includes('credentials');}assert.ok(rejected,'Official types must detect the original credentials regression');
  }
  for(const file of ['gateway/validation.mjs','gateway/dashboard-worker.mjs']){
   const source=fs.readFileSync(path.join(root,file),'utf8'),expression=source.match(/const upstream=await (fetcher\(GATEWAY_TARGET,[\s\S]*?\));/);assert.ok(expression);
   const declarations="declare const fetcher:typeof fetch;declare const GATEWAY_TARGET:string;declare const VALIDATION_HEADER:string;declare const env:Record<string,string>;declare const grant:object;declare const token:string;declare const mac:string;declare const url:URL;declare const ip:string;declare const proof:{ip:string;issued:number;nonce:string;trace:string};declare function signValidation(secret:string,grant:object,token:string,mac:string):Promise<string>;const body=new Uint8Array(1);\n";
   const fixture=path.join(folder,'validation-'+path.basename(file)+'.ts');fs.writeFileSync(fixture,declarations+'async function check(){return await '+expression[1]+';}\n');execFileSync(process.execPath,[tsCli,'--strict','--noEmit','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022',fixture,types],{stdio:'pipe'});
  }
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
 const {Miniflare}=deps('miniflare'),origin='https://taxiqaid-auth-gateway.dohanyan.workers.dev',target='https://mqkflwsvnzcaylxtvsje.supabase.co',cases=[];
 const source=fs.readFileSync(path.join(root,'gateway/dashboard-worker.mjs'),'utf8');
 async function exercise(status,followControl=false){
  let upstreamCalls=0,redirectCalls=0;
  // A direct isolated outbound service returns redirects to workerd itself. Miniflare's fetchMock
  // adapter uses an intermediate Node fetch, which would follow before workerd sees the response.
  const mf=new Miniflare({modules:true,script:followControl?source.replaceAll("redirect:'manual'","redirect:'follow'"):source,compatibilityDate:'2026-07-30',cf:{colo:'SYNTHETIC'},outboundService:async request=>{
   if(request.url===target+'/functions/v1/login-with-identifier'){assert.equal(request.headers.get('cookie'),null);upstreamCalls++;return new Response(status===304?null:status===200?JSON.stringify({access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH',private_debug:'SYNTHETIC_PRIVATE'}):'',{status,headers:{'Content-Type':'application/json',Location:'https://untrusted.invalid/collect'}});}
   if(request.url==='https://untrusted.invalid/collect'){redirectCalls++;return Response.json({access_token:'SYNTHETIC_STOLEN',refresh_token:'SYNTHETIC_STOLEN_REFRESH'});}
   throw new Error('Unexpected local-test destination.');
  },bindings:{TAXIQAID_GATEWAY_ENABLED:'true',TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_ORIGINS:origin,TAXIQAID_GATEWAY_SECRET:'1'.repeat(64)}});
  try{
   const response=await mf.dispatchFetch(origin+'/login-with-identifier',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1',Cookie:'SYNTHETIC_INCOMING_COOKIE'},body:JSON.stringify({identifier:'syntheticmanager',password:'SYNTHETIC_PASSWORD'})});
   assert.equal(response.status,status===200||followControl?200:503,'Unexpected result for upstream '+status);assert.equal(upstreamCalls,1);assert.equal(redirectCalls,followControl?1:0);assert.equal(response.headers.get('location'),null);const body=await response.json();if(status===200||followControl)assert.deepEqual(Object.keys(body),['access_token','refresh_token','token_type']);else assert.deepEqual(Object.keys(body),['error']);assert.equal(JSON.stringify(body).includes('SYNTHETIC_PRIVATE'),false);
  }finally{await mf.dispose();}
 }
 for(const status of [200,301,302,303,304,307,308]){await exercise(status);cases.push({upstream:status,result:'PASS'});}
 await exercise(302,true); // Negative control: the local runtime really would follow if the policy regressed.
 async function protectedExercise(authStatus,upstreamStatus,enabled='false'){
  let authCalls=0,brokerCalls=0,redirectCalls=0;const time=Math.floor(Date.now()/1000),uid='00000000-0000-4000-8000-000000000001',grant={id:'00000000-0000-4000-8000-000000000002',ownerUid:uid,issuedAt:time,expiresAt:(Math.floor(time/900)+1)*900-10};
  const mf=new Miniflare({modules:true,script:source,compatibilityDate:'2026-07-30',cf:{colo:'SYNTHETIC'},outboundService:async request=>{
   if(request.url===target+'/auth/v1/user'){authCalls++;return Response.json({id:uid,aud:'authenticated',role:'authenticated'},{status:authStatus,headers:{Location:'https://untrusted.invalid/collect'}});}
   if(request.url===target+'/functions/v1/login-with-identifier'){brokerCalls++;assert.ok(request.headers.get('x-taxiqaid-validation'));assert.equal(request.headers.get('cookie'),null);return Response.json({case:'ip-base',result:'PASS',scope:'IP_BASE',probes:10,allowed:10,denied:0,canary:false,dbMinute:1,dbQuarter:0,expiresAt:(Math.floor(time/900)+1)*900-10,sqlQueries:30,sqlTransactions:2},{status:upstreamStatus,headers:{Location:'https://untrusted.invalid/collect'}});}
   redirectCalls++;throw new Error('Unexpected validation redirect.');
  },bindings:{TAXIQAID_GATEWAY_ENABLED:enabled,TAXIQAID_GATEWAY_ORIGIN:origin,TAXIQAID_GATEWAY_SECRET:'1'.repeat(64),TAXIQAID_VALIDATION_GRANT:JSON.stringify(grant)}});
  try{const response=await mf.dispatchFetch(origin+'/auth-validation',{method:'POST',headers:{Origin:origin,Authorization:'Bearer c3ludGhldGlj.anNvbmludGVybmFs.c2lnbmF0dXJl','Content-Type':'application/json','cf-connecting-ip':'192.0.2.1'},body:'{"case":"ip-base"}'});assert.equal(response.status,enabled!=='false'||authStatus!==200?403:upstreamStatus===200?200:503);assert.equal(redirectCalls,0);assert.equal(authCalls,enabled==='false'?1:0);assert.equal(brokerCalls,enabled==='false'&&authStatus===200?1:0);}finally{await mf.dispose();}
 }
 for(const item of [[200,200],[302,200],[200,302],[200,307],[200,200,'true']])await protectedExercise(...item);
 console.log(JSON.stringify({result:'PASS',officialTypeCheck:'Exact public and protected source/generated Fetch expressions, strict compiler, no DOM merging; original TS2353 reproduced as negative control',localRuntime:'Generated Dashboard Worker in Miniflare/workerd; synthetic cf metadata and isolated mock upstreams; five protected-gate/Auth/upstream redirect cases',hostedCloudflareVerified:false,followNegativeControl:'Observed an extra redirect hop only when deliberately mutated to follow',versions:{typescript:tsMeta.version,workersTypes:JSON.parse(fs.readFileSync(path.join(path.dirname(types),'package.json'),'utf8')).version,miniflare:deps('miniflare/package.json').version},cases},null,2));
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
