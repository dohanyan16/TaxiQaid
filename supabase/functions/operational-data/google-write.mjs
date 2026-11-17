import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sheetModel=require('../../../shared/sheets-model.js');
/**
 * Server-only, approved fixed-host Google Sheets write transport.
 * Proposed for activation only after reviewed durable receipts migration.
 * Google has no compare-and-swap. All TaxiQaid writes must hold the durable
 * workbook-wide claim; direct human editing of these fields must be prevented.
 */
export function createGoogleWriteAdapter(env,{auth,fetcher=fetch}){
 const identifiers={drivers:'TAXIQAID_DRIVERS_SHEET_ID',fleet:'TAXIQAID_FLEET_SHEET_ID'};
 const info=module=>{
   if(!Object.hasOwn(identifiers,module))throw new Error('INVALID_MODULE');
   const id=env(identifiers[module]);if(!/^[A-Za-z0-9_-]{20,200}$/.test(id||''))throw new Error('GOOGLE_WRITE_CONFIG');
   return id;
 };
 const cell=value=>({userEnteredValue:{stringValue:String(value??'')}});
 async function responseJson(reply,max=8*1024*1024){
   if(Number(reply.headers.get('content-length'))>max)throw new Error('GOOGLE_TOO_LARGE');
   const reader=reply.body?.getReader();if(!reader)throw new Error('GOOGLE_RESPONSE_INVALID');
   const chunks=[];let len=0;try{
     for(;;){const part=await reader.read();if(part.done)break;len+=part.value.length;
       if(len>max)throw new Error('GOOGLE_TOO_LARGE');chunks.push(part.value);}
     const bytes=new Uint8Array(len);let pos=0;for(const x of chunks){bytes.set(x,pos);pos+=x.length;}
     return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 async function request(module,suffix,{method='GET',body,max=8*1024*1024}={}){
   const token=await auth.accessToken();
   const url='https://sheets.googleapis.com/v4/spreadsheets/'+info(module)+suffix;
   let reply;try{reply=await fetcher(url,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});}
   catch{throw new Error('GOOGLE_WRITE_NETWORK_UNCERTAIN');}
   if(!reply.ok){const status=reply.status;await reply.body?.cancel();const e=new Error('GOOGLE_WRITE_HTTP');e.status=status;throw e;}
   return responseJson(reply,max);
 }
 async function data(module){
   const range="'DATA'!"+(module==='drivers'?'A:V':'A:R');
   const json=await request(module,'/values/'+encodeURIComponent(range)+'?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS');
   const values=json?.values??[];
   const parsed=sheetModel.rows(module,values);
   const rows=[];let offset=0;
   for(let i=1;i<values.length;i++){
     const r=values[i];if(!Array.isArray(r)||!r.some(v=>v!==''&&v!==null))continue;
     const record=parsed[offset++];rows.push({...record,sheetRowIndex:i});
   }
   return {rows,values};
 }
 async function metadata(module){
   const value=await request(module,'?fields=sheets(properties(sheetId,title))', {max:32768});
   const sheets=value?.sheets?.map(x=>x.properties)||[];
   const dataSheet=sheets.find(x=>x.title==='DATA'),logSheet=sheets.find(x=>x.title==='CHANGE_LOG');
   if(!Number.isSafeInteger(dataSheet?.sheetId)||!Number.isSafeInteger(logSheet?.sheetId))throw new Error('SHEET_TABS_MISSING');
   const header=await request(module,'/values/'+encodeURIComponent("'CHANGE_LOG'!1:1"),{max:32768});
   const expected=sheetModel.log;
   if(!Array.isArray(header?.values?.[0])||header.values[0].length!==expected.length||expected.some((x,i)=>x!==header.values[0][i]))throw new Error('SHEET_LOG_HEADERS_MISMATCH');
   return {dataId:dataSheet.sheetId,logId:logSheet.sheetId};
 }
 function setCell(sheetId,rowIndex,column,headers,value){
   const col=headers.indexOf(column);if(col<0)throw new Error('UNAPPROVED_FIELD');
   return {updateCells:{start:{sheetId,rowIndex,columnIndex:col},rows:[{values:[cell(value)]}],fields:'userEnteredValue'}};
 }
 function logAppend(logSheetId,columns){
   if(columns.length!==sheetModel.log.length)throw new Error('INVALID_LOG');
   return {appendCells:{sheetId:logSheetId,rows:[{values:columns.map(cell)}],fields:'userEnteredValue'}};
 }
 function audit(event,operation,actor,recordId,fields,date,kind){
   const redacted=JSON.stringify(Object.fromEntries(fields.map(key=>[key,'[REDACTED]'])));
   return [event,date,actor.uid,actor.username,'TaxiQaid',kind,recordId,JSON.stringify(fields),redacted,redacted,operation,'APPLIED'];
 }
 async function eventId(operation,module,id){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(operation+':'+module+':'+id)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function plan({drivers,fleet,row,changes,operation,actor,date}){
  const id=row.id||crypto.randomUUID(),version=(row.version||0)+1;
  const item=async(module,before,change,kind)=>{const recordId=module==='drivers'?id:before.id||crypto.randomUUID(),next=(before.version||0)+1,fields=Object.keys(change).sort();return {row:before.sheetRowIndex,before,recordId,version:next,cells:{...change,'Record ID':recordId,'Row Version':String(next),'Updated At UTC':date},audit:audit(await eventId(operation,module,recordId),operation,actor,recordId,fields,date,kind)};};
  const driver=await item('drivers',row,changes,'UPDATE'),derived=[];
  // Recalculate only when assignment changed, using the proposed authoritative state.
  if(Object.hasOwn(changes,'Car Plate')){
   const targets=new Set([row.values['Car Plate'],changes['Car Plate']].map(sheetModel.plate).filter(Boolean));
   const updated=drivers.rows.map(d=>d===row?{...d,values:{...d.values,...changes}}:d);
   for(const vehicle of fleet.rows){const plate=sheetModel.plate(vehicle.values.Plate);if(!targets.has(plate))continue;
    const assigned=updated.filter(d=>sheetModel.plate(d.values['Car Plate'])===plate).sort((a,b)=>a.values.Iqama.localeCompare(b.values.Iqama));
    const computed={'Assigned Driver':assigned.map(d=>d.values['Full Name']+' ('+d.values.Iqama+')').join(', '),Availability:assigned.length?'Assigned':'Unassigned'};
    const delta=Object.fromEntries(Object.entries(computed).filter(([k,v])=>v!==vehicle.values[k]));
    if(Object.keys(delta).length)derived.push(await item('fleet',vehicle,delta,'DERIVED_UPDATE'));
   }
  }
  return {id,version,operation,drivers:[driver],fleet:derived};
 }
 async function logs(module){const value=await request(module,'/values/'+encodeURIComponent("'CHANGE_LOG'!A:L")+'?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS');const rows=value?.values;if(!Array.isArray(rows)||rows.length>10001||JSON.stringify(rows[0])!==JSON.stringify(sheetModel.log))throw new Error('SHEET_LOG_HEADERS_MISMATCH');return rows.slice(1);}
 async function verify(plan,module){
  for(const key of module?[module]:['drivers','fleet']){
   if(!plan[key].length)continue;
   const [source,events]=await Promise.all([data(key),logs(key)]);
   for(const item of plan[key]){
    const matching=source.rows.filter(r=>r.id===item.recordId),auditRows=events.filter(r=>r[0]===item.audit[0]||r[10]===plan.operation&&r[6]===item.recordId);
    if(matching.length!==1||auditRows.length!==1||JSON.stringify(auditRows[0])!==JSON.stringify(item.audit))return false;
    const record=matching[0],actual={...record.values,'Record ID':record.id,'Row Version':String(record.version),'Updated At UTC':record.updatedAt};
    if(Object.entries(item.cells).some(([k,v])=>actual[k]!==v))return false;
   }
  }
  return true;
 }
 async function apply(plan,module){
  const items=plan[module];if(!items.length)return;
  const source=await data(module);
  // This preflight detects changed/reordered rows; Sheets still has no CAS. Independent writers must be excluded.
  for(const item of items){const current=source.rows.find(r=>r.sheetRowIndex===item.row);if(!current||JSON.stringify(current)!==JSON.stringify(item.before))throw new Error('SOURCE_CHANGED');}
  const events=await logs(module);if(events.some(r=>r[10]===plan.operation))throw new Error('OPERATION_ALREADY_SENT');
  const meta=await metadata(module),headers=sheetModel.columns(module),requests=[];
  for(const item of items){for(const [name,value]of Object.entries(item.cells))requests.push(setCell(meta.dataId,item.row,name,headers,value));requests.push(logAppend(meta.logId,item.audit));}
  if(requests.length>1000)throw new Error('WRITE_BATCH_LIMIT');
  await request(module,':batchUpdate',{method:'POST',body:{requests,includeSpreadsheetInResponse:false},max:65536});
 }
 return Object.freeze({data,plan,apply,verify});
}
