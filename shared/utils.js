/** Shared KSA display boundary. UTC instants stay UTC in storage; calendar-only values never shift. */
const TaxiQaidTime=(()=>{
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 function instant(value){if(value instanceof Date)return Number.isFinite(value.getTime())?value:null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(value.trim()))return null;let source=value.trim().replace(' ','T').replace(/([+-]\d{2})$/,'$1:00');const date=new Date(source);return Number.isFinite(date.getTime())?date:null;}
 function parts(value=new Date()){const date=instant(value);if(!date)return null;const obj=Object.fromEntries(formatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return {date:`${obj.year}-${obj.month}-${obj.day}`,time:`${obj.hour}:${obj.minute}`};}
 function dateInput(value,{calendar=false}={}){if(!value)return '';const p=!calendar&&parts(value);const source=p?p.date:String(value).trim().split(/[T ]/)[0];return /^\d{4}-\d{2}-\d{2}$/.test(source)?source:'';}
 function timeInput(value){if(!value)return '';const p=parts(value);if(p)return p.time;const source=String(value).trim().split('T').at(-1);return /^\d{2}:\d{2}/.test(source)?source.slice(0,5):'';}
 function date(value,options){const source=dateInput(value,options);return source?source.split('-').reverse().join('/'):(value&&value!=='Not Yet'?String(value):'-');}
 function timestamp(value){const p=parts(value);return p?`${date(p.date)} ${p.time} KSA`:'-';}
 function field(name,value){if(!value)return value;const label=String(name).replace(/([a-z])([A-Z])/g,'$1 $2');if(!/(?:^|[ _-])(date|time|at|hour|timestamp)(?:$|[ _-])/i.test(label))return value;if(/birth/i.test(label))return date(value,{calendar:true});if(instant(value)){if(/date$/i.test(label))return date(value);if(/(?:time|hour)$/i.test(label))return timeInput(value);return timestamp(value);}return /^\d{4}-\d{2}-\d{2}$/.test(String(value))?date(value):value;}
 return Object.freeze({zone:'Asia/Riyadh',instant,parts,dateInput,timeInput,date,timestamp,field});
})();
function getKSACurrentDateTime(){return TaxiQaidTime.parts(new Date());}
function formatDateForDisplay(value,options){return TaxiQaidTime.date(value,options);}
function formatTimeForDisplay(value){return value?TaxiQaidTime.timeInput(value)||'-':'-';}
function toDateInput(value,options){return TaxiQaidTime.dateInput(value,options);}
function toTimeInput(value){return TaxiQaidTime.timeInput(value);}
function formatTimestampForDisplay(value){return TaxiQaidTime.timestamp(value);}
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidTime;
