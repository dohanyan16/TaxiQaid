/** Fixed private telemetry only. Never accept caller payloads, errors, identifiers, IPs or proof values. */
export const AUTH_TRACE_HEADER='x-taxiqaid-trace';
export function validAuthTrace(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);}
const AUTH_EVENTS=new Set(['ROUTE_REJECTED','ORIGIN_REJECTED','GATEWAY_DISABLED','PROVENANCE_REJECTED','UPSTREAM_RESPONSE','UPSTREAM_REDIRECT_REJECTED','UPSTREAM_UNAVAILABLE','SESSION_FILTER_REJECTED','PROOF_REJECTED','PROOF_VERIFIED','BROKER_DISABLED','DATABASE_UNAVAILABLE','INPUT_REJECTED','ADMISSION_ALLOWED','ADMISSION_DENIED','AUTH_REJECTED','AUTH_THROTTLED','AUTH_UNAVAILABLE','IDENTITY_REJECTED','ACCESS_REJECTED','SESSION_ISSUED','SESSION_CLEANUP_CONFIRMED','SESSION_CLEANUP_UNCONFIRMED']);
export function authAudit(component,trace,sink=value=>console.info(value)){
 return (event,http)=>{if(!['gateway','broker'].includes(component)||!validAuthTrace(trace)||!AUTH_EVENTS.has(event)||!Number.isInteger(http)||http<100||http>599)return;
  try{sink(JSON.stringify({schema:'taxiqaid-auth-audit-v1',component,trace,event,http}));}catch{/* Telemetry must not change admission or leak a logger error. */}
 };
}
