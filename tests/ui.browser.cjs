// Visual/search regression audit. Synthetic search fixtures exist only in this test harness.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const output=process.env.TAXIQAID_SCREENSHOTS || '/tmp/taxiqaid-ui-review';fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.TAXIQAID_CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 try {
  const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width:1440,height:1050}});
  const errors=[],legacy=[],writes=[],downloads=[];
  const retiredRequests=[], brokenModuleResources=[];
  page.on('request', request=>{if(request.url().includes('/modules/people/driver-weekly-schedule/'))retiredRequests.push(request.url());});
  page.on('response', response=>{if(/\/(?:modules|shared)\/.*\.(?:html|css|js)(?:[?#].*)?$/.test(response.url())&&response.status()>=400)brokenModuleResources.push({url:response.url(),status:response.status()});});
  page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()));
  page.on('request',r=>{if(/script\.google|sheets\.google|docs\.google/.test(r.url()))legacy.push(r.url());if(/supabase.co/.test(r.url())&&r.method()!=='GET')writes.push(r.url());});
  await page.route('https://*.supabase.co/**',r=>r.abort());
  await page.goto(process.env.TAXIQAID_URL || 'http://127.0.0.1:8001/');await page.waitForFunction(()=>!document.getElementById('boot-status'));
  await page.evaluate(()=>{
   supabaseClient.auth.signInWithPassword=async()=>({data:{user:{id:'test-only'}},error:null});
   supabaseClient.auth.signOut=async()=>({error:null});
   supabaseClient.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'},error:null})})})});
  });
  await page.locator('#username').fill('preview');await page.locator('#password').fill('test-only');await page.locator('#login-button').click();
  await page.waitForFunction(()=>document.getElementById('erp-app').style.display==='flex');
  async function nav(view){const link=page.locator(`[data-view="${view}"] a`);await link.evaluate(el=>{const group=el.closest('details');if(group)group.open=true;});await link.click();}
  const views=await page.locator('[data-view]').evaluateAll(nodes=>nodes.map(n=>n.dataset.view));
  assert.equal(views.length,18);assert.equal(views.includes('driver-weekly-schedule'),false);
  assert.equal(await page.locator('#view-driver-weekly-schedule').count(),0);
  const screenshotViews=['dashboard','fleet','drivers','accidents','breakdowns','maintenance','fuel','ncr','penalties','tripcheck','driver-appeals','training','driver-deductions','roster','customer-care','helpdesk','driver-portal-preview','user-management'];
  const pdfHash=crypto.createHash('sha256').update(await page.evaluate(()=>createTripCheckPdf.toString())).digest('hex');
  assert.equal(pdfHash,'f3ca12a764f62d34862e4a1893c0cf9511a27ebf162e56541370a9b68af9218a','Custom PDF source changed');
  assert.equal(await page.locator('#sidebar-toggle').innerText(),'‹');
  await page.locator('#sidebar-toggle').click();assert.equal(await page.locator('#sidebar').evaluate(el=>el.classList.contains('collapsed')),true);assert.equal(await page.locator('#sidebar-toggle').innerText(),'›');
  await page.locator('#sidebar-toggle').click();assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'true');
  // Test the shared component with isolated fixtures, never module data arrays.
  await page.evaluate(()=>{
   const host=document.createElement('section');host.id='search-harness';host.className='card';
   const label=document.createElement('label');label.htmlFor='harness-input';label.textContent='Harness Search';
   const input=document.createElement('input');input.id='harness-input';host.append(label,input);document.getElementById('module-views').prepend(host);
   const records=[{'Accident ID':'ACD-00001','Car Plate':'AbC - 123','Driver Name':'First synthetic driver'},
    {'Accident ID':'ACD-000010','Car Plate':'XYZ 456','Driver Name':'<img src=x onerror="window.searchXss=true">'}];
   window.harnessSearch=TaxiQaidSearch.create({input:'harness-input',config:'accidents',getData:()=>records,apply:()=>{window.harnessResults=records.filter(r=>harnessSearch.matches(r)).map(r=>r['Accident ID']);}});
  });
  const input=page.getByRole('combobox',{name:'Harness Search'});
  await input.fill(' ABC123 ');assert.equal(await page.locator('#harness-input-suggestions [role=option]').count(),1);
  await input.press('ArrowDown');assert.ok(await input.getAttribute('aria-activedescendant'));await input.press('Enter');
  assert.equal(await input.inputValue(),'ACD-00001');assert.deepEqual(await page.evaluate(()=>harnessResults),['ACD-00001']);
  await input.fill('ACD-00001');assert.equal(await page.locator('#harness-input-suggestions [role=option]').count(),2);
  await input.press('ArrowDown');await input.press('Enter');assert.deepEqual(await page.evaluate(()=>harnessResults),['ACD-00001']);
  await input.fill('img');assert.equal(await page.locator('#harness-input-suggestions img').count(),0);
  assert.match(await page.locator('#harness-input-suggestions').innerText(),/<img/);assert.equal(await page.evaluate(()=>window.searchXss),undefined);
  await input.press('Escape');assert.equal(await input.getAttribute('aria-expanded'),'false');
  await input.fill('');await input.press('ArrowUp');await input.press('Enter');assert.equal(await input.inputValue(),'ACD-000010');
  await input.fill('no-match');assert.equal(await page.locator('#harness-input-suggestions [role=option]').count(),0);
  await page.locator('#page-title').click();assert.equal(await input.getAttribute('aria-expanded'),'false');
  await page.evaluate(()=>document.getElementById('search-harness').remove());
  // Profile selection uses the correct identifier after a model/VIN or phone match.
  await nav('fleet');
  await page.evaluate(()=>{fleetDatabase=[{Plate:'TEST 123',Model:'Synthetic model',VIN:'test-only-vin'}];});
  await page.locator('#fleet-plate-input').fill('test-only-vin');await page.locator('#fleet-plate-input').press('ArrowDown');await page.locator('#fleet-plate-input').press('Enter');
  assert.equal(await page.locator('#fleet-profile-container').isVisible(),true);assert.equal(await page.locator('#fleet-plate-input').inputValue(),'TEST 123');
  await page.evaluate(()=>{fleetDatabase=[];fleetSearch.clear();});
  await nav('drivers');
  await page.evaluate(()=>{driversDatabase=[{'Iqama Number':'test-only-iqama','Full Name':'Synthetic driver','Phone Number':'test-only-phone'}];});
  await page.locator('#driver-search-input').fill('test-only-phone');await page.locator('#driver-search-input').press('ArrowDown');await page.locator('#driver-search-input').press('Enter');
  assert.equal(await page.locator('#driver-profile-container').isVisible(),true);assert.equal(await page.locator('#driver-search-input').inputValue(),'test-only-iqama');
  await page.evaluate(()=>{driversDatabase=[];driverSearch.clear();});
  // Temporary local module fixtures verify search and independent filters together.
  await nav('accidents');
  await page.evaluate(()=>{accidentsDatabase=[
   {'Accident ID':'ACD-00001','Car Plate':'AbC - 123','Driver Name':'Synthetic driver',Date:'2026-01-10'},
   {'Accident ID':'ACD-000010','Car Plate':'AbC - 123','Driver Name':'Synthetic driver',Date:'2026-01-11'},
   {'Accident ID':'ACD-00002','Car Plate':'AbC - 123','Driver Name':'Synthetic driver',Date:'2026-01-12'}
  ];});
  await page.locator('#filter-start-date').fill('2026-01-10');await page.locator('#filter-end-date').fill('2026-01-11');
  await page.locator('#accident-search-input').fill('ABC123');
  assert.deepEqual(await page.evaluate(()=>getFilteredAccidents().map(r=>r['Accident ID'])),['ACD-00001','ACD-000010']);
  await page.locator('#accident-search-input').press('ArrowDown');await page.locator('#accident-search-input').press('Enter');
  assert.deepEqual(await page.evaluate(()=>getFilteredAccidents().map(r=>r['Accident ID'])),['ACD-00001']);
  await page.evaluate(()=>{accidentsDatabase=[];document.getElementById('filter-start-date').value='';document.getElementById('filter-end-date').value='';accidentSearch.clear();});
  await nav('tripcheck');
  await page.evaluate(()=>{tripChecksDatabase=[
   {'Check ID':'test-only-pre','Car Plate':'ABC 123','Driver Name':'Synthetic driver','Check Type':'Pre-Trip',Date:'2026-01-10'},
   {'Check ID':'test-only-post','Car Plate':'ABC 123','Driver Name':'Synthetic driver','Check Type':'Post-Trip',Date:'2026-01-10'}
  ];});
  await page.locator('#tripcheck-type-filter').selectOption('Pre-Trip');await page.locator('#tripcheck-date-filter').fill('2026-01-10');
  await page.locator('#tripcheck-search-input').fill('synthetic');
  assert.deepEqual(await page.evaluate(()=>getFilteredTripChecks().map(r=>r['Check ID'])),['test-only-pre']);
  await page.evaluate(()=>{tripChecksDatabase=[];document.getElementById('tripcheck-type-filter').value='all';document.getElementById('tripcheck-date-filter').value='';tripcheckSearch.clear();});

  async function audit(scope){
   const problems=await page.locator(scope).evaluate(root=>{
    const issues=[];const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
    for(const label of root.querySelectorAll('label[for]')){
     const control=document.getElementById(label.htmlFor);if(!visible(label)||!control||!visible(control))continue;
     if(label.getBoundingClientRect().bottom>control.getBoundingClientRect().top+1)issues.push('Label/control overlap: '+label.htmlFor);
    }
    for(const button of root.querySelectorAll('.btn-primary,.btn-secondary')){
     if(!visible(button))continue;
     if(button.getBoundingClientRect().height<45)issues.push('Small button: '+button.id);
     if(button.scrollHeight>button.clientHeight+2||button.scrollWidth>button.clientWidth+2)issues.push('Clipped button: '+button.id);
     const bg=getComputedStyle(button).backgroundColor;
     if(button.classList.contains('btn-primary')&&bg!=='rgb(245, 130, 32)'&&bg!=='rgb(217, 106, 16)')issues.push('Primary color: '+button.id+' '+bg);
    }
    return issues;
   });assert.deepEqual(problems,[],scope);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Document overflow');
   assert.ok(await page.locator('.main-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Main panel overflow');
   if(scope.endsWith('-modal'))assert.ok(await page.locator(scope+' .modal-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Modal panel overflow: '+scope);
  }
  const searchViews=['customer-care','fleet','drivers','accidents','breakdowns','maintenance','fuel','ncr','penalties','tripcheck','driver-appeals','training','driver-deductions','roster','driver-portal-preview','user-management'];
  for(const width of [320,375,768,1024,1440]){
   await page.setViewportSize({width,height:1050});
   for(const view of views){await nav(view);await audit('#view-'+view);if(searchViews.includes(view))assert.equal(await page.locator(`#view-${view} input[role=combobox]:visible`).count(),1,'Unified search '+view);}
   if(width===320||width===1440)for(const view of screenshotViews){await nav(view);await page.screenshot({animations:'disabled',path:path.join(output,`${width===320?'mobile':'desktop'}-${view}.png`)});}
   for(const [view,button,modal] of [['accidents','#open-add-accident-modal','#add-accident-modal'],['breakdowns','[data-open=breakdown-modal]','#breakdown-modal'],['maintenance','[data-open=request-modal]','#request-modal'],['fuel','#open-fuel-modal','#fuel-modal'],['ncr','#open-ncr-modal','#ncr-modal'],['tripcheck','#open-add-tripcheck-modal','#add-tripcheck-modal'],['driver-appeals','#appeals-preview','#appeals-modal'],['training','#training-create','#training-session-modal'],['driver-deductions','#deductions-add-expense','#deductions-expense-modal'],['customer-care','#care-open','#care-modal'],['helpdesk','#helpdesk-preview','#helpdesk-details-modal']]){
    await nav(view);if(view==='ncr')await page.locator('#ncr-tracker-tab').click();if(view==='training')await page.locator('#training-sessions-tab').click();if(view==='helpdesk')await page.locator('#helpdesk-manage-tab').click();if(view==='driver-deductions')await page.locator('#deductions-expenses-tab').click();
    await page.locator(button).click();await audit(modal);
    if(view==='tripcheck')assert.equal(await page.locator('#add-tripcheck-modal input[type=hidden]:visible').count(),0,'Hidden wizard state became visible');
    if(view==='ncr'){
     await page.locator('#ncr-category').selectOption('unauthorized-transport');
     const select=page.locator('#ncr-category');const text=await select.locator('option:checked').innerText();
     if(await select.evaluate(el=>el.clientWidth<900))assert.equal(await page.locator('#ncr-category-selected-text').isVisible(),true);
     assert.equal(await page.locator('#ncr-category-selected-text').textContent(),text);
     await audit(modal);
    }
    await page.keyboard.press('Escape');
   }
   // Return tabbed modules to their default view for the next viewport's shared-search check.
   await nav('ncr');await page.locator('#ncr-scores-tab').click();await nav('training');await page.locator('#training-overview-tab').click();await nav('driver-deductions');await page.locator('#deductions-balances-tab').click();await nav('helpdesk');await page.locator('#helpdesk-create-tab').click();
  }
  await page.setViewportSize({width:768,height:1050});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const view of screenshotViews){await nav(view);await audit('#view-'+view);}
  await nav('ncr');await page.locator('#ncr-tracker-tab').click();await page.locator('#open-ncr-modal').click();await page.locator('#ncr-category').selectOption('pickup-dropoff-rules');await audit('#ncr-modal');
  await page.screenshot({animations:'disabled',path:path.join(output,'text-200-ncr-form.png')});
  await page.locator('#ncr-category-selected-text').scrollIntoViewIfNeeded();
  await page.screenshot({animations:'disabled',path:path.join(output,'text-200-ncr-category.png')});await page.keyboard.press('Escape');
  await nav('tripcheck');await page.locator('#open-add-tripcheck-modal').click();await audit('#add-tripcheck-modal');await page.keyboard.press('Escape');
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  const emoji=await page.locator('#erp-app, #module-overlays').evaluateAll(roots=>roots.flatMap(root=>[...root.querySelectorAll('button,h1,h2,h3,label,.nav-text,.nav-icon,.group-icon,.status-badge')].filter(el=>/\p{Extended_Pictographic}/u.test(el.textContent)).map(el=>el.textContent)));
  assert.deepEqual(emoji,[]);assert.equal(await page.locator('.sidebar .nav-icon svg').count(),views.length+1);
  assert.deepEqual(retiredRequests,[]);assert.deepEqual(brokenModuleResources,[]);
  assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);assert.deepEqual(writes,[]);assert.deepEqual(downloads,[]);
  console.log(JSON.stringify({result:'PASS',viewports:[320,375,768,1024,1440],textScaling:'200% at 768px',pages:views.length,retiredRequests,brokenModuleResources,screenshots:output,pdfSource:'unchanged',errors,legacy,writes,downloads},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
