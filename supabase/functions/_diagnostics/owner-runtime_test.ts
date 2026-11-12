/** Real pinned SDK/SQL adapter with synthetic transport. Never hosted or cryptographic authentication proof. */
import postgres from 'npm:postgres@4.1.0';
import {createRequire} from 'node:module';
import {ownerDependencies} from './owner-runtime.ts';
import {createOwnerUsernameHandler} from './owner-username-core.mjs';
const require=createRequire(import.meta.url),catalog=require('../../../shared/permission-catalog.js');
function assert(value:unknown):asserts value{if(!value)throw new Error('Owner runtime assertion failed.');}
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',email='synthetic-private@example.invalid',password='SYNTHETIC_PASSWORD',project='https://mqkflwsvnzcaylxtvsje.supabase.co';
const token=[btoa('{"alg":"ES256","typ":"JWT"}'),btoa(JSON.stringify({sub:uid,email,aud:'authenticated',role:'authenticated',aal:'aal1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})),btoa('synthetic-only')].map(x=>x.replaceAll('+','-').replaceAll('/','_').replaceAll('=','')).join('.');
const bootstrapToken=token.split('.').slice(0,2).join('.')+'.'+btoa('synthetic-admin');
function raw(){return {version:1,uid,account:{uid,type:'management',status:'active',role:'super_admin',username:'dohanyan',fullName:'Synthetic Master'},permissions:{roleDefaults:catalog.ALL.filter((p:{audience:string})=>p.audience!=='Driver').map((p:{key:string})=>p.key),overrides:{}},departments:['it'],validUntil:Date.now()+60000};}
function fixture(mode='success'){
 const calls:string[]=[],settings:Record<string,string>={TAXIQAID_USERNAME_DIAGNOSTIC_ENABLED:'true',TAXIQAID_USERNAME_DIAGNOSTIC_ADMIN_UID:uid,TAXIQAID_USERNAME_DIAGNOSTIC_EXPIRES_AT:new Date(Date.now()+600000).toISOString(),TAXIQAID_LOGIN_ENABLED:'false',TAXIQAID_SESSION_TRANSPORT_REVIEWED:'false',TAXIQAID_TRUSTED_IP_HEADER_VERIFIED:'false',TAXIQAID_RATE_SECRET:'SYNTHETIC_RATE_SECRET_32_CHARACTERS',TAXIQAID_BROKER_DB_URL:'postgresql://taxiqaid_auth_login.mqkflwsvnzcaylxtvsje:SYNTHETIC_ONLY@aws-0-fixture.pooler.supabase.com:6543/postgres'};
 const query=async(parts:TemplateStringsArray,...values:unknown[])=>{const text=parts.join('?');
  if(text.includes('session_user'))return [{login:'taxiqaid_auth_login',actor:'taxiqaid_auth_login',restricted:true}];
  if(text.includes('begin_login_attempt')){calls.push('atomic-lookup');assert(values[0]==='dohanyan');return [{allowed:true,uid:mode==='wrong-mapping'?other:uid,email,status:'active',mapping_revision:'7'}];}
  if(text.includes('get_management_access')){calls.push('revision');assert(values[0]===uid&&values[1]==='7');if(mode==='revision-race')throw new Error('SYNTHETIC_PRIVATE');return [{access:raw()}];}
  if(text.includes('SET LOCAL ROLE')||text.includes('set_config'))return [];throw new Error('Unexpected query.');
 };
 const sql=Object.assign(query,{begin:async(_mode:string,work:(tx:unknown)=>unknown)=>await work(query),end:async()=>{calls.push('close');}});
 const connect=((options:ReturnType<typeof postgres>['options'])=>{assert(options.ssl&&options.prepare===false);calls.push('open');return sql;}) as unknown as typeof postgres;
 const fetcher:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));assert(url.origin===project&&init?.redirect==='error'&&init?.cache==='no-store');calls.push(url.pathname);
  const headers=new Headers(init?.headers),subject={id:uid,email,aud:'authenticated',role:'authenticated',is_anonymous:false};
  if(url.pathname==='/auth/v1/token'){const body=JSON.parse(String(init?.body));assert(body.email===email&&body.password===password);return Response.json({access_token:token,refresh_token:'SYNTHETIC_REFRESH',token_type:'bearer',expires_in:3600,user:mode==='wrong-auth'?{...subject,id:other}:subject});}
  if(url.pathname==='/auth/v1/user')return Response.json(subject);
  if(url.pathname==='/auth/v1/logout')return mode==='logout-failure'?Response.json({error:'SYNTHETIC_PRIVATE'},{status:500}):new Response(null,{status:204});
  if(url.pathname==='/functions/v1/get-my-access'){assert(headers.get('Origin')===project);if(headers.get('authorization')==='Bearer '+token&&mode==='access-failure')return Response.json({error:'SYNTHETIC_PRIVATE'},{status:403});return Response.json(raw());}
  throw new Error('Unexpected network request.');
 };
 const handler=createOwnerUsernameHandler(ownerDependencies(name=>settings[name],connect,fetcher));return {handler,calls};
}
Deno.test('real SDK privately installs/verifies username session, calls unchanged access function with its JWT, and signs out/closes',async()=>{
 const {handler,calls}=fixture();const response=await handler(new Request(project+'/functions/v1/check-owner-username',{method:'POST',headers:{Origin:project,Authorization:'Bearer '+bootstrapToken,'Content-Type':'application/json'},body:JSON.stringify({identifier:'dohanyan',password})}));const body=await response.json();assert(body.overall==='PASS'&&body.management_count===101&&body.driver_denied_count===6);assert(calls.indexOf('atomic-lookup')<calls.indexOf('/auth/v1/token'));assert(calls.filter(x=>x==='/functions/v1/get-my-access').length===2);assert(calls.includes('/auth/v1/logout')&&calls.at(-1)==='close');assert(!JSON.stringify(body).includes(email)&&!JSON.stringify(body).includes(token));
});
Deno.test('actual runtime keeps mismatched identity, revision, access and logout failures private and closes',async()=>{
 for(const mode of ['wrong-mapping','wrong-auth','revision-race','access-failure','logout-failure']){const {handler,calls}=fixture(mode);const response=await handler(new Request(project+'/functions/v1/check-owner-username',{method:'POST',headers:{Origin:project,Authorization:'Bearer '+bootstrapToken,'Content-Type':'application/json'},body:JSON.stringify({identifier:'dohanyan',password})}));const body=await response.json();assert(body.overall==='FAIL');assert(calls.at(-1)==='close');if(mode==='wrong-mapping')assert(!calls.includes('/auth/v1/token'));else assert(calls.includes('/auth/v1/logout'));assert(!JSON.stringify(body).includes('SYNTHETIC'));}
});
Deno.test('single-file Dashboard candidate boots independently without starting a server or reading secrets',async()=>{
 const previous=Deno.serve;let captured=false;
 try{Deno.serve=((handler:unknown)=>{captured=typeof handler==='function';return {};}) as typeof Deno.serve;await import('../../dashboard/check-owner-username.ts');assert(captured);}finally{Deno.serve=previous;}
});
