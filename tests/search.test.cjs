// All fixtures are confined to tests; production search collections remain empty.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const s=require('../shared/search.js');
test('shared matching trims whitespace, normalizes case and plates, and supports partial text',()=>{
 const record={'Accident ID':'ACD-00001','Car Plate':'AbC - 123','Driver Iqama':'001234','Driver Name':'Synthetic   Driver'};
 for(const q of [' acd-000 ','ABC123','abc_123',' 0012 ','SYNTHETIC DRIVER']) assert.equal(s.matches(record,s.CONFIG.accidents.fields,q),true,q);
 assert.equal(s.matches(record,s.CONFIG.accidents.fields,'missing'),false);
 assert.equal(s.matches(record,s.CONFIG.accidents.fields,'   '),true);
 assert.equal(s.matches({'Car Plate':'ABC'},[{key:'Car Plate',plate:true}],'-'),false);
});
test('each module declares all required identifiers and preserves aliases and numeric zero',()=>{
 const fixtures={
  fleet:{'Car Plate':'ABC 123',VIN:'VIN-test',Model:'Model-test'},
  drivers:{'Driver Iqama':'001','Driver Name':'Name-test','Phone Number':'555-test'},
  accidents:{'Accident ID':'ACD-test','Car Plate':'ABC123','Driver Iqama':'001','Driver Name':'Name-test'},
  breakdowns:{'Breakdown ID':'BDW-test','Car Plate':'ABC123','Driver Iqama':'001','Driver Name':'Name-test'},
  requests:{ID:'ACD-test','Car Plate':'ABC123','Car Model':'Model-test','Sent By':'Sender-test'},
  overview:{'Maintenance ID':'MTN-test','Original Source ID':'ACD-test','Car Plate':'ABC123','Maintenance Engineer Iqama':'001'},
  fuel:{'Fuel Record ID':'Fuel-test','Car Plate':'ABC123','Driver Iqama':'001','Driver Name':'Name-test'},
  ncr:{'NCR ID':'NCT-test','Driver Iqama':'001','Driver Name':'Name-test'},
  scores:{'Driver Iqama':'001','Driver Name':'Name-test'},
  penalties:{ID:'Source-test','Car Plate':'ABC123','Driver Iqama':'001','Driver Name':'Name-test'},
  tripcheck:{'Check ID':'Check-test','Car Plate':'ABC123','Driver Iqama':'001','Driver Name':'Name-test'}
 };
 for(const [name,record] of Object.entries(fixtures)) for(const value of Object.values(record)) assert.equal(s.matches(record,s.CONFIG[name].fields,value),true,name+': '+value);
 assert.equal(s.read({id:0},'ID'),0);
 assert.equal(s.matches({id:0},s.CONFIG.penalties.fields,'0'),true);
});
