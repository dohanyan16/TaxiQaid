const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {sourceFingerprints,sha256}=require('../scripts/lib/sql-source-fingerprints.cjs'),{definition}=require('../scripts/lib/maintenance-repair-sql.cjs');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8'),observed=JSON.parse(read('tests/fixtures/live-fingerprints-step120.json')).functions;
const signatures=['consume_login_counters(text,text,text)','public_login_limits_healthy()','maintain_public_login_counters(integer)','claim_gateway_nonce(text,bigint)','begin_signed_login_attempt(text,text,text,text,text,bigint)'];
test('all five observed fingerprints are independently derived CRLF forms of known reviewed sources',()=>{
 for(const signature of signatures){
  const name=signature.split('(')[0],source=read(name==='consume_login_counters'?'supabase/review/public-login/00_conservative_limits.sql':'tests/fixtures/cron-watermark-095f494.sql');
  const entry=definition(source,'taxiqaid_auth_api.'+signature),variants=sourceFingerprints(entry.src);
  assert.equal(variants.length,2);assert.notEqual(variants[0].hash,observed[name]);assert.equal(variants[1].hash,observed[name]);
  assert.deepEqual(sourceFingerprints(entry.src.replaceAll('\n','\r\n')),variants);
  assert.equal(variants[1].hash,sha256(entry.src.replaceAll('\n','\r\n')));
  if(name!=='consume_login_counters')assert.ok(!sourceFingerprints(definition(read('supabase/review/public-login/01_signed_attempt_and_cleanup.sql'),'taxiqaid_auth_api.'+signature).src).some(value=>value.hash===observed[name]),'The broken legacy body must never be recognized as corrected');
 }
});
test('only exact repository-derived LF/CRLF bytes are accepted; no generic source normalization',()=>{
 const source="BEGIN\n -- It is a comment, not a literal.\n RETURN 'safe value';\nEND\n",variants=sourceFingerprints(source),known=variants.map(value=>value.hash);
 for(const changed of [source.trim(),source.replace('safe value','unsafe value'),source.replace('safe value','safe  value'),source.replace('RETURN','RETURN /* extra comment */'),source.replace('\n','\r\n')])assert.equal(known.includes(sha256(changed)),false);
 for(const file of ['scripts/lib/maintenance-repair-sql.cjs','scripts/lib/function-fingerprint-diagnostic.cjs','scripts/lib/sql-source-fingerprints.cjs'])assert.equal(read(file).includes('live-fingerprints-step120'),false,'Live observations must not supply accepted production hashes');
});
test('automatic CRLF variants refuse quoted newlines, escapes, nested dollar quotes and ambiguous source',()=>{
 for(const source of ["SELECT 'line\nbreak';\n",'SELECT "line\nbreak";\n',"SELECT E'escape\\n';\n",'SELECT $x$line\nbreak$x$;\n',"SELECT 'unterminated\n",'SELECT 1; /* unfinished', 'SELECT 1;\r'])assert.throws(()=>sourceFingerprints(source));
 assert.equal(sourceFingerprints("/* Nested /* 'quote */ comments */\nSELECT 'it''s -- safe'; -- ' ignored\n").length,2);
});
test('07 is a read-only catalog diagnostic with no source-text projection or target invocation',()=>{
 const source=read('supabase/review/public-login/07_inspect_function_fingerprints.sql');assert.match(source,/BEGIN TRANSACTION READ ONLY;/);assert.match(source,/ROLLBACK;\s*$/);
 assert.doesNotMatch(source,/\b(?:CREATE|INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE|DO)\b/);
 const projection=source.slice(source.lastIndexOf('\nSELECT signature,'),source.indexOf('\nFROM matched ORDER BY signature;'));
 assert.ok(projection.includes('raw_prosrc_sha256'));assert.doesNotMatch(projection,/(?:^|,)\s*(?:p\.)?prosrc\s*(?:,|$)/m);
 for(const table of ['auth.users','taxiqaid_private.user_accounts','taxiqaid_private.auth_login_identities','cron.job_run_details'])assert.equal(source.includes(table),false);
});
