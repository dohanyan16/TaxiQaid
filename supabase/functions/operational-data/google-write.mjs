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
   const parsed=TaxiQaidSheetsModel.rows(module,values);
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
   const expected=TaxiQaidSheetsModel.log;
   if(!Array.isArray(header?.values?.[0])||header.values[0].length!==expected.length||expected.some((x,i)=>x!==header.values[0][i]))throw new Error('SHEET_LOG_HEADERS_MISMATCH');
   return {dataId:dataSheet.sheetId,logId:logSheet.sheetId};
 }
 function setCell(sheetId,rowIndex,column,headers,value){
   const col=headers.indexOf(column);if(col<0)throw new Error('UNAPPROVED_FIELD');
   return {updateCells:{start:{sheetId,rowIndex,columnIndex:col},rows:[{values:[cell(value)]}],fields:'userEnteredValue'}};
 }
 function logAppend(logSheetId,columns){
   if(columns.length!==TaxiQaidSheetsModel.log.length)throw new Error('INVALID_LOG');
   return {appendCells:{sheetId:logSheetId,rows:[{values:columns.map(cell)}],fields:'userEnteredValue'}};
 }
 function audit(operation,actor,recordId,fields,date,kind){
   const redacted=JSON.stringify(Object.fromEntries(fields.map(key=>[key,'[REDACTED]'])));
   return [crypto.randomUUID(),date,actor.uid,actor.username,'TaxiQaid',kind,recordId,JSON.stringify(fields),redacted,redacted,operation,'APPLIED'];
 }
 async function writeBatch(module,requests){
   if(!requests.length||requests.length>1000)throw new Error('WRITE_BATCH_LIMIT');
   return await request(module,':batchUpdate',{method:'POST',body:{requests,includeSpreadsheetInResponse:false},max:65536});
 }
 async function writeDriver({row,recordId,version,changes,operation,actor,date}){
   const meta=await metadata('drivers'),headers=TaxiQaidSheetsModel.columns('drivers');
   const fields=Object.keys(changes).sort();
   const cells={...changes,'Record ID':recordId,'Row Version':String(version),'Updated At UTC':date};
   const requests=Object.entries(cells).map(([name,value])=>setCell(meta.dataId,row.sheetRowIndex,name,headers,value));
   requests.push(logAppend(meta.logId,audit(operation,actor,recordId,fields,date,'UPDATE')));
   await writeBatch('drivers',requests);
 }
 async function syncFleet({oldPlate,newPlate,operation,actor,date}){
   const targets=new Set([oldPlate,newPlate].map(TaxiQaidSheetsModel.plate).filter(Boolean));
   if(!targets.size)return {updated:0};
   const drivers=await data('drivers'),fleet=await data('fleet'),items=[];
   for(const vehicle of fleet.rows){
     const plate=TaxiQaidSheetsModel.plate(vehicle.values.Plate);
     if(!targets.has(plate))continue;
     const assigned=drivers.rows.filter(d=>TaxiQaidSheetsModel.plate(d.values['Car Plate'])===plate);
     const assignedText=assigned.map(d=>d.values['Full Name']+' ('+d.values.Iqama+')').join(', ');
     const availability=assigned.length?'Assigned':'Unassigned';
     const changes={};
     if(vehicle.values['Assigned Driver']!==assignedText)changes['Assigned Driver']=assignedText;
     if(vehicle.values.Availability!==availability)changes.Availability=availability;
     if(Object.keys(changes).length)items.push({vehicle,changes});
   }
   if(!items.length)return {updated:0};
   const meta=await metadata('fleet'),headers=TaxiQaidSheetsModel.columns('fleet'),requests=[];
   for(const {vehicle,changes} of items){
     const id=vehicle.id||crypto.randomUUID(),version=(vehicle.version||0)+1;
     const cells={...changes,'Record ID':id,'Row Version':String(version),'Updated At UTC':date};
     for(const [name,value] of Object.entries(cells))requests.push(setCell(meta.dataId,vehicle.sheetRowIndex,name,headers,value));
     requests.push(logAppend(meta.logId,audit(operation,actor,id,Object.keys(changes).sort(),date,'DERIVED_UPDATE')));
   }
   await writeBatch('fleet',requests);
   return {updated:items.length};
 }
 async function hasDriverAudit(operation){
   const log=await request('drivers','/values/'+encodeURIComponent("'CHANGE_LOG'!A:L")+'?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS');
   const rows=log?.values||[];
   if(!Array.isArray(rows)||rows.length>10001)throw new Error('SHEET_LOG_TOO_LARGE');
   return rows.slice(1).filter(r=>r[10]===operation&&r[4]==='TaxiQaid'&&r[5]==='UPDATE').length;
 }
 return Object.freeze({data,writeDriver,syncFleet,hasDriverAudit});
}
