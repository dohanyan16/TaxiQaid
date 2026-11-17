const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

test('restricted connection rejects unsafe host/role/port/query without disclosing secret values',async()=>{
 const {operationalConnectionOptions:options}=await import('../supabase/functions/operational-data/write-receipts.mjs');
 const valid='postgresql://taxiqaid_operational_login.mqkflwsvnzcaylxtvsje:strong%23password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require';
 const result=options('  '+valid+'  ');
 assert.equal(result.username,'taxiqaid_operational_login.mqkflwsvnzcaylxtvsje');
 assert.equal(result.password,'strong#password');
 assert.equal(result.prepare,false);
 assert.equal(result.ssl.rejectUnauthorized,true);
 const bad=[
  ['not a URL','OPDB_URL_INVALID'],
  [valid.replace('postgresql:','https:'),'OPDB_URL_FORMAT'],
  [valid.replace('strong%23password',''),'OPDB_PASSWORD_MISSING'],
  [valid.replace('taxiqaid_operational_login','postgres'),'OPDB_ROLE_MISMATCH'],
  [valid.replace('taxiqaid_operational_login.mqkflwsvnzcaylxtvsje','taxiqaid_operational_login').replace('aws-0-eu-central-1.pooler.supabase.com','127.0.0.1'),'OPDB_HOST_OR_PORT'],
  [valid.replace(':6543/postgres',':9999/postgres'),'OPDB_HOST_OR_PORT'],
  [valid.replace('sslmode=require','sslmode=disable'),'OPDB_QUERY_UNSUPPORTED']
 ];
 for(const [url,code]of bad){
  assert.throws(()=>options(url),error=>error.message===code&&!error.message.includes('password'));
 }
});

test('live Sheets panels expose approved page registry and contain no direct Google transport',()=>{
 const code=fs.readFileSync('shared/live-sheets.js','utf8');
 const pages=['breakdowns','maintenance','fuel','ncr','training','driver-deductions','customer-care','user-management'];
 for(const page of pages)assert.equal(vm.runInNewContext(code+'\nTaxiQaidLiveSheets.accepts('+JSON.stringify(page)+')'),true,page);
 assert.equal(vm.runInNewContext(code+'\nTaxiQaidLiveSheets.accepts("drivers")'),false);
 assert.equal(vm.runInNewContext(code+'\nTaxiQaidLiveSheets.accepts("roster")'),false);
 assert.match(code,/TaxiQaidSources\.read\(module/);
 assert.doesNotMatch(code,/https?:\/\/|document\.write|\.innerHTML\s*=/);
 assert.match(code,/context\?\.role!=='super_admin'/);
 assert.match(code,/record\.values|values\(record\)/);
});