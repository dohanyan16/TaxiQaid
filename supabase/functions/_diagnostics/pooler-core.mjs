/** Temporary administrator capability. No caller metadata, key alone, or submitted UID grants access. */
export const POOLER_CHECKS=Object.freeze(['configuration','administrator_authorization','pooler_configuration','connection','tls_to_pooler','login_role','role_membership','postgres_backend_tls','set_local_role','backend_role','transaction_rollback','role_reset','connection_closed','overall']);
export const poolerFailure=()=>Object.fromEntries(POOLER_CHECKS.map(key=>[key,'FAIL']));
export function diagnosticPolicy(env,now){
 const uid=env('TAXIQAID_POOLER_DIAGNOSTIC_ADMIN_UID'),expiry=env('TAXIQAID_POOLER_DIAGNOSTIC_EXPIRES_AT');
 if(env('TAXIQAID_POOLER_DIAGNOSTIC_ENABLED')!=='true'||typeof uid!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)||typeof expiry!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(expiry))return null;
 const until=Date.parse(expiry);return Number.isFinite(until)&&until>now&&until-now<=15*60000?{uid:uid.toLowerCase(),until}:null;
}
function reply(status,result,origin){return new Response(status===204?null:JSON.stringify(result),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',Pragma:'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; connect-src https://mqkflwsvnzcaylxtvsje.supabase.co; form-action 'none'; frame-ancestors 'none'",Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})}});}
async function emptyInput(request){
 if(request.body===null)return true;
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>16)return false;
 const reader=request.body.getReader();let size=0,chunks=[],timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('INPUT_REJECTED'));reader.cancel().catch(()=>{});},1000);});
 try{for(;;){const {value,done}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>16){await reader.cancel();return false;}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return /^\s*\{\s*\}\s*$/.test(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return false;}finally{clearTimeout(timer);reader.releaseLock();}
}
export function createPoolerDiagnosticHandler({env,verifyUser,probe,now=Date.now}){
 const approvedOrigin='https://mqkflwsvnzcaylxtvsje.supabase.co';let active=false;
 return async request=>{
  const result=poolerFailure(),origin=request.headers.get('origin'),responseOrigin=origin===approvedOrigin?origin:null;
  if(origin&&origin!==approvedOrigin)return reply(403,result);
  if(request.method==='OPTIONS')return reply(204,null,responseOrigin);
  if(request.method!=='POST'||new URL(request.url).search)return reply(405,result,responseOrigin);
  const authorization=request.headers.get('authorization')||'',match=authorization.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  if(!match||match[1].length>16384)return reply(401,result,responseOrigin);
  const policy=diagnosticPolicy(env,now());if(!policy)return reply(503,result,responseOrigin);result.configuration='PASS';
  if(!await emptyInput(request))return reply(400,result,responseOrigin);
  let user;try{user=await verifyUser(match[1]);}catch{return reply(401,result,responseOrigin);}
  if(!user||typeof user.id!=='string'||user.id.toLowerCase()!==policy.uid||user.is_anonymous===true||user.aud!=='authenticated'||user.role!=='authenticated')return reply(403,result,responseOrigin);
  // The protected allowlist is an explicit temporary grant issued only after Dashboard administrator verification.
  if(now()>=policy.until)return reply(403,result,responseOrigin);result.administrator_authorization='PASS';
  if(active)return reply(429,result,responseOrigin);active=true;
  try{
   const checked=await probe();
   for(const key of POOLER_CHECKS)if(!['configuration','administrator_authorization','overall'].includes(key)&&checked?.[key]==='PASS')result[key]='PASS';
  }catch{}
  finally{active=false;}
  result.overall=POOLER_CHECKS.filter(key=>key!=='overall').every(key=>result[key]==='PASS')?'PASS':'FAIL';
  return reply(result.overall==='PASS'?200:503,result,responseOrigin);
 };
}
