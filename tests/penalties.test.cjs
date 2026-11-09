// Synthetic source fixtures stay in tests; the application has no connected records.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const p = require('../modules/compliance/penalties/penalties.js');
const record = (overrides={}) => Object.freeze({'ID':'test-only-reference','Details':'Test description','Date':'2026-01-10','Time':'12:30',
  'Car Plate':'test-only-plate','Driver Iqama':'00001','Driver Name':'Synthetic Driver','Amount':12.5,'Charged To':'source-provided text',...overrides});

test('the read-only overview uses exactly the nine approved columns', () => {
  assert.deepEqual(p.COLUMNS,['ID','Details','Date','Time','Car Plate','Driver Iqama','Driver Name','Amount','Charged To']);
});

test('Driver Name and Iqama filters work independently or together without changing records', () => {
  const records=Object.freeze([record(),record({'Driver Iqama':'00002','Driver Name':'Different Synthetic Driver'})]);
  const before=JSON.stringify(records);
  assert.deepEqual(p.filterRecords(records,{driverName:'SYNTHETIC'}),records);
  assert.deepEqual(p.filterRecords(records,{driverIqama:'00001'}),[records[0]]);
  assert.deepEqual(p.filterRecords(records,{driverName:'different',driverIqama:'00002'}),[records[1]]);
  assert.deepEqual(p.filterRecords(records,{driverName:'different',driverIqama:'00001'}),[]);
  assert.equal(JSON.stringify(records),before);
});

test('date filters include both boundary dates and use Date independently of Time', () => {
  const records=[record({Date:'2026-01-09'}),record({Date:'2026-01-10',Time:'00:00'}),
    record({Date:'2026-01-11',Time:'23:59:59'}),record({Date:'2026-01-12'})];
  assert.deepEqual(p.filterRecords(records,{startDate:'2026-01-10',endDate:'2026-01-11'}),records.slice(1,3));
  assert.deepEqual(p.filterRecords(records,{startDate:'2026-01-12'}),[records[3]]);
  assert.deepEqual(p.filterRecords(records,{endDate:'2026-01-09'}),[records[0]]);
  assert.deepEqual(p.filterRecords(records,{startDate:'2026-01-10',endDate:'2026-01-10'}),[records[1]]);
});

test('invalid date filters are explicit; unsupported source dates cannot silently match a period', () => {
  assert.throws(()=>p.filterRecords([],{startDate:'2026-02-30'}),/Start Date/);
  assert.throws(()=>p.filterRecords([],{endDate:'01/10/2026'}),/End Date/);
  assert.throws(()=>p.filterRecords([],{startDate:'2026-02-01',endDate:'2026-01-01'}),/on or before/);
  assert.equal(p.isIsoDate('2024-02-29'),true);assert.equal(p.isIsoDate('2025-02-29'),false);
  assert.deepEqual(p.filterRecords([record({Date:null})],{startDate:'2026-01-01'}),[]);
  assert.equal(p.displayValue(record({Date:null}),'Date'),'Unavailable');
});

test('amount formatting uses SAR and two decimals without inventing missing amounts or interpreting signs', () => {
  assert.equal(p.formatAmount(12.5),'SAR 12.50');assert.equal(p.formatAmount(0),'SAR 0.00');
  assert.equal(p.formatAmount(-12.5),'SAR -12.50');assert.equal(p.formatAmount(1.005),'SAR 1.01');
  for(const invalid of [null,undefined,'', '12.50',NaN,Infinity]) assert.equal(p.formatAmount(invalid),'Unavailable');
  const source=record({Amount:12.5});p.displayValue(source,'Amount');assert.equal(source.Amount,12.5);
  assert.equal(typeof source.Amount,'number');
});

test('valid source times retain 24-hour precision; missing or invalid times are not invented', () => {
  for(const time of ['00:00','08:30','23:59:59']) assert.equal(p.formatTime(time),time);
  for(const time of ['',null,'24:00','12:60','8:30','08:30 PM']) assert.equal(p.formatTime(time),'Unavailable');
});

test('IDs, Details and Charged To retain source content without a vocabulary or ID convention', () => {
  const details='<literal source text> '+ 'Long text '.repeat(2000);
  const source=record({ID:'any external reference / 7',Details:details,'Charged To':'  Source Party <unchanged>  '});
  assert.equal(p.displayValue(source,'ID'),source.ID);
  assert.equal(p.displayValue(source,'Details'),details);
  assert.equal(p.displayValue(source,'Charged To'),source['Charged To']);
});
