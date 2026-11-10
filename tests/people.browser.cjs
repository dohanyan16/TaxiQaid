// Local synthetic fixtures only. Supabase authentication is mocked; no live operational data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const output=process.env.TAXIQAID_SCREENSHOTS||'/tmp/taxiqaid-people-review';fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.TAXIQAID_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 try{
  const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width:1440,height:1050}});
  const errors=[],legacy=[],writes=[],downloads=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()));
  page.on('request',r=>{if(/script\.google|sheets\.google|docs\.google|sheets\.googleapis|drive\.google/.test(r.url()))legacy.push(r.url());if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
  await page.addInitScript(()=>{
   window.operationalStorageWrites=[];
   const setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){operationalStorageWrites.push('storage:'+key);return setItem.call(this,key,value);};
   const open=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{operationalStorageWrites.push('indexedDB:'+args[0]);return open(...args);};
  });
  await page.route('https://*.supabase.co/**',r=>r.abort());
  await page.goto(process.env.TAXIQAID_URL||'http://127.0.0.1:8001/');await page.waitForFunction(()=>!document.getElementById('boot-status'));
  // The existing Supabase SDK probes storage availability once, then removes its probe.
  assert.equal(await page.evaluate(()=>operationalStorageWrites.every(key=>/^storage:lswt-/.test(key))),true);
  await page.evaluate(()=>{
   operationalStorageWrites=[];
   supabaseClient.auth.signInWithPassword=async()=>({data:{user:{id:'test-only'}},error:null});supabaseClient.auth.signOut=async()=>({error:null});
   supabaseClient.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'},error:null})})})});
  });
  await page.locator('#username').fill('preview');await page.locator('#password').fill('test-only');await page.locator('#login-button').click();await page.waitForFunction(()=>document.getElementById('erp-app').style.display==='flex');
  async function nav(view){const link=page.locator(`[data-view="${view}"] a`);await link.evaluate(el=>{const group=el.closest('details');if(group)group.open=true;});await link.click();}
  async function options(id){return page.locator('#'+id+' option').allTextContents();}
  async function columns(id){return page.locator('#'+id+' th').allTextContents();}
  async function dismissNotice(){const button=page.locator('#integration-notice button');if(await button.count())await button.click();}
  await nav('driver-appeals');
  assert.equal(await page.locator('#view-driver-appeals').getByText('Review, assign and resolve appeals submitted by drivers.',{exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Add Appeal',exact:true}).count(),0);
  assert.deepEqual(await columns('appeals-table'),['Appeal ID','Driver Name','Driver Iqama','Nationality','Appeal Type','Description','Status','Department']);
  assert.deepEqual(await options('appeals-status'),['All Statuses','Pending','In Progress','Done']);
  assert.deepEqual(await options('appeals-department'),['All Departments','Pending','Financial','Operation','Quality','IT']);
  assert.deepEqual(await options('appeals-type'),['Types pending configuration']);
  await page.evaluate(()=>TaxiQaidAppealsPreview.setRecords([
   {'Appeal ID':'test-appeal-first','Driver Name':'Synthetic driver','Driver Iqama':'test-iqama',Nationality:'test-only','Appeal Type':'unconfigured','Description':'<img src=x onerror="window.appealsXss=true">','Submission Date':'2026-11-10','Submission Time':'09:10',Status:'Pending',Department:'Pending','Assigned By':'test-actor','Assigned At':'test-time','Last Updated By':'test-actor','Last Updated At':'test-time'},
   {'Appeal ID':'test-appeal-second','Driver Name':'Synthetic driver','Driver Iqama':'test-iqama','Submission Date':'2026-11-11',Status:'In Progress',Department:'IT'},
   {'Appeal ID':'test-appeal-outside','Driver Name':'Synthetic driver','Submission Date':'2026-11-12',Status:'Done',Department:'Financial'}
  ]));
  await page.locator('#appeals-start').fill('2026-11-10');await page.locator('#appeals-end').fill('2026-11-11');await page.locator('#appeals-search').fill('synthetic');await page.locator('#appeals-search').press('Escape');
  assert.equal(await page.locator('#appeals-table tbody tr').count(),2);assert.equal(await page.locator('#appeals-table img').count(),0);
  await page.locator('#appeals-status').selectOption('In Progress');assert.match(await page.locator('#appeals-table tbody').innerText(),/test-appeal-second/);
  await page.locator('#appeals-department').selectOption('Financial');assert.match(await page.locator('#appeals-table tbody').innerText(),/No records/);
  await page.locator('#appeals-department').selectOption('');await page.locator('#appeals-status').selectOption('');
  await page.locator('#appeals-table button').first().click();
  assert.equal(await page.locator('#appeal-detail-submission-date').inputValue(),'2026-11-10');assert.equal(await page.locator('#appeal-detail-submission-time').inputValue(),'09:10');
  assert.equal(await page.locator('#appeals-form input:not([readonly]),#appeals-form textarea:not([readonly])').count(),0);
  assert.deepEqual(await options('appeal-detail-status'),['Pending','In Progress','Done']);assert.deepEqual(await options('appeal-detail-department'),['Pending','Financial','Operation','Quality','IT']);
  await page.locator('#appeal-detail-department').selectOption('Financial');assert.equal(await page.locator('#appeal-detail-status').inputValue(),'Pending');
  await page.locator('#appeals-save').click();assert.equal(await page.locator('#appeals-save-status').innerText(),'Database integration pending — changes not saved.');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#appeals-table button').first().evaluate(el=>el===document.activeElement),true);
  assert.match(await page.locator('#appeals-table tbody tr').first().innerText(),/Pending\s+Pending$/);
  await page.locator('#appeals-start').fill('2026-11-12');assert.equal(await page.locator('#appeals-date-error').isVisible(),true);
  await page.evaluate(()=>{TaxiQaidAppealsPreview.setRecords([]);document.getElementById('appeals-start').value='';document.getElementById('appeals-end').value='';});
  await page.locator('#appeals-search').fill('');await page.locator('#appeals-search').press('Escape');assert.equal(await page.evaluate(()=>window.appealsXss),undefined);
  await nav('training');
  assert.deepEqual(await page.locator('#view-training [role=tab]').allTextContents(),['Training Overview','Training Sessions','Training Attendance']);
  assert.deepEqual(await columns('training-overview-table'),['Driver Name','Driver Iqama','Training Sessions Pending','Status']);
  assert.deepEqual(await options('training-status'),['All Statuses','On Day','Pending Training Sessions']);
  await page.locator('#training-status').selectOption('On Day');await page.locator('#training-overview-tab').press('ArrowRight');
  assert.equal(await page.locator('#training-sessions-tab').getAttribute('aria-selected'),'true');
  assert.equal((await columns('training-sessions-table')).length,9);
  await page.locator('#training-sessions-tab').press('End');assert.equal(await page.locator('#training-attendance-panel').isVisible(),true);
  assert.equal((await columns('training-attendance-table')).length,7);
  await page.locator('#training-attendance-tab').press('Home');assert.equal(await page.locator('#training-status').inputValue(),'On Day');await page.locator('#training-status').selectOption('');
  await page.locator('#training-sessions-tab').click();await page.locator('#training-create').click();await page.locator('#training-select-drivers').click();
  assert.equal(await page.locator('#training-select-filtered').isDisabled(),true);assert.equal(await page.locator('#training-picker-table input[type=checkbox]').count(),0);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#training-session-modal').isVisible(),true);
  assert.equal(await page.locator('#training-select-drivers').evaluate(el=>el===document.activeElement),true);
  await page.evaluate(()=>TaxiQaidTrainingPreview.setDriverSource(Array.from({length:900},(_,i)=>({'Iqama Number':`test-${String(i).padStart(4,'0')}`,'Full Name':`Synthetic ${i%2?'odd':'even'} driver ${i}`})),{complete:true}));
  await page.locator('#training-select-drivers').click();assert.equal(await page.locator('#training-picker-table input[type=checkbox]').count(),25);
  await page.locator('#training-picker-table input').first().check();assert.match(await page.locator('#training-picker-count').innerText(),/^1 drivers selected/);
  await page.locator('#training-picker-next').click();await page.locator('#training-picker-table input').first().check();assert.match(await page.locator('#training-picker-count').innerText(),/^2 drivers selected/);
  await page.locator('#training-picker-search').fill('even');await page.locator('#training-picker-search').press('Escape');await page.locator('#training-select-filtered').click();
  assert.match(await page.locator('#training-picker-count').innerText(),/^451 drivers selected · 450 matching drivers$/);
  assert.equal(await page.locator('#training-picker-table input').count(),25);assert.equal(await page.locator('#training-selected-table button').count(),25);
  await page.locator('#training-picker-search').fill('odd');await page.locator('#training-picker-search').press('Escape');await page.locator('#training-select-filtered').click();assert.match(await page.locator('#training-picker-count').innerText(),/^900 drivers selected/);
  await page.locator('#training-selected-next').click();await page.locator('#training-selected-table button').first().click();assert.match(await page.locator('#training-picker-count').innerText(),/^899 drivers selected/);
  await page.locator('#training-use-selection').click();assert.match(await page.locator('#training-assigned-count').innerText(),/^899 drivers selected — unsaved$/);
  await page.locator('#training-select-drivers').click();await page.locator('#training-deselect-all').click();assert.match(await page.locator('#training-picker-count').innerText(),/^0 drivers selected/);await page.keyboard.press('Escape');
  assert.match(await page.locator('#training-assigned-count').innerText(),/^899 drivers selected/);await page.locator('#training-select-drivers').click();assert.match(await page.locator('#training-picker-count').innerText(),/^899 drivers selected/);await page.keyboard.press('Escape');
  await page.locator('#training-name').fill('Synthetic training');await page.locator('#training-trainer').fill('Synthetic trainer');await page.locator('#training-date').fill('2026-11-10');await page.locator('#training-start').fill('09:00');await page.locator('#training-end').fill('10:00');await page.locator('#training-location').fill('Synthetic location');
  await page.locator('#training-session-save').click();assert.match(await page.locator('#training-session-status').innerText(),/session not saved/);await page.keyboard.press('Escape');assert.match(await page.locator('#training-sessions-table tbody').innerText(),/No records/);
  await page.evaluate(()=>TaxiQaidTrainingPreview.setDriverSource([]));await page.locator('#training-create').click();await page.locator('#training-select-drivers').click();await page.locator('#training-picker-search').fill('');await page.locator('#training-picker-search').press('Escape');await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.locator('#training-create').click();await page.locator('#training-select-drivers').click();assert.equal(await page.locator('#training-picker-table input').count(),0);await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.locator('#training-overview-tab').click();
  await nav('driver-deductions');
  assert.deepEqual(await page.locator('#view-driver-deductions [role=tab]').allTextContents(),['Driver Balances','Driver Expenses','Applied Deductions']);
  assert.deepEqual(await columns('deductions-balances-table'),['Driver Iqama','Driver Name','Total Charged (SAR)','Total Deducted (SAR)','Outstanding Balance (SAR)']);
  await page.locator('#deductions-expenses-tab').click();assert.equal((await columns('deductions-expenses-table')).length,11);
  await page.locator('#deductions-add-expense').click();assert.deepEqual(await options('expense-source'),['Select source type','NCR Financial Fine','Fuel Charge','Traffic Violation','Manual Expense']);
  await page.locator('#expense-source').selectOption('NCR Financial Fine');assert.equal(await page.locator('#expense-source-reference').getAttribute('required'),'');
  await page.locator('#expense-source').selectOption('Manual Expense');assert.equal(await page.locator('#expense-source-reference').getAttribute('required'),null);
  await page.locator('#expense-amount').fill('-50');await page.locator('#expense-save').click();assert.equal(await page.locator('#expense-amount').evaluate(el=>el.validity.customError),true);assert.match(await page.locator('#expense-save-status').innerText(),/expense not saved/);await page.keyboard.press('Escape');
  await page.evaluate(()=>{
   driversDatabase=[{'Iqama Number':'test-iqama','Full Name':'Synthetic driver'}];
   window.financialFixture={complete:true,drivers:[{'Driver Iqama':'test-iqama','Driver Name':'Synthetic driver'}],expenses:[{'Expense Reference':'test-expense-original','Driver Iqama':'test-iqama','Driver Name':'Synthetic driver','Source Type':'Manual Expense','Source Reference':'test-source-preserved','Original Amount (SAR)':'500.00','Amount Deducted (SAR)':'150.00','Outstanding Amount (SAR)':'350.00',authorized:true,posted:true}],deductions:[{'Deduction Reference':'test-deduction-original','Driver Iqama':'test-iqama','Driver Name':'Synthetic driver','Related Expense':'test-expense-original','Deduction Amount (SAR)':'150.00','Remaining Outstanding (SAR)':'350.00',authorized:true,posted:true}]};
   TaxiQaidDeductionsPreview.setSnapshot(financialFixture);
  });
  await page.locator('#deductions-balances-tab').click();assert.match(await page.locator('#deductions-balances-table tbody').innerText(),/500\.00\s+150\.00\s+350\.00/);
  await page.locator('#deductions-balances-table button').click();assert.match(await page.locator('#deductions-history-expenses tbody').innerText(),/test-source-preserved/);assert.match(await page.locator('#deductions-history-applied tbody').innerText(),/test-expense-original/);await page.keyboard.press('Escape');
  await page.locator('#deductions-applied-tab').click();assert.equal((await columns('deductions-applied-table')).length,10);await page.locator('#deductions-apply').click();
  assert.deepEqual(await options('deduction-method'),['Methods pending approval']);
  await page.locator('#deduction-iqama').fill('synthetic');await page.locator('#deduction-iqama').press('ArrowDown');await page.locator('#deduction-iqama').press('Enter');assert.equal(await page.locator('#deduction-name').inputValue(),'Synthetic driver');
  await page.locator('#deduction-expense').selectOption('test-expense-original');assert.equal(await page.locator('#deduction-outstanding').inputValue(),'350.00');
  await page.locator('#deduction-amount').fill('100');assert.equal(await page.locator('#deduction-remaining').innerText(),'250.00 SAR');
  await page.locator('#deduction-amount').fill('350.01');assert.match(await page.locator('#deduction-validation').innerText(),/must not exceed/);assert.match(await page.locator('#deduction-remaining').innerText(),/Unavailable/);
  await page.locator('#deduction-amount').fill('1.001');assert.match(await page.locator('#deduction-validation').innerText(),/two decimal/);
  await page.locator('#deduction-amount').fill('100');await page.locator('#deduction-save').click();assert.match(await page.locator('#deduction-save-status').innerText(),/deduction not applied/);await page.keyboard.press('Escape');
  assert.match(await page.locator('#deductions-applied-table tbody').innerText(),/150\.00\s+350\.00/);
  await page.evaluate(()=>{TaxiQaidDeductionsPreview.setSnapshot({});driversDatabase=[];delete window.financialFixture;});await page.locator('#deductions-balances-tab').click();
  // Exercise every pending page action. None may download, reload or mutate data.
  const before=page.url();
  for(const view of ['driver-appeals','training','driver-deductions']){
   await nav(view);
   const tabs=page.locator(`#view-${view} [role=tab]`);const count=await tabs.count();
   for(let index=0;index<Math.max(1,count);index++){
    if(count)await tabs.nth(index).click();
    const actions=page.locator(`#view-${view} [data-people-pending]:visible`);
    for(let action=0;action<await actions.count();action++){await actions.nth(action).click();assert.match(await page.locator('#integration-notice').innerText(),/Database integration pending/);await dismissNotice();}
   }
   if(count)await tabs.first().click();
  }
  assert.equal(page.url(),before);
  // All tabs and dialogs at narrow widths and increased text size.
  async function audit(scope){
   assert.deepEqual(await page.locator(scope).evaluate(root=>{
    const issues=[];for(const label of root.querySelectorAll('label[for]')){const input=document.getElementById(label.htmlFor);if(label.getClientRects().length&&input?.getClientRects().length&&label.getBoundingClientRect().bottom>input.getBoundingClientRect().top+1)issues.push(label.htmlFor);}
    for(const el of root.querySelectorAll('.btn-primary,.btn-secondary,input:not([type=checkbox]),select'))if(el.getClientRects().length&&el.getBoundingClientRect().height<45)issues.push('control height '+el.id);
    return issues;
   }),[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(scope.endsWith('-modal'))assert.equal(await page.locator(scope+' .modal-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  }
  for(const [width,scale] of [[320,''],[375,''],[768,''],[1024,''],[1440,''],[768,'200%']]){
   await page.setViewportSize({width,height:1050});await page.evaluate(scale=>document.documentElement.style.fontSize=scale,scale);
   for(const view of ['driver-appeals','training','driver-deductions']){
    await nav(view);const tabs=page.locator(`#view-${view} [role=tab]`);for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();await audit('#view-'+view);}if(await tabs.count())await tabs.first().click();
    await audit('#view-'+view);
    if(!scale&&[320,1440].includes(width))await page.screenshot({animations:'disabled',path:path.join(output,`${width===320?'mobile':'desktop'}-${view}.png`)});
   }
   for(const [view,tab,button,modal] of [['driver-appeals',null,'appeals-preview','appeals-modal'],['training','training-sessions-tab','training-create','training-session-modal'],['driver-deductions','deductions-expenses-tab','deductions-add-expense','deductions-expense-modal'],['driver-deductions','deductions-applied-tab','deductions-apply','deductions-apply-modal'],['driver-deductions','deductions-balances-tab','deductions-preview-history','deductions-history-modal']]){
    await nav(view);if(tab)await page.locator('#'+tab).click();await page.locator('#'+button).click();await audit('#'+modal);
    if(view==='training'){await page.locator('#training-select-drivers').click();await audit('#training-drivers-modal');if(!scale&&[320,1440].includes(width))await page.screenshot({animations:'disabled',path:path.join(output,`${width===320?'mobile':'desktop'}-training-drivers.png`)});await page.keyboard.press('Escape');}
    if(width===768&&scale)await page.screenshot({animations:'disabled',path:path.join(output,`text-200-${modal}.png`)});
    await page.keyboard.press('Escape');
   }
  }
  await page.evaluate(()=>document.documentElement.style.fontSize='');await nav('roster');assert.match(await page.locator('#view-roster').innerText(),/Coming Soon/);assert.equal(await page.locator('#view-roster input[type=file]').count(),0);
  assert.deepEqual(await page.evaluate(()=>operationalStorageWrites),[]);assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);assert.deepEqual(writes,[]);assert.deepEqual(downloads,[]);
  console.log(JSON.stringify({result:'PASS',modules:['Driver Appeals','Training Tracker','Drivers Deduction'],syntheticDrivers:900,maximumPickerRows:25,viewports:[320,375,768,1024,1440],textScaling:'200%',roster:'unchanged placeholder',errors,legacy,writes,downloads,storageWrites:[],screenshots:output},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
