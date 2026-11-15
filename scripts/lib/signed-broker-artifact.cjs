// Deterministic repository-only packaging. This helper reads public source; it never deploys or reads secrets.
const fs=require('node:fs'),path=require('node:path');
const DASHBOARD_FILES=Object.freeze(['supabase/dashboard/login-with-identifier.ts','supabase/dashboard/login-with-identifier-gateway.ts']);
const SOURCE_FILES=Object.freeze([
 'supabase/functions/_shared/auth-audit.mjs',
 'supabase/functions/_shared/security.mjs',
 'supabase/functions/_shared/handlers.mjs',
 'supabase/functions/_shared/broker-store.ts',
 'supabase/functions/_shared/gateway-proof.mjs',
 'supabase/functions/_shared/signed-broker-store.ts',
 'supabase/functions/login-with-identifier/index.ts'
]);
function buildSignedBrokerArtifact(root=path.resolve(__dirname,'../..')){
 const imports=new Set(),bodies=[];
 for(const file of SOURCE_FILES){
  const source=fs.readFileSync(path.join(root,file),'utf8').replace(/^import .* from ['"]([^'"]+)['"];\n/gm,(line,target)=>{
   if(!target.startsWith('.'))imports.add(line.trim());return '';
  }).replace(/^export /gm,'');
  bodies.push('// Source: '+file+'\n'+source);
 }
 // Existing generated-bundle policy is retained; original modules receive strict Deno type checking.
 return '// @ts-nocheck\n// GENERATED SIGNED BROKER. Both Dashboard filenames use the canonical signed entry.\n// Source modules are checked separately. No deployment or activation is authorized.\n'+[...imports].join('\n')+'\n'+bodies.join('\n');
}
module.exports={SOURCE_FILES,DASHBOARD_FILES,buildSignedBrokerArtifact};
