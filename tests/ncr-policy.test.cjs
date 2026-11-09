// Synthetic fixtures are used only for pure scoring regression tests.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const policy = require('../modules/compliance/ncr/ncr-policy.js');
const ncr = (categoryKey='mdt-black-shift', ncrDate='2025-01-01', extra={}) => ({categoryKey, ncrDate, ...extra});
const asOf = '2025-03-31';

test('the exact approved 23 categories have stable unique keys and only approved penalties', () => {
  const expected = [
    ['Tampering with any CCTV cameras',-50],
    ['Money corruption, fraud, or disloyalty',-50],
    ['Transporting passengers without payment or carrying unauthorized goods in the vehicle',-50],
    ['Damaging TaxiQaid assets, including vehicles or office buildings',-25],
    ['Smoking inside vehicles, offices, accommodation, or prohibited areas',-25],
    ['Reckless driving, including vehicle drifting, without causing damage',-25],
    ['Not wearing the full uniform or maintaining poor personal hygiene',-25],
    ['Using a company vehicle for personal purposes',-25],
    ['Depot violations, including speeding, littering, or improper parking',-25],
    ['Engaging in fights or arguments with employees, passengers, or others',-10],
    ['Using a phone or not fastening a seat belt while driving',-10],
    ['Failure to log in to the MDT device',-10],
    ['Failure to report incidents to OCC',-10],
    ['Unprofessional or rude behavior toward others',-10],
    ['Placing blankets or luggage inappropriately, or sleeping in the vehicle',-10],
    ['Non-compliance with TaxiQaid alerts or instructions',-10],
    ['Conduct harmful to TaxiQaid business that is not otherwise listed',-10],
    ['Non-compliance with rules at third-party operating sites',-10],
    ['Remaining at one location for an excessive period',-10],
    ['Absence from work without permission',-25],
    ['Eating while driving',-10],
    ['MDT Black Shift',-10],
    ['Non-compliance with Passenger Pickup & Drop-off Rules',-25]
  ];
  assert.deepEqual(policy.CATEGORIES.map(({label,penalty})=>[label,penalty]),expected);
  assert.equal(new Set(policy.CATEGORIES.map(c=>c.key)).size,23);
  assert.equal(new Set(policy.CATEGORIES.map(c=>c.label)).size,23);
  for(const [penalty,count] of [[-50,3],[-25,8],[-10,12]]) assert.equal(policy.CATEGORIES.filter(c=>c.penalty===penalty).length,count);
  policy.CATEGORIES.forEach(c=>assert.equal(policy.getCategoryPenalty(c.key),c.penalty));
  assert.throws(()=>policy.getCategoryPenalty('unknown'),/Unknown/);
});

test('starting score is 100, each penalty uses positive magnitude and balances have no zero floor', () => {
  const cases = [ [[],100], [[ncr()],90], [[ncr('asset-damage'),ncr('asset-damage')],50],
    [[ncr('cctv-tampering'),ncr('cctv-tampering')],0],
    [[ncr('cctv-tampering'),ncr('cctv-tampering'),ncr()],-10],
    [[ncr('cctv-tampering'),ncr('cctv-tampering'),ncr('cctv-tampering')],-50] ];
  for(const [records,expected] of cases) assert.equal(policy.getCurrentDriverScore(records,asOf),expected);
});

test('expiry is at the beginning of the 90th KSA calendar day', () => {
  assert.equal(policy.getExpiryDate('2025-01-01'),'2025-04-01');
  assert.equal(policy.getNcrStatus('2025-01-01','2025-01-01'),'Active');
  assert.equal(policy.getNcrStatus('2025-01-01','2025-03-31'),'Active');
  assert.equal(policy.getNcrStatus('2025-01-01','2025-04-01'),'Expired');
  assert.equal(policy.getNcrStatus('2025-01-01','2026-04-01'),'Expired');
});

test('calendar addition handles month boundaries, leap years and year changes', () => {
  for(const [date,expiry] of [['2024-01-01','2024-03-31'],['2024-02-29','2024-05-29'],
    ['2025-11-30','2026-02-28'],['2025-12-31','2026-03-31'],['2023-12-01','2024-02-29']]) {
    assert.equal(policy.getExpiryDate(date),expiry);
  }
});

test('independent expiries restore only their own points, eventually recover to 100 and preserve history', () => {
  const records = Object.freeze([Object.freeze(ncr('asset-damage','2025-01-01',{id:'synthetic-1',remarks:'retained'})),
    Object.freeze(ncr('cctv-tampering','2025-02-01',{id:'synthetic-2',statement:'retained'}))]);
  const before = JSON.stringify(records);
  assert.equal(policy.getCurrentDriverScore(records,'2025-03-31'),25);
  assert.equal(policy.getCurrentDriverScore(records,'2025-04-01'),50);
  assert.equal(policy.getCurrentDriverScore(records,'2025-05-02'),100);
  assert.equal(policy.countActiveNcrs(records,'2025-04-01'),1);
  assert.equal(policy.countExpiredNcrs(records,'2025-04-01'),1);
  assert.equal(policy.countHistoricalNcrs(records,'2025-05-02'),2);
  assert.equal(policy.getActivePointsDeducted(records,'2025-04-01'),50);
  assert.equal(JSON.stringify(records),before);
});

test('active/current totals are separate from expired/historical deductions', () => {
  const records=[ncr('cctv-tampering','2025-03-01'),ncr('asset-damage','2025-03-01'),ncr(),ncr()];
  assert.deepEqual(policy.summarizeNcrs(records,'2025-04-01'),{
    startingPoints:100,totalNcrs:4,activeNcrs:2,expiredNcrs:2,futureNcrs:0,
    activePointsDeducted:75,totalHistoricalDeductions:95,currentPoints:25,validationIssues:[]
  });
});

test('future dates never deduct and are explicitly flagged rather than marked Active or Expired', () => {
  const summary = policy.summarizeNcrs([ncr('cctv-tampering','2025-04-02')],'2025-04-01');
  assert.equal(summary.currentPoints,100);
  assert.equal(summary.activeNcrs,0);assert.equal(summary.expiredNcrs,0);assert.equal(summary.futureNcrs,1);
  assert.equal(summary.validationIssues.length,1);
  assert.equal(policy.getNcrStatus('2025-04-02','2025-04-01'),null);
  assert.equal(policy.getCurrentDriverScore([ncr('cctv-tampering','2025-04-02')],'2025-04-02'),50);
});

test('missing and impossible dates fail explicitly; no misleading score or recovery is returned', () => {
  for(const invalid of [null,undefined,'','2025-02-29','2024-02-30','2025-13-01','2025-00-10','2025-01-00','2025-1-1','01/01/2025','2025-01-01T00:00:00Z']) {
    assert.throws(()=>policy.getExpiryDate(invalid),RangeError);
    assert.throws(()=>policy.summarizeNcrs([{...ncr(),ncrDate:invalid}],asOf),RangeError);
  }
  assert.throws(()=>policy.summarizeNcrs([],''),RangeError);
  assert.throws(()=>policy.getExpiryDate('9999-12-31'),RangeError);
});

test('KSA midnight and date arithmetic do not depend on the browser/host timezone or daylight saving', () => {
  for(const timezone of ['America/New_York','Pacific/Honolulu','Europe/Madrid','Asia/Tokyo']) {
    const script = `const p=require('./modules/compliance/ncr/ncr-policy.js');console.log(JSON.stringify([
      p.getKsaDate(new Date('2025-03-31T20:59:59Z')),p.getKsaDate(new Date('2025-03-31T21:00:00Z')),
      p.getExpiryDate('2025-01-01'),p.getExpiryDate('2024-02-29')]))`;
    const values=JSON.parse(execFileSync(process.execPath,['-e',script],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,TZ:timezone},encoding:'utf8'}));
    assert.deepEqual(values,['2025-03-31','2025-04-01','2025-04-01','2024-05-29']);
  }
});

test('TBT and disciplinary action never change expiry or scoring', () => {
  assert.equal(policy.getTbtStatus(''),'Pending');assert.equal(policy.getTbtStatus('2025-03-01'),'Conducted');
  assert.throws(()=>policy.getTbtStatus('2025-02-30'),RangeError);
  for(const action of ['TBT Conducted','1st NCR Initiated','2nd NCR Initiated','3rd NCR Initiated']) {
    const records=[ncr('asset-damage','2025-01-01',{tbtConductedDate:'2025-03-01',actionTaken:action})];
    assert.equal(policy.getCurrentDriverScore(records,'2025-03-31'),75);
    assert.equal(policy.getCurrentDriverScore(records,'2025-04-01'),100);
  }
});

test('inclusive exact/minimum/maximum points filters accept negative and unbounded scores', () => {
  const drivers=[-150,-50,-10,0,25,50,100].map(currentPoints=>({currentPoints}));
  const filter = bounds => policy.filterDriversByPoints(drivers,bounds).map(d=>d.currentPoints);
  assert.deepEqual(filter({exact:'-10'}),[-10]);assert.deepEqual(filter({max:-1}),[-150,-50,-10]);
  assert.deepEqual(filter({min:-50,max:0}),[-50,-10,0]);assert.deepEqual(filter({min:0,max:50}),[0,25,50]);
  assert.deepEqual(filter({exact:100}),[100]);assert.deepEqual(filter({}),drivers.map(d=>d.currentPoints));
  assert.throws(()=>filter({min:50,max:0}),/Minimum/);assert.throws(()=>filter({min:'bad'}),/finite/);
  assert.throws(()=>policy.filterDriversByPoints([{currentPoints:null}],{}),/unresolved/);
});
