// Synthetic policy fixtures exist only in this test harness, never in operational modules.
const test=require('node:test'),assert=require('node:assert/strict');
const appeals=require('../modules/people/driver-appeals/appeals-policy.js');
const training=require('../modules/people/training/training-model.js');
const money=require('../modules/people/driver-deductions/deductions-policy.js');
const search=require('../shared/search.js');
const driver=(id)=>({'Iqama Number':String(id),'Full Name':`Synthetic ${id%2?'odd':'even'} driver ${id}`});
function picker(){return training.createSelection({match:(record,query)=>search.matches(record,search.CONFIG.drivers.fields.slice(0,2),query)});}
test('appeal date filters include both boundary days and exclude missing dates',()=>{
 const records=['2026-11-09','2026-11-10','2026-11-11','2026-11-12',''].map(date=>({'Submission Date':date}));
 assert.deepEqual(records.filter(r=>appeals.matches(r,{start:'2026-11-10',end:'2026-11-11'})).map(r=>r['Submission Date']),['2026-11-10','2026-11-11']);
 assert.equal(appeals.matches(records[1],{start:'2026-11-12',end:'2026-11-10'}),false);
 assert.equal(appeals.matches(records[4],{end:'2026-11-10'}),false);
});
test('appeal department assignment never changes status and only approved values are accepted',()=>{
 assert.deepEqual(appeals.STATUSES,['Pending','In Progress','Done']);
 assert.deepEqual(appeals.DEPARTMENTS,['Pending','Financial','Operation','Quality','IT']);
 assert.deepEqual(appeals.assignment('Pending','Financial'),{Status:'Pending',Department:'Financial'});
 assert.deepEqual(appeals.assignment('In Progress','IT'),{Status:'In Progress',Department:'IT'});
 assert.throws(()=>appeals.assignment('Assigned','IT'));assert.throws(()=>appeals.assignment('Done','Operations'));
 assert.equal(appeals.matches({Status:'Pending',Department:'IT','Appeal Type':'configured-type'},{status:'Pending',department:'IT',type:'configured-type'}),true);
});
test('900-driver picker keeps bounded pages and selects the entire filtered set',()=>{
 const model=picker();model.load(Array.from({length:900},(_,i)=>driver(i)),{complete:true});
 assert.equal(model.snapshot().records.length,25);assert.equal(model.snapshot().pages,36);
 model.search('EVEN');model.selectAllFiltered();assert.equal(model.snapshot().total,450);assert.equal(model.snapshot().selectedCount,450);
 model.move(17);assert.equal(model.snapshot().records.length,25);assert.equal(model.snapshot().selectedCount,450);
 assert.equal(model.snapshot().selectedIds.includes('898'),true);assert.equal(model.snapshot().selectedIds.includes('899'),false);
});
test('driver selections survive searches/pages and can be removed individually or cleared',()=>{
 const model=picker();model.load(Array.from({length:900},(_,i)=>driver(i)),{complete:true});
 model.toggle('0',true);model.move(35);model.toggle('899',true);model.search('no matching driver');
 assert.equal(model.snapshot().records.length,0);assert.equal(model.snapshot().selectedCount,2);
 model.remove('0');assert.deepEqual(model.snapshot().selectedIds,['899']);model.clear();assert.equal(model.snapshot().selectedCount,0);
});
test('duplicate driver IDs never produce duplicate assignments and selection summaries stay bounded',()=>{
 const model=picker();const records=Array.from({length:900},(_,i)=>driver(i));model.load([...records,...records],{complete:true});model.selectAllFiltered();model.selectAllFiltered();model.toggle('1',true);
 assert.equal(model.snapshot().total,900);assert.equal(model.snapshot().selectedCount,900);assert.equal(model.selectedPage(0).length,25);assert.equal(model.selectedPage(35).length,25);
 assert.throws(()=>model.toggle('unknown',true));
});
test('incomplete remote results cannot claim Select All; explicit eligibility is respected',()=>{
 const model=picker();model.load([driver(1),driver(2)]);assert.throws(()=>model.selectAllFiltered(),/Complete eligible/);
 model.load([driver(1),driver(2),driver(3)],{complete:true,eligibleIds:['2','3']});model.selectAllFiltered();assert.deepEqual(model.snapshot().selectedIds,['2','3']);
 model.load([driver(3)],{complete:true});assert.deepEqual(model.snapshot().selectedIds,['3']);
});
test('scheduling, confirmation alone and expired completion do not satisfy requirements',()=>{
 const requirements=[{id:'required',applicable:true},{id:'unrelated',applicable:false}];
 for(const completions of [[],[{requirementId:'required',enrolled:true}],[{requirementId:'required',confirmed:true}],[{requirementId:'required',verified:true,valid:false}]])assert.deepEqual(training.compliance(requirements,completions),{pending:1,status:'Pending Training Sessions'});
 assert.deepEqual(training.compliance(requirements,[{requirementId:'required',verified:true,valid:true}]),{pending:0,status:'On Day'});
});
test('unknown applicability never becomes On Day and requirements are not duplicated',()=>{
 assert.equal(training.compliance(null,[]).pending,null);assert.equal(training.compliance([{id:'r'}],[]).pending,null);
 assert.equal(training.compliance([],[]).status,'On Day');
 assert.throws(()=>training.compliance([{id:'r',applicable:true},{id:'r',applicable:true}],[]),/unique/);
});
test('currency validation rejects nonfinite, nonpositive and fractional-halala amounts',()=>{
 for(const value of ['',NaN,Infinity,'1e3','-10','1.001','0','0.00','-50','90071992547410'])assert.throws(()=>money.cents(value,{positive:true}));
 assert.equal(money.cents('0.01',{positive:true}),1);assert.equal(money.cents('12.3'),1230);assert.equal(money.format(1230),'12.30');
});
test('partial deductions preserve original amount and use exact integer arithmetic',()=>{
 assert.deepEqual(money.preview('500.00','0.00','150.00'),{charged:50000,deducted:0,amount:15000,outstanding:50000,remaining:35000});
 const second=money.preview('500.00','150.00','100.00');assert.equal(second.remaining,25000);assert.equal(second.deducted+second.amount,25000);
 assert.equal(money.format(money.preview('0.30','0.10','0.20').remaining),'0.00');
 assert.equal(money.preview('500','150','350').remaining,0);
});
test('over-deduction and inconsistent previous totals are rejected',()=>{
 assert.throws(()=>money.preview('500','150','350.01'),/outstanding/);assert.throws(()=>money.preview('500','501','1'),/Previous/);
});
test('only authorized posted financial values affect balances, never draft/disputed payments',()=>{
 const charge={authorized:true,posted:true,amount:'500.00'};const payment={authorized:true,posted:true,amount:'150.00'};
 assert.deepEqual(money.balance([charge,{...charge,authorized:false},{...charge,posted:false}],[payment,{...payment,disputed:true},{...payment,reversed:true},{...payment,posted:false}]),{charged:50000,deducted:15000,outstanding:35000});
 assert.throws(()=>money.balance([{authorized:true,posted:true,points:-50}],[]));
 assert.throws(()=>money.balance([{authorized:true,posted:true,liters:20}],[]));
});
test('source classifications preserve original references and cannot treat NCR points as an amount',()=>{
 assert.deepEqual(money.SOURCES,['NCR Financial Fine','Fuel Charge','Traffic Violation','Manual Expense']);
 for(const source of money.SOURCES.slice(0,3))assert.throws(()=>money.expense(source,'50',''),/reference/);
 assert.deepEqual(money.expense('NCR Financial Fine','25.00',' original-ncr-financial-fine '),{source:'NCR Financial Fine',amount:2500,reference:'original-ncr-financial-fine'});
 assert.throws(()=>money.expense('NCR Points','50','ncr-ref'));assert.throws(()=>money.expense('NCR Financial Fine','-50','ncr-ref'));
 assert.equal(money.expense('Manual Expense','1').amount,100);
});
