// Real pinned SDK/operator script, virtual clock and isolated request fixtures. Never hosted evidence.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),results=[],origin='https://review.example.workers.dev',project='https://mqkflwsvnzcaylxtvsje.supabase.co',uid='00000000-0000-4000-8000-000000000001',email='synthetic-private@example.invalid',password='SYNTHETIC_PRIVATE_PASSWORD';
 const snippet=fs.readFileSync('scripts/_auth_validation/dashboard-snippet.js','utf8').replaceAll('REPLACE_WITH_REVIEWED_WORKER_ORIGIN',origin),time=new Date('2026-11-15T22:02:01Z');
 try{
  // Actual browser -> loopback HTTP receipt, without Playwright fulfillment: none of these
  // four names is blocked by this Chromium Fetch implementation. No real IP/token is sent.
  const names=['cf-connecting-ip','x-real-ip','x-forwarded-for','x-taxiqaid-ip'],server=http.createServer((request,response)=>{
   if(request.method==='POST'&&request.url==='/header-check'){response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(names.map(name=>Object.hasOwn(request.headers,name))));}
   else{response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><title>Local synthetic headers</title>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const probe=await browser.newPage();
  try{await probe.goto('http://127.0.0.1:'+server.address().port+'/');assert.deepEqual(await probe.evaluate(async()=>await(await fetch('/header-check',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'198.51.100.41','x-real-ip':'198.51.100.42','x-forwarded-for':'198.51.100.43','x-taxiqaid-ip':'198.51.100.44'},body:'{}'})).json()),[true,true,true,true]);results.push('actual-loopback-receipt-of-four-client-headers');}
  finally{await probe.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  for(const scenario of ['success','legacy-cf-header','control-403','health-fail','window-change','logout-fail','bootstrap-fail','bootstrap-lost','expired-grant','private-output']){
  const page=await browser.newPage(),errors=[],logs=[],requests=[];let controls=0,logout=0;
  await page.clock.install({time});page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>logs.push(message.text()));
  await page.addInitScript(()=>{window.storageWrites=[];Storage.prototype.setItem=function(){storageWrites.push('storage');};indexedDB.open=function(){storageWrites.push('indexedDB');throw new Error('Prohibited.');};});
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());requests.push(url.pathname);assert.equal(url.origin,url.pathname==='/login-with-identifier'||url.pathname==='/auth-validation'?origin:project);
   if(request.isNavigationRequest()){await route.fulfill({status:405,contentType:'application/json',headers:{'Content-Security-Policy':"default-src 'none'; connect-src 'self' https://mqkflwsvnzcaylxtvsje.supabase.co; form-action 'none'"},body:'{}'});return;}
   if(url.pathname==='/auth/v1/token'){
    assert.equal(url.search,'?grant_type=password');const body=request.postDataJSON();assert.equal(body.email,email);assert.equal(body.password,password);
    if(scenario==='bootstrap-fail'){await route.fulfill({status:400,contentType:'application/json',body:'{"msg":"Synthetic rejection."}'});return;}
    if(scenario==='bootstrap-lost'){await route.abort('failed');return;}
    const jwt=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:time.getTime()/1000+3600,aal:'aal1',role:'authenticated',aud:'authenticated',email})).toString('base64url'),'c3ludGhldGlj'].join('.');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:jwt,refresh_token:'SYNTHETIC_PRIVATE_REFRESH',expires_in:3600,token_type:'bearer',user:{id:uid,email,aud:'authenticated',role:'authenticated'}})});return;
   }
   if(url.pathname==='/auth/v1/logout'){logout++;await route.fulfill({status:scenario==='logout-fail'?500:204,...(scenario==='logout-fail'?{contentType:'application/json',body:'{"msg":"Synthetic logout failure."}'}:{})});return;}
   assert.equal(url.pathname,'/auth-validation');controls++;assert.ok(controls<=6);assert.ok(request.headers().authorization?.startsWith('Bearer '));const name=request.postDataJSON().case;
   if(scenario==='control-403'){await route.fulfill({status:403,contentType:'application/json',body:'{"result":"FAIL"}'});return;}
   if(name==='ip-spoof'){
    for(const header of ['x-real-ip','x-forwarded-for','x-taxiqaid-ip'])assert.ok(request.headers()[header]);
    // Explicit synthetic edge negative control. Playwright/workerd do not reproduce hosted ingress.
    // The legacy helper's four-header request can be rejected before any Worker or broker control.
    if(request.headers()['cf-connecting-ip']){assert.equal(scenario,'legacy-cf-header');await route.fulfill({status:403,contentType:'text/html',body:'<!doctype html><title>Error 1000</title>'});return;}
    assert.notEqual(scenario,'legacy-cf-header');
   }
   const now=await page.evaluate(()=>Date.now()),minute=Math.floor(now/60000)+(scenario==='window-change'&&name==='ip-spoof'?1:0),spec={
    'ip-base':[10,10,0,false,'IP_BASE',30,2], 'ip-spoof':[2,1,1,true,'IP_SPOOF',22,2],
    'global-db':[22,21,1,true,'SQL_GLOBAL_ONLY',42,2],replay:[7,5,2,true,'SIGNED_SQL_REPLAY',39,4],
    'identifier-base':[3,3,0,false,'IDENTIFIER_BASE',23,2],'identifier-finish':[9,8,1,true,'IDENTIFIER_FINISH',29,2]
   }[name];assert.ok(spec);const [probes,allowed,denied,canary,scope,sqlQueries,sqlTransactions]=spec;
   const value={case:name,result:scenario==='health-fail'?'FAIL':'PASS',scope,probes,allowed,denied,canary,dbMinute:minute,dbQuarter:Math.floor(minute/15),expiresAt:scenario==='expired-grant'?Math.floor(now/1000)-1:Math.floor(time.getTime()/900000)*900+890,sqlQueries,sqlTransactions};if(scenario==='private-output')value.email=email;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
  });
  const legacy=snippet.replace("...(spoof?{'x-real-ip'","...(spoof?{'cf-connecting-ip':'198.51.100.41','x-real-ip'");assert.notEqual(legacy,snippet);
  await page.goto(origin+'/login-with-identifier');await page.evaluate(scenario==='legacy-cf-header'?legacy:snippet);await page.locator('#validation-email').fill(email);await page.locator('#validation-password').fill(password);await page.locator('button[type=submit]').click();
  for(let n=0;n<6;n++){
   await page.waitForFunction(()=>['WAITING_FOR_SAFE_WINDOW','PASS','FAIL_OR_INCONCLUSIVE'].includes(document.querySelector('#validation-status')?.textContent));
   if(await page.locator('#validation-status').innerText()!=='WAITING_FOR_SAFE_WINDOW')break;
   await page.clock.fastForward(62000);
  }
  await page.waitForFunction(()=>!document.querySelector('button[type=button]').disabled);const text=await page.locator('#validation-summary').inputValue(),report=JSON.parse(text);
  assert.equal(report.result,scenario==='success'?'PASS':'FAIL_OR_INCONCLUSIVE');assert.equal(report.http.bootstrap,1);assert.ok(report.http.control<=6&&report.http.logout<=2);assert.equal(requests.filter(p=>p==='/auth/v1/user').length,0);assert.equal(logout,scenario.startsWith('bootstrap-')?0:scenario==='logout-fail'?2:1);
  assert.equal(controls,scenario==='success'||scenario==='logout-fail'?6:scenario.startsWith('bootstrap-')?0:['window-change','legacy-cf-header'].includes(scenario)?2:1);if(scenario==='bootstrap-lost')assert.equal(report.cleanup,'UNCONFIRMED');
  if(scenario==='legacy-cf-header'){assert.equal(report.bootstrap,'PASS');assert.equal(report.cases['ip-base'].result,'PASS');assert.deepEqual(report.cases['ip-spoof'],{result:'FAIL',http:403});assert.equal(report.cleanup,'PASS');assert.deepEqual(Object.keys(report.cases),['ip-base','ip-spoof']);}
  for(const secret of [uid,email,password,'SYNTHETIC_PRIVATE_REFRESH','Bearer '])assert.equal((text+logs.join('\n')).includes(secret),false);assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>storageWrites),[]);assert.equal(await page.locator('#validation-email').inputValue(),'');assert.equal(await page.locator('#validation-password').inputValue(),'');results.push(scenario);await page.close();
 }
 console.log(JSON.stringify({result:'PASS',localOnly:true,realSdk:true,hostedEvidence:false,cases:results},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
