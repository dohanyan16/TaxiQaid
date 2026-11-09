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
  await nav('fuel');
  assert.deepEqual(await page.locator('#fuel-table th').allTextContents(),[
   'Date','Time','Car Plate','Car Model','Driver Iqama','Driver Name','Driver Arrangement',
   'Fueled In','Outside Depot Location','Fuel Received (L)','Fuel Pricing (SAR/L)','Total Amount (SAR)'
  ]);
  await page.locator('#fuel-search-input').fill('No connected driver');
  assert.equal(await page.locator('#fuel-table tbody tr').count(),1);
  assert.match(await page.locator('#fuel-table tbody').innerText(),/No records available/);
  await page.locator('#fuel-search-input').fill('');
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'fuel-tracker.png')});
  await page.locator('#open-fuel-modal').click();
  const fuelFields=['fuel-date','fuel-time','fuel-plate','fuel-model','fuel-iqama','fuel-driver-name',
   'fuel-driver-arrangement','fuel-fueled-in','fuel-outside-location','fuel-received','fuel-price','fuel-total'];
  for(const id of fuelFields) assert.equal(await page.locator('#'+id).count(),1);
  for(const id of ['fuel-record-id','fuel-model','fuel-driver-name','fuel-driver-arrangement']) {
   assert.notEqual(await page.locator('#'+id).getAttribute('readonly'),null);
   assert.equal(await page.locator('#'+id).inputValue(),'');
  }
  assert.equal(await page.locator('#fuel-plate option').count(),1);
  assert.equal(await page.locator('#fuel-iqama option').count(),1);
  assert.deepEqual(await page.locator('#fuel-fueled-in option').allTextContents(),['Depot','Outside Depot']);
  assert.equal(await page.locator('#fuel-outside-location').isDisabled(),true);
  assert.notEqual(await page.locator('#fuel-price').getAttribute('readonly'),null);
  assert.equal(await page.locator('#fuel-price').inputValue(),'2.18');
  await page.locator('#fuel-received').fill('50');
  assert.equal(await page.locator('#fuel-total').innerText(),'SAR 109.00');
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'fuel-form-preview.png')});
  await page.locator('#fuel-fueled-in').selectOption('Outside Depot');
  assert.equal(await page.locator('#fuel-price').inputValue(),'');
  assert.equal(await page.locator('#fuel-outside-location').isEnabled(),true);
  assert.equal(await page.locator('#fuel-price').getAttribute('readonly'),null);
  assert.equal(await page.locator('#fuel-price').evaluate(el=>el.required),true);
  assert.equal(await page.locator('#fuel-outside-location').evaluate(el=>el.required),true);
  await page.locator('#save-fuel-btn').click();
  assert.equal(await page.locator('#fuel-form').evaluate(el=>el.checkValidity()),false);
  assert.match(await page.locator('#integration-notice').innerText(),/pending/);
  await page.locator('#fuel-outside-location').fill('   ');
  await page.locator('#fuel-price').fill('2.33');
  assert.equal(await page.locator('#fuel-form').evaluate(el=>el.checkValidity()),false);
  await page.locator('#fuel-outside-location').fill('Unsaved location preview');
  assert.equal(await page.locator('#fuel-form').evaluate(el=>el.checkValidity()),true);
  assert.equal(await page.locator('#fuel-total').innerText(),'SAR 116.50');
  await page.locator('#fuel-received').fill('0.1');await page.locator('#fuel-price').fill('0.2');
  assert.equal(await page.locator('#fuel-total').innerText(),'SAR 0.02');
  await page.locator('#fuel-received').fill('1');await page.locator('#fuel-price').fill('1.005');
  assert.equal(await page.locator('#fuel-total').innerText(),'SAR 1.01');
  for(const invalid of ['0','-1','']) {
   await page.locator('#fuel-price').fill(invalid);
   assert.match(await page.locator('#fuel-total').innerText(),/Unavailable/);
   assert.equal(await page.locator('#fuel-form').evaluate(el=>el.checkValidity()),false);
  }
  await page.locator('#fuel-price').fill('2.33');
  await page.locator('#fuel-received').fill('-1');
  assert.match(await page.locator('#fuel-total').innerText(),/Unavailable/);
  await page.locator('#fuel-received').fill('50');
  await page.locator('#save-fuel-btn').click();
  assert.equal(await page.locator('#fuel-modal').isVisible(),true);
  assert.equal(await page.locator('#fuel-table tbody tr').count(),1);
  await page.locator('#fuel-fueled-in').selectOption('Depot');
  assert.equal(await page.locator('#fuel-price').inputValue(),'2.18');
  assert.equal(await page.locator('#fuel-outside-location').inputValue(),'');
  assert.equal(await page.locator('#fuel-outside-location').isDisabled(),true);
  assert.equal(await page.locator('#fuel-total').innerText(),'SAR 109.00');
  await page.locator('#close-fuel-modal').click();
  assert.equal(await page.locator('#open-fuel-modal').evaluate(el=>el===document.activeElement),true);
  await page.locator('#preview-fuel-details').click();
  assert.match(await page.locator('#fuel-modal-title').innerText(),/Details.*Empty Preview/);
  assert.equal(await page.locator('#fuel-received').isDisabled(),true);
  assert.equal(await page.locator('#fuel-record-id').inputValue(),'');
  await page.locator('#edit-fuel-preview').click();
  assert.match(await page.locator('#fuel-modal-title').innerText(),/Edit Fuel Record/);
  assert.equal(await page.locator('#fuel-received').isEnabled(),true);
  assert.equal(await page.locator('#fuel-received').inputValue(),'');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#fuel-modal').isVisible(),false);
  await page.locator('#integration-notice button').click();
  await page.clock.setFixedTime(new Date('2025-03-31T20:59:59Z'));
  await nav('ncr');
  assert.equal(await page.locator('#view-ncr [role=tab]').count(),2);
  assert.equal(await page.locator('#ncr-scores-panel').isVisible(),true);
  assert.deepEqual(await page.locator('#ncr-scores-table th').allTextContents(),[
   'Driver Iqama','Driver Name','Driver Phone Number','Starting Points','Total NCRs','Active NCRs','Expired NCRs','Active Points Deducted','Current Points']);
  await page.locator('#ncr-score-search').fill('Unsaved filter');
  await page.locator('#ncr-points-exact').fill('-10');
  await page.locator('#ncr-points-min').fill('-50');
  await page.locator('#ncr-points-max').fill('0');
  assert.match(await page.locator('#ncr-score-filter-status').innerText(),/No driver scores/);
  await page.locator('#preview-ncr-driver').click();
  assert.equal(await page.locator('#ncr-driver-modal').isVisible(),true);
  for(const id of ['ncr-detail-iqama','ncr-detail-name','ncr-detail-phone','ncr-detail-starting','ncr-detail-current']) {
   assert.notEqual(await page.locator('#'+id).getAttribute('readonly'),null);
   assert.equal(await page.locator('#'+id).inputValue(),'');
  }
  assert.match(await page.locator('#ncr-active-history').innerText(),/No active NCR history/);
  assert.match(await page.locator('#ncr-expired-history').innerText(),/No expired NCR history/);
  await page.keyboard.press('Escape');
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'ncr-driver-scores.png')});
  await page.locator('#ncr-tracker-tab').click();
  assert.equal(await page.locator('#ncr-tracker-panel input[type=time]').count(),0);
  assert.deepEqual(await page.locator('#ncr-records-table th').allTextContents(),[
   'NCR ID','Driver Iqama','Driver Name','Driver Phone Number','Category','NCR Score','NCR Description','NCR Date',
   'TBT Status','TBT Conducted Date','Action Taken','Action Taken Date','Non-Compliance Expiry Date','Non-Compliance Status','Individual Statement','Remarks']);
  await page.locator('#ncr-filter-start').fill('2025-01-01');await page.locator('#ncr-filter-end').fill('2025-04-01');
  await page.locator('#ncr-filter-driver').fill('Unsaved name filter');
  await page.locator('#ncr-filter-status').selectOption('Expired');await page.locator('#ncr-filter-tbt').selectOption('Conducted');
  await page.locator('#ncr-scores-tab').click();
  assert.equal(await page.locator('#ncr-points-exact').inputValue(),'-10');
  assert.equal(await page.locator('#ncr-points-min').inputValue(),'-50');
  assert.equal(await page.locator('#ncr-points-max').inputValue(),'0');
  assert.equal(await page.locator('#ncr-score-search').inputValue(),'Unsaved filter');
  await page.locator('#ncr-scores-tab').press('ArrowRight');
  assert.equal(await page.locator('#ncr-filter-status').inputValue(),'Expired');
  assert.equal(await page.locator('#ncr-filter-tbt').inputValue(),'Conducted');
  assert.equal(await page.locator('#ncr-filter-start').inputValue(),'2025-01-01');
  assert.equal(await page.locator('#ncr-filter-driver').inputValue(),'Unsaved name filter');
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'ncr-tracker.png')});
  await page.locator('#open-ncr-modal').click();
  assert.equal(await page.locator('#ncr-category option:not([value=""])').count(),23);
  assert.ok((await page.locator('#ncr-category option').allTextContents()).slice(1).every(label=>/\(-(?:50|25|10) pt\)$/.test(label)));
  for(const id of ['ncr-id','ncr-driver-name','ncr-driver-phone','ncr-reported-by','ncr-reporting-date','ncr-reporting-time','ncr-modified-by','ncr-modified-at']) {
   assert.notEqual(await page.locator('#'+id).getAttribute('readonly'),null);
   assert.equal(await page.locator('#'+id).inputValue(),'');
  }
  for(const [key,score] of [['cctv-tampering','-50 pt'],['asset-damage','-25 pt'],['mdt-black-shift','-10 pt']]) {
   await page.locator('#ncr-category').selectOption(key);assert.equal(await page.locator('#ncr-score').inputValue(),score);
  }
  await page.locator('#ncr-date').fill('2025-01-01');
  assert.equal(await page.locator('#ncr-expiry-date').inputValue(),'2025-04-01');
  assert.equal(await page.locator('#ncr-expiry-status').inputValue(),'Active');
  assert.equal(await page.locator('#ncr-tbt-status').inputValue(),'Pending');
  // KSA midnight changes the unsaved preview automatically, with no Refresh click.
  await page.clock.setFixedTime(new Date('2025-03-31T21:00:00Z'));
  await page.waitForFunction(()=>document.getElementById('ncr-expiry-status').value==='Expired');
  await page.locator('#ncr-tbt-date').fill('2025-03-01');
  assert.equal(await page.locator('#ncr-tbt-status').inputValue(),'Conducted');
  assert.equal(await page.locator('#ncr-expiry-status').inputValue(),'Expired');
  await page.locator('#ncr-tbt-date').fill('');
  assert.equal(await page.locator('#ncr-tbt-status').inputValue(),'Pending');
  assert.deepEqual((await page.locator('#ncr-action option').allTextContents()).slice(1),['TBT Conducted','1st NCR Initiated','2nd NCR Initiated','3rd NCR Initiated']);
  await page.locator('#ncr-action').selectOption('3rd NCR Initiated');
  assert.equal(await page.locator('#ncr-tbt-status').inputValue(),'Pending');
  await page.locator('#ncr-date').fill('2025-04-02');
  assert.equal(await page.locator('#ncr-expiry-status').inputValue(),'');
  assert.match(await page.locator('#ncr-calculation-status').innerText(),/Future.*not yet active/);
  await page.locator('#ncr-date').fill('2024-02-29');
  assert.equal(await page.locator('#ncr-expiry-date').inputValue(),'2024-05-29');
  await page.locator('#ncr-description').fill('Unsaved form preview only');
  await page.locator('#save-ncr-btn').click();
  assert.equal(await page.locator('#ncr-save-status').innerText(),'Database integration pending — NCR not saved.');
  assert.equal(await page.locator('#ncr-modal').isVisible(),true);
  assert.equal(await page.locator('#ncr-records-table tbody tr').count(),1);
  await page.locator('#close-ncr-modal').click();
  await page.locator('#preview-ncr-record').click();
  assert.equal(await page.locator('#ncr-description').isDisabled(),true);
  assert.equal(await page.locator('#ncr-id').inputValue(),'');
  await page.locator('#edit-ncr-preview').click();
  assert.equal(await page.locator('#ncr-description').isEnabled(),true);
  await page.locator('#delete-ncr-preview').click();
  assert.equal(await page.locator('#ncr-save-status').innerText(),'Database integration pending — NCR not deleted.');
  await page.keyboard.press('Escape');
  await nav('penalties');
  assert.equal(await page.locator('#view-penalties h2').first().innerText(),'Penalties Tracker');
  assert.deepEqual(await page.locator('#penalties-main-actions button').allTextContents(),['Refresh','Export by Period']);
  assert.deepEqual(await page.locator('#penalties-table th').allTextContents(),['ID','Details','Date','Time','Car Plate','Driver Iqama','Driver Name','Amount','Charged To']);
  assert.equal(await page.locator('#view-penalties input[type=time]').count(),0);
  for(const id of ['penalties-search-input','penalties-start-date','penalties-end-date']) assert.equal(await page.locator('#'+id).isVisible(),true);
  assert.equal(await page.locator('#penalties-table-body').innerText(),'No penalties available — database integration pending.');
  assert.equal(await page.locator('#view-penalties button, #penalty-details-modal button').allTextContents().then(labels=>labels.some(label=>/Add|New|Edit|Delete|Save/.test(label))),false);
  await page.locator('#penalties-search-input').fill('Unsaved combined filter');
  await page.locator('#penalties-start-date').fill('2026-01-10');await page.locator('#penalties-end-date').fill('2026-01-11');
  for(const id of ['refresh-penalties-btn','export-penalties-btn']) {
   await page.locator('#'+id).click();assert.match(await page.locator('#integration-notice').innerText(),/Database integration pending/);
  }
  await page.locator('#integration-notice button').click();
  await nav('dashboard');await nav('penalties');
  assert.equal(await page.locator('#penalties-search-input').inputValue(),'Unsaved combined filter');
  assert.equal(await page.locator('#penalties-start-date').inputValue(),'2026-01-10');
  assert.equal(await page.locator('#penalties-end-date').inputValue(),'2026-01-11');
  await page.screenshot({animations:'disabled',path:path.join(screenshotDir,'penalties-tracker.png')});
  await page.locator('#penalties-end-date').fill('2026-01-09');
  assert.match(await page.locator('#penalties-filter-status').innerText(),/on or before/);
  await page.locator('#clear-penalties-filters').click();
  for(const id of ['penalties-search-input','penalties-start-date','penalties-end-date']) assert.equal(await page.locator('#'+id).inputValue(),'');
  // Synthetic renderer fixtures are injected only by this test, then removed.
  // No application fixture, import connection or source record store is created.
  await page.evaluate(()=>{
   window.penaltyTestRecord=Object.freeze({ID:'test-only-reference',Details:'<img src=x onerror="window.penaltyXss=true">'+ 'Long description '.repeat(500),
    Date:'2026-01-10',Time:'23:59:59','Car Plate':'test-only-plate','Driver Iqama':'test-only-iqama',
    'Driver Name':'Synthetic test driver',Amount:12.5,'Charged To':'  arbitrary source value <literal>  '});
   document.getElementById('penalties-table-body').replaceChildren(TaxiQaidPenalties.buildReadOnlyRow(penaltyTestRecord,TaxiQaidPenaltiesView.openDetails));
  });
  assert.equal(await page.locator('#penalties-table-body td').count(),9);
  assert.equal(await page.locator('#penalties-table-body img').count(),0);
  assert.equal(await page.locator('#penalties-table-body td').nth(7).innerText(),'SAR 12.50');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Long Details page overflow');
  await page.locator('#penalties-table-body tr').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#penalty-details-modal').isVisible(),true);
  assert.deepEqual(await page.locator('#penalty-details-modal button').allTextContents(),['Close']);
  assert.equal(await page.locator('#penalty-details-modal input, #penalty-details-modal select, #penalty-details-modal textarea, #penalty-details-modal form').count(),0);
  assert.equal(await page.locator('#penalty-detail-description').textContent(),await page.evaluate(()=>penaltyTestRecord.Details));
  assert.equal(await page.locator('#penalty-detail-charged-to').textContent(),await page.evaluate(()=>penaltyTestRecord['Charged To']));
  assert.equal(await page.locator('#penalty-detail-time').innerText(),'23:59:59');
  assert.equal(await page.locator('#penalty-detail-amount').innerText(),'SAR 12.50');
  assert.equal(await page.locator('#penalty-details-modal img').count(),0);
  assert.equal(await page.evaluate(()=>window.penaltyXss),undefined);
  await page.locator('#close-penalty-details').click();
  assert.equal(await page.locator('#penalties-table-body tr').evaluate(el=>document.activeElement===el),true);
  await page.locator('#clear-penalties-filters').click();
  await page.evaluate(()=>{delete window.penaltyTestRecord});
  assert.equal(await page.locator('#penalties-table-body').innerText(),'No penalties available — database integration pending.');
  // Every dependent action reports pending and never downloads a fabricated export.
  for(const name of ['fleet','drivers','accidents','tripcheck','breakdowns','maintenance','fuel','ncr','penalties']) {
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
  for(const name of ['accidents','breakdowns','maintenance','ncr','penalties']) {await nav(name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),name+' mobile overflow');}
  await nav('penalties');
  assert.ok(await page.locator('#view-penalties .tracker-table-container').evaluate(el=>el.scrollWidth>el.clientWidth),'Penalties should scroll within its own container');
  await page.evaluate(()=>TaxiQaidPenaltiesView.openDetails({}));
  assert.ok(await page.locator('#penalty-details-modal .modal-content').evaluate(el=>el.getBoundingClientRect().right<=window.innerWidth),'Penalty mobile dialog overflow');
  assert.deepEqual(await page.locator('#penalty-details-modal button').allTextContents(),['Close']);
  await page.keyboard.press('Escape');
  await nav('ncr');
  await page.locator('#ncr-tracker-tab').click();
  await page.locator('#open-ncr-modal').click();
  assert.ok(await page.locator('#ncr-modal .modal-content').evaluate(el=>el.getBoundingClientRect().right<=window.innerWidth),'NCR mobile dialog overflow');
  await page.keyboard.press('Escape');
  await nav('fuel');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Fuel mobile overflow');
  await page.locator('#open-fuel-modal').click();
  assert.ok(await page.locator('#fuel-modal .modal-content').evaluate(el=>el.getBoundingClientRect().right<=window.innerWidth),'Fuel mobile dialog overflow');
  await page.locator('#fuel-fueled-in').selectOption('Outside Depot');
  await page.keyboard.press('Escape');
  await nav('maintenance');
  await page.locator('[data-open=request-modal]').click();
  await page.keyboard.press('Escape');
  if(await page.locator('#integration-notice').count()) await page.locator('#integration-notice button').click();
  await page.locator('#logout-button').click();assert.ok(await page.locator('#login-screen').isVisible());
  assert.ok((await page.evaluate(()=>authCalls)).includes('logout'));
  assert.deepEqual(legacy,[]);assert.deepEqual(databaseWrites,[]);assert.deepEqual(downloads,[]);assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
  assert.equal(await page.evaluate(()=>fleetDatabase.length+driversDatabase.length+accidentsDatabase.length+tripChecksDatabase.length),0);
  console.log(JSON.stringify({result:'PASS',sidebarPages:views.length,penalties:'Read-only actions/details, four retained filters, inclusive dates, nine columns, long text safety, currency, keyboard navigation and mobile layout passed',ncr:'Two views, retained filters, 23 categories, expiry, KSA day rollover, TBT independence, empty details/editing and mobile dialogs passed',fuel:'Fields, Depot/Outside Depot conditions, validation, live SAR totals, empty details/edit previews and mobile dialog passed',uncaughtErrors:errors,legacyRequests:legacy,databaseWrites,downloads,screenshots:screenshotDir,authentication:'Mocked login, role denial, role lookup and logout verified; live credentials not supplied'},null,2));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
