/** Approved Customer Care and Helpdesk contracts. No identifiers, records or timestamps are allocated. */
const TaxiQaidSupportPolicy = (() => {
  const search=typeof TaxiQaidSearch!=='undefined'?TaxiQaidSearch:require('../../shared/search.js');
  const freeze=values=>Object.freeze(values);
  const CASE_STATUSES=freeze(['New','Assigned','In Progress','Awaiting Customer','Awaiting Internal Dept','Escalated','Closed']);
  const CHANNELS=freeze(['Phone','WhatsApp','Email','Website','Social Media','Walk-in','App','Other']);
  const CASE_TYPES=freeze(['Complaint','Service Request','Inquiry','Suggestion','Lost & Found','Refund/Compensation','General Requirement']);
  const CATEGORIES=freeze(['Driver Behavior','Delay/Punctuality','Ticket/Booking','Refund/Payment','Lost & Found','Vehicle Condition','Staff Conduct','Cleanliness','Safety','Accessibility','Customer Service','Other']);
  const PRIORITIES=freeze(['Low','Medium','High','Critical']);
  const CASE_DEPARTMENTS=freeze(['Customer Service','Operation','Planning','Finance','Maintenance','HR','IT','QHSE']);
  const TICKET_DEPARTMENTS=freeze(['Operation','Planning','Finance','Maintenance','HR','IT','QHSE']);
  const TICKET_STATUSES=freeze(['Pending','In Progress','Done']);
  const CASE_COLUMNS=freeze(['ID','Received Date','Customer Name','Customer Contact','Channel','Case Type','Category','Car Plate','Trip/Route','Complaint/Requirement Details','Priority','Department','Assigned To','Status','Date','Time','Created By','Root Cause','Action Taken','Refund','Customer Satisfaction','Solved Date','Solved Hour']);
  const TICKET_COLUMNS=freeze(['Ticket ID','Created Date','Created Time','Created By','Creator Email','Assigned Department','Status','Last Updated At']);
  function rating(value) {
    if(value===''||value===null||value===undefined)return null;
    const number=Number(value);
    if(!['number','string'].includes(typeof value)||!Number.isInteger(number)||number<1||number>5)throw new Error('Choose a rating from 1 to 5, or leave it unrated.');
    return number;
  }
  function sar(value) {
    if(value===''||value===null||value===undefined)return '';
    const text=String(value).trim();
    if(!text)return '';
    if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw new Error('Enter a finite, nonnegative SAR amount with at most two decimal places.');
    const [whole,fraction='']=text.split('.'),halalas=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
    if(halalas>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('The SAR amount exceeds the supported range.');
    return String(halalas/100n)+'.'+String(halalas%100n).padStart(2,'0');
  }
  function refund(value) {
    if(value===undefined||value===null||value==='')return 'No refund recorded';
    if(typeof value!=='object')return String(value);
    const details=String(value.details||'');
    const amount=sar(value.amount);
    return [details,amount!==''?'SAR '+amount:''].filter(Boolean).join(' · ')||'No refund recorded';
  }
  function validDate(value) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;
    const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  function validateCase(draft) {
    if(!validDate(draft.receivedDate))throw new Error('A valid Received Date is required.');
    for(const [key,options,label] of [['channel',CHANNELS,'Channel'],['type',CASE_TYPES,'Case Type'],['category',CATEGORIES,'Category'],['priority',PRIORITIES,'Priority']]) {
      if(!options.includes(draft[key]))throw new Error('Select an approved '+label+'.');
    }
    if(!String(draft.details||'').trim())throw new Error('Complaint/Requirement Details are required.');
    if(!CASE_STATUSES.includes(draft.status))throw new Error('Select an approved case status.');
    if(draft.department&&!CASE_DEPARTMENTS.includes(draft.department))throw new Error('Select an approved case department.');
    rating(draft.rating);sar(draft.refundAmount);return true;
  }
  function validateTicket(draft) {
    if(!TICKET_DEPARTMENTS.includes(draft.department))throw new Error('Select the department responsible for receiving the ticket.');
    if(!String(draft.description||'').trim())throw new Error('Ticket Description is required.');
    return true;
  }
  function verifiedEmail(user) {
    // This displays existing SDK account data only; it never grants permissions or proves identity to a backend.
    if(!user?.id||typeof user.email_confirmed_at!=='string'||!Number.isFinite(Date.parse(user.email_confirmed_at)))return '';
    return typeof user.email==='string'?user.email.trim():'';
  }
  function matchesCase(record,{plate='',status=''}={}) {
    return (!plate||search.plate(record['Car Plate'])===search.plate(plate))&&(!status||record.Status===status);
  }
  function creatorId(record){return String(record['Creator User ID']||record['Creator Email']||record['Created By']||'');}
  function matchesTicket(record,{creator='',status=''}={}) {
    // Input must already be permission-filtered by the future backend. This is a business filter only.
    return (!creator||creatorId(record)===creator)&&(!status||record.Status===status);
  }
  return Object.freeze({CASE_STATUSES,CHANNELS,CASE_TYPES,CATEGORIES,PRIORITIES,CASE_DEPARTMENTS,TICKET_DEPARTMENTS,TICKET_STATUSES,CASE_COLUMNS,TICKET_COLUMNS,rating,sar,refund,validDate,validateCase,validateTicket,verifiedEmail,matchesCase,creatorId,matchesTicket});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidSupportPolicy;
