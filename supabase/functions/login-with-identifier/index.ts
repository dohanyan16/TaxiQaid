/** Canonical signed broker. Deployment and activation require separate owner approval. */
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import postgres from 'npm:postgres@4.1.0';
import {configuredOrigins,response,FAILURE} from '../_shared/security.mjs';
import {createLoginHandler} from '../_shared/handlers.mjs';
import {brokerConnectionOptions} from '../_shared/broker-store.ts';
import {signedBrokerStore} from '../_shared/signed-broker-store.ts';
import {verifyGateway} from '../_shared/gateway-proof.mjs';
import {authAudit} from '../_shared/auth-audit.mjs';
import {createValidationHandler} from '../_diagnostics/validation-runtime.ts';
import {VALIDATION_HEADER} from '../_shared/validation-policy.mjs';
export function createSignedLogin(env:(name:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch,auditSink:((value:string)=>void)|undefined=undefined){return async(request:Request)=>{
 const origins=configuredOrigins(env('TAXIQAID_AUTH_ORIGINS')),origin=request.headers.get('origin'),rate=env('TAXIQAID_RATE_SECRET')||'';
 const configured=['TAXIQAID_LOGIN_ENABLED','TAXIQAID_SESSION_TRANSPORT_REVIEWED','TAXIQAID_GATEWAY_ENABLED','TAXIQAID_GATEWAY_REVIEWED'].every(key=>env(key)==='true')&&rate.length>=32&&env('TAXIQAID_TRUSTED_IP_HEADER_VERIFIED')==='false';
 const proof=await verifyGateway(request,env('TAXIQAID_GATEWAY_SECRET'));
 const audit=authAudit('broker',proof?.trace??crypto.randomUUID(),auditSink);
 if(!proof||!origins.includes(proof.origin)){audit('PROOF_REJECTED',403);return response(403,{error:FAILURE});}
 audit('PROOF_VERIFIED',200);
 if(!configured){audit('BROKER_DISABLED',503);return response(503,{error:FAILURE},proof.origin);}
 let sql:ReturnType<typeof postgres>|null=null;
 try{
  sql=connect({...brokerConnectionOptions(env('TAXIQAID_BROKER_DB_URL')||'',env('TAXIQAID_BROKER_DB_CA')),max:1,idle_timeout:1,max_lifetime:60});
  const store=signedBrokerStore(sql,proof,rate),auth=createClient('https://mqkflwsvnzcaylxtvsje.supabase.co','sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:(input,init)=>fetcher(input,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)})}});
  return await createLoginHandler({origins,ready:true,rateSecret:rate,audit,clientIp:()=>proof.ip,beginAttempt:store.beginAttempt,loadAccess:store.loadAccess,
   passwordSignIn:async(email:string,password:string)=>{const {data,error}=await auth.auth.signInWithPassword({email,password});return {...data,error:error?{status:error.status||0}:null};},signOut:()=>auth.auth.signOut({scope:'local'})})(request);
 }catch{audit('DATABASE_UNAVAILABLE',503);return response(503,{error:FAILURE},proof.origin);}
 finally{if(sql)try{await sql.end({timeout:1});}catch{}}
};}
export function createLoginRouter(env:(name:string)=>string|undefined,connect:typeof postgres=postgres,fetcher:typeof fetch=fetch,auditSink:((value:string)=>void)|undefined=undefined){
 const login=createSignedLogin(env,connect,fetcher,auditSink),validation=createValidationHandler(env,connect,fetcher);
 return (request:Request)=>request.headers.has(VALIDATION_HEADER)?validation(request):login(request);
}
Deno.serve(createLoginRouter(name=>Deno.env.get(name)));
