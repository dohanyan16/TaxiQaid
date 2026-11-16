// Developer packaging only; owner review/deployment/test uses Dashboard and a normal browser, without a CLI.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function output(file,contents){const target=path.join(root,file);if(check){if(read(file)!==contents)throw new Error('Diagnostic artifact drift: '+file);}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,contents);}}
const broker=read('supabase/functions/_shared/broker-store.ts'),start=broker.indexOf('export function brokerConnectionOptions('),end=broker.indexOf('export function createBrokerStore('),project=broker.match(/^const projectRef=.*;$/m)?.[0];
if(start<0||end<start||!project)throw new Error('Shared connection parser extraction failed.');
const parser=project+'\n'+broker.slice(start,end),imports=new Set(),bodies=[];
for(const file of ['supabase/functions/_diagnostics/pooler-core.mjs','supabase/functions/_diagnostics/pooler-db.ts','supabase/functions/check-broker-pooler/index.ts']){
 let source=read(file).replace(/^import .* from ['"]([^'"]+)['"];\n/gm,(line,target)=>{if(!target.startsWith('.'))imports.add(line.trim());return '';}).replace(/^export /gm,'');bodies.push('// Source: '+file+'\n'+source);
}
output('supabase/dashboard/check-broker-pooler.ts','// @ts-nocheck\n// GENERATED REVIEW-ONLY temporary diagnostic. No deployment or public login activation.\n// Original typed modules are checked separately. Regenerate with scripts/build-pooler-diagnostic.cjs.\n'+[...imports].join('\n')+'\n// Pure shared connection parser; no broker handler or identity queries are bundled.\n'+parser.replace(/^export /gm,'')+'\n'+bodies.join('\n'));
const embedded=read('scripts/_broker_smoke/dashboard-snippet.js'),begin='// BEGIN PUBLIC SUPABASE SDK\n',finish='\n// END PUBLIC SUPABASE SDK',sdk=embedded.slice(embedded.indexOf(begin)+begin.length,embedded.indexOf(finish)),hash='a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce';
if(!embedded.includes(begin)||!embedded.includes(finish)||crypto.createHash('sha256').update(sdk).digest('hex')!==hash)throw new Error('Pinned SDK integrity failed.');
const checks=read('supabase/functions/_diagnostics/pooler-core.mjs').match(/^export const POOLER_CHECKS=.*;$/m)?.[0];if(!checks)throw new Error('Result schema missing.');
const guard="for(const key of ['localStorage','sessionStorage','indexedDB','caches'])Object.defineProperty(globalThis,key,{get(){throw new DOMException('Storage is disabled.','SecurityError');}});";
output('scripts/_pooler_diagnostic/dashboard-snippet.js','/*\n'+read('scripts/_broker_smoke/THIRD_PARTY_LICENSES.txt')+'\n*/\n// GENERATED PUBLIC CODE ONLY. Pinned SDK SHA-256: '+hash+'\n(async()=>{\nif(location.origin!=="https://mqkflwsvnzcaylxtvsje.supabase.co"||!/^\\/functions\\/v1\\/check-broker-pooler\\/?$/.test(location.pathname)||globalThis.TAXIQAID_POOLER_DIAGNOSTIC_RUNNING)return;\n'+guard+'\n// BEGIN PUBLIC SUPABASE SDK\n'+sdk+'\n// END PUBLIC SUPABASE SDK\n'+checks.replace('export ','')+'\n'+read('scripts/_pooler_diagnostic/browser.js')+'\n})();\n');
console.log(check?'PASS: diagnostic artifacts match sources and pinned SDK.':'Built review-only diagnostic artifacts.');
