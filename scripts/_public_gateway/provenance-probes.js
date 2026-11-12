/** REVIEW: run only in an approved live test window, with no real credentials and an otherwise idle IP minute. */
(async()=>{
 const reviewedGatewayOrigin='REPLACE_WITH_REVIEWED_WORKER_ORIGIN';
 if(location.origin!==reviewedGatewayOrigin)return;
 if(location.protocol!=='https:'||!location.hostname.endsWith('.workers.dev')||location.pathname!=='/login-with-identifier'||location.search||location.hash||globalThis.TAXIQAID_PUBLIC_PROVENANCE_PROBE_RUN)return;
 Object.defineProperty(globalThis,'TAXIQAID_PUBLIC_PROVENANCE_PROBE_RUN',{value:true});
 const statuses=[];
 for(let index=1;index<=3;index++)try{
  const response=await fetch(location.origin+'/login-with-identifier',{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','cf-connecting-ip':'198.51.100.'+index,'x-real-ip':'198.51.100.'+index,'x-forwarded-for':'198.51.100.'+index,'x-taxiqaid-ip':'198.51.100.'+index,'x-taxiqaid-mac':'invalid-client-proof'},body:JSON.stringify({identifier:'gwprobe'+crypto.randomUUID().replaceAll('-',''),password:'NOT_AN_ACCOUNT_PASSWORD'})});statuses.push(response.status);await response.body?.cancel();
 }catch{statuses.push(0);}
 const output=document.createElement('pre');output.textContent=JSON.stringify({provenance_bucket:statuses.join(',')==='401,401,429'?'PASS':'FAIL',http:statuses},null,2);document.body.replaceChildren(output);
})();
