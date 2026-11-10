// Synthetic drafts only; no customer records, accounts or operational stores are created.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../modules/customer/support-policy.js'),search=require('../shared/search.js');
const initial=()=>({receivedDate:'2026-11-10',channel:'Phone',type:'Complaint',category:'Safety',priority:'High',details:'Synthetic request\nSecond line',status:'New',department:'',rating:null,refundAmount:''});
test('case and ticket columns and statuses are separate approved contracts',()=>{
 assert.deepEqual(policy.CASE_COLUMNS,['ID','Received Date','Customer Name','Customer Contact','Channel','Case Type','Category','Car Plate','Trip/Route','Complaint/Requirement Details','Priority','Department','Assigned To','Status','Date','Time','Created By','Root Cause','Action Taken','Refund','Customer Satisfaction','Solved Date','Solved Hour']);
 assert.deepEqual(policy.TICKET_COLUMNS,['Ticket ID','Created Date','Created Time','Created By','Creator Email','Assigned Department','Status','Last Updated At']);
 assert.deepEqual(policy.CASE_STATUSES,['New','Assigned','In Progress','Awaiting Customer','Awaiting Internal Dept','Escalated','Closed']);assert.deepEqual(policy.TICKET_STATUSES,['Pending','In Progress','Done']);
 assert.equal(policy.CASE_STATUSES.includes('Done'),false);assert.equal(policy.TICKET_STATUSES.includes('New'),false);
});
test('exact case categories, channels, priorities and distinct receiving departments remain configured',()=>{
 assert.deepEqual(policy.CHANNELS,['Phone','WhatsApp','Email','Website','Social Media','Walk-in','App','Other']);
 assert.deepEqual(policy.CASE_TYPES,['Complaint','Service Request','Inquiry','Suggestion','Lost & Found','Refund/Compensation','General Requirement']);
 assert.deepEqual(policy.CATEGORIES,['Driver Behavior','Delay/Punctuality','Ticket/Booking','Refund/Payment','Lost & Found','Vehicle Condition','Staff Conduct','Cleanliness','Safety','Accessibility','Customer Service','Other']);
 assert.deepEqual(policy.PRIORITIES,['Low','Medium','High','Critical']);
 assert.deepEqual(policy.CASE_DEPARTMENTS,['Customer Service','Operation','Planning','Finance','Maintenance','HR','IT','QHSE']);assert.deepEqual(policy.TICKET_DEPARTMENTS,['Operation','Planning','Finance','Maintenance','HR','IT','QHSE']);
});
test('initial cases require meaningful source information, while resolution and contact are optional',()=>{
 const draft=initial(),before=JSON.stringify(draft);assert.equal(policy.validateCase(draft),true);assert.equal(JSON.stringify(draft),before);
 for(const field of ['receivedDate','channel','type','category','priority','details'])assert.throws(()=>policy.validateCase({...draft,[field]:''}));
 assert.throws(()=>policy.validateCase({...draft,details:'  \n '}));assert.throws(()=>policy.validateCase({...draft,receivedDate:'2026-02-29'}));
 assert.throws(()=>policy.validateCase({...draft,status:'Done'}));assert.throws(()=>policy.validateCase({...draft,department:'Unknown'}));
});
test('ratings accept only scalar 1–5 or genuinely unrated values, never zero',()=>{
 for(const value of [null,undefined,''])assert.equal(policy.rating(value),null);
 for(const value of [1,2,3,4,5,'3'])assert.equal(policy.rating(value),Number(value));
 for(const value of [0,'0',6,-1,2.5,NaN,Infinity,'bad',false,true,[],[3],{}])assert.throws(()=>policy.rating(value));
});
test('optional SAR values preserve zero separately from no refund and reject unsafe precision',()=>{
 assert.equal(policy.sar(''),'');assert.equal(policy.sar('  '),'');assert.equal(policy.sar('12.3'),'12.30');assert.equal(policy.sar(0),'0.00');assert.equal(policy.sar('0.01'),'0.01');
 for(const value of ['-1','1.001','1e3',Infinity,NaN,'90071992547410'])assert.throws(()=>policy.sar(value));
 assert.equal(policy.refund(null),'No refund recorded');assert.equal(policy.refund({details:'Reviewed compensation'}),'Reviewed compensation');
 assert.equal(policy.refund({details:'Optional details',amount:'0'}),'Optional details · SAR 0.00');assert.equal(policy.refund({amount:'123.4'}),'SAR 123.40');
});
test('closing a case never allocates audit values, a refund or a satisfaction rating',()=>{
 const draft={...initial(),status:'Closed'},before=JSON.stringify(draft);assert.equal(policy.validateCase(draft),true);assert.equal(JSON.stringify(draft),before);
 assert.equal(draft.rating,null);assert.equal(draft.refundAmount,'');assert.equal(draft.solvedAt,undefined);assert.equal(draft.id,undefined);
});
test('case search identifiers and normalized plate/status filters combine without changing sources',()=>{
 const record={ID:'test-case-1','Car Plate':'AbC - 123','Customer Name':'Synthetic customer',Status:'Awaiting Customer'};
 assert.equal(search.matches(record,search.CONFIG.customerCare.fields,'case-1'),true);assert.equal(search.matches(record,search.CONFIG.customerCare.fields,'ABC123'),true);
 assert.equal(policy.matchesCase(record,{plate:'abc123',status:'Awaiting Customer'}),true);assert.equal(policy.matchesCase(record,{status:'Closed'}),false);assert.equal(record.Status,'Awaiting Customer');
});
test('internal ticket drafts require a receiving department and retain multiline descriptions',()=>{
 const draft={department:'IT',description:'Synthetic request\nSecond line'},before=JSON.stringify(draft);assert.equal(policy.validateTicket(draft),true);assert.equal(JSON.stringify(draft),before);
 assert.throws(()=>policy.validateTicket({...draft,department:'Customer Service'}));assert.throws(()=>policy.validateTicket({...draft,description:'  '}));assert.equal(draft.id,undefined);assert.equal(draft.createdAt,undefined);
});
test('account email is displayed only from a confirmed authenticated account, never profile metadata',()=>{
 const user={id:'synthetic-user',email:'verified@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',user_metadata:{department:'IT'}};
 assert.equal(policy.verifiedEmail(user),'verified@example.test');assert.equal(policy.verifiedEmail({...user,email_confirmed_at:null}), '');
 assert.equal(policy.verifiedEmail({...user,email_confirmed_at:undefined,confirmed_at:'2026-11-01T00:00:00Z'}),'');assert.equal(policy.verifiedEmail({...user,id:null}),'');
 assert.equal(policy.verifiedEmail({user_metadata:{email:'not-verified@example.test'}}),'');assert.equal(policy.verifiedEmail(null),'');
});
test('ticket business filters use stable creator identity and do not implement department permissions',()=>{
 const first={'Ticket ID':'ticket-a','Creator User ID':'actor-a','Created By':'Same synthetic name','Creator Email':'a@example.test','Assigned Department':'IT',Status:'Pending'};
 const second={...first,'Ticket ID':'ticket-b','Creator User ID':'actor-b','Assigned Department':'Finance',Status:'Done'};
 assert.equal(policy.matchesTicket(first,{creator:'actor-a',status:'Pending'}),true);assert.equal(policy.matchesTicket(second,{creator:'actor-a'}),false);
 assert.equal(policy.matchesTicket(second,{}),true);assert.equal(search.matches(first,search.CONFIG.helpdesk.fields,'same synthetic'),true);
});
