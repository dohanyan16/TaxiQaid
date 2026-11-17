const test=require('node:test'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
let engine;
async function makeEngine(options={}){
 const {createDriverWriteEngine}=await import(pathToFileURL(path.resolve('supabase/functions/operational-data/write-engine.mjs')));
 const entry={id:null,version:null,values:{Iqama:'0000000001','Car Plate':'','Full Name':'Driver X',TID:''},sheetRowIndex:1};
 const seen={claimed:[],finishes:[],writes:[],syncs:[]};
 const schema={editable:['TID','Phone Number','Arrangement','KSA Driving License Date','Shift','Car Plate','Status','Out of Project Date'],plate:v=>String(v||'').toLowerCase(),patch:change=>({...change})};
 const google={data:async module=>({rows:module==='drivers'?[entry]:[]}),writeDriver:async arg=>{seen.writes.push(arg);if(options.failDriver)throw Error('timeout');},syncFleet:async arg=>{seen.syncs.push(arg);if(options.failFleet)throw Error('timeout');}};
 const receipts={claim:async arg=>{seen.claimed.push(arg);return {is_new:true,result_state:'claimed'};},finish:async arg=>{seen.finishes.push(arg);return arg.state;}};
 return {run:createDriverWriteEngine({google,receipts,schema,permissions:{can:()=>true},now:()=>Date.UTC(2026,10,17)}).update,
 seen};
}
const context={verified:true,uid:'00000000-0000-4000-8000-000000000001',username:'tester',accountType:'Management'};
const operation='11111111-1111-4111-8111-111111111111';
const hash=async str=>'ro-'+[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)))].map(n=>n.toString(16).padStart(2,'0')).join('');
test('successful first edit initializes opaque ID, increments version, audits and reconciles',async()=>{
 const {run,seen}=await makeEngine(),recordId=await hash('drivers:0000000001');
 const r=await run({operation,recordId,expectedVersion:0,changes:{TID:'700'}},context);
 assert.equal(r.confirmed,true);assert.equal(r.version,1);
 assert.equal(seen.writes.length,1);assert.equal(seen.syncs.length,1);
 assert.deepEqual(seen.finishes.map(f=>f.state),['applied']);
 assert.equal(seen.writes[0].changes.TID,'700');
});
test('reject readonly fields before any receipt',async()=>{
 const {run,seen}=await makeEngine();
 await assert.rejects(run({operation,recordId:'anything',expectedVersion:0,changes:{Iqama:'XXX'}},context),/INVALID_WRITE/);
 assert.equal(seen.claimed.length,0);
});
test('driver write timeout remains unresolved to prevent unsafe replay',async()=>{
 const {run,seen}=await makeEngine({failDriver:true}),recordId=await hash('drivers:0000000001');
 await assert.rejects(run({operation,recordId,expectedVersion:0,changes:{TID:'800'}},context),/RECOVERY_REQUIRED/);
 assert.equal(seen.finishes[0].state,'uncertain');assert.equal(seen.syncs.length,0);
});
test('fleet sync uncertainty cannot be reported as successful',async()=>{
 const {run,seen}=await makeEngine({failFleet:true}),recordId=await hash('drivers:0000000001');
 await assert.rejects(run({operation,recordId,expectedVersion:0,changes:{TID:'800'}},context),/RECOVERY_REQUIRED/);
 assert.equal(seen.finishes[0].state,'uncertain');assert.equal(seen.writes.length,1);
});
test('version conflict frees receipt without mutating Google',async()=>{
 const {run,seen}=await makeEngine();
 await assert.rejects(run({operation,recordId:'unknown',expectedVersion:0,changes:{TID:'800'}},context),/VERSION_CONFLICT/);
 assert.equal(seen.finishes[0].state,'conflict');assert.equal(seen.writes.length,0);
});