// Browser-only owner diagnostic using the real pinned SDK and mocked requests. No genuine hosted broker login or Cloudflare attestation.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 try{
  const snippet=fs.readFileSync(path.resolve(__dirname,'../scripts/_public_gateway/dashboard-snippet.js'),'utf8').replaceAll('REPLACE_WITH_REVIEWED_WORKER_ORIGIN','https://review.example.workers.dev'),catalog=require('../shared/permission-catalog.js'),management=catalog.ALL.filter(p=>p.audience!=='Driver').map(p=>p.key),project='https://mqkflwsvnzcaylxtvsje.supabase.co',gateway='https://review.example.workers.dev';
  const uid='00000000-0000-4000-8000-000000000001',email='synthetic-private@example.invalid',password='SYNTHETIC_PRIVATE_PASSWORD',refresh='SYNTHETIC_PRIVATE_REFRESH';
  const results=[];
  for(const scenario of ['flat-success','nested-success','wrong-password','broker-429','broker-503','access-401','missing-profile-fields','driver-granted','logout-500']){
   const page=await browser.newPage(),errors=[],logs=[],requests=[];let logouts=0;
   const jwt=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,aal:'aal1',role:'authenticated',aud:'authenticated',email,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})).toString('base64url'),'c3ludGhldGljLXNpZ25hdHVyZQ'].join('.');
   page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>logs.push(message.text()));await page.addInitScript(()=>{window.storageWrites=[];Storage.prototype.setItem=function(){storageWrites.push('storage');};indexedDB.open=function(){storageWrites.push('indexedDB');throw new Error('Prohibited.');};});
   await page.route('**/*',async route=>{
    const request=route.request(),target=new URL(request.url());assert.equal(target.origin,target.pathname==='/login-with-identifier'?gateway:project);requests.push(target.pathname);
    const headers={'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; connect-src 'self' https://mqkflwsvnzcaylxtvsje.supabase.co; form-action 'none'"};
    if(request.isNavigationRequest()){await route.fulfill({status:503,headers,contentType:'application/json',body:'{"error":"Unavailable."}'});return;}
    assert.ok(['/login-with-identifier','/functions/v1/get-my-access','/auth/v1/user','/auth/v1/logout'].includes(target.pathname));
    if(target.pathname==='/login-with-identifier'){
     const input=request.postDataJSON();assert.deepEqual(input,{identifier:'syntheticmanager',password});
     const status=scenario==='wrong-password'?401:scenario==='broker-429'?429:scenario==='broker-503'?503:200;
     await route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(status===200?{access_token:jwt,refresh_token:refresh,token_type:'bearer',expires_in:3600}:{error:password+email+refresh})});return;
    }
    assert.equal(request.headers().authorization,'Bearer '+jwt);
    if(target.pathname==='/auth/v1/user'){await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({id:uid,email,role:'authenticated',aud:'authenticated',factors:[]})});return;}
    if(target.pathname==='/auth/v1/logout'){logouts++;await route.fulfill({status:scenario==='logout-500'?500:204,headers,...(scenario==='logout-500'?{contentType:'application/json',body:JSON.stringify({error:password+refresh})}:{})});return;}
    const defaults=scenario==='driver-granted'?catalog.ALL.map(p=>p.key):management;
    const flat={uid,accountType:'management',status:'active',role:'super_admin',username:'syntheticmanager',fullName:'SYNTHETIC_PRIVATE_NAME',roleDefaults:defaults,overrides:{},departments:['it']};
    if(scenario==='missing-profile-fields'){delete flat.status;delete flat.fullName;delete flat.username;}
    const data=scenario==='nested-success'?{version:1,uid,account:{uid,type:'management',status:'active',role:'super_admin',username:'syntheticmanager',fullName:'SYNTHETIC_PRIVATE_NAME'},departments:['it'],permissions:{roleDefaults:defaults,overrides:{}},validUntil:Date.now()+60000}:flat;
    await route.fulfill({status:scenario==='access-401'?401:200,headers,contentType:'application/json',body:JSON.stringify(scenario==='access-401'?{error:email+password}:{...data,private_debug:email+refresh+password})});
   });
   await page.goto(gateway+'/login-with-identifier');
   // Same DevTools protocol evaluation used by a browser Snippet; no installed tooling is needed by its owner.
   const session=await page.context().newCDPSession(page);await session.send('Runtime.evaluate',{expression:snippet,awaitPromise:true});
   await page.locator('#broker-username').fill('SyntheticManager');await page.locator('#broker-password').fill(password);await page.getByRole('button',{name:'Run Once and Sign Out'}).click();await page.waitForFunction(()=>!document.querySelector('button[type=button]').disabled,{},{timeout:45000});
   const result=JSON.parse(await page.locator('#broker-summary').inputValue());assert.equal(result.statuses.overall,['flat-success','nested-success'].includes(scenario)?'PASS':'FAIL / NOT VERIFIED');
   const visible=await page.locator('body').innerText(),combined=visible+JSON.stringify(result)+logs.join('');for(const privateValue of [uid,email,password,refresh,jwt,'SYNTHETIC_PRIVATE_NAME'])assert.equal(combined.includes(privateValue),false,'Private fixture leaked');assert.equal(await page.locator('#broker-password').inputValue(),'');assert.equal(await page.locator('#broker-username').inputValue(),'');assert.deepEqual(await page.evaluate(()=>storageWrites),[]);assert.deepEqual(errors,[]);
   if(['flat-success','nested-success'].includes(scenario)){assert.equal(result.counts.management,101);assert.equal(result.counts.driverDenied,6);assert.equal(result.statuses.signout,'PASS');assert.equal(result.statuses.passwordOnly,'PASS');}
   if(['wrong-password','broker-429','broker-503'].includes(scenario))assert.equal(logouts,0);else assert.ok(logouts>0);
   if(scenario==='broker-429')assert.equal(result.http.broker,429);if(scenario==='broker-503')assert.equal(result.http.broker,503);if(scenario==='missing-profile-fields')assert.deepEqual(result.fieldPresence,{activeStatus:false,fullName:false,username:false});
   results.push({scenario,result:'PASS'});await page.close();
  }
  const ipLimit=require('../scripts/lib/public-login-policy.cjs').load().ip.attempts;
  for(const scenario of ['expected','early-denial','no-denial','native-outage','window-rollover']){
   const probe=await browser.newPage();let probeRequests=0;const statuses=[];
   await probe.route('**/*',async route=>{const req=route.request();assert.equal(new URL(req.url()).origin,gateway);if(req.isNavigationRequest()){await route.fulfill({status:405,contentType:'application/json',body:'{}'});return;}const body=req.postDataJSON();assert.match(body.identifier,/^gwprobe[0-9a-f]{32}$/);assert.equal(body.password,'NOT_AN_ACCOUNT_PASSWORD');probeRequests++;
    const status=scenario==='early-denial'?429:scenario==='no-denial'?401:scenario==='native-outage'?503:scenario==='window-rollover'?(probeRequests===ipLimit?429:401):probeRequests<=ipLimit?401:429;statuses.push(status);
    await route.fulfill({status,contentType:'application/json',body:'{"error":"SYNTHETIC_PRIVATE_NOT_FOR_DISPLAY"}'});
   });
   await probe.goto(gateway+'/login-with-identifier');await probe.evaluate(fs.readFileSync(path.resolve(__dirname,'../scripts/_public_gateway/provenance-probes.js'),'utf8').replaceAll('REPLACE_WITH_REVIEWED_WORKER_ORIGIN',gateway));const probeResult=JSON.parse(await probe.locator('pre').innerText());assert.deepEqual(probeResult,{status_pattern:scenario==='expected'?'PASS':'FAIL',http:statuses});assert.equal(probeRequests,ipLimit+1);assert.equal((await probe.locator('body').innerText()).includes('SYNTHETIC_PRIVATE'),false);await probe.close();
  }

  console.log(JSON.stringify({result:'PASS',genuineUsernameAuthenticationVerified:false,scenarios:results,privacy:'No secrets in rendered/copied/logged output or storage; sessions signed out',ownerTooling:'Public gateway browser flow; pinned SDK, mock transport, no installation'},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
