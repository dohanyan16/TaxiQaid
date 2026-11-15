// Catalog/storage regression in the disposable database. Owner observations are test evidence only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {definition}=require('../scripts/lib/maintenance-repair-sql.cjs');
module.exports=function fingerprintFixture({sql,admin,root,records,metadata,denied,repair,verify}){
 const read=file=>fs.readFileSync(path.join(root,file),'utf8'),observed=JSON.parse(read('tests/fixtures/live-fingerprints-step120.json')).functions;
 const signatures=['taxiqaid_auth_api.consume_login_counters(text,text,text)','taxiqaid_auth_api.public_login_limits_healthy()','taxiqaid_auth_api.maintain_public_login_counters(integer)','taxiqaid_auth_api.claim_gateway_nonce(text,bigint)','taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)'];
 const definitions=signatures.map((signature,index)=>({...definition(read(index===0?'supabase/review/public-login/00_conservative_limits.sql':'tests/fixtures/cron-watermark-095f494.sql'),signature),signature,name:signature.split('(')[0].split('.')[1]}));
 const install=entry=>admin(entry.create.replace(/^CREATE (?:OR REPLACE )?FUNCTION /,'CREATE OR REPLACE FUNCTION ').replaceAll('\n','\r\n'));
 definitions.forEach(install);
 const script=read('supabase/review/public-login/07_inspect_function_fingerprints.sql');
 const query=script.split('-- BEGIN READ-ONLY FINGERPRINT QUERY\n')[1].split('-- END READ-ONLY FINGERPRINT QUERY')[0].trim().replace(/;$/,'');
 const run=()=>JSON.parse(sql(script.replace(query+';',"SELECT coalesce(json_agg(row_to_json(r)),'[]') FROM ("+query+') r;')));
 const state=()=>JSON.parse(sql('SELECT row_to_json(v) FROM ('+verify.replace(/^--.*\n/gm,'').trim().replace(/;$/,'')+') v;'));
 const securityQuery=read('supabase/review/public-login/03_verify_role_state.sql').replace(/^--.*\n/gm,'').trim().replace(/;$/,'');
 const securityPass=()=>{const result=JSON.parse(sql('SELECT row_to_json(v) FROM ('+securityQuery+') v;'));for(const [key,value]of Object.entries(result))assert.equal(value,key==='cron_extension'?'NOT_INSTALLED':'PASS');};
 securityPass();
 const before=metadata(),data=records(),results=run();assert.equal(results.length,5);assert.equal(metadata(),before);assert.equal(records(),data);
 for(const result of results){
  const name=result.signature.split('(')[0].split('.')[1],entry=definitions.find(value=>value.name===name);
  assert.equal(result.raw_prosrc_sha256,observed[name],'PostgreSQL stores the exact owner-observed CRLF body bytes');
  assert.notEqual(result.raw_prosrc_sha256,entry.hash,'The old LF-only body predicate fails for every observed function');
  assert.equal(result.body_review,'EXACT_REVIEWED_BYTES');assert.equal(result.matched_references.length,1);assert.equal(result.matched_references[0].line_endings,'CRLF');
  assert.equal(result.matched_references[0].reference,name==='consume_login_counters'?'REVIEWED_20_10_10':'LEGACY_65_CHARACTER_WATERMARK');
  assert.equal(result.interface_review,'PASS');assert.equal(result.security_review,'PASS');assert.equal(result.lone_cr_characters,0);assert.ok(result.crlf_pairs>0);assert.equal(result.crlf_pairs,result.lf_characters);
  assert.equal(result.rate_policy_review,name==='consume_login_counters'?'CONFIRMED_20_10_10_WINDOWS_60_60_900':'NOT_APPLICABLE');
 }
 const expected=state();assert.equal(expected.unchanged_rate_policy,'PASS');for(const entry of definitions.slice(1))assert.equal(expected[entry.name],'NEEDS_REPAIR');
 // A comment still changes exact bytes. No source snippets or unexpected literals may leave 07.
 for(const entry of definitions){
  const changed={...entry,create:entry.create.replace('AS $$',()=> 'AS $$\n/* SYNTHETIC_PRIVATE_SOURCE_DO_NOT_RETURN */')};install(changed);
  const result=run().find(value=>value.signature===entry.signature);assert.equal(result.body_review,'UNREVIEWED_BODY');assert.equal(result.matched_references,null);assert.equal(result.security_review,'PASS');assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE'),false);
  if(entry.name==='consume_login_counters')assert.equal(state().unchanged_rate_policy,'FAIL');else assert.equal(state()[entry.name],'FAIL');
  denied(repair,'unreviewed CRLF body '+entry.name);install(entry);
 }
 const rate=definitions[0];
 for(const replacement of ['ARRAY[200,20,10]','ARRAY[20,2,10]','ARRAY[21,10,10]']){
  install({...rate,create:rate.create.replace('ARRAY[20,10,10]',replacement)});
  assert.equal(run().find(value=>value.signature===rate.signature).rate_policy_review,'NOT_CONFIRMED');assert.equal(state().unchanged_rate_policy,'FAIL');denied(repair,'changed policy '+replacement);install(rate);
 }
 const nonce=definitions.find(value=>value.name==='claim_gateway_nonce');
 install({...nonce,create:nonce.create.replace('ON CONFLICT(bucket,window_start) DO NOTHING','ON CONFLICT(bucket,window_start) DO UPDATE SET attempts=2')});
 securityPass();assert.equal(state().claim_gateway_nonce,'FAIL');assert.equal(run().find(value=>value.signature===nonce.signature).body_review,'UNREVIEWED_BODY');denied(repair,'unsafe nonce replay change');install(nonce);
 // No generic newline/whitespace trimming or mixed-ending normalization is authorized.
 const trimmed={...rate,create:rate.create.replace(rate.src,()=>rate.src.trim())};install(trimmed);assert.equal(state().unchanged_rate_policy,'FAIL');denied(repair,'trimmed source is outside the exact two variants');install(rate);
 const mixed=rate.create.replace(/^CREATE (?:OR REPLACE )?FUNCTION /,'CREATE OR REPLACE FUNCTION ').replaceAll('\n','\r\n').replace('\r\nDECLARE','\nDECLARE');
 admin(mixed);assert.equal(state().unchanged_rate_policy,'FAIL');denied(repair,'mixed line endings are not normalized');install(rate);
 assert.equal(records(),data,'All inspections/rejected repairs preserve every counter/account record');
 process.stderr.write('PASS: all five owner hashes reproduced by PostgreSQL CRLF storage; LF-only mismatch explained; read-only diagnostic privacy and exact-variant acceptance; altered/unsafe/trimmed/mixed bodies rejected.\n');
 return {run,signatures};
};
