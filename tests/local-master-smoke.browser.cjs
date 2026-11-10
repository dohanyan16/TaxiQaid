// Real pinned browser SDK, mocked HTTPS responses. Never claims genuine authentication.
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const fixtureSdk=process.env.TAXIQAID_SMOKE_SDK_FILE;
 const publicKey=fs.readFileSync(path.resolve(__dirname,'../shared/auth-dedicated-config.js'),'utf8').match(/publicKey:\s*'([^']+)'/)[1];
 const args=['scripts/_local_master_smoke/server.py',...(fixtureSdk?['--sdk-file',fixtureSdk]:[])];
 const server=spawn('python3',args,{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']}),output=[];
 const url=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(new Error('Local smoke server did not start.')),40000);server.stdout.on('data',bytes=>{text+=bytes;output.push(String(bytes));const match=text.match(/Open locally: (http:\/\/127\.0\.0\.1:\d+\/)/);if(match){clearTimeout(timer);resolve(match[1]);}});server.stderr.on('data',()=>{});server.on('exit',()=>{clearTimeout(timer);reject(new Error('Local smoke server startup failed.'));});});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 try{
  const catalog=require('../shared/permission-catalog.js'),allowed=catalog.ALL.filter(p=>p.audience!=='Driver').map(p=>p.key);
  const uid='00000000-0000-4000-8000-000000000001',email='synthetic@example.invalid',password='SYNTHETIC_PASSWORD_MARKER',refresh='SYNTHETIC_REFRESH_MARKER';
  const token=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',aal:'aal1',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,email})).toString('base64url'),'c3ludGhldGljLW9ubHktc2lnbmF0dXJl'].join('.');
  const results=[];
  for(const scenario of ['success','edge-401','edge-500','auth-400','wrong-uid','driver-granted','unsupported','network','logout-500','logout-401']){
   const page=await browser.newPage(),accessToken=token();const logs=[],requests=[],errors=[];let logoutCount=0;
   page.on('console',message=>logs.push(message.text()));page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{window.storageWrites=[];Storage.prototype.setItem=function(key){storageWrites.push(key);};indexedDB.open=()=>{storageWrites.push('indexedDB');throw new Error('Storage is prohibited.');};});
   await page.route('https://mqkflwsvnzcaylxtvsje.supabase.co/**',async route=>{
    const request=route.request(),target=new URL(request.url());requests.push({path:target.pathname,method:request.method()});
    assert.ok(['/auth/v1/token','/auth/v1/user','/auth/v1/logout','/functions/v1/get-my-access'].includes(target.pathname));
    const headers={'Access-Control-Allow-Origin':new URL(url).origin,'Access-Control-Allow-Headers':request.headers()['access-control-request-headers']||'authorization,apikey,content-type,x-client-info,x-supabase-api-version','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
    if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
    assert.equal(request.headers().apikey,publicKey);
    if(target.pathname!=='/auth/v1/token')assert.equal(request.headers().authorization,'Bearer '+accessToken);
    const user={id:uid,aud:'authenticated',role:'authenticated',email,email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{},factors:[]};
    if(target.pathname==='/auth/v1/token'){
     const body=request.postDataJSON();assert.equal(body.email,email);assert.equal(body.password,password);assert.equal(target.searchParams.get('grant_type'),'password');
     await route.fulfill({status:scenario==='auth-400'?400:200,headers,contentType:'application/json',body:JSON.stringify(scenario==='auth-400'?{msg:password+' '+email}:{access_token:accessToken,refresh_token:refresh,expires_in:3600,token_type:'bearer',user})});return;
    }
    if(target.pathname==='/auth/v1/user'){await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(user)});return;}
    if(target.pathname==='/auth/v1/logout'){logoutCount++;await route.fulfill({status:scenario==='logout-500'?500:scenario==='logout-401'?401:204,headers,...(['logout-500','logout-401'].includes(scenario)?{contentType:'application/json',body:JSON.stringify({msg:refresh+' '+email})}:{})});return;}
    if(scenario==='network'){await route.abort();return;}
    const raw=scenario==='unsupported'?{private_debug:password+refresh+email}:{version:1,uid:scenario==='wrong-uid'?'another-subject':uid,account:{uid,type:'management',status:'active',role:'super_admin',fullName:'SYNTHETIC_PRIVATE_NAME'},permissions:{roleDefaults:scenario==='driver-granted'?catalog.ALL.map(p=>p.key):allowed,overrides:{}},private_debug:password+refresh+email};
    await route.fulfill({status:scenario==='edge-401'?401:scenario==='edge-500'?500:200,headers,contentType:'application/json',body:JSON.stringify(['edge-401','edge-500'].includes(scenario)?{error:password+refresh+email}:raw)});
   });
   await page.goto(url);await page.waitForFunction(()=>!document.getElementById('private-fields').disabled);
   assert.equal(await page.locator('#technical-email').getAttribute('type'),'password');
   await page.locator('#technical-email').fill(email);await page.locator('#technical-password').fill(password);await page.locator('#run').click();await page.waitForFunction(()=>!document.getElementById('copy').disabled,{},{timeout:45000});
   const summary=JSON.parse(await page.locator('#summary').inputValue());assert.equal(summary.overall,scenario==='success'?'PASS':'FAIL / NOT VERIFIED');
   assert.equal(await page.locator('#technical-email').inputValue(),'');assert.equal(await page.locator('#technical-password').inputValue(),'');assert.deepEqual(await page.evaluate(()=>storageWrites),[]);assert.deepEqual(errors,[]);
   const visible=await page.locator('body').innerText(),serialized=JSON.stringify(summary)+visible+logs.join(' ')+output.join(' ');
   for(const secret of [email,password,refresh,uid,'SYNTHETIC_PRIVATE_NAME',accessToken])assert.equal(serialized.includes(secret),false,'Private fixture leaked');
   assert.equal(requests.some(r=>/login-with-identifier|rest\/v1/.test(r.path)),false);if(scenario!=='auth-400')assert.ok(logoutCount>0,'Automatic sign-out missing');
   if(scenario==='success'){assert.equal(summary.counts.management,101);assert.equal(summary.counts.driverDenied,6);assert.equal(summary.mfa,'PASS');assert.equal(summary.signout,'PASS');}
   if(scenario==='edge-401')assert.equal(summary.http.access,401);if(scenario==='auth-400')assert.equal(summary.http.authentication,400);if(scenario==='network')assert.equal(summary.http.access,null);if(['logout-500','logout-401'].includes(scenario))assert.equal(summary.signout,'FAIL');if(scenario==='edge-500')assert.equal(summary.http.access,500);
   results.push({scenario,result:'PASS'});await page.close();
  }
  const hostStatus=await new Promise((resolve,reject)=>{const request=require('node:http').get({hostname:'127.0.0.1',port:new URL(url).port,path:'/',headers:{Host:'attacker.invalid'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);});assert.equal(hostStatus,403);const originResponse=await fetch(url,{headers:{origin:'https://attacker.invalid'}});assert.equal(originResponse.status,403);const post=await fetch(url,{method:'POST',body:'SYNTHETIC_PRIVATE_PAYLOAD'});assert.equal(post.status,405);const traversal=await fetch(url+'shared/config.js');assert.equal(traversal.status,404);
  assert.equal(fs.existsSync(path.resolve(__dirname,'../scripts/_local_master_smoke/index.html')),false);
  console.log(JSON.stringify({result:'PASS',genuineAuthenticationVerified:false,scenarios:results,loopbackGuards:'Host, Origin, methods and route allowlist verified',privacy:'Masked/cleared fields, no storage or secret output, SDK session cleanup',productionChanged:false},null,2));
 }finally{await browser.close();server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exitCode=1;});
