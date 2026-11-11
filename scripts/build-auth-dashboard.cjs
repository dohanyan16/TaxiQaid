// Developer-only deterministic packaging; the owner copies the checked artifact through Dashboard/browser UI.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check');
const files=['supabase/functions/_shared/security.mjs','supabase/functions/_shared/handlers.mjs','supabase/functions/_shared/broker-store.ts','supabase/functions/login-with-identifier/index.ts'];
const imports=new Set(),bodies=[];
for(const file of files){let source=fs.readFileSync(path.join(root,file),'utf8');source=source.replace(/^import .* from ['"]([^'"]+)['"];\n/gm,(line,target)=>{if(!target.startsWith('.'))imports.add(line.trim());return '';}).replace(/^export /gm,'');bodies.push('// Source: '+file+'\n'+source);}
const header='// @ts-nocheck\n// GENERATED REVIEW CANDIDATE. Disabled unless every server readiness gate is explicitly approved.\n// Do not edit here. Regenerate with scripts/build-auth-dashboard.cjs; no secrets are included.\n';
const artifact=header+[...imports].join('\n')+'\n'+bodies.join('\n');
function output(file,contents){const target=path.join(root,file);if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==contents)throw new Error('Dashboard artifact drift: '+file);}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,contents);}}
output('supabase/dashboard/login-with-identifier.ts',artifact);
const sdkFile=process.env.TAXIQAID_SMOKE_SDK_FILE,expected='a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce';
const snippetFile='scripts/_broker_smoke/dashboard-snippet.js',snippetSource=path.join(root,'scripts/_broker_smoke/browser.js');
if(fs.existsSync(snippetSource)){
 let sdk;if(sdkFile)sdk=fs.readFileSync(sdkFile);else if(check){const saved=fs.readFileSync(path.join(root,snippetFile),'utf8'),begin='// BEGIN PUBLIC SUPABASE SDK\n',end='\n// END PUBLIC SUPABASE SDK';const start=saved.indexOf(begin);if(start<0||saved.indexOf(end)<0)throw new Error('Pinned SDK markers missing.');sdk=Buffer.from(saved.slice(start+begin.length,saved.indexOf(end)));}
 if(sdk){if(crypto.createHash('sha256').update(sdk).digest('hex')!==expected)throw new Error('Pinned public SDK integrity failure.');
 const privacy="for(const key of ['localStorage','sessionStorage','indexedDB','caches'])Object.defineProperty(globalThis,key,{get(){throw new DOMException('Storage is disabled.','SecurityError');}});";
 const parts=['shared/permission-catalog.js','shared/permission-model.js','shared/auth-contract.js','scripts/_broker_smoke/browser.js'];
 const license=fs.readFileSync(path.join(root,'scripts/_broker_smoke/THIRD_PARTY_LICENSES.txt'),'utf8');
 const snippet='/*\n'+license+'\n*/\n// GENERATED, PUBLIC CODE ONLY. Run once as a reviewed browser DevTools Snippet on the dedicated function URL.\n// Supabase SDK 2.119.0 SHA-256: '+expected+'\n(async()=>{\nif(location.origin!=="https://mqkflwsvnzcaylxtvsje.supabase.co"||!/^\\/functions\\/v1\\/login-with-identifier\\/?$/.test(location.pathname)||globalThis.TAXIQAID_BROKER_TEST_RUNNING)return;\n'+privacy+'\n// BEGIN PUBLIC SUPABASE SDK\n'+sdk.toString()+'\n// END PUBLIC SUPABASE SDK\n'+parts.map(file=>'\n// Source: '+file+'\n'+fs.readFileSync(path.join(root,file),'utf8')).join('\n')+'\n})();\n';output(snippetFile,snippet);
 }else if(!check)throw new Error('TAXIQAID_SMOKE_SDK_FILE must identify the pinned public SDK copy to build the browser snippet.');
}
console.log(check?'PASS: Dashboard artifact matches reviewed sources.':'Built Dashboard candidate and optional browser snippet.');
