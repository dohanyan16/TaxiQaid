/** Durable coordination is used only by authenticated Edge Function code.
 * Administrative secret is never returned to the browser or logged.
 * SQL routines must be reviewed and installed in the private TaxiQaid schema first.
 */
export function createDriverReceipts(adminClient){
 if(!adminClient)throw new Error('WRITE_COORDINATOR_NOT_READY');
 async function rpc(name,payload){
  let reply;try{reply=await adminClient.rpc(name,payload);}catch{throw new Error('WRITE_COORDINATOR_UNAVAILABLE');}
  if(reply.error)throw new Error('WRITE_COORDINATOR_UNAVAILABLE');
  return reply.data;
 }
 return Object.freeze({
  async claim({operation,actor,recordId,version,sha}){
    const rows=await rpc('taxiqaid_driver_write_claim',{p_operation:operation,p_actor:actor,p_record:recordId,p_expected:version,p_fingerprint:sha});
    if(!Array.isArray(rows)||rows.length!==1||typeof rows[0].result_state!=='string'||typeof rows[0].is_new!=='boolean')throw new Error('WRITE_COORDINATOR_UNAVAILABLE');
    return rows[0];
  },
  async finish({operation,actor,sha,state,id,version}){
    const result=await rpc('taxiqaid_driver_write_finish',{p_operation:operation,p_actor:actor,p_fingerprint:sha,p_state:state,p_result_id:id??null,p_result_version:version??null});
    if(result!==state&&result!=='applied'&&result!=='conflict')throw new Error('WRITE_COORDINATOR_UNAVAILABLE');
    return result;
  }
 });
}
