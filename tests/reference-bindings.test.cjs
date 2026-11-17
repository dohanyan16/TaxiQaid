const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const binding=fs.readFileSync('shared/reference-bindings.js','utf8');
const data=fs.readFileSync('shared/data.js','utf8');
test('all reference-bound previews are explicit and no cross-module mutation or direct Google call exists',()=>{
 const pages=['accidents','breakdowns','maintenance','fuel','ncr','driver-deductions','customer-care','training'];
 for(const page of pages){
  const accepts=vm.runInNewContext(binding+'\nTaxiQaidReferenceBindings.supported('+JSON.stringify(page)+')');
  assert.equal(accepts,true,page);
 }
 for(const page of ['drivers','fleet','user-management','roster'])assert.equal(vm.runInNewContext(binding+'\nTaxiQaidReferenceBindings.supported('+JSON.stringify(page)+')'),false);
 assert.doesNotMatch(binding,/https?:\/\/|innerHTML|fetch\(|\.update\(|\.insert\(/);
 assert.match(binding,/fetchFleet\(\{signal\}\)/);
 assert.match(binding,/fetchDrivers\(\{signal\}\)/);
 assert.match(binding,/complete:false/);
});
test('cross-module references read the authorized Drivers and Fleet sources and refuse stale or revoked contexts',()=>{
 assert.match(data,/TaxiQaidSources\.read\('drivers',\{signal\}\)/);
 assert.match(data,/TaxiQaidSources\.read\('fleet',\{signal\}\)/);
 assert.match(data,/uid!==TaxiQaidAccess\.getUid\(\)/);
 assert.match(data,/TaxiQaidAccess\.can\('drivers\.view'\)/);
 assert.match(data,/TaxiQaidAccess\.can\('fleet\.view'\)/);
 assert.doesNotMatch(data,/https?:\/\/sheets\.googleapis|script\.google\.com/);
});
