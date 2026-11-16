/** Opt-in genuine test. Credentials must be supplied through secure runtime bindings, never CLI arguments/files. */
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),contract=require('../shared/auth-contract.js'),catalog=require('../shared/permission-catalog.js'),model=require('../shared/permission-model.js');
const url='https://mqkflwsvnzcaylxtvsje.supabase.co',key='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
const identifier=Deno.env.get('TAXIQAID_TEST_IDENTIFIER'),password=Deno.env.get('TAXIQAID_TEST_PASSWORD'),origin=Deno.env.get('TAXIQAID_TEST_ORIGIN');
if(Deno.env.get('TAXIQAID_ALLOW_LIVE_AUTH_TEST')!=='true'||!identifier||!password||!origin)throw new Error('Secure test bindings and explicit live-test enablement are required. No request was sent.');
const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
let established=false;
try{
 for(const headers of ([{},{apikey:key},{apikey:key,Authorization:'Bearer invalid-regression-token'}] as Array<Record<string,string>>)){const rejected=await fetch(url+'/functions/v1/get-my-access',{headers:{Origin:origin,...headers},redirect:'error',signal:AbortSignal.timeout(20000)});if(rejected.status!==401)throw new Error('Unauthenticated JWT controls were not verified.');}
 const post=await fetch(url+'/functions/v1/login-with-identifier',{method:'POST',headers:{apikey:key,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(contract.credentials(identifier,password)),redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!post.ok)throw new Error('Broker validation failed.');const tokens=await post.json();const {error}=await auth.auth.setSession({access_token:tokens.access_token,refresh_token:tokens.refresh_token});if(error)throw new Error('Session establishment failed.');established=true;
 const {data:identity,error:identityError}=await auth.auth.getUser(),{data:session}=await auth.auth.getSession();if(identityError||!identity.user||!session.session)throw new Error('Verified Auth identity unavailable.');
 const access=await fetch(url+'/functions/v1/get-my-access',{headers:{apikey:key,Origin:origin,Authorization:'Bearer '+session.session.access_token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});if(!access.ok)throw new Error('Private identity/permission query failed.');
 const context=contract.access(await access.json(),identity.user.id,session.session.expires_at);
 const effective=catalog.ALL.filter((p:{key:string})=>model.draftDecision(p.key,context).allowed);
 if(context.role==='super_admin'&&(effective.length!==101||effective.some((p:{audience:string})=>p.audience==='Driver')))throw new Error('Master permission inventory mismatch.');
 console.log(JSON.stringify({genuineAuthentication:true,anonymousAndInvalidJwtRejected:true,ownAccessQuery:true,accountStatus:'active',master101Verified:context.role==='super_admin'?effective.length===101:null,driverOnlyExcluded:context.role==='super_admin'?effective.every((p:{audience:string})=>p.audience!=='Driver'):null}));
}catch{console.error('Live authentication validation did not pass. No credentials, tokens or database errors are printed.');Deno.exitCode=1;}
finally{if(established)await auth.auth.signOut({scope:'local'});}
