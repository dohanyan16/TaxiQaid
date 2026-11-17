/** Only approved Drivers/Fleet reads are connected. No legacy transport, writes or persistent cache. */
const TaxiQaidSources=(()=>{
 const pending=Object.freeze({connected:false,records:Object.freeze([]),message:'Database integration pending — no operational source is connected.'});
 const inflight=new Map();let generation=0;
 const abort=()=>new DOMException('Cancelled','AbortError');
 function allowed(module,action){const c=TaxiQaidAccess.getContext();return window.TAXIQAID_DEDICATED_AUTH?.enabled===true&&c?.accountType==='Management'&&TaxiQaidAccess.can(action==='lookup'||action==='update'?'drivers.edit':module+'.'+(action==='export'?'export':'view'));}
 async function read(module,{signal,action='read'}={}){if(!['drivers','fleet'].includes(module))return pending;if(window.TAXIQAID_DEDICATED_AUTH?.enabled!==true)return pending;if(!allowed(module,action)||action==='lookup'&&module!=='fleet')throw new Error('Access denied.');if(signal?.aborted)throw abort();const uid=TaxiQaidAccess.getUid(),key=[uid,module,action].join(':'),epoch=generation,existing=inflight.get(key);if(existing&&!existing.controller.signal.aborted)return existing.task;
 const controller=new AbortController();const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});const valid=()=>{if(controller.signal.aborted||epoch!==generation||uid!==TaxiQaidAccess.getUid()||!allowed(module,action))throw abort();};
 const task=(async()=>{let cursor=null,records=[],headers=null;const seen=new Set();for(let page=0;page<100;page++){valid();const {data,error}=await supabaseClient.auth.getSession();if(error||!data?.session?.access_token)throw new Error('Sign in again.');let reply;try{reply=await fetch('https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/operational-data',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,apikey:window.TAXIQAID_DEDICATED_AUTH.publicKey,'Content-Type':'application/json'},body:JSON.stringify({module,action,cursor,limit:100}),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(25000)])});}catch{valid();throw new Error('Operational source unavailable. Retry Refresh.');}valid();if(!reply.ok){await reply.body?.cancel();throw new Error(reply.status===403?'Operational access denied.':reply.status===409?'The source changed during pagination. Refresh to restart.':reply.status===429?'Source quota reached. Wait before refreshing.':'Operational source unavailable or its headers are invalid.');}const result=await reply.json();valid();if(result?.source!=='authorized-backend'||result.readOnly!==true||result.writesEnabled!==false||!Array.isArray(result.records)||result.records.length>100||!Array.isArray(result.headers)||result.nextCursor!==null&&(typeof result.nextCursor!=='string'||result.nextCursor.length>2048)||!Number.isSafeInteger(result.total)||result.total<0)throw new Error('Invalid operational response.');headers=result.headers;for(const row of result.records){if(typeof row.id!=='string'||seen.has(row.id)||!row.values||typeof row.values!=='object'||Array.isArray(row.values))throw new Error('Invalid operational record.');seen.add(row.id);records.push(row);}cursor=result.nextCursor;if(cursor===null){if(records.length!==result.total)throw new Error('Incomplete operational response.');return {connected:true,readOnly:true,headers,records,total:records.length,message:records.length+' authorized records loaded.'};}}throw new Error('Source exceeds the reviewed pagination limit. No partial result is confirmed.');})().finally(()=>{signal?.removeEventListener('abort',cancel);if(inflight.get(key)?.task===task)inflight.delete(key);});inflight.set(key,{task,controller});return task;
 }
 async function updateDriver({recordId,expectedVersion,changes,operation}){
   if(!allowed('drivers','update'))throw new Error('Driver edit permission required.');
   if(typeof operation!=='string'||!recordId||!Number.isSafeInteger(expectedVersion)||expectedVersion<0||!changes||typeof changes!=='object')throw new Error('Invalid change request.');
   const {data,error}=await supabaseClient.auth.getSession();
   if(error||!data?.session?.access_token)throw new Error('Sign in again.');
   let reply;try{
     reply=await fetch('https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/operational-data',{
       method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,apikey:window.TAXIQAID_DEDICATED_AUTH.publicKey,'Content-Type':'application/json'},
       body:JSON.stringify({module:'drivers',action:'update',operation,recordId,expectedVersion,changes}),
       credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)
     });
   }catch{throw new Error('Save outcome uncertain. Do not repeat this operation; ask an administrator to check the change log.');}
   const result=await reply.json().catch(()=>null);
   if(!reply.ok){
     const code=result?.error;
     if(code==='RECOVERY_REQUIRED')throw new Error('Save outcome uncertain. Do not submit again until the administrator has reconciled the record.');
     if(code==='VERSION_CONFLICT')throw new Error('This record changed elsewhere. Refresh before editing.');
     if(code==='NO_CHANGES')throw new Error('No changes to save.');
     if(code==='PERMISSION_DENIED'||reply.status===403)throw new Error('Driver edit permission denied.');
     if(code==='WRITE_COORDINATOR_NOT_READY'||code==='WRITE_COORDINATOR_UNAVAILABLE')throw new Error('Saving is unavailable until the secure write coordinator is active.');
     throw new Error('Unable to confirm the save. Refresh before editing again.');
   }
   if(result?.source!=='authorized-backend'||result.saved!==true||typeof result.recordId!=='string'||!Number.isSafeInteger(result.version))throw new Error('Save confirmation invalid. Reconcile before retrying.');
   return result;
 }
 async function exportExcel(module,button){if(!allowed(module,'export'))throw new Error('Export access denied.');button.disabled=true;try{const result=await read(module,{action:'export'});if(!allowed(module,'export'))throw abort();await TaxiQaidModules.resource('assets/vendor/roster/xlsx.full.min.js');if(!allowed(module,'export'))throw abort();const values=[result.headers,...result.records.map(r=>result.headers.map(h=>TaxiQaidSheetsModel.cell(r.values[h])))],sheet=XLSX.utils.aoa_to_sheet(values),book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'DATA');XLSX.writeFile(book,module==='drivers'?'Drivers_Management.xlsx':'Fleet_Management.xlsx');}finally{button.disabled=false;}}
 TaxiQaidAccess.subscribe(()=>{generation++;for(const entry of inflight.values())entry.controller.abort();inflight.clear();});return Object.freeze({read,exportExcel,updateDriver});
})();
