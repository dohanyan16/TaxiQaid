// Run a local server first. Authentication is mocked; no live account or data is used.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const screenshotDir = process.env.TAXIQAID_SCREENSHOTS || path.join(__dirname, '../docs/screenshots');
 fs.mkdirSync(screenshotDir, {recursive:true});
 const browser = await chromium.launch({executablePath:process.env.TAXIQAID_CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox'],
  ...(process.env.HTTPS_PROXY ? {proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}} : {})});
 try {
  const context = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000},timezoneId:'America/Los_Angeles'});
  const page = await context.newPage();
  const errors=[], legacy=[], databaseWrites=[], downloads=[], dialogs=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('request', r=>{
   if (/script\.google|sheets\.google|sheets\.googleapis|docs\.google/.test(r.url())) legacy.push(r.url());
   if (/supabase.co/.test(r.url()) && r.method()!=='GET') databaseWrites.push(r.url());
  });
  page.on('download', d=>downloads.push(d.suggestedFilename()));
  page.on('dialog', d=>{dialogs.push(d.message()); d.accept();});
  await page.route('https://*.supabase.co/**', route=>route.abort());
  await page.goto(process.env.TAXIQAID_URL || 'http://127.0.0.1:8000/');
  await page.waitForFunction(()=>!document.getElementById('boot-status'));
  await page.evaluate(()=>{
   window.authCalls=[]; window.roleAllowed=true;
   supabaseClient.auth.signInWithPassword=async ({email})=>{authCalls.push('login:'+email); return {data:{user:{id:'test-user'}},error:null}};
   supabaseClient.auth.getUser=async()=>({data:{user:{id:'test-user'}},error:null});
   supabaseClient.auth.signOut=async()=>{authCalls.push('logout'); return {error:null}};
   supabaseClient.from=table=>{authCalls.push('role:'+table); return {select:()=>({eq:()=>({maybeSingle:async()=>({data:roleAllowed?{role:'admin'}:null,error:null})})})}};
  });
  async function login() {await page.locator('#username').fill('preview');await page.locator('#password').fill('test-only');await page.locator('#login-button').click();}
  await page.evaluate(()=>window.roleAllowed=false); await login();
  await page.waitForFunction(()=>!document.getElementById('error-message').hidden);
  assert.equal(await page.locator('#erp-app').isVisible(),false);
  await page.evaluate(()=>window.roleAllowed=true); await login();
  await page.waitForFunction(()=>document.getElementById('erp-app').style.display==='flex');
  assert.ok((await page.evaluate(()=>authCalls)).includes('role:taxiqaid_roles'));
  // All sidebar destinations remain usable, including grouped pages.
  const views=await page.locator('.sidebar-menu li[data-view]').evaluateAll(items=>items.map(item=>item.dataset.view));
  async function nav(name) {const link=page.locator(`[data-view="${name}"] a`);await link.evaluate(el=>{const group=el.closest('details');if(group)group.open=true});await link.click();assert.ok(await page.locator('#view-'+name).isVisible());}
  for(const name of views) await nav(name);
  await nav('accidents');
  assert.equal(await page.locator('#view-accidents input[type=time]').count(),0);
  assert.ok(await page.locator('#accidents-table th').allTextContents().then(x=>x.includes('Maintenance Status')));
  await page.locator('#filter-start-date').fill('2026-11-01');await page.locator('#filter-end-date').fill('2026-11-09');
  await page.locator('#accident-search-input').fill('ACD');
  await page.locator('#open-add-accident-modal').click();
  assert.equal(await page.locator('#add-acc-date').inputValue(),'');
  assert.equal(await page.locator('#add-acc-id').inputValue(),'');
  const locations=await page.locator('#add-acc-location option').allTextContents(); assert.equal(locations.length,41);
  await page.locator('#add-acc-najm').selectOption('Yes'); assert.equal(await page.locator('#add-acc-najm-status').isEnabled(),true);
  await page.locator('#save-accident-btn').click();assert.match(await page.locator('#integration-notice').innerText(),/pending/);
  await page.locator('#delete-accident-btn').click();
  await page.keyboard.press('Escape');assert.equal(await page.locator('#add-accident-modal').isVisible(),false);
  await page.locator('#integration-notice button').click();
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'accident-tracker.png')});
  await nav('breakdowns'); await page.locator('[data-open=breakdown-modal]').click();
  assert.deepEqual((await page.locator('#bdw-breakdown-location option').allTextContents()).slice(1),locations.slice(1));
  assert.equal(await page.locator('#bdw-breakdown-symptoms option').count(),13);
  assert.equal(await page.locator('#bdw-maintenance-status').inputValue(),'Not Requested');
  await page.locator('#bdw-send-to-maintenance').selectOption('Yes');
  assert.equal(await page.locator('#bdw-maintenance-status').inputValue(),'Not Requested');
  await page.locator('#bdw-breakdown-description').fill('Unsaved interface review');
  await page.getByRole('button',{name:'Save Breakdown',exact:true}).click();
  await page.locator('#breakdown-modal [data-close]').click();
  await page.locator('#integration-notice button').click();
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'breakdown-tracker.png')});
  await nav('maintenance');
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'maintenance-requests.png')});
  await page.locator('[data-open=request-modal]').click();
  for(const id of ['request-original-source-id','request-source-type','request-original-description','request-linked-maintenance-id']) assert.ok(await page.locator('#'+id).getAttribute('readonly')!==null);
  await page.locator('#request-request-status').selectOption('In Progress');
  assert.ok(await page.locator('#acceptance-modal').isVisible());
  for(const id of ['workorder-maintenance-id','workorder-original-source-id','workorder-original-source-type','workorder-maintenance-request-reference']) {assert.equal(await page.locator('#'+id).inputValue(),'');assert.ok(await page.locator('#'+id).getAttribute('readonly')!==null);}
  assert.deepEqual(await page.locator('#workorder-status option').allTextContents(),['Requested','In Progress','Pending of Component','Pending of Approval','Done']);
  assert.equal(await page.locator('#workorder-breakdown-type option').count(),15);
  assert.deepEqual(await page.locator('#workorder-action-taken option').allTextContents(),['Changed','Repaired','Nothing']);
  await page.locator('#acceptance-modal [data-close]').click();
  if(await page.locator('#request-modal').isVisible())await page.locator('#request-modal [data-close]').click();
  await page.locator('#overview-tab').click();
  assert.ok(await page.locator('#overview-panel').isVisible());
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'maintenance-overview.png')});
  await page.locator('#overview-tab').press('ArrowLeft');assert.ok(await page.locator('#requests-panel').isVisible());
  // Every dependent action reports pending and never downloads a fabricated export.
  for(const name of ['fleet','drivers','accidents','tripcheck','breakdowns','maintenance']) {
   await nav(name);
   for(const button of await page.locator(`#view-${name} button`).all()) {
    const text=await button.innerText();
    if(await button.isVisible() && /Refresh|Export/.test(text)) {await button.click();}
   }
  }
  await nav('tripcheck');
  await page.locator('#open-add-tripcheck-modal').click();assert.ok(await page.locator('#add-tripcheck-modal').isVisible());
  for(let i=0;i<26;i++) await page.locator('#wizard-next-btn').click();
  assert.equal(await page.evaluate(()=>currentWizardStep),27);
  await page.locator('#tc-cancel-signature-btn').click();
  await page.locator('#save-tripcheck-btn').click();
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  for(const name of ['accidents','breakdowns','maintenance']) {await nav(name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),name+' mobile overflow');}
  await page.locator('[data-open=request-modal]').click();
  await page.keyboard.press('Escape');
  if(await page.locator('#integration-notice').count()) await page.locator('#integration-notice button').click();
  await page.locator('#logout-button').click();assert.ok(await page.locator('#login-screen').isVisible());
  assert.ok((await page.evaluate(()=>authCalls)).includes('logout'));
  assert.deepEqual(legacy,[]);assert.deepEqual(databaseWrites,[]);assert.deepEqual(downloads,[]);assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
  assert.equal(await page.evaluate(()=>fleetDatabase.length+driversDatabase.length+accidentsDatabase.length+tripChecksDatabase.length),0);
  console.log(JSON.stringify({result:'PASS',sidebarPages:views.length,uncaughtErrors:errors,legacyRequests:legacy,databaseWrites,downloads,screenshots:screenshotDir,authentication:'Mocked login, role denial, role lookup and logout verified; live credentials not supplied'},null,2));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
