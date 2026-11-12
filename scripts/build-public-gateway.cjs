// Review artifacts only. No deployment, network, secret generation or live SQL execution.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'..'),check=process.argv.includes('--check'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function output(file,source){if(check){if(read(file)!==source)throw new Error('Public gateway artifact drift: '+file);}else fs.writeFileSync(path.join(root,file),source);}
const proof=read('supabase/functions/_shared/gateway-proof.mjs');
const worker=read('gateway/worker.mjs');
if(/\bcredentials\s*:/.test(worker)||/\bredirect\s*:\s*['"]error['"]/.test(worker))throw new Error('Unsupported Cloudflare Worker fetch options.');
output('gateway/dashboard-worker.mjs','// GENERATED REVIEW ONLY. No secrets, deployment or activation.\n'+proof.replace(/^export /gm,'')+'\n'+worker.replace(/^import .*;\n/gm,''));
const files=['supabase/functions/_shared/security.mjs','supabase/functions/_shared/handlers.mjs','supabase/functions/_shared/broker-store.ts','supabase/functions/_shared/gateway-proof.mjs','supabase/functions/_shared/signed-broker-store.ts','supabase/review/public-login/login-with-identifier.ts'],imports=new Set(),bodies=[];
for(const file of files){let source=read(file).replace(/^import .* from ['"]([^'"]+)['"];\n/gm,(line,target)=>{if(!target.startsWith('.'))imports.add(line.trim());return '';}).replace(/^export /gm,'');bodies.push('// Source: '+file+'\n'+source);}
output('supabase/dashboard/login-with-identifier-gateway.ts','// @ts-nocheck\n// GENERATED REVIEW REPLACEMENT. Original modules are checked separately. Do not deploy without approval.\n'+[...imports].join('\n')+'\n'+bodies.join('\n'));
const existing=read('scripts/_broker_smoke/dashboard-snippet.js'),start='// BEGIN PUBLIC SUPABASE SDK\n',end='\n// END PUBLIC SUPABASE SDK',sdk=existing.slice(existing.indexOf(start)+start.length,existing.indexOf(end)),hash='a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce';
if(crypto.createHash('sha256').update(sdk).digest('hex')!==hash)throw new Error('SDK integrity failed.');
const guard="if(location.origin!=='REPLACE_WITH_REVIEWED_WORKER_ORIGIN')return;\nif(location.protocol!=='https:'||!location.hostname.endsWith('.workers.dev')||location.pathname!=='/login-with-identifier'||location.search||location.hash||globalThis.TAXIQAID_BROKER_TEST_RUNNING)return;";
const parts=['shared/permission-catalog.js','shared/permission-model.js','shared/auth-contract.js','scripts/_public_gateway/browser.js'];
output('scripts/_public_gateway/dashboard-snippet.js','/*\n'+read('scripts/_broker_smoke/THIRD_PARTY_LICENSES.txt')+'\n*/\n// GENERATED PUBLIC CODE. Pinned SDK SHA-256: '+hash+'\n(async()=>{\n'+guard+"\nfor(const key of ['localStorage','sessionStorage','indexedDB','caches'])Object.defineProperty(globalThis,key,{get(){throw new DOMException('Storage disabled.','SecurityError');}});\n"+start+sdk+end+'\n'+parts.map(file=>'// Source: '+file+'\n'+read(file)).join('\n')+'\n})();\n');
console.log('PASS: public gateway review artifacts '+(check?'verified.':'prepared.'));
