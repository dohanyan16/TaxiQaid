/** Review candidate, not a claim about the current deployed function. No browser UID is accepted. */
import {withSupabase} from 'npm:@supabase/server@1.9.2';
import {createAccessHandler} from '../_shared/handlers.mjs';
import {response,originFor,configuredOrigins} from '../_shared/security.mjs';
import {openStore} from '../_shared/store.ts';
const env=(name:string)=>Deno.env.get(name);
const origins=configuredOrigins(env('TAXIQAID_AUTH_ORIGINS'),env('TAXIQAID_ALLOW_LOOPBACK_ORIGIN')==='true');
let cachedStore:ReturnType<typeof openStore>|null=null;
const secure=withSupabase({auth:'user'},async(request,context)=>{
 const uid=context.userClaims?.id;
 if(!uid||context.jwtClaims?.is_anonymous)return response(401,{error:'Access unavailable.'},originFor(request,origins));
 return createAccessHandler({origins,loadAccess:(uid:string)=>(cachedStore??=openStore(env)).loadAccess(uid)})(request,uid);
});
Deno.serve(async request=>{
 const origin=originFor(request,origins);if(!origin)return response(403,{error:'Access unavailable.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,OPTIONS',Vary:'Origin','Cache-Control':'no-store'}});
 const result=await secure(request),headers=new Headers(result.headers);
 headers.set('Cache-Control','no-store, max-age=0');headers.set('Vary','Origin');headers.set('Access-Control-Allow-Origin',origin);
 return new Response(result.body,{status:result.status,statusText:result.statusText,headers});
});
