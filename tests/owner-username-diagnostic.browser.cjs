// Real pinned SDK with mocked Auth/diagnostic replies. No genuine database or user login is verified here.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 try{
  const {OWNER_CHECKS}=await import('../supabase/functions/_diagnostics/owner-username-core.mjs'),source=fs.readFileSync(path.resolve(__dirname,'../scripts/_owner_username/dashboard-snippet.js'),'utf8');
  const project='https://mqkflwsvnzcaylxtvsje.supabase.co',uid='00000000-0000-4000-8000-000000000001',email='synthetic-admin@example.invalid',password='SYNTHETIC_PRIVATE_PASSWORD',refresh='SYNTHETIC_PRIVATE_REFRESH';const results=[];
  for(const mode of ['pass','unauthorized','mapping-failure','server-signout-failure','unsafe-response','gateway-rejection','auth-failure','network-failure','logout-failure','wrong-count','http-failure']){
   const page=await browser.newPage(),logs=[],errors=[],requests=[];let logoutCount=0;
   const token=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',aal:'aal1',email,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'c3ludGhldGljLW9ubHk'].join('.');
   page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.storageWrites=[];Storage.prototype.setItem=function(){storageWrites.push('storage');};indexedDB.open=function(){storageWrites.push('indexedDB');throw new Error('Prohibited.');};});
   await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());assert.equal(url.origin,project);requests.push(url.pathname);
    if(request.isNavigationRequest()){await route.fulfill({status:401,contentType:'application/json',body:'{"overall":"FAIL"}',headers:{'Content-Security-Policy':"default-src 'none'; connect-src 'self'; form-action 'none'"}});return;}
    assert.ok(['/auth/v1/token','/auth/v1/user','/auth/v1/logout','/functions/v1/check-owner-username'].includes(url.pathname));
    const user={id:uid,email,aud:'authenticated',role:'authenticated',is_anonymous:false};
    if(url.pathname==='/auth/v1/token'){const submitted=request.postDataJSON();assert.equal(submitted.email,email);assert.equal(submitted.password,password);await route.fulfill({status:mode==='auth-failure'?400:200,contentType:'application/json',body:JSON.stringify(mode==='auth-failure'?{msg:password+email}:{access_token:token,refresh_token:refresh,expires_in:3600,token_type:'bearer',user})});return;}
    assert.equal(request.headers().authorization,'Bearer '+token);
    if(url.pathname==='/auth/v1/user'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)});return;}
    if(url.pathname==='/auth/v1/logout'){logoutCount++;await route.fulfill({status:mode==='logout-failure'?500:204,...(mode==='logout-failure'?{contentType:'application/json',body:JSON.stringify({error:password+refresh})}:{})});return;}
    assert.deepEqual(request.postDataJSON(),{identifier:'dohanyan',password});if(mode==='network-failure'){await route.abort();return;}
    const payload={...Object.fromEntries(OWNER_CHECKS.map(key=>[key,'PASS'])),management_count:101,driver_denied_count:6};
    if(mode==='unauthorized'){payload.administrator_authorization='FAIL';payload.overall='FAIL';}
    if(mode==='mapping-failure'){payload.private_mapping='FAIL';payload.overall='FAIL';}
    if(mode==='server-signout-failure'){payload.server_signout='FAIL';payload.overall='FAIL';}
    if(mode==='wrong-count')payload.management_count=100;
    if(mode==='unsafe-response')payload.private_debug=password+email+refresh+uid;
    await route.fulfill({status:mode==='unauthorized'?403:mode==='gateway-rejection'?401:mode==='http-failure'?503:200,contentType:'application/json',body:JSON.stringify(mode==='gateway-rejection'?{error:password+email}:payload)});
   });
   await page.goto(project+'/functions/v1/check-owner-username');const cdp=await page.context().newCDPSession(page);await cdp.send('Runtime.evaluate',{expression:source,awaitPromise:true});
   assert.equal(await page.locator('#owner-email').getAttribute('type'),'password');await page.locator('#owner-email').fill(email);await page.locator('#owner-password').fill(password);await page.getByRole('button',{name:'Run Once and Sign Out'}).click();await page.waitForFunction(()=>!document.querySelector('button[type=button]').disabled,{},{timeout:45000});
   const summary=JSON.parse(await page.locator('#owner-summary').inputValue());assert.equal(summary.overall,mode==='pass'?'PASS':'FAIL');assert.ok(Object.entries(summary).every(([key,value])=>key.endsWith('_count')?Number.isInteger(value):['PASS','FAIL'].includes(value)));
   const combined=JSON.stringify(summary)+await page.locator('body').innerText()+logs.join('');for(const privateValue of [uid,email,password,refresh,token])assert.equal(combined.includes(privateValue),false,'Private fixture leaked');assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>storageWrites),[]);assert.equal(await page.locator('#owner-email').inputValue(),'');assert.equal(await page.locator('#owner-password').inputValue(),'');
   assert.equal(requests.some(url=>/login-with-identifier|get-my-access|rest\/v1/.test(url)),false);if(mode!=='auth-failure')assert.ok(logoutCount>0);if(mode==='logout-failure')assert.equal(summary.browser_signout,'FAIL');
   results.push({scenario:mode,result:'PASS'});await page.close();
  }
  console.log(JSON.stringify({result:'PASS',liveUsernameVerified:false,scenarios:results,privacy:'Masked/cleared fields, no storage, status-only output, automatic local sign-out',publicLoginBrokerCalls:0,browserAccessFunctionCalls:0},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
