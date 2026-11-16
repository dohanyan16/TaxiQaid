/** Disabled-by-default metadata mirror. Fixed durable rows, RAW values, no Auth identities/credentials. */
export async function syncSheets(batch,leaseUntil,env,fetcher=fetch,now=Date.now){
 if(env('TAXIQAID_SHEETS_SYNC_ENABLED')!=='true')return [];
 const id=env('TAXIQAID_GOOGLE_SPREADSHEET_ID'),token=env('TAXIQAID_GOOGLE_ACCESS_TOKEN'),users=env('TAXIQAID_GOOGLE_USERS_TAB'),requests=env('TAXIQAID_GOOGLE_REQUESTS_TAB'),deadline=now()+20000;
 if(!/^[A-Za-z0-9_-]{20,200}$/.test(id||'')||!token||![users,requests].every(v=>/^[A-Za-z0-9 _-]{1,50}$/.test(v||''))||users===requests||!Array.isArray(batch)||batch.length>10)throw new Error('SHEETS_CONFIGURATION_REQUIRED');
 const receipts=[];
 for(const entry of batch){
  const receipt={kind:entry.kind,entity:entry.entity,version:entry.version,ok:false};receipts.push(receipt);
  try{
   if(now()>=deadline||now()>leaseUntil*1000-15000||!Number.isSafeInteger(Number(entry.sheet_row))||Number(entry.sheet_row)<2)throw new Error('LEASE_EXPIRED');
   const p=entry.payload;let values,tab;
   if(entry.kind==='user'){
    const keys=['uid','username','fullName','contactEmail','role','departments','status','version','createdAt','updatedAt'];if(Object.keys(p).some(k=>!keys.includes(k)))throw new Error('UNAPPROVED_METADATA');
    values=keys.map(k=>Array.isArray(p[k])?p[k].join(', '):p[k]??'');tab=users;
   }else if(entry.kind==='profile-request'){
    const allowed=['id','mirror_row','driver_ref','field','status','version','requested_at','reviewed_by','reviewed_at','history'];if(Object.keys(p).some(k=>!allowed.includes(k)))throw new Error('UNAPPROVED_METADATA');
    values=allowed.filter(k=>k!=='mirror_row').map(k=>typeof p[k]==='object'&&p[k]!==null?JSON.stringify(p[k]):p[k]??'');tab=requests;
   }else throw new Error('UNAPPROVED_METADATA');
   const range="'"+tab+"'!A"+entry.sheet_row+':'+String.fromCharCode(64+values.length)+entry.sheet_row;
   const reply=await fetcher('https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/'+encodeURIComponent(range)+'?valueInputOption=RAW',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({range,majorDimension:'ROWS',values:[values]}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(Math.min(5000,Math.max(1,deadline-now())))});
   receipt.ok=reply.status===200;await reply.body?.cancel();
  }catch{/* Fixed error state only; outbox retains metadata and uses bounded exponential backoff. */}
 }
 return receipts;
}
