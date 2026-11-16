// Deterministic review packaging only; no deployment, secret access or runtime dependency downloads.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function output(file,data){if(check){if(read(file)!==data)throw new Error('Owner diagnostic artifact drift: '+file);}else fs.writeFileSync(path.join(root,file),data);}
const imports=new Set(),parts=[];
for(const file of ['supabase/functions/_shared/security.mjs','supabase/functions/_shared/broker-store.ts','supabase/functions/_diagnostics/owner-username-core.mjs','supabase/functions/_diagnostics/master-access.ts','supabase/functions/_diagnostics/owner-runtime.ts','supabase/functions/check-owner-username/index.ts']){
 let source=read(file).replace(/^import .* from ['"]([^'"]+)['"];\n/gm,(line,target)=>{if(!target.startsWith('.')&&!line.includes('createRequire'))imports.add(line.trim());return '';}).replace(/^export /gm,'');
 if(file.endsWith('master-access.ts'))source=source.replace(/^const require=.*;\n/m,'').replace(/^const ownerContract=.*;$/m,'const ownerContract=TaxiQaidAuthContract;').replace(/^const ownerCatalog=.*;$/m,'const ownerCatalog=TaxiQaidPermissionCatalog;').replace(/^const ownerModel=.*;$/m,'const ownerModel=TaxiQaidPermissionModel;');
 parts.push('// Source: '+file+'\n'+source);
}
const common=['shared/permission-catalog.js','shared/permission-model.js','shared/auth-contract.js'].map(file=>'// Source: '+file+'\n'+read(file)).join('\n');
output('supabase/dashboard/check-owner-username.ts','// @ts-nocheck\n// GENERATED REVIEW ONLY. Original typed modules are checked separately. No deployment is performed.\n'+[...imports].join('\n')+'\n'+common+'\n'+parts.join('\n'));
const embedded=read('scripts/_broker_smoke/dashboard-snippet.js'),begin='// BEGIN PUBLIC SUPABASE SDK\n',end='\n// END PUBLIC SUPABASE SDK',sdk=embedded.slice(embedded.indexOf(begin)+begin.length,embedded.indexOf(end)),hash='a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce';
if(!embedded.includes(begin)||!embedded.includes(end)||crypto.createHash('sha256').update(sdk).digest('hex')!==hash)throw new Error('SDK integrity failed.');
const checks=read('supabase/functions/_diagnostics/owner-username-core.mjs').match(/^export const OWNER_CHECKS=.*;$/m)?.[0];if(!checks)throw new Error('Result schema missing.');
const guard="for(const key of ['localStorage','sessionStorage','indexedDB','caches'])Object.defineProperty(globalThis,key,{get(){throw new DOMException('Storage is disabled.','SecurityError');}});";
output('scripts/_owner_username/dashboard-snippet.js','/*\n'+read('scripts/_broker_smoke/THIRD_PARTY_LICENSES.txt')+'\n*/\n// GENERATED PUBLIC CODE. SDK SHA-256: '+hash+'\n(async()=>{\nif(location.origin!=="https://mqkflwsvnzcaylxtvsje.supabase.co"||!/^\\/functions\\/v1\\/check-owner-username\\/?$/.test(location.pathname)||globalThis.TAXIQAID_OWNER_USERNAME_DIAGNOSTIC_RUNNING)return;\n'+guard+'\n// BEGIN PUBLIC SUPABASE SDK\n'+sdk+'\n// END PUBLIC SUPABASE SDK\n'+checks.replace('export ','')+'\n'+read('scripts/_owner_username/browser.js')+'\n})();\n');
console.log('PASS: owner diagnostic packaging'+(check?' verified.':' prepared.'));
