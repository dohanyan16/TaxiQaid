const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {watermark,definition}=require('../scripts/lib/maintenance-repair-sql.cjs'),read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
const canonical=read('supabase/review/public-login/01_signed_attempt_and_cleanup.sql'),repair=read('supabase/review/public-login/04_repair_maintenance_watermark.sql');
test('watermark literals satisfy the exact live bucket constraint; historical fixture reproduces the 65-character value',()=>{
 assert.equal(watermark.length,64);assert.match(watermark,/^[0-9a-f]{64}$/);
 const current=[...canonical.matchAll(/'([0-9a-f]{64,})'/g)].map(match=>match[1]);assert.ok(current.length>=8);assert.ok(current.every(value=>value===watermark));
 const historical=[...read('tests/fixtures/cron-watermark-095f494.sql').matchAll(/'([0-9a-f]{64,})'/g)].map(match=>match[1]);assert.ok(historical.length>=4);assert.ok(historical.every(value=>value.length===65));
 const consume=definition(read('supabase/review/public-login/00_conservative_limits.sql'),'taxiqaid_auth_api.consume_login_counters(text,text,text)');assert.ok(consume.src.includes('ARRAY[20,10,10]'));
});
test('repair changes only four reviewed bodies and has no operational DML outside those bodies',()=>{
 const start=repair.indexOf('-- BEGIN REVIEW REPAIR BODIES'),end=repair.indexOf('-- END REVIEW REPAIR BODIES');assert.ok(start>0&&end>start);
 const outside=repair.slice(0,start)+repair.slice(end);assert.doesNotMatch(outside,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER TABLE|DROP FUNCTION)\b/);
 assert.equal((repair.slice(start,end).match(/^CREATE OR REPLACE FUNCTION /gm)||[]).length,4);
 assert.doesNotMatch(repair,/ALTER FUNCTION .* OWNER TO|GRANT EXECUTE|REVOKE ALL ON FUNCTION|cron\.(?:schedule|alter_job|unschedule)\(/);
 const signed=definition(canonical,'taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)').src;
 assert.ok(signed.indexOf('p_ip=')<signed.indexOf('begin_login_attempt('));assert.ok(signed.indexOf('p_nonce=')<signed.indexOf('begin_login_attempt('));
 const nonce=definition(canonical,'taxiqaid_auth_api.claim_gateway_nonce(text,bigint)').src;assert.ok(nonce.indexOf("p_nonce='"+watermark+"'")<nonce.indexOf('INSERT INTO'));
});
