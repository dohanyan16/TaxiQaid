/** Review-only temporary endpoint. No login handler, private data queries, privileged keys or deployment action. */
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createPoolerDiagnosticHandler} from '../_diagnostics/pooler-core.mjs';
import {runPoolerDiagnostic} from '../_diagnostics/pooler-db.ts';
const poolerProject='https://mqkflwsvnzcaylxtvsje.supabase.co';
const poolerPublicKey='sb_publishable_c6NqjXyYvryqdXpgTUS0jg_hnfxiTWd';
const poolerEnv=(name:string)=>Deno.env.get(name);
const poolerHandler=createPoolerDiagnosticHandler({env:poolerEnv,
 verifyUser:async(token:string)=>{
  const auth=createClient(poolerProject,poolerPublicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,debug:false},global:{fetch:(input,init)=>fetch(input,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)})}});
  const {data,error}=await auth.auth.getUser(token);
  return !error&&data.user?{id:data.user.id,aud:data.user.aud,role:data.user.role,is_anonymous:data.user.is_anonymous}:null;
 },
 // The closure reads the existing connection secret only after the core authorizes the administrator.
 probe:()=>runPoolerDiagnostic(poolerEnv)
});
Deno.serve(poolerHandler);
