/** Disabled candidate. Owner review and genuine browser-to-broker testing precede any activation. */
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {configuredOrigins,trustedClientIp} from '../_shared/security.mjs';
import {createLoginHandler} from '../_shared/handlers.mjs';
import {openBrokerStore} from '../_shared/broker-store.ts';
const url='https://mqkflwsvnzcaylxtvsje.supabase.co';
const key='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
let cachedBrokerStore:ReturnType<typeof openBrokerStore>|null=null;
Deno.serve(request=>{
 const env=(name:string)=>Deno.env.get(name),origins=configuredOrigins(env('TAXIQAID_AUTH_ORIGINS'),env('TAXIQAID_ALLOW_LOOPBACK_ORIGIN')==='true');
 const header=env('TAXIQAID_TRUSTED_IP_HEADER')||'',secret=env('TAXIQAID_RATE_SECRET')||'';
 const configured=Boolean(header&&secret.length>=32&&env('TAXIQAID_TRUSTED_IP_HEADER_VERIFIED')==='true'&&env('TAXIQAID_SESSION_TRANSPORT_REVIEWED')==='true'&&env('TAXIQAID_LOGIN_ENABLED')==='true');
 let store:ReturnType<typeof openBrokerStore>|null=null;if(configured)try{store=cachedBrokerStore??=openBrokerStore(env);}catch{}
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:(input,init)=>fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(10000)})}});
 return createLoginHandler({origins,ready:Boolean(configured&&store),rateSecret:secret,
  clientIp:(req:Request)=>trustedClientIp(req,header,env('TAXIQAID_TRUSTED_IP_HEADER_VERIFIED')==='true'),
  beginAttempt:(identifier:string,keys:string[])=>store!.beginAttempt(identifier,keys),loadAccess:(uid:string,revision:string)=>store!.loadAccess(uid,revision),
  passwordSignIn:async(email:string,password:string)=>{const {data,error}=await auth.auth.signInWithPassword({email,password});return {...data,error:error?{status:error.status||0}:null};},
  signOut:()=>auth.auth.signOut({scope:'local'})})(request);
});
