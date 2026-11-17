/** Stage-only write engine: no endpoint is active until reviewed SQL + coordinator exist.
 * All identity/capability evidence originates in the existing JWT/access handler.
 * A durable receipt is acquired BEFORE any Google mutation.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function fingerprint(value){
 const bytes=new TextEncoder().encode(value);
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createDriverWriteEngine({google,receipts,schema,permissions,now=Date.now}){
 async function update(input,context){
  if(context?.verified!==true||context.accountType!=='Management'||!permissions.can(context,'drivers.edit'))throw new Error('PERMISSION_DENIED');
  if(!uuid.test(input?.operation||'')||typeof input.recordId!=='string'||input.recordId.length>128||
    !Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||
    !input.changes||typeof input.changes!=='object'||Array.isArray(input.changes)||
    !Object.keys(input.changes).length||Object.keys(input.changes).some(k=>!schema.editable.includes(k)||
      typeof input.changes[k]!=='string'||input.changes[k].length>100))
    throw new Error('INVALID_WRITE');
  const requestSha=await fingerprint(JSON.stringify({actor:context.uid,operation:input.operation,recordId:input.recordId,version:input.expectedVersion,changes:input.changes}));
  const receipt={operation:input.operation,actor:context.uid,recordId:input.recordId,version:input.expectedVersion,sha:requestSha};
  const claimed=await receipts.claim(receipt);
  if(!claimed.is_new){
    if(claimed.result_state==='applied')return {confirmed:true,id:claimed.result_record_id,version:claimed.result_version,replayed:true};
    throw new Error('RECOVERY_REQUIRED');
  }
  const finish=async(state,id=null,version=null)=>receipts.finish({...receipt,state,id,version});
  let record,patched,id,nextVersion,oldPlate,newPlate,date;
  try{
   const [drivers,fleet]=await Promise.all([google.data('drivers'),google.data('fleet')]);
   for(const row of drivers.rows){
     const resolved=row.id||'ro-'+await fingerprint('drivers:'+row.values.Iqama);
     if(resolved===input.recordId){record=row;break;}
   }
   if(!record||(record.version||0)!==input.expectedVersion)throw new Error('VERSION_CONFLICT');
   if(input.recordId.startsWith('ro-')&&record.id)throw new Error('VERSION_CONFLICT');
   // The shared schema enforces all eight editable fields, vehicle existence,
   // phone validity, canonical status options, and KSA date transitions.
   patched=schema.patch(input.changes,{plates:fleet.rows.map(r=>r.values.Plate),now:now()});
   if(patched['Out of Project Date']&& !('Status' in patched) && record.values.Status!=='Out of Project')
      throw new Error('INVALID_DATE');
   if(patched['Car Plate']===record.values['Car Plate'])delete patched['Car Plate'];
   const dirty=Object.fromEntries(Object.entries(patched).filter(([k,v])=>String(record.values[k]??'')!==String(v)));
   if(!Object.keys(dirty).length)throw new Error('NO_CHANGES');
   patched=dirty;
   id=record.id||crypto.randomUUID();
   nextVersion=(record.version||0)+1;
   oldPlate=record.values['Car Plate'];newPlate=Object.hasOwn(patched,'Car Plate')?patched['Car Plate']:oldPlate;
   date=new Date(now()).toISOString();
  }catch(error){
    try{await finish('conflict');}catch{throw new Error('RECOVERY_REQUIRED');}
    if(['VERSION_CONFLICT','INVALID_DATE','NO_CHANGES'].includes(error.message)||/^INVALID_|^READONLY_|^UNKNOWN_/.test(error.message))throw error;
    throw new Error('SOURCE_UNAVAILABLE');
  }
  const actor={uid:context.uid,username:String(context.username||context.uid).slice(0,128)};
  // Google DATA + CHANGE_LOG update is atomic within Drivers only.
  // If the Google request times out we must not claim failure or replay it.
  try{await google.writeDriver({row:record,recordId:id,version:nextVersion,changes:patched,operation:input.operation,actor,date});}
  catch{await finish('uncertain').catch(()=>{});throw new Error('RECOVERY_REQUIRED');}
  // Fleet is another workbook: reconcile its affected derived rows before
  // releasing this workbook-wide claim. Never silently mark a half-synced
  // operation as complete.
  try{await google.syncFleet({oldPlate,newPlate,operation:input.operation,actor,date});}
  catch{await finish('uncertain').catch(()=>{});throw new Error('RECOVERY_REQUIRED');}
  try{await finish('applied',id,nextVersion);}catch{throw new Error('RECOVERY_REQUIRED');}
  return {confirmed:true,id,version:nextVersion,replayed:false};
 }
 return Object.freeze({update});
}
