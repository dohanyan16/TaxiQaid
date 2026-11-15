// Local public-source packaging and synthetic fixtures only; no deployed handler or credential is used.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {SOURCE_FILES,DASHBOARD_FILES,buildSignedBrokerArtifact}=require('../scripts/lib/signed-broker-artifact.cjs');
test('canonical factory and server registration preserve the reviewed c0a5e7d implementation exactly',()=>{
 const source=read('supabase/functions/login-with-identifier/index.ts'),factory=source.slice(source.indexOf('export function createSignedLogin'));
 assert.equal(crypto.createHash('sha256').update(factory).digest('hex'),'9682fbf8ead4fa8a330bcbf3437620f058c9d6bf951749dc7ff7558e48f33711');
 assert.doesNotMatch(source,/trustedClientIp|openBrokerStore|cachedBrokerStore/);
 const compatibility=read('supabase/review/public-login/login-with-identifier.ts');assert.match(compatibility,/export \{createSignedLogin\} from '\.\.\/\.\.\/functions\/login-with-identifier\/index\.ts';/);assert.doesNotMatch(compatibility,/Deno\.serve|function createSignedLogin/);
});
test('both signed Dashboard artifacts are identical deterministic outputs of the canonical dependency closure',()=>{
 const artifact=buildSignedBrokerArtifact(root);assert.equal(DASHBOARD_FILES.length,2);
 for(const file of DASHBOARD_FILES)assert.equal(read(file),artifact);
 assert.equal((artifact.match(/function createSignedLogin\(/g)||[]).length,1);assert.equal((artifact.match(/Deno\.serve\(/g)||[]).length,1);
 for(const file of SOURCE_FILES)assert.ok(artifact.includes('// Source: '+file+'\n'));
 assert.ok(SOURCE_FILES.includes('supabase/functions/_shared/gateway-proof.mjs'));assert.ok(SOURCE_FILES.includes('supabase/functions/_shared/signed-broker-store.ts'));
 assert.equal(SOURCE_FILES.some(file=>file.startsWith('supabase/review/')),false);
 assert.match(artifact,/begin_signed_login_attempt/);assert.match(artifact,/clientIp:\(\)=>proof\.ip/);
});
test('each builder checks both artifact aliases through the one shared packager',()=>{
 for(const file of ['scripts/build-auth-dashboard.cjs','scripts/build-public-gateway.cjs']){
  const source=read(file);assert.match(source,/require\('\.\/lib\/signed-broker-artifact\.cjs'\)/);assert.match(source,/for\(const file of DASHBOARD_FILES\)output\(file,/);
  assert.doesNotMatch(source,/const files=\[.*login-with-identifier/);
  execFileSync(process.execPath,[path.join(root,file),'--check'],{cwd:root,stdio:'pipe'});
 }
});
test('canonical-source drift and either stale alias fail --check in an isolated repository fixture',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'taxiqaid-signed-package-'));
 try{
  for(const file of [...SOURCE_FILES,...DASHBOARD_FILES,'scripts/build-auth-dashboard.cjs','scripts/lib/signed-broker-artifact.cjs']){
   fs.mkdirSync(path.dirname(path.join(folder,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(folder,file));
  }
  const check=()=>execFileSync(process.execPath,[path.join(folder,'scripts/build-auth-dashboard.cjs'),'--check'],{cwd:folder,stdio:'pipe'});
  check();
  for(const file of [SOURCE_FILES.at(-1),...DASHBOARD_FILES]){
   const target=path.join(folder,file),before=fs.readFileSync(target,'utf8');fs.writeFileSync(target,before+'\n// Synthetic drift.\n');
   assert.throws(check,error=>String(error.stderr).includes('Dashboard artifact drift:'));fs.writeFileSync(target,before);check();
  }
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('repository activation configuration and permission inventory remain unchanged by packaging',()=>{
 const config=read('shared/auth-dedicated-config.js');assert.match(config,/brokerUrl:null/);assert.match(config,/enabled:false/);assert.match(config,/sessionStorageMode:'memory'/);
 const platform=read('supabase/config.toml');assert.match(platform,/\[functions\.get-my-access\]\s*verify_jwt = true/);assert.match(platform,/\[functions\.login-with-identifier\]\s*verify_jwt = false/);
 const catalog=require('../shared/permission-catalog.js');assert.equal(catalog.ALL.length,107);assert.equal(catalog.ALL.filter(item=>item.audience==='Driver').length,6);
});
