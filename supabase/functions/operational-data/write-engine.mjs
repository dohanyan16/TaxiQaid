/** A sealed plan precedes any outbound mutation. Ambiguous requests are never resent. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function operationalFingerprint(value){
 const normalize=v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):Array.isArray(v)?v.map(normalize):v;
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(normalize(value)))))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createDriverWriteEngine({google,receipts,schema,permissions,now=Date.now}){
 async function update(input,context){
  if(context?.verified!==true||context.accountType!=='Management'||!permissions.can(context,'drivers.edit'))throw new Error('PERMISSION_DENIED');
  if(!uuid.test(input?.operation||'')||!uuid.test(context.uid||'')||typeof input.recordId!=='string'||!input.recordId||input.recordId.length>128||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||!input.changes||typeof input.changes!=='object'||Array.isArray(input.changes)||!Object.keys(input.changes).length||Object.keys(input.changes).some(k=>!schema.editable.includes(k)||typeof input.changes[k]!=='string'||input.changes[k].length>100))throw new Error('INVALID_WRITE');
  const operation=input.operation.toLowerCase();
  const receipt={operation,actor:context.uid,recordId:input.recordId,version:input.expectedVersion,sha:await operationalFingerprint({actor:context.uid,recordId:input.recordId,version:input.expectedVersion,changes:input.changes})};
  const claimed=await receipts.claim(receipt);
  if(!claimed.is_new){
   if(claimed.state==='applied')return {confirmed:true,id:claimed.id,version:claimed.version,replayed:true};
   // Read-only reconciliation: never repeat a Google batch after an ambiguous response.
   if(claimed.plan&&await google.verify(claimed.plan)){
    await receipts.finish({...receipt,state:'applied',id:claimed.plan.id,version:claimed.plan.version,reconcile:true});
    return {confirmed:true,id:claimed.plan.id,version:claimed.plan.version,replayed:true};
   }
   throw new Error('RECOVERY_REQUIRED');
  }
  const owned={...receipt,key:claimed.key};let plan;
  try{
   const [drivers,fleet]=await Promise.all([google.data('drivers'),google.data('fleet')]);let record;
   for(const row of drivers.rows)if((row.id||'ro-'+await operationalFingerprint('drivers:'+row.values.Iqama))===input.recordId){record=row;break;}
   if(!record||(record.version||0)!==input.expectedVersion)throw new Error('VERSION_CONFLICT');
   const patch=schema.patch(input.changes,{plates:fleet.rows.map(r=>r.values.Plate),now:now(),current:record.values});
   const changes=Object.fromEntries(Object.entries(patch).filter(([k,v])=>String(record.values[k]??'')!==v));
   if(!Object.keys(changes).length)throw new Error('NO_CHANGES');
   plan=await google.plan({drivers,fleet,row:record,changes,operation,actor:{uid:context.uid,username:String(context.username||'').slice(0,128)},date:new Date(now()).toISOString()});
   await receipts.seal({...owned,plan});
  }catch(error){await receipts.finish({...owned,state:'conflict'}).catch(()=>{});if(/^(VERSION_CONFLICT|NO_CHANGES|INVALID_|READONLY_|UNKNOWN_)/.test(error.message))throw error;throw new Error('SOURCE_UNAVAILABLE');}
  try{
   await receipts.advance({...owned,state:'driver_sent'});
   await google.apply(plan,'drivers');
   if(!await google.verify(plan,'drivers'))throw new Error('DRIVER_EVIDENCE_MISSING');
   await receipts.advance({...owned,state:'driver_confirmed'});
   if(plan.fleet.length){await receipts.advance({...owned,state:'fleet_sent'});await google.apply(plan,'fleet');}
   if(!await google.verify(plan))throw new Error('COMPLETION_EVIDENCE_MISSING');
   await receipts.finish({...owned,state:'applied',id:plan.id,version:plan.version});
  }catch{await receipts.finish({...owned,state:'uncertain'}).catch(()=>{});throw new Error('RECOVERY_REQUIRED');}
  return {confirmed:true,id:plan.id,version:plan.version,replayed:false};
 }
 return Object.freeze({update,available:async context=>{try{return permissions.can(context,'drivers.edit')&&(await receipts.ready({actor:context.uid})).version===2;}catch{return false;}}});
}
