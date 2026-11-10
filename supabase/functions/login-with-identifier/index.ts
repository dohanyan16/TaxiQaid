/** Dormant until database mapping, distributed throttling, trusted ingress and session transport are verified. */
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {isIP} from 'node:net';
import {configuredOrigins} from '../_shared/security.mjs';
import {createLoginHandler} from '../_shared/handlers.mjs';
import {openStore} from '../_shared/store.ts';
const url='https://mqkflwsvnzcaylxtvsje.supabase.co';
const key='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
let cachedStore:ReturnType<typeof openStore>|null=null;
Deno.serve(request=>{
 const env=(name:string)=>Deno.env.get(name),origins=configuredOrigins(env('TAXIQAID_AUTH_ORIGINS'),env('TAXIQAID_ALLOW_LOOPBACK_ORIGIN')==='true');
 let store;try{store=cachedStore??=openStore(env);}catch{store=null;}
 const header=env('TAXIQAID_TRUSTED_IP_HEADER')||'',secret=env('TAXIQAID_RATE_SECRET')||'';
 const ready=Boolean(store&&header&&secret.length>=32&&env('TAXIQAID_TRUSTED_IP_HEADER_VERIFIED')==='true'&&env('TAXIQAID_SESSION_TRANSPORT_REVIEWED')==='true'&&env('TAXIQAID_LOGIN_ENABLED')==='true');
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 return createLoginHandler({origins,ready,rateSecret:secret,clientIp:(req:Request)=>{const value=req.headers.get(header);return value&&isIP(value)?value:null;},
  consume:(keys:string[])=>store!.consume(keys),resolve:(identifier:string)=>store!.resolve(identifier),loadAccess:(uid:string)=>store!.loadAccess(uid),
  passwordSignIn:async(email:string,password:string)=>{const {data,error}=await auth.auth.signInWithPassword({email,password});if(error)throw new Error('Credentials rejected.');return data;},signOut:()=>auth.auth.signOut({scope:'local'})})(request);
});
