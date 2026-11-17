const {test}=require('node:test');
const assert=require('node:assert/strict');
const schemas=require('../shared/operational-schemas.js');
const loader=()=>import('../supabase/functions/operational-data/domain-model.mjs');

test('each of the 14 approved operational workbooks accepts an exact empty DATA sheet',async()=>{
 const {operationalDomainRows}=await loader();
 const domains=Object.entries(schemas);
 assert.equal(domains.length,14);
 for(const [key,spec] of domains){
  const data=operationalDomainRows(key,[spec.tabs.DATA]);
  assert.deepEqual(data,[],key);
  assert.ok(typeof spec.secret==='string'&&spec.secret.startsWith('TAXIQAID_'));
 }
});
test('owner-appended Traffic Violations rows need no technical fields; business ID is still mandatory',async()=>{
 const {operationalDomainRows}=await loader();
 const cfg=schemas.penalties;
 const values=(id,record='',version='')=>cfg.tabs.DATA.map(k=>({'Penalty ID':id,'Date':'2026-11-17','Record ID':record,'Row Version':version})[k]||'');
 const parsed=operationalDomainRows('penalties',[cfg.tabs.DATA,values('PEN-0001')]);
 assert.equal(parsed[0].id,null);
 assert.equal(parsed[0].version,null);
 assert.equal(parsed[0].values['Penalty ID'],'PEN-0001');
 assert.throws(()=>operationalDomainRows('penalties',[cfg.tabs.DATA,values('PEN-0001'),values('PEN-0001')]),/SHEET_IDENTITY_CONFLICT/);
 assert.throws(()=>operationalDomainRows('penalties',[cfg.tabs.DATA,values('')]),/SHEET_IDENTITY_CONFLICT/);
});
test('stored operational row versions and opaque IDs must be consistent',async()=>{
 const {operationalDomainRows}=await loader();const cfg=schemas.accidents;
 const row=(id,version)=>cfg.tabs.DATA.map(k=>({
  'Accident ID':'ACD-00001','Record ID':id,'Row Version':version
 })[k]??'');
 assert.equal(operationalDomainRows('accidents',[cfg.tabs.DATA,row('row-001','1')])[0].version,1);
 for(const [id,version] of [['row-001',''],['','1'],['row-001','0'],['row-001','not-a-number']]){
  assert.throws(()=>operationalDomainRows('accidents',[cfg.tabs.DATA,row(id,version)]),/SHEET_VERSION_INVALID/);
 }
 assert.throws(()=>operationalDomainRows('accidents',[cfg.tabs.DATA,row('bad id','1')]),/SHEET_IDENTITY_CONFLICT/);
});
test('a schema mismatch does not silently reinterpret user workbooks',async()=>{
 const {operationalDomainRows}=await loader();
 for(const [module,spec] of Object.entries(schemas)){
  const changed=[...spec.tabs.DATA];changed[0]='Unexpected Header';
  assert.throws(()=>operationalDomainRows(module,[changed]),/SHEET_HEADERS_MISMATCH/,module);
 }
});
