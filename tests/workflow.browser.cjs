// Requires Playwright + Chromium and a local server (see README).
// Every Sheet write is intercepted; this test never modifies live data.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.join(__dirname, '..');
const config = fs.readFileSync(path.join(root, 'shared/config.js'), 'utf8');
const trip = fs.readFileSync(path.join(root, 'modules/tripcheck/tripcheck.js'), 'utf8');
const endpoint = name => config.match(new RegExp('const ' + name + ' = "([^"]+)"'))[1];
const postUrl = trip.match(/"Post-Trip": "([^"]+)"/)[1];
const preUrl = trip.match(/"Pre-Trip": "([^"]+)"/)[1];
const fleetUrl = endpoint('GOOGLE_SHEET_FLEET_URL');
const driverUrl = endpoint('GOOGLE_SHEET_DRIVERS_URL');
const accidentUrl = endpoint('GOOGLE_SHEET_ACCIDENTS_URL');
const questions = JSON.parse(trip.match(/const TRIPCHECK_QUESTIONS = Object.freeze\((\[[\s\S]*?\])\);/)[1]);
const makeTrip = (id, date, time, km, plate='abc_123') => ({
 'Check ID':id,Date:date,Time:time,'Car Plate':plate,'Odometer (KM)':km,
 'Driver Name':'Fixture Driver','Driver Iqama':'0000000001',Signed:'Yes','Checked By':'fixture',
 ...Object.fromEntries(questions.map(([,label])=>[label,'OK']))
});
(async () => {
 const output = fs.mkdtempSync(path.join(os.tmpdir(), 'taxiqaid-browser-'));
 const executablePath = process.env.TAXIQAID_CHROMIUM || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
 const browser = await chromium.launch({executablePath,headless:true,args:['--no-sandbox'],
  ...(process.env.HTTPS_PROXY ? {proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}} : {})});
 try {
  const context = await browser.newContext({timezoneId:'America/Los_Angeles',acceptDownloads:true});
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors=[], failures=[], writes=[], reads=[], dialogs=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('requestfailed', r=>failures.push({url:r.url(),error:r.failure().errorText}));
  page.on('dialog', d=>{dialogs.push(d.message());return d.accept();});
  const fleet = [
   {Plate:'ABC 123',Brand:'Fixture',Model:'Taxi',VIN:'TESTVIN1','Fuel Type':'Petrol','Total KM':25,Availability:'Unassigned',Accidents:99},
   {plate:'XYZ-456',brand:'Fixture',model:'Taxi',vin:'TESTVIN2','fuel type':'Petrol','total km':55,availability:'Unassigned',Accidents:99}
  ];
  const drivers = [{'Car Plate':'aBc-123','Full Name':'Fixture Driver','Iqama Number':'0000000001',Shift:'Day Shift',Nationality:'Static value'}];
  const accidents = [{'Car Plate':'ABC 123','Accident ID':'TEST-1',Date:'2026-11-05',Time:'10:00','Driver Iqama':'0000000001',
    'Accident Location':'Al Awali','Root Causes':'General careless driving','Damage Description':'Fixture damage','Accident Type':'Collision'}];
  const post = [makeTrip('POST-OLD','2026-11-04','22:00',999),makeTrip('POST-LATEST','2026-11-05','21:30',150)];
  const pre = [makeTrip('PRE-ORIGINAL','2026-11-05','23:59',99999)];
  const responses = new Map([[fleetUrl,fleet],[driverUrl,drivers],[accidentUrl,accidents],[postUrl,post],[preUrl,pre]]);
  let syncFails = true;
  let offlineUrl = null;
  await page.route('https://script.google.com/**', async route=>{
   const req=route.request();
   assert.ok(responses.has(req.url()), 'unexpected backend URL / placeholder integration');
   if(req.method()==='POST') {
    const body=JSON.parse(req.postData());
    writes.push({url:req.url(),body,contentType:req.headers()['content-type']});
    let saved;
    if(req.url()===fleetUrl) {
     assert.deepEqual(Object.keys(body).sort(),['Availability','Plate','action']);
     Object.assign(fleet.find(v=>(v.Plate||v.plate)===body.Plate),body);
    } else if(req.url()===driverUrl) {
     assert.deepEqual(Object.keys(body).sort(),['Arrangement','Car Plate','Iqama Number','Phone Number','Shift','Status']);
     Object.assign(drivers.find(d=>d['Iqama Number']===body['Iqama Number']),body);
    } else if(req.url()===accidentUrl) {
     const index=accidents.findIndex(a=>a['Accident ID']===body['Accident ID']);
     if(body.action==='delete') accidents.splice(index,1);
     else if(index>=0) accidents[index]={...body};
     else accidents.push({...body,'Accident ID':'TEST-CREATED'});
    } else {
     const records=responses.get(req.url());
     const index=records.findIndex(r=>r['Check ID']===body['Check ID']);
     saved={...body}; delete saved.action;
     if(index>=0) records[index]=saved; else records.push(saved);
     // Simulates the externally managed Post-Trip server, never a frontend POST.
     if(req.url()===postUrl && !syncFails) fleet[0]['Total KM']=body['Odometer (KM)'];
    }
    await route.fulfill({json:{status:'success',record:saved}});
   } else {
    reads.push(req.url());
    if(req.url()===offlineUrl) await route.fulfill({status:503,json:{status:'error'}});
    else await route.fulfill({json:responses.get(req.url())});
   }
  });
  await page.route('https://*.supabase.co/**', route=>route.abort());
  await page.goto(process.env.TAXIQAID_URL || 'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!document.getElementById('boot-status'));
  assert.equal(await page.title(),'TaxiQaid');
  assert.equal(await page.locator('meta[name="application-name"]').getAttribute('content'),'TaxiQaid');
  assert.equal(await page.locator('#login-screen h1').textContent(),'TaxiQaid');
  await page.evaluate(()=>{
   supabaseClient.auth.signInWithPassword=async()=>({data:{user:{id:'fixture-user'}},error:null});
   supabaseClient.auth.getUser=async()=>({data:{user:{id:'fixture-user'}},error:null});
   supabaseClient.auth.signOut=async()=>({error:null});
   supabaseClient.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'},error:null})})})});
  });
  await page.locator('#username').fill('fixture');
  await page.locator('#password').fill('fixture-password');
  await page.locator('#login-button').click();
  await page.waitForFunction(()=>tripChecksDatabase.length===3);
  assert.equal(await page.locator('#view-dashboard h2').textContent(),'Welcome to TaxiQaid');
  await page.locator('[data-view="fleet"] a').click();
  await page.waitForFunction(()=>document.getElementById('fleet-sync-status').textContent.includes('Latest Post-Trip KM loaded'));
  await page.locator('#fleet-plate-input').fill('ABC 123');
  assert.equal(await page.locator('#f-val-km span').textContent(),'150');
  assert.match(await page.locator('#f-val-km small').textContent(),/05\/11\/2026 21:30 \(KSA\)/);
  assert.match(await page.locator('#f-val-assigned-drivers').textContent(),/Fixture Driver/);
  assert.equal(await page.locator('#f-val-accidents').textContent(),'1');
  await page.locator('#edit-fleet-btn').click();
  assert.equal(await page.locator('#edit-fleet-availability').isDisabled(),true);
  assert.equal(await page.locator('#edit-fleet-km').isDisabled(),true);
  await page.locator('#cancel-fleet-edit-btn').click();
  await page.locator('#fleet-plate-input').fill('XYZ-456');
  await page.locator('#edit-fleet-btn').click();
  await page.locator('#edit-fleet-availability').selectOption('Under Maintenance');
  fleet[1].vin='BULK-EDITED-VIN';
  post.push(makeTrip('POST-XYZ','2026-11-06','00:15',2000,'XYZ 456'));
  await page.locator('#refresh-fleet-btn').click();
  await page.waitForFunction(()=>document.getElementById('edit-fleet-km').value==='2000');
  assert.equal(await page.locator('#edit-fleet-availability').inputValue(),'Under Maintenance');
  await page.locator('#edit-fleet-btn').click();
  await page.waitForFunction(()=>!isFleetEditMode);
  assert.equal(fleet[1].vin,'BULK-EDITED-VIN');
  assert.equal(fleet[1]['total km'],55);
  assert.equal(fleet[1].Availability,'Under Maintenance');
  assert.equal(await page.locator('#f-val-vin').textContent(),'BULK-EDITED-VIN');

  const excel = async (button, sheetName, artifact) => {
   const download=page.waitForEvent('download');
   await page.locator(button).click();
   const file=await download;
   const filePath=path.join(output,artifact);
   await file.saveAs(filePath);
   return page.evaluate(({bytes,sheetName})=>{
    const book=XLSX.read(new Uint8Array(bytes),{type:'array'});
    return XLSX.utils.sheet_to_json(book.Sheets[sheetName]);
   },{bytes:Array.from(fs.readFileSync(filePath)),sheetName});
  };
  fleet.push({Plate:'BULK 789',VIN:'BULK-VIN','Total KM':77,Accidents:99});
  const fleetRows=await excel('#export-fleet-excel-btn','Fleet Database','Fleet.xlsx');
  assert.deepEqual(fleetRows.map(r=>r['Total KM']),[150,2000,77]);
  assert.deepEqual(fleetRows.map(r=>r.Accidents),[1,0,0]);
  assert.ok(fleetRows.every(r=>!Object.hasOwn(r,'total km')));

  await page.locator('[data-view="drivers"] a').click();
  await page.locator('#driver-search-input').fill('0000000001');
  await page.locator('#edit-driver-btn').click();
  drivers[0].Nationality='BULK-EDITED-NATIONALITY';
  await page.locator('#edit-phone').fill('5551234');
  await page.locator('#edit-driver-btn').click();
  await page.waitForFunction(()=>!isEditMode);
  assert.equal(drivers[0]['Phone Number'],'5551234');
  assert.equal(await page.locator('#val-nationality').textContent(),'BULK-EDITED-NATIONALITY');
  drivers.push({'Iqama Number':'0000000002','Full Name':'Bulk Driver'});
  assert.equal((await excel('#export-excel-btn','Drivers Database','Drivers.xlsx')).length,2);

  await page.locator('[data-view="accidents"] a').click();
  await page.locator('#accidents-table-body tr').first().click();
  await page.locator('#add-acc-description').fill('Saved fixture description');
  await page.locator('#save-accident-btn').click();
  await page.waitForFunction(()=>document.getElementById('add-accident-modal').style.display==='none');
  assert.equal(accidents[0]['Accident Description'],'Saved fixture description');
  const accidentRows=await excel('#export-accidents-date-btn','Accidents','Accidents.xlsx');
  assert.equal(accidentRows[0]['Accident Description'],'Saved fixture description');
  await page.locator('#accidents-table-body tr').first().click();
  await page.locator('#delete-accident-btn').click();
  await page.waitForFunction(()=>accidentsDatabase.length===0);
  assert.equal(await page.evaluate(()=>fleetDatabase.find(v=>v.Plate==='ABC 123').Accidents),0);

  await page.locator('[data-view="tripcheck"] a').click();
  await page.locator('#tripcheck-type-filter').selectOption('Post-Trip');
  await page.locator('#tripcheck-date-filter').fill('2026-11-05');
  await page.locator('#tripcheck-search-input').fill('Fixture');
  post.push(makeTrip('POST-FILTERED','2026-11-05','20:00',140));
  const before=reads.length;
  await page.locator('#refresh-tripchecks-btn').click();
  await page.waitForFunction(()=>!document.getElementById('refresh-tripchecks-btn').disabled);
  assert.deepEqual(reads.slice(before).sort(),[preUrl,postUrl].sort());
  assert.equal(await page.locator('#tripcheck-type-filter').inputValue(),'Post-Trip');
  assert.equal(await page.locator('#tripcheck-date-filter').inputValue(),'2026-11-05');
  assert.equal(await page.locator('#tripcheck-search-input').inputValue(),'Fixture');
  assert.equal(await page.locator('#tripchecks-table-body tr').count(),2);

  const editLatest = async km => {
   await page.locator('#tripchecks-table-body tr').filter({hasText:'POST-LATEST'}).getByRole('button',{name:'Edit inspection POST-LATEST',exact:true}).click();
   await page.locator('#tripcheck-edit-odometer').fill(String(km));
   await page.locator('#tripcheck-edit-save').click();
   await page.waitForFunction(()=>!document.getElementById('tripcheck-edit-save').disabled);
  };
  const fleetWrites=writes.filter(w=>w.url===fleetUrl).length;
  await editLatest(175);
  assert.equal(post.find(r=>r['Check ID']==='POST-LATEST')['Odometer (KM)'],175);
  assert.match(await page.locator('#tripcheck-save-status').textContent(),/Inspection saved.*Warning:.*Fleet synchronization failed/);
  assert.equal(await page.locator('#tripcheck-save-status').getAttribute('role'),'alert');
  assert.equal(writes.filter(w=>w.url===fleetUrl).length,fleetWrites);
  syncFails=false;
  offlineUrl=fleetUrl;
  await editLatest(190);
  assert.equal(post.find(r=>r['Check ID']==='POST-LATEST')['Odometer (KM)'],190);
  assert.match(await page.locator('#tripcheck-save-status').textContent(),/Inspection saved.*Warning:.*Fleet synchronization failed/);
  offlineUrl=null;
  await editLatest(200);
  assert.doesNotMatch(await page.locator('#tripcheck-save-status').textContent(),/Warning/);
  assert.equal(fleet[0]['Total KM'],200);
  const saved=post.find(r=>r['Check ID']==='POST-LATEST');
  assert.equal(saved.Date,'2026-11-05'); assert.equal(saved.Time,'21:30'); assert.equal(saved.Signed,'Yes');
  assert.match(saved['Last Edited At'],/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(writes.filter(w=>w.url===fleetUrl).length,fleetWrites);
  const tripRows=await excel('#export-tripchecks-btn','Trip Checks','TripChecks.xlsx');
  assert.equal(tripRows.length,2);
  assert.equal(tripRows.find(r=>r['Check ID']==='POST-LATEST')['Odometer (KM)'],200);
  offlineUrl=preUrl;
  const countBefore=await page.locator('#tripchecks-table-body tr').count();
  await page.locator('#refresh-tripchecks-btn').click();
  await page.waitForFunction(()=>!document.getElementById('refresh-tripchecks-btn').disabled);
  assert.equal(await page.locator('#tripchecks-table-body tr').count(),countBefore);
  assert.match(await page.locator('#tripcheck-sync-status').textContent(),/Unable to load/);
  offlineUrl=null;

  const pdfDownload=page.waitForEvent('download',{timeout:60000});
  await page.locator('#export-tripchecks-pdf-zip-btn').click();
  const zipFile=await pdfDownload; const zipPath=path.join(output,'Trip_Check_PDFs.zip');
  await zipFile.saveAs(zipPath);
  const pdfs=await page.evaluate(async bytes=>{
   const zip=await JSZip.loadAsync(new Uint8Array(bytes)); const files=[];
   for(const file of Object.values(zip.files)) if(!file.dir) {
    const text=await file.async('string'); files.push({name:file.name,pdf:text.startsWith('%PDF-'),custom:text.includes('TaxiQaid') && text.includes('DRIVER SIGNATURE CONFIRMATION')});
   }
   return files;
  },Array.from(fs.readFileSync(zipPath)));
  assert.equal(pdfs.length,2); assert.ok(pdfs.every(p=>p.pdf && p.custom));

  // Exercise creation with real pointer input on the existing signature canvas.
  await page.clock.setFixedTime(new Date('2026-11-05T23:10:00Z'));
  await page.locator('#open-add-tripcheck-modal').click();
  await page.waitForFunction(()=>document.getElementById('add-tripcheck-modal').style.display==='flex');
  await page.evaluate(()=>{
   document.getElementById('tc-plate').value='ABC 123';
   document.getElementById('tc-iqama').value='0000000001';
   document.getElementById('tc-driver-name').value='Fixture Driver';
   document.getElementById('tc-odometer').value='200';
   TRIPCHECK_QUESTIONS.forEach(([id])=>setWizardChoice(id,'OK'));
   showWizardStep(totalWizardSteps);
  });
  await page.locator('#tc-signature-canvas').waitFor({state:'visible'});
  const box=await page.locator('#tc-signature-canvas').boundingBox();
  await page.mouse.move(box.x+30,box.y+30); await page.mouse.down();
  await page.mouse.move(box.x+160,box.y+70,{steps:8}); await page.mouse.up();
  await page.locator('#tc-confirm-signature-btn').click();
  await page.locator('#save-tripcheck-btn').click();
  await page.waitForFunction(()=>!document.getElementById('save-tripcheck-btn').disabled);
  const created=pre.find(r=>r['Check ID']!=='PRE-ORIGINAL');
  assert.ok(created); assert.equal(created.Signed,'Yes');
  assert.equal(created['Check ID'],`PRE-ABC123-${created.Date.replaceAll('-','')}`);
  assert.equal(Object.keys(created).some(k=>/canvas|bitmap|signature.*data/i.test(k)),false);
  assert.equal(created.Date,'2026-11-06');
  assert.equal(created.Time,'02:10');
  assert.equal(writes.filter(w=>w.url===fleetUrl).length,fleetWrites);

  // A failed Sheet reload cancels an Excel download, rather than using cache.
  offlineUrl=preUrl;
  await page.locator('#export-tripchecks-btn').click();
  await page.waitForFunction(()=>!document.getElementById('export-tripchecks-btn').disabled);
  assert.match(dialogs.at(-1),/Export cancelled/);
  assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);
  console.log(JSON.stringify({result:'passed',browserTimezone:'America/Los_Angeles',checks:'branding, Fleet/Driver protected patch persistence, manual bulk rows, fresh Sheet reloads for four Excel exports, derived accident deletion, Trip Refresh filters and failure, Post-Trip sync mismatch/read-failure/success, no duplicate Fleet writes, KSA IDs/signature creation, filtered custom PDFs',pdfCount:pdfs.length,backendWrites:'fixture requests only',artifacts:output},null,2));
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
