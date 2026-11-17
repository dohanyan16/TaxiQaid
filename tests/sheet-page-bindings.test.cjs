'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const manifest=require('../schemas/operational-template-contract.json');
const domains=manifest.domains;

const liveRoutes=Object.freeze({
  breakdowns:'breakdowns',
  maintenance:'maintenance',
  fuel:'fuel',
  ncr:'ncr',
  training:'training',
  'driver-deductions':'driver-deductions',
  'customer-care':'customer-care',
  'driver-profile-requests':'user-management',
  'user-directory':'user-management',
  'driver-reset-requests':'user-management'
});
const nativeRoutes=Object.freeze({
  accidents:['accidents','modules/accidents/accidents.js'],
  tripcheck:['tripcheck','modules/tripcheck/tripcheck.js'],
  penalties:['penalties','modules/compliance/penalties/penalties.js'],
  'driver-appeals':['driver-appeals','modules/people/driver-appeals/driver-appeals.js']
});
const primaryRoutes=Object.freeze({
  drivers:['drivers','modules/drivers/drivers.js','TAXIQAID_DRIVERS_SHEET_ID'],
  fleet:['fleet','modules/fleet/fleet.js','TAXIQAID_FLEET_SHEET_ID']
});
const expectedSecrets=Object.freeze({
  accidents:'TAXIQAID_ACCIDENTS_SHEET_ID',
  breakdowns:'TAXIQAID_BREAKDOWNS_SHEET_ID',
  maintenance:'TAXIQAID_MAINTENANCE_SHEET_ID',
  fuel:'TAXIQAID_FUEL_SHEET_ID',
  tripcheck:'TAXIQAID_TRIPCHECK_SHEET_ID',
  ncr:'TAXIQAID_NCR_SHEET_ID',
  penalties:'TAXIQAID_TRAFFIC_VIOLATIONS_SHEET_ID',
  training:'TAXIQAID_TRAINING_SHEET_ID',
  'driver-deductions':'TAXIQAID_DEDUCTIONS_SHEET_ID',
  'driver-appeals':'TAXIQAID_APPEALS_SHEET_ID',
  'customer-care':'TAXIQAID_CUSTOMER_CARE_SHEET_ID',
  'driver-profile-requests':'TAXIQAID_DRIVER_PROFILE_REQUESTS_SHEET_ID',
  'user-directory':'TAXIQAID_USER_DIRECTORY_SHEET_ID',
  'driver-reset-requests':'TAXIQAID_DRIVER_RESET_REQUESTS_SHEET_ID'
});

function currentLiveBindings(){
 const code=source('shared/live-sheets.js');
 const match=code.match(/const byPage=Object\.freeze\((\{[\s\S]*?\})\);/);
 assert.ok(match,'read-only page connection registry must remain explicit');
 const values=vm.runInNewContext('('+match[1]+')');
 return Object.fromEntries(Object.entries(values).map(([page,items])=>[page,[...items]]));
}

test('exactly 16 approved workbooks have one intended page each (14 operational + 2 primary)',()=>{
 assert.equal(Object.keys(domains).length,14);
 const expected=new Set([...Object.keys(liveRoutes),...Object.keys(nativeRoutes)]);
 assert.equal(expected.size,14,'no source is routed to both a panel and a native reader');
 assert.deepEqual(Object.keys(domains).sort(),[...expected].sort());
 assert.equal(Object.keys(primaryRoutes).length,2);
 assert.equal(expected.has('helpdesk'),false,'Helpdesk is deferred without an approved workbook');
 const visible=new Set();
 const bootstrap=source('shared/bootstrap.js');
 for(const page of [...Object.values(liveRoutes),...Object.values(nativeRoutes).map(x=>x[0]),...Object.values(primaryRoutes).map(x=>x[0])]){
  visible.add(page);
  assert.match(bootstrap,new RegExp('name:\\s*["\x27]'+page+'["\x27]'),'configured page '+page);
 }
 assert.equal(visible.size,14,'16 sources intentionally occupy 14 different management pages');
});
test('each of 14 Sheets uses its exact own Secret and only DATA as current reader',()=>{
 const values=Object.values(expectedSecrets);
 assert.equal(new Set(values).size,14);
 for(const [domain,secret] of Object.entries(expectedSecrets)){
  assert.equal(domains[domain].secret,secret,'source mismatch '+domain);
  assert.deepEqual(domains[domain].tabs.DATA.slice(0,1).length,1,'DATA header contract missing '+domain);
  assert.equal(domains[domain].sourceVerified,false,'do not falsely certify untested live workbook IDs');
 }
 const google=source('supabase/functions/operational-data/google.mjs');
 for(const name of ['TAXIQAID_DRIVERS_SHEET_ID','TAXIQAID_FLEET_SHEET_ID'])
  assert.ok(google.includes(name),'primary reader is missing '+name);
 assert.match(google,/operationalDomain\(module\)\.secret/,'operational Google read must use the schema-specific source');
 assert.match(google,/["\x27]DATA["\x27]!A:AZ/,'read-only operational transport must read DATA');
});
test('14 approved sources are assigned to exactly the visible intended pages',()=>{
 const actual=currentLiveBindings();
 const inverted=Object.fromEntries(Object.entries(liveRoutes).map(([domain,page])=>[domain,page]));
 const mapped={};
 for(const [page,sources] of Object.entries(actual)){
  for(const domain of sources){
   assert.equal(mapped[domain],undefined,'duplicate live sheet '+domain);
   mapped[domain]=page;
  }
 }
 assert.deepEqual(Object.keys(mapped).sort(),Object.keys(liveRoutes).sort());
 assert.deepEqual(mapped,inverted);
 assert.equal(Object.keys(actual).includes('helpdesk'),false);
 assert.equal(actual['user-management'].length,3);
 const code=source('shared/live-sheets.js');
 assert.match(code,/TaxiQaidSources\.read\(module,\{signal:activeSignal\}\)/);
 assert.match(code,/context\?\.role!=='super_admin'/,'three sensitive directory/request sources stay Master-only');
 assert.doesNotMatch(code,/https?:\/\/(?:sheets|script)\.google|document\.write|\.innerHTML\s*=/);
 for(const [domain,[page,script]] of Object.entries(nativeRoutes)){
  assert.equal(page,domain,'native view mismatch');
  assert.match(source(script),new RegExp('TaxiQaidSources\\.read\\(["\x27]'+domain+'["\x27]'),'native read '+domain);
 }
 for(const [domain,[page,script]] of Object.entries(primaryRoutes)){
  assert.equal(page,domain);
  assert.match(source(script),new RegExp('TaxiQaidSources\\.read\\(["\x27]'+domain+'["\x27]'),'primary read '+domain);
 }
});
test('only the existing controlled Drivers save is available; operational workbooks are preview-only',()=>{
 const api=source('shared/operational-sources.js');
 const runtime=source('shared/module-runtime.js');
 for(const domain of Object.keys(domains))assert.doesNotMatch(api,new RegExp('update'+domain,'i'));
 assert.match(api,/updateDriver\(/);
 assert.match(runtime,/const backgroundRead=\['accidents','tripcheck','penalties','driver-appeals'\]/);
 assert.match(runtime,/const livePanelPage=\['breakdowns','maintenance','fuel','ncr','training','driver-deductions','customer-care','user-management'\]/);
 assert.match(runtime,/TaxiQaidLiveSheets\.enter\(name,section,signal\)/);
});
