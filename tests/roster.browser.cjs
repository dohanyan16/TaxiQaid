// Local file workflows only. All committed fixtures are synthetic; private references use environment paths.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {rows,workbook}=require('./roster-fixtures.cjs'),JSZip=require('../assets/vendor/roster/jszip.min.js');
(async()=>{
 const output=process.env.TAXIQAID_ROSTER_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'taxiqaid-roster-'));
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.TAXIQAID_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 try {
  const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width:1440,height:1050}}),errors=[],legacy=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/script\.google|sheets\.google|sheets\.googleapis|docs\.google|drive\.google|whatsapp|facebook\.com|graph\.facebook/.test(r.url()))legacy.push(r.url());if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
  await page.addInitScript(()=>{window.moduleStorageWrites=[];const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){moduleStorageWrites.push(key);return set.call(this,key,value);};const open=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{moduleStorageWrites.push('indexedDB:'+args[0]);return open(...args);};});
  await page.route('https://*.supabase.co/**',r=>r.abort());// Legacy compatibility fixture: release defaults to dedicated Auth, but this suite tests the disabled legacy path.
   await page.route('**/shared/auth-dedicated-config.js*',route=>route.fulfill({contentType:'text/javascript',body:"window.TAXIQAID_DEDICATED_AUTH=Object.freeze({enabled:false});"}));
   await page.goto(process.env.TAXIQAID_URL||'http://127.0.0.1:8002/');await page.waitForFunction(()=>!document.getElementById('boot-status'));
  await page.evaluate(()=>{moduleStorageWrites=[];supabaseClient.auth.signInWithPassword=async()=>({data:{user:{id:'test-only'}},error:null});supabaseClient.auth.signOut=async()=>({error:null});supabaseClient.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'},error:null})})})});});
  await page.locator('#username').fill('preview');await page.locator('#password').fill('test-only');await page.locator('#login-button').click();await page.waitForFunction(()=>TaxiQaidAccess.hasLegacyManagementSession());await require('./lazy-fixtures.cjs').initializeAuthorized(page);
  const requested=[];page.on('request',r=>requested.push(new URL(r.url()).pathname));
  await page.locator('[data-view=roster] a').evaluate(el=>el.closest('details').open=true);await page.locator('[data-view=roster] a').click();await page.locator('#view-roster.active[data-ready=true]').waitFor();
  assert.match(await page.locator('#view-roster').innerText(),/Roster Management[\s\S]*Coming Soon/);
  assert.equal(await page.locator('#view-roster input,#view-roster button,#view-roster table').count(),0);
  assert.equal(await page.locator('script[src*=roster-model],script[src*=roster-worker],link[href*=roster]').count(),0);
  assert.equal(requested.some(p=>/roster-(worker|model|pdf)|roster\.css/.test(p)),false);
  assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);assert.deepEqual(writes,[]);
  assert.deepEqual(await page.evaluate(()=>moduleStorageWrites),[]);
  console.log(JSON.stringify({result:'PASS',roster:'Coming Soon; no operational controls, model, worker, styles or network writes',errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
