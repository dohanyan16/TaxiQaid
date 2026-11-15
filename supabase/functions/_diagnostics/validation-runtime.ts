/** Temporary owner-only SQL/proof validation. No password verification, session issuance or DDL. */
import postgres from 'npm:postgres@4.1.0';
import {brokerConnectionOptions} from '../_shared/broker-store.ts';
import {bucket,configuredOrigins} from '../_shared/security.mjs';
import {GATEWAY_TARGET,signGateway,verifyGateway} from '../_shared/gateway-proof.mjs';
import {VALIDATION_HEADER,VALIDATION_OWNER,VALIDATION_PROJECT,VALIDATION_KEY,VALIDATION_CASES,validationGrant,validationToken,validationCase,verifyValidation,verifiedValidationExpiry,grantText,safeValidationResult} from '../_shared/validation-policy.mjs';
import {inspectMasterAccess} from './master-access.ts';
type Sql=ReturnType<typeof postgres>;
type Grant={id:string;ownerUid:string;issuedAt:number;expiresAt:number};
type Proof={ip:string;origin:string;issued:number;nonce:string;trace?:string};
const scopes:Record<string,string>={'ip-base':'IP_BASE','ip-spoof':'IP_SPOOF',replay:'SIGNED_SQL_REPLAY','identifier-base':'IDENTIFIER_BASE','identifier-finish':'IDENTIFIER_FINISH','global-db':'SQL_GLOBAL_ONLY'};
function validationResponse(status:number,value:unknown){return Response.json(value,{status,headers:{'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}});}
export function createValidationHandler(env:(key:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch,now:()=>number=Date.now){return async(request:Request)=>{
 const deadline=now()+20000;
 let sql:Sql|null=null;
 try{
  const grant:Grant|null=validationGrant(env('TAXIQAID_VALIDATION_GRANT'),now()),token=validationToken(request),secret=env('TAXIQAID_GATEWAY_SECRET')||'',rate=env('TAXIQAID_RATE_SECRET')||'';
  if(!grant||!token||env('TAXIQAID_LOGIN_ENABLED')!=='false'||env('TAXIQAID_TRUSTED_IP_HEADER_VERIFIED')!=='false'||rate.length<32)throw new Error('DENIED');
  const proof=await verifyGateway(request,secret,now()) as Proof|null;
  if(!proof?.trace||!configuredOrigins(env('TAXIQAID_AUTH_ORIGINS')).includes(proof.origin)||!await verifyValidation(secret,grant,token,request.headers.get('x-taxiqaid-mac'),request.headers.get(VALIDATION_HEADER)))throw new Error('DENIED');
  const caseId:string=await validationCase(request);
  const userResponse=await fetcher(VALIDATION_PROJECT+'/auth/v1/user',{method:'GET',headers:{apikey:VALIDATION_KEY,Authorization:'Bearer '+token},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(userResponse.status!==200){await userResponse.body?.cancel();throw new Error('DENIED');}
  const user=await userResponse.json();if(user.id!==grant.ownerUid||user.aud!=='authenticated'||user.role!=='authenticated'||user.is_anonymous===true)throw new Error('DENIED');
  const expiry=verifiedValidationExpiry(token,grant.ownerUid);
  let sqlQueries=0,sqlTransactions=0,probes=0,allowed=0,denied=0;
  const live=()=>{const current=validationGrant(env('TAXIQAID_VALIDATION_GRANT'),now());if(!current||grantText(current)!==grantText(grant)||env('TAXIQAID_LOGIN_ENABLED')!=='false'||now()>=deadline)throw new Error('DENIED');};
  live();sql=connect({...brokerConnectionOptions(env('TAXIQAID_BROKER_DB_URL')||'',env('TAXIQAID_BROKER_DB_CA')),max:caseId==='replay'?2:1,fetch_types:false,idle_timeout:1,max_lifetime:30});
  const run=async<T>(mode:string,work:(query:Sql)=>Promise<T>):Promise<T>=>{
   live();if(++sqlTransactions>4)throw new Error('DENIED');
   return await sql!.begin(mode,async tx=>{
    const query=((strings:TemplateStringsArray,...values:unknown[])=>{live();if(++sqlQueries>50)throw new Error('DENIED');return (tx as unknown as Sql)(strings,...values as never[]);}) as unknown as Sql;
    const identity=await query`SELECT session_user AS login,current_user AS actor,NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit AS restricted FROM pg_catalog.pg_roles WHERE rolname=session_user`;
    if(identity.length!==1||identity[0].login!=='taxiqaid_auth_login'||identity[0].actor!=='taxiqaid_auth_login'||identity[0].restricted!==true)throw new Error('DENIED');
    await query`SET LOCAL ROLE taxiqaid_auth_backend`;
    await query`SELECT pg_catalog.set_config('statement_timeout','3000',true),pg_catalog.set_config('lock_timeout','1000',true)`;
    return await work(query);
   }) as T;
  };
  const key=(label:string)=>bucket(rate,'v1:owner-validation:'+grant.id+':'+label);
  // Commit the one-use case ledger before any probe. No browser-controlled lookup or SQL key.
  const ledger=await run('isolation level read committed',async query=>{
   const clock=await query`SELECT floor(extract(epoch from clock_timestamp()))::bigint AS epoch`,epoch=Number(clock[0]?.epoch);
   if(!Number.isSafeInteger(epoch)||Math.abs(epoch-Math.floor(now()/1000))>5||epoch>=grant.expiresAt||Math.floor(epoch/900)!==Math.floor(grant.issuedAt/900))throw new Error('DENIED');
   const keys=await Promise.all(['source','identifier','global'].map(label=>key('guard:'+caseId+':'+label)));
   let revision='';
   // Fill the case's private 10/quarter identifier quota atomically. Its lifetime exceeds nonce
   // cleanup, so a consumed case cannot be repeated after its two-minute nonce has been pruned.
   for(let n=0;n<10;n++){
    const nonce=await key('case:'+caseId+':'+n),identifier=n===0?VALIDATION_OWNER:'validation'+(await key('guard-absent:'+caseId)).slice(0,32);
    const rows=await query`SELECT allowed,uid,email,status,mapping_revision::text AS mapping_revision FROM taxiqaid_auth_api.begin_signed_login_attempt(${identifier},${keys[0]},${keys[1]},${keys[2]},${nonce},${proof.issued}::bigint)`;
    if(rows.length!==1||rows[0].allowed!==true)throw new Error('DENIED');
    if(n===0){if(rows[0].uid!==grant.ownerUid||rows[0].status!=='active'||typeof rows[0].email!=='string'||!rows[0].email||typeof rows[0].mapping_revision!=='string'||!/^[1-9][0-9]{0,18}$/.test(rows[0].mapping_revision)||BigInt(rows[0].mapping_revision)>9223372036854775807n)throw new Error('DENIED');revision=rows[0].mapping_revision as string;}
    else if(rows[0].uid!==null||rows[0].email!==null||rows[0].status!==null||rows[0].mapping_revision!==null)throw new Error('DENIED');
   }
   return {revision};
  });
  const global=await bucket(rate,'v1:global'),ip=await bucket(rate,'v1:ip:'+proof.ip);
  let ordinal=0;
  const envelope=async(label:string)=>{
   const identifier='validation'+(await key('identifier:'+label)).slice(0,32),body=new TextEncoder().encode(JSON.stringify({identifier,password:'NOT_A_PASSWORD_TEST'}));
   const signed={ip:proof.ip,origin:proof.origin,issued:Math.floor(now()/1000),nonce:crypto.randomUUID().replaceAll('-',''),trace:crypto.randomUUID()},mac=await signGateway(secret,signed,body);
   return {identifier,body,signed,mac};
  };
  type Envelope=Awaited<ReturnType<typeof envelope>>;
  const proofRequest=(item:Envelope)=>new Request(GATEWAY_TARGET,{method:'POST',headers:{'Content-Type':'application/json',Origin:item.signed.origin,'x-taxiqaid-ip':item.signed.ip,'x-taxiqaid-issued':String(item.signed.issued),'x-taxiqaid-nonce':item.signed.nonce,'x-taxiqaid-trace':item.signed.trace,'x-taxiqaid-mac':item.mac},body:item.body});
  const probe=async(query:Sql,item:Envelope,source=ip,aggregate=global)=>{
   if(++probes>VALIDATION_CASES[caseId as keyof typeof VALIDATION_CASES])throw new Error('DENIED');
   const verified=await verifyGateway(proofRequest(item),secret,now());
   if(!verified)throw new Error('DENIED');const identifier=await bucket(rate,'v1:account:'+item.identifier),nonce=await bucket(rate,'v1:gateway-nonce:'+verified.nonce);
   const rows=await query`SELECT allowed,uid,email,status,mapping_revision::text AS mapping_revision FROM taxiqaid_auth_api.begin_signed_login_attempt(${item.identifier},${source},${identifier},${aggregate},${nonce},${verified.issued}::bigint)`;
   if(rows.length!==1||typeof rows[0].allowed!=='boolean'||rows[0].uid!==null||rows[0].email!==null||rows[0].status!==null||rows[0].mapping_revision!==null)throw new Error('DENIED');
   if(rows[0].allowed)allowed++;else denied++;return rows[0].allowed as boolean;
  };
  const fresh=(label:string)=>envelope(label+':'+(++ordinal));
  const batch=async<T>(mode:string,work:(query:Sql)=>Promise<T>)=>run(mode,async query=>{
   const rows=await query`SELECT taxiqaid_auth_api.get_management_access(${grant.ownerUid}::uuid,${ledger.revision}::bigint) AS access`;
   const access=inspectMasterAccess(rows.length===1?rows[0].access:null,grant.ownerUid,expiry);
   if(!access.activeMaster||access.management!==101||access.driverDenied!==6)throw new Error('DENIED');
   const before=await query`SELECT floor(extract(epoch from clock_timestamp())/60)::bigint AS minute`;
   const minute=Number(before[0]?.minute);if(!Number.isSafeInteger(minute))throw new Error('DENIED');
   const result=await work(query),after=await query`SELECT floor(extract(epoch from clock_timestamp())/60)::bigint AS minute`;
   return {result,minute,stable:Number(after[0]?.minute)===minute};
  });
  let result='FAIL',canary=false,dbMinute=0,stable=true;
  if(caseId==='replay'){
   const first=await envelope('replay-sequential'),second=await envelope('replay-concurrent');
   // Execute the deployed shared verifier with modified body, IP, trace and stale signed time.
   // This is not an external replay of the public HTTP entry or a browser-accessible signing oracle.
   for(const altered of [{...first,body:new TextEncoder().encode('{}')},{...first,signed:{...first.signed,ip:proof.ip==='192.0.2.9'?'192.0.2.8':'192.0.2.9'}},{...first,signed:{...first.signed,trace:crypto.randomUUID()}},{...first,signed:{...first.signed,issued:Math.floor(now()/1000)-61}}]){
    if(await verifyGateway(proofRequest(altered),secret,now()))throw new Error('DENIED');
   }
   const serial=await batch('isolation level repeatable read',async query=>{
    const a=await probe(query,first),b=await probe(query,first),c=await probe(query,await fresh('replay-canary'));return a&&!b&&c;
   });
   // Two real transactions/connections: READ COMMITTED permits the losing INSERT to observe its winner.
   const concurrent=await Promise.all([0,1].map(()=>batch('isolation level read committed',async query=>{
    const admitted=await probe(query,second),healthy=await probe(query,await fresh('replay-canary'));return {admitted,healthy};
   })));
   stable=serial.stable&&concurrent.every(value=>value.stable&&value.minute===serial.minute);dbMinute=serial.minute;
   canary=concurrent.every(value=>value.result.healthy);result=serial.result&&canary&&concurrent.filter(value=>value.result.admitted).length===1?'PASS':'FAIL';
  }else{
   const tested=await batch('isolation level repeatable read',async query=>{
    if(caseId==='ip-base'){const values=[];for(let i=0;i<10;i++)values.push(await probe(query,await fresh('ip-base')));return values.every(Boolean);}
    if(caseId==='ip-spoof'){
     const rejected=!await probe(query,await fresh('ip-spoof'));
     // Same public global key, isolated source: rules out global exhaustion and unhealthy maintenance.
     canary=await probe(query,await fresh('ip-canary'),await key('ip-canary'));return rejected&&canary;
    }
    if(caseId==='identifier-base'){const values=[];for(let i=0;i<3;i++)values.push(await probe(query,await envelope('shared-identifier')));return values.every(Boolean);}
    if(caseId==='identifier-finish'){
     const values=[];for(let i=0;i<8;i++)values.push(await probe(query,await envelope('shared-identifier')));
     canary=await probe(query,await fresh('identifier-canary'));return values.slice(0,7).every(Boolean)&&values[7]===false&&canary;
    }
    const values=[];for(let i=0;i<21;i++)values.push(await probe(query,await fresh('global'),await key('global-source:'+i)));
    canary=await probe(query,await fresh('health-canary'),await key('health-source'),await key('health-global'));
    return values.slice(0,20).every(Boolean)&&values[20]===false&&canary;
   });
   stable=tested.stable;dbMinute=tested.minute;result=tested.result?'PASS':'FAIL';
  }
  live();if(!stable)result='INCONCLUSIVE';
  return validationResponse(200,safeValidationResult({case:caseId,result,scope:scopes[caseId],probes,allowed,denied,canary,dbMinute,dbQuarter:Math.floor(dbMinute/15),expiresAt:grant.expiresAt,sqlQueries,sqlTransactions}));
 }catch{return validationResponse(403,{result:'FAIL'});}
 finally{if(sql)try{await sql.end({timeout:1});}catch{}}
};}
