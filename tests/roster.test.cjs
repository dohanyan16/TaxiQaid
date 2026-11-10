const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../modules/people/roster/roster-model.js'),{rows}=require('./roster-fixtures.cjs');
const initial=require('../modules/people/roster/locations.json');
function pair(day={},night={}) {return model.combine(model.parseRows(rows(day),'Day Shift'),model.parseRows(rows({base:9100000000,start:'18:00',end:'06:00',platePrefix:'NIGHT',...night}),'Night Shift'));}
test('paired rows preserve driver, seven actual dates and per-day vehicle assignments',()=>{
 const result=pair();assert.equal(result.ok,true);assert.deepEqual(result.counts,{day:2,night:2,total:4});
 const driver=result.drivers[0];assert.equal(driver.assignments.length,7);assert.equal(driver.assignments[0].duty,'Rest Day');assert.equal(driver.assignments[0].plate,'');
 assert.equal(driver.assignments[1].plate,'0-TEST');assert.equal(result.week[0],'2026-11-08');assert.equal(result.week[6],'2026-11-14');
});
test('a shift may contain zero drivers without inventing assignments',()=>{const result=pair({drivers:3},{drivers:0});assert.equal(result.ok,true);assert.deepEqual(result.counts,{day:3,night:0,total:3});});
test('delimiters preserve hyphenated zone/stop names and actual overnight hours',()=>{
 const a=model.parseAssignment('(19:15)-(04:45)-Zone: A - B - Stop: Stop - 4','SYN-1','2026-11-14','Night Shift');
 assert.equal(a.zone,'A - B');assert.equal(a.stop,'Stop - 4');assert.equal(a.start,'19:15');assert.equal(a.endDate,'2026-11-15');
 assert.equal((model.interval(a)[1]-model.interval(a)[0])/3600000,9.5);
});
test('missing cells, orphan vehicle rows and inconsistent Rest Days are rejected',()=>{
 for(const mutate of [data=>data[2][3]='',data=>data[3][3]='FAKE-CAR',data=>data[3][1]='Another Driver',data=>data[2][2]='',data=>data[2][2]='123']) {
  const data=rows();mutate(data);assert.equal(model.parseRows(data,'Day Shift').ok,false);
 }
 assert.throws(()=>model.parseAssignment('(12:00)-(00:00)-Zone: X - Stop: Y','REST DAY','2026-11-08','Day Shift'));
});
test('formula assignments and impossible times/dates are rejected without trusting cached values',()=>{
 const data=rows();data[2][4]={v:'REST DAY',f:'SOME_FORMULA()'};assert.equal(model.parseRows(data,'Day Shift').ok,false);
 for(const value of ['24:00','12:60','-1:00','9pm'])assert.throws(()=>model.time(value));
 assert.throws(()=>model.parseAssignment('(12:00)-(12:00)-Zone: X - Stop: Y','A','2026-11-08','Day Shift'));
 assert.throws(()=>model.isoDate('2026-02-29'));assert.throws(()=>model.excelDate(60));assert.equal(model.excelDate(0,true),'1904-01-01');
});
test('both workbooks must contain the same consecutive Sunday–Saturday dates',()=>{
 assert.equal(pair({}, {week:'2026-11-15'}).ok,false);
 const data=rows();data[1][5]++;assert.equal(model.parseRows(data,'Day Shift').ok,false);
 assert.equal(model.parseRows(rows({week:'2026-11-09'}),'Day Shift').ok,false);
});
test('duplicate Iqamas within and across shift files cannot create duplicate schedules',()=>{
 const data=rows();data[4][2]=data[2][2];assert.equal(model.parseRows(data,'Day Shift').ok,false);
 assert.equal(pair({}, {base:9000000000}).ok,false);
});
test('vehicle conflicts include actual overlap after midnight and normalized plates',()=>{
 assert.equal(pair({}, {platePrefix:'TEST'}).ok,false);
 const a=rows({drivers:2,restDay:6,start:'18:00',end:'06:00'});a[4][4]='(05:00)-(17:00)-Zone: X - Stop: Y';a[5][4]='0 - TEST';
 const result=model.combine(model.parseRows(a,'Day Shift'),model.parseRows(rows({drivers:1,base:9100000000,platePrefix:'OTHER'}),'Night Shift'));
 assert.equal(result.ok,false);assert.ok(result.issues.some(issue=>issue.message.includes('Conflicting vehicle')));
});
test('changing weekly driver counts and weeks produces independent datasets above 800 drivers',()=>{
 const large=pair({drivers:805},{drivers:17});assert.equal(large.ok,true);assert.equal(large.counts.total,822);assert.equal(model.daily(large).length,822*7);
 const next=pair({drivers:1,week:'2026-11-15'},{drivers:1,week:'2026-11-15'});assert.equal(next.counts.total,2);assert.equal(next.week[0],'2026-11-15');assert.equal(large.counts.total,822);
});
test('all 76 reference coordinates validate and DEPOT remains the exact supplied location',()=>{
 const catalog=model.validateLocations(initial);assert.equal(catalog.locations.length,76);
 const depot=model.findLocation(catalog,' depot ');assert.equal(depot.latitude,21.340459729677285);assert.equal(depot.longitude,39.62585445210181);
 assert.equal(model.mapUrl(depot),'https://www.google.com/maps/search/?api=1&query=21.340459729677285,39.62585445210181');
 assert.equal(model.findLocation(catalog,'Kuday -At Taqwa','zone'),null);
});
test('location matching normalizes only safe punctuation and explicitly approved aliases',()=>{
 const catalog=model.validateLocations({schemaVersion:1,coordinateOrder:'latitude,longitude',locations:[{name:'Example - Stop',latitude:21,longitude:39,aliases:['Approved Alias']}]});
 assert.equal(model.findLocation(catalog,' EXAMPLE – STOP ').name,'Example - Stop');assert.equal(model.findLocation(catalog,'approved   alias').name,'Example - Stop');assert.equal(model.findLocation(catalog,'Example Stpo'),null);
});
test('names, aliases and coordinates must be unambiguous; failed updates leave the source intact',()=>{
 const catalog=model.validateLocations(initial),before=JSON.stringify(catalog);
 for(const entry of [{name:'New',latitude:91,longitude:39},{name:'New',latitude:21,longitude:181},{name:'New',latitude:NaN,longitude:39},{name:'New',latitude:'21',longitude:39},{name:'',latitude:21,longitude:39},{name:'DEPOT',latitude:21,longitude:39},{name:'New',latitude:21,longitude:39,aliases:['depot']}])assert.throws(()=>model.updateLocation(catalog,entry));
 assert.equal(JSON.stringify(catalog),before);
 assert.throws(()=>model.validateLocations({...initial,locations:[{name:'A',latitude:1,longitude:1,aliases:['A']}]}));
});
test('unknown stops remain original text and resolve through a local catalog update, without reimport',()=>{
 const roster=pair({stop:'Missing - Stop'},{stop:'Missing - Stop'}),catalog=model.validateLocations(initial);
 assert.deepEqual(model.mappings(roster,catalog).unmatched,['Missing - Stop']);
 const next=model.updateLocation(catalog,{name:'Missing - Stop',latitude:22.1,longitude:39.2,aliases:[]});assert.equal(model.mappings(roster,next).unmatched.length,0);
 assert.equal(roster.drivers[0].assignments[1].stop,'Missing - Stop');assert.equal(catalog.locations.length,76);
 assert.ok(model.similarNames(next,'Missing - Stop 2').length);
});
test('location exports retain only non-personal configuration fields and explicit zone coordinates',()=>{
 const catalog=model.validateLocations({...initial,drivers:[{name:'PRIVATE'}],zones:[{name:'Explicit Zone',latitude:20,longitude:40}],locations:[{...initial.locations[0],driverName:'PRIVATE',phone:'PRIVATE'}]});
 assert.equal(JSON.stringify(catalog).includes('PRIVATE'),false);assert.ok(model.findLocation(catalog,'Explicit Zone','zone'));assert.equal(model.findLocation(catalog,'Explicit Zone'),null);
});
test('filenames cannot escape a ZIP directory and source names remain unchanged',()=>{
 const driver={iqama:'9000000000',name:'Test / Driver:* ..'};const before=driver.name;
 assert.equal(/[\/\\:*?]/.test(model.filename(driver)),false);assert.ok(model.filename(driver).startsWith('9000000000_'));assert.equal(driver.name,before);
});

test('large conflicting vehicle sets report each affected assignment without quadratic duplicate issues',()=>{
 const data=rows({drivers:1000});for(let row=3;row<data.length;row+=2)for(let column=4;column<10;column++)data[row][column]='SHARED-TEST';
 const result=model.combine(model.parseRows(data,'Day Shift'),model.parseRows(rows({drivers:0}),'Night Shift'));
 assert.equal(result.ok,false);assert.equal(result.issues.length,6000);
});
