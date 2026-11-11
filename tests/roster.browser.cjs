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
  await page.route('https://*.supabase.co/**',r=>r.abort());await page.goto(process.env.TAXIQAID_URL||'http://127.0.0.1:8002/');await page.waitForFunction(()=>!document.getElementById('boot-status'));
  await page.evaluate(()=>{moduleStorageWrites=[];supabaseClient.auth.signInWithPassword=async()=>({data:{user:{id:'test-only'}},error:null});supabaseClient.auth.signOut=async()=>({error:null});supabaseClient.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'},error:null})})})});});
  await page.locator('#username').fill('preview');await page.locator('#password').fill('test-only');await page.locator('#login-button').click();
  await page.locator('[data-view=roster] a').evaluate(el=>el.closest('details').open=true);await page.locator('[data-view=roster] a').click();await page.evaluate(()=>TaxiQaidRoster.ready);
  assert.deepEqual(await page.locator('#view-roster [role=tab]').allTextContents(),['Daily Overview','Weekly Roster','Driver Schedule & PDF','Roster Import','Stops & Locations']);
  assert.equal(await page.locator('#roster-mapping-current').innerText(),'76');assert.equal(await page.locator('#roster-generate-all').isDisabled(),true);assert.equal(await page.locator('#roster-download-zip').isDisabled(),true);
  const file=(name,buffer)=>({name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
  async function upload(day,night){await page.locator('#roster-day-file').setInputFiles(day);await page.locator('#roster-night-file').setInputFiles(night);await page.locator('#roster-validate').click();await page.waitForFunction(()=>!document.getElementById('roster-validate').disabled);}
  const day=workbook(rows({drivers:3})),night=workbook(rows({drivers:2,base:9100000000,platePrefix:'NIGHT',start:'18:00',end:'06:00'}));
  await upload(file('synthetic-day.xlsx',day),file('synthetic-night.xlsx',night));assert.equal(await page.locator('#roster-total-count').innerText(),'5');assert.equal(await page.locator('#roster-daily-panel').isVisible(),true);
  assert.equal(await page.locator('#roster-daily-table tbody tr').count(),5);assert.equal(await page.locator('#roster-daily-table .roster-rest').count(),5);
  await page.locator('#roster-date').selectOption('2026-11-09');await page.locator('#roster-daily-shift').selectOption('Night Shift');assert.equal(await page.locator('#roster-daily-table tbody tr').count(),2);assert.match(await page.locator('#roster-daily-table tbody').innerText(),/06:00 \(next day\)/);
  await page.locator('#roster-daily-search').fill('0night');await page.locator('#roster-daily-search').press('Escape');assert.equal(await page.locator('#roster-daily-table tbody tr').count(),1);await page.locator('#roster-daily-search').fill('');await page.locator('#roster-daily-search').press('Escape');
  await page.locator('#roster-duty').selectOption('Rest Day');assert.match(await page.locator('#roster-daily-table tbody').innerText(),/No assignments/);await page.locator('#roster-duty').selectOption('');await page.locator('#roster-daily-shift').selectOption('');
  await page.locator('#roster-weekly-tab').click();assert.equal(await page.locator('#roster-weekly-table tbody tr').count(),5);assert.match(await page.locator('#roster-weekly-table tbody').innerText(),/Starting Zone/);
  await page.locator('#roster-weekly-search').fill('0-TEST');await page.locator('#roster-weekly-search').press('Escape');assert.equal(await page.locator('#roster-weekly-table tbody tr').count(),1);await page.locator('#roster-weekly-table button').first().click();
  assert.equal(await page.locator('#roster-personal-panel').isVisible(),true);assert.equal(await page.locator('#roster-personal-table tbody tr').count(),7);assert.match(await page.locator('#roster-personal-table tbody').innerText(),/Not Configured/);
  let downloading=page.waitForEvent('download',{timeout:60000});await page.locator('#roster-download-pdf').click();let downloaded=await downloading;assert.equal(downloaded.suggestedFilename(),'9000000000_Synthetic Driver 0.pdf');await downloaded.saveAs(path.join(output,'synthetic-personal.pdf'));
  await page.locator('#roster-preview-pdf').click();await page.waitForFunction(()=>document.getElementById('roster-pdf-modal').style.display==='flex');assert.match(await page.locator('#roster-pdf-frame').getAttribute('src'),/^blob:/);await page.keyboard.press('Escape');
  // Failed import preserves the entire active preview and selected driver's schedule.
  await upload(file('other-week.xlsx',workbook(rows({drivers:1,week:'2026-11-15'}))),file('old-week.xlsx',night));assert.match(await page.locator('#roster-validation-status').innerText(),/Validation failed/);assert.equal(await page.locator('#roster-total-count').innerText(),'5');assert.match(await page.locator('#roster-active-week').innerText(),/2026-11-08/);
  const duplicate=rows({drivers:2});duplicate[4][2]=duplicate[2][2];await upload(file('duplicate.xlsx',workbook(duplicate)),file('night.xlsx',night));assert.match(await page.locator('#roster-validation-table tbody').innerText(),/Duplicate/);assert.equal(await page.locator('#roster-total-count').innerText(),'5');
  await upload(file('wrong-sheet.xlsx',workbook(rows(),'Other')),file('night.xlsx',night));assert.match(await page.locator('#roster-validation-status').innerText(),/worksheet Roster was not found/);
  // Unknown stops are honest; adding a local mapping rechecks the existing roster without reimport.
  await upload(file('missing-stop.xlsx',workbook(rows({drivers:1,stop:'Synthetic Missing Stop'}))),file('night.xlsx',night));assert.equal(await page.locator('#roster-total-count').innerText(),'3');assert.equal(await page.locator('#roster-mapping-unmatched').innerText(),'1');
  await page.locator('#roster-manage-stops').click();await page.locator('#roster-unmatched-table button').click();assert.equal(await page.locator('#roster-stop-name').inputValue(),'Synthetic Missing Stop');
  await page.locator('#roster-stop-latitude').fill('91');await page.locator('#roster-stop-longitude').fill('39');assert.equal(await page.locator('#roster-stop-preview').isDisabled(),true);
  await page.locator('#roster-stop-latitude').fill('21.123');await page.locator('#roster-stop-longitude').fill('39.456');assert.equal(await page.locator('#roster-stop-url').inputValue(),'https://www.google.com/maps/search/?api=1&query=21.123,39.456');
  await page.locator('#roster-stop-aliases').fill('DEPOT');await page.locator('#roster-stop-save').click();assert.match(await page.locator('#roster-stop-error').innerText(),/Duplicate/);
  await page.locator('#roster-stop-aliases').fill('Synthetic Approved Alias');await page.locator('#roster-stop-save').click();assert.equal(await page.locator('#roster-mapping-unmatched').innerText(),'0');assert.equal(await page.locator('#roster-mapping-current').innerText(),'77');assert.match(await page.locator('#roster-action-status').innerText(),/Stop added to the current preview/);
  await page.locator('#roster-daily-tab').click();await page.locator('#roster-date').selectOption('2026-11-09');assert.equal(await page.locator('#roster-daily-table a[href*="21.123,39.456"]').count(),1);await page.locator('#roster-daily-table button').first().click();
  downloading=page.waitForEvent('download');await page.locator('#roster-download-pdf').click();await(await downloading).saveAs(path.join(output,'resolved-personal.pdf'));
  await page.locator('#roster-manage-stops').click();await page.locator('#roster-location-search').fill('Synthetic Approved Alias');await page.locator('#roster-location-search').press('Escape');assert.equal(await page.locator('#roster-locations-table tbody tr').count(),1);
  await page.locator('#roster-locations-table button').click();await page.locator('#roster-location-edit').click();await page.locator('#roster-stop-longitude').fill('39.457');await page.locator('#roster-stop-save').click();assert.match(await page.locator('#roster-stop-error').innerText(),/Review and confirm/);await page.locator('#roster-stop-confirm').check();await page.locator('#roster-stop-save').click();
  downloading=page.waitForEvent('download');await page.locator('#roster-location-export').click();const catalogFile=await downloading;const catalogPath=path.join(output,'locations-export.json');await catalogFile.saveAs(catalogPath);const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));assert.equal(catalog.locations.length,77);assert.equal(JSON.stringify(catalog).includes('9000000000'),false);
  const corrupt={...catalog,locations:[...catalog.locations,catalog.locations[0]]};await page.locator('#roster-location-file').setInputFiles({name:'corrupt.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});await page.waitForFunction(()=>document.getElementById('roster-action-status').textContent.includes('Catalog import rejected'));assert.match(await page.locator('#roster-action-status').innerText(),/Catalog import rejected/);assert.equal(await page.locator('#roster-mapping-current').innerText(),'77');
  await page.locator('#roster-location-file').setInputFiles({name:'catalog.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(catalog))});await page.waitForFunction(()=>document.getElementById('roster-catalog-modal').style.display==='flex');await page.locator('#roster-catalog-confirm').check();await page.locator('#roster-catalog-apply').click();
  // Future delivery has no phone assumptions, provider statuses or sending path.
  await page.locator('#roster-whatsapp').click();assert.equal(await page.locator('#roster-whatsapp-connection').inputValue(),'Not Configured');assert.match(await page.locator('#roster-whatsapp-phones').inputValue(),/Unavailable/);assert.equal(await page.locator('#roster-whatsapp-send').isDisabled(),true);
  await page.locator('#roster-whatsapp-preview').click();assert.match(await page.locator('#roster-whatsapp-message').innerText(),/^Hello \{\{driver_name\}\}/);await page.locator('#roster-whatsapp-settings').click();assert.equal(await page.locator('#roster-whatsapp-language').inputValue(),'English');assert.equal(await page.locator('#roster-whatsapp-settings-modal input[type=password]').count(),0);await page.keyboard.press('Escape');
  await page.locator('#roster-whatsapp-recipients').click();assert.equal(await page.locator('#roster-recipients-table tbody tr').count(),3);assert.match(await page.locator('#roster-recipients-table tbody').innerText(),/Pending verification/);await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  // Real references are optional inputs outside the repository; logs contain aggregate counts only.
  let referenceCount=null;
  if(process.env.TAXIQAID_DAY_FILE&&process.env.TAXIQAID_NIGHT_FILE){
   await upload(process.env.TAXIQAID_DAY_FILE,process.env.TAXIQAID_NIGHT_FILE);referenceCount=Number(await page.locator('#roster-total-count').innerText());assert.equal(referenceCount,263);
   await page.locator('#roster-generate-all').click();await page.waitForFunction(()=>!document.getElementById('roster-download-zip').disabled,{},{timeout:240000});
   downloading=page.waitForEvent('download');await page.locator('#roster-download-zip').click();await(await downloading).saveAs(path.join(output,'reference-week.zip'));
   const zip=await JSZip.loadAsync(fs.readFileSync(path.join(output,'reference-week.zip')));assert.equal(Object.keys(zip.files).length,referenceCount);assert.ok(Object.keys(zip.files).every(name=>name.endsWith('.pdf')&&!name.includes('/')));
   await page.evaluate(()=>TaxiQaidRoster.clearPrivateData());
  }
  // A fresh week replaces all previous assignments; 805 dynamic PDFs must reach one complete ZIP.
  await upload(file('large-day.xlsx',workbook(rows({drivers:805,week:'2026-11-15'}))),file('large-night.xlsx',workbook(rows({drivers:7,base:9100000000,week:'2026-11-15',platePrefix:'NIGHT',start:'18:00',end:'06:00'}))));
  assert.equal(await page.locator('#roster-total-count').innerText(),'812');assert.equal(await page.locator('#roster-mapping-unmatched').innerText(),'0');assert.match(await page.locator('#roster-active-week').innerText(),/2026-11-15/);assert.equal(await page.locator('#roster-daily-table tbody tr').count(),25);
  await page.locator('#roster-generate-all').click();
  // Navigation remains usable while the worker builds PDFs.
  await page.locator('#roster-weekly-tab').click();assert.equal(await page.locator('#roster-weekly-panel').isVisible(),true);await page.locator('#roster-weekly-next').click();assert.match(await page.locator('#roster-weekly-page').innerText(),/^Page 2/);
  await page.waitForFunction(()=>!document.getElementById('roster-download-zip').disabled,{},{timeout:300000});assert.equal(await page.locator('#roster-batch-generated').innerText(),'812');assert.equal(await page.locator('#roster-batch-errors').innerText(),'0');assert.equal(await page.locator('#roster-batch-remaining').innerText(),'0');
  downloading=page.waitForEvent('download');await page.locator('#roster-download-zip').click();downloaded=await downloading;assert.equal(downloaded.suggestedFilename(),'TaxiQaid_Weekly_Roster_2026-11-15.zip');await downloaded.saveAs(path.join(output,'synthetic-large-week.zip'));
  const zip=await JSZip.loadAsync(fs.readFileSync(path.join(output,'synthetic-large-week.zip')));assert.equal(Object.keys(zip.files).length,812);assert.ok(Object.keys(zip.files).every(name=>/^(9000000\d{3}|910000000\d)_/.test(name)));
  // Changing the catalog invalidates the previous ZIP rather than returning stale maps.
  await page.locator('#roster-add-stop').click();await page.locator('#roster-stop-name').fill('Synthetic Temporary Stop');await page.locator('#roster-stop-latitude').fill('0');await page.locator('#roster-stop-longitude').fill('0');await page.locator('#roster-stop-save').click();assert.equal(await page.locator('#roster-download-zip').isDisabled(),true);
  // An unsupported glyph fails explicitly; incomplete batches never enable a complete ZIP.
  const unsupported=rows({drivers:1,week:'2026-11-22'});unsupported[2][1]='Synthetic \u{10FFFF}';await upload(file('unsupported.xlsx',workbook(unsupported)),file('empty-night.xlsx',workbook(rows({drivers:0,week:'2026-11-22'}))));
  await page.locator('#roster-generate-all').click();await page.waitForFunction(()=>document.getElementById('roster-cancel-batch').disabled,{},{timeout:60000});assert.match(await page.locator('#roster-batch-status').innerText(),/Incomplete generation/);assert.equal(await page.locator('#roster-download-zip').isDisabled(),true);assert.equal(await page.locator('#roster-batch-errors').innerText(),'1');assert.equal(await page.locator('#roster-batch-remaining').innerText(),'1');
  // Exercise long proper names and explicit separate zone/station mappings in an isolated worker.
  const model=require('../modules/people/roster/roster-model.js');
  const longZone='Synthetic Extended Zone '+('Geographic Section '.repeat(4)).trim(),longStop='Synthetic Long Stop '+('Location Section '.repeat(5)).trim();
  const longSource=rows({drivers:1,zone:longZone,stop:longStop});longSource[2][1]='Synthetic José '+('Extended Driver Name '.repeat(5)).trim();
  const parsed=model.parseRows(longSource,'Day Shift');assert.equal(parsed.ok,true);parsed.drivers[0].assignments.filter(a=>a.duty==='Working').forEach(a=>a.station={name:'DEPOT',time:'01:45'});
  const longCatalog=model.validateLocations({...require('../modules/people/roster/locations.json'),zones:[{name:longZone,latitude:10,longitude:20}],locations:[...require('../modules/people/roster/locations.json').locations,{name:longStop,latitude:21.123,longitude:39.456}]});
  const bytes=await page.evaluate(payload=>new Promise((resolve,reject)=>{
   const worker=new Worker('modules/people/roster/roster-worker.js');worker.onmessage=event=>{worker.terminate();if(event.data.type==='error')reject(new Error(event.data.message));else resolve(Array.from(new Uint8Array(event.data.buffer)));};worker.onerror=()=>{worker.terminate();reject(new Error('Isolated PDF worker failed'));};worker.postMessage({id:1,type:'pdf',...payload});
  }),{driver:parsed.drivers[0],week:parsed.week,catalog:longCatalog});
  fs.writeFileSync(path.join(output,'synthetic-long-personal.pdf'),Buffer.from(bytes));fs.writeFileSync(path.join(output,'synthetic-long-manifest.json'),JSON.stringify({name:parsed.drivers[0].name,zone:longZone,stop:longStop}));
  await page.evaluate(()=>TaxiQaidRoster.clearPrivateData());
  // Empty, non-personal review screenshots only. Test inputs never become production fixtures.
  async function audit(scope){
   assert.deepEqual(await page.locator(scope).evaluate(root=>{
    const issues=[];for(const label of root.querySelectorAll('label[for]')){const control=document.getElementById(label.htmlFor);if(label.getClientRects().length&&control?.getClientRects().length&&label.getBoundingClientRect().bottom>control.getBoundingClientRect().top+1)issues.push('overlap '+label.htmlFor);}
    for(const button of root.querySelectorAll('.btn-primary,.btn-secondary'))if(button.getClientRects().length&&(button.getBoundingClientRect().height<45||button.scrollWidth>button.clientWidth+1||button.scrollHeight>button.clientHeight+1))issues.push('button '+button.id);
    return issues;
   }),[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.locator('.main-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
   if(scope.endsWith('-modal'))assert.equal(await page.locator(scope+' .modal-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  }
  for(const [width,scale] of [[320,''],[375,''],[768,''],[1024,''],[1440,''],[768,'200%']]){
   await page.setViewportSize({width,height:1050});await page.evaluate(scale=>document.documentElement.style.fontSize=scale,scale);
   for(const key of ['daily','weekly','personal','import','locations']){await page.locator('#roster-'+key+'-tab').click();await audit('#view-roster');if(!scale&&[320,1440].includes(width))await page.screenshot({animations:'disabled',path:path.join(output,(width===320?'mobile':'desktop')+'-roster-'+key+'.png')});}
   await page.locator('#roster-add-stop').click();await audit('#roster-stop-modal');await page.keyboard.press('Escape');
   await page.locator('#roster-whatsapp').click();await audit('#roster-whatsapp-modal');await page.locator('#roster-whatsapp-settings').click();await audit('#roster-whatsapp-settings-modal');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  }
  await page.evaluate(()=>document.documentElement.style.fontSize='');await page.locator('#logout-button').click();assert.equal(await page.locator('#erp-app').isVisible(),false);assert.equal(await page.locator('#roster-total-count').innerText(),'0');
  assert.deepEqual(await page.evaluate(()=>moduleStorageWrites),[]);assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);assert.deepEqual(writes,[]);
  console.log(JSON.stringify({result:'PASS',referenceDrivers:referenceCount,syntheticBatchPDFs:812,maximumTableRows:25,viewports:[320,375,768,1024,1440],textScale:'200%',errors,legacy,writes,storageWrites:[],privateOutput:output},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
