// Disposable PostgreSQL 16 only; the Cron catalog is a fixture, not a scheduler or live Supabase connection.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {watermark,definition}=require('../scripts/lib/maintenance-repair-sql.cjs');
module.exports=function maintenanceRepairFixture({sql,runtime,root,hash,lit}){
 const admin=(input,options={})=>sql(input,{user:'supabase_admin',...options}),read=file=>fs.readFileSync(path.join(root,file),'utf8');
 const repair=read('supabase/review/public-login/04_repair_maintenance_watermark.sql'),verify=read('supabase/review/public-login/05_verify_maintenance_watermark.sql'),probe=read('supabase/review/public-login/06_probe_maintenance_rollback.sql');
 const signatures=['taxiqaid_auth_api.public_login_limits_healthy()','taxiqaid_auth_api.maintain_public_login_counters(integer)','taxiqaid_auth_api.claim_gateway_nonce(text,bigint)','taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)'];
 const legacy=signatures.map(signature=>definition(read('tests/fixtures/cron-watermark-095f494.sql'),signature).create.replace(/^CREATE FUNCTION /,'CREATE OR REPLACE FUNCTION ')).join('\n');
 admin('BEGIN;'+legacy+'COMMIT;');
 admin("CREATE SCHEMA cron;CREATE TABLE cron.job(jobid bigint,jobname text,schedule text,active boolean,username text,database text,command text);INSERT INTO cron.job VALUES(1,'taxiqaid-public-login-counter-maintenance','* * * * *',false,'postgres',current_database(),'SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);');GRANT USAGE ON SCHEMA cron TO postgres;GRANT SELECT ON cron.job TO postgres;");
 const records=()=>admin("SELECT jsonb_build_object('accounts',(SELECT jsonb_agg(to_jsonb(v) ORDER BY user_id) FROM taxiqaid_private.user_accounts v),'auth',(SELECT jsonb_agg(to_jsonb(v) ORDER BY id) FROM auth.users v),'mapping',(SELECT jsonb_agg(to_jsonb(v) ORDER BY user_id) FROM taxiqaid_private.auth_login_identities v),'counters',(SELECT jsonb_agg(to_jsonb(v) ORDER BY bucket,window_start) FROM taxiqaid_private.login_attempt_counters v),'permissions',(SELECT jsonb_agg(to_jsonb(v) ORDER BY permission_key) FROM taxiqaid_private.permissions v),'grants',(SELECT jsonb_agg(to_jsonb(v) ORDER BY role_key,permission_key) FROM taxiqaid_private.role_permissions v),'departments',(SELECT jsonb_agg(to_jsonb(v) ORDER BY department_key) FROM taxiqaid_private.departments v));");
 const metadata=()=>admin("SELECT jsonb_build_object('members',(SELECT jsonb_agg(to_jsonb(v) ORDER BY roleid,member,grantor) FROM pg_auth_members v),'schemas',(SELECT jsonb_agg(to_jsonb(v) ORDER BY oid) FROM pg_namespace v),'functions',(SELECT jsonb_agg(to_jsonb(v) ORDER BY oid) FROM pg_proc v WHERE pronamespace='taxiqaid_auth_api'::regnamespace),'constraints',(SELECT jsonb_agg(to_jsonb(v) ORDER BY oid) FROM pg_constraint v WHERE conrelid='taxiqaid_private.login_attempt_counters'::regclass),'table',(SELECT to_jsonb(v) FROM pg_class v WHERE oid='taxiqaid_private.login_attempt_counters'::regclass),'cron',(SELECT jsonb_agg(to_jsonb(v) ORDER BY jobid) FROM cron.job v));");
 const statuses=()=>JSON.parse(sql('SELECT row_to_json(v) FROM ('+verify.replace(/^--.*\n/gm,'').trim().replace(/;$/,'')+') v;'));
 const initial=statuses();assert.equal(initial.exact_counter_constraints,'PASS');assert.equal(initial.unchanged_rate_policy,'PASS');assert.equal(initial.existing_cron_state,'DISABLED');
 for(const name of ['public_login_limits_healthy','maintain_public_login_counters','claim_gateway_nonce','begin_signed_login_attempt'])assert.equal(initial[name],'NEEDS_REPAIR');
 // Reproduce the reported incident after an eligible expired row has been selected for pruning.
 admin(`INSERT INTO taxiqaid_private.login_attempt_counters VALUES(${lit(hash('incident-expired'))},now()-interval '2 hours',now()-interval '1 hour',1);`);
 const beforeIncident=records();
 sql("DO $$ BEGIN PERFORM taxiqaid_auth_api.maintain_public_login_counters(1000);RAISE EXCEPTION 'Expected live CHECK failure was not reproduced';EXCEPTION WHEN check_violation THEN IF SQLERRM NOT LIKE '%login_attempt_counters_bucket_check%' THEN RAISE;END IF;END $$;");
 assert.equal(records(),beforeIncident,'Failed watermark insert must roll back prior expired-row cleanup');
 for(const [bucket,attempts]of [[watermark,0],[watermark,-1],['f'.repeat(65),1],['G'.repeat(64),1]]){
  admin(`INSERT INTO taxiqaid_private.login_attempt_counters VALUES(${lit(bucket)},to_timestamp(1),now(),${attempts});`,{failure:true});
 }
 let rejected=0;
 function denied(source,label){const before=metadata(),data=records();sql(source,{failure:true});assert.equal(metadata(),before,label+' metadata rollback');assert.equal(records(),data,label+' record preservation');rejected++;}
 for(const role of ['taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner']){
  denied(repair.replace('REVOKE '+role+' FROM postgres GRANTED BY postgres RESTRICT;','-- omitted cleanup'),'omitted SET cleanup '+role);
  denied(repair.replace('REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM '+role+' GRANTED BY postgres RESTRICT;','-- omitted CREATE cleanup'),'omitted CREATE cleanup '+role);
 }
 denied(repair.replace('-- END REVIEW REPAIR BODIES','SELECT 1/0;\n-- END REVIEW REPAIR BODIES'),'SQL error during replacement');
 denied(repair.replace('SET LOCAL ROLE taxiqaid_auth_rate_owner;','-- omitted role switch'),'missing owner role switch');
 denied(repair.replace('-- END REVIEW REPAIR BODIES',"SET LOCAL ROLE taxiqaid_auth_rate_owner;GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.public_login_limits_healthy() TO anon;SET LOCAL ROLE postgres;\n-- END REVIEW REPAIR BODIES"),'unexpected EXECUTE grant');
 denied(repair.replace('-- END REVIEW REPAIR BODIES',"SET LOCAL ROLE taxiqaid_auth_rate_owner;ALTER FUNCTION taxiqaid_auth_api.consume_login_counters(text,text,text) COST 101;SET LOCAL ROLE postgres;\n-- END REVIEW REPAIR BODIES"),'unrelated function metadata edit');
 denied(repair.replace('-- END REVIEW REPAIR BODIES',"SET LOCAL ROLE taxiqaid_auth_rate_owner;ALTER FUNCTION taxiqaid_auth_api.public_login_limits_healthy() SET search_path=public;SET LOCAL ROLE postgres;\n-- END REVIEW REPAIR BODIES"),'repaired function hardening edit');
 for(const [change,restore]of [
  ["UPDATE cron.job SET active=true;","UPDATE cron.job SET active=false;"],
  ["UPDATE cron.job SET username='anon';","UPDATE cron.job SET username='postgres';"],
  ["UPDATE cron.job SET schedule='*/2 * * * *';","UPDATE cron.job SET schedule='* * * * *';"],
  ["UPDATE cron.job SET database='other_database';","UPDATE cron.job SET database=current_database();"],
  ["UPDATE cron.job SET jobname='missing_fixture_job';","UPDATE cron.job SET jobname='taxiqaid-public-login-counter-maintenance';"],
  ["UPDATE cron.job SET command='SELECT 1';","UPDATE cron.job SET command='SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);';"],
  ["INSERT INTO cron.job SELECT 2,jobname,schedule,active,username,database,command FROM cron.job;","DELETE FROM cron.job WHERE jobid=2;"],
  ["GRANT taxiqaid_auth_rate_owner TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET TRUE GRANTED BY postgres;","REVOKE taxiqaid_auth_rate_owner FROM postgres GRANTED BY postgres;"],
  ["GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.claim_gateway_nonce(text,bigint) TO anon;","REVOKE EXECUTE ON FUNCTION taxiqaid_auth_api.claim_gateway_nonce(text,bigint) FROM anon;"],
  ["ALTER FUNCTION taxiqaid_auth_api.claim_gateway_nonce(text,bigint) OWNER TO postgres;","ALTER FUNCTION taxiqaid_auth_api.claim_gateway_nonce(text,bigint) OWNER TO taxiqaid_auth_rate_owner;"]
 ]){admin(change);denied(repair,change);admin(restore);}
 const badHealth=definition(legacy,signatures[0]).create.replace('SELECT EXISTS','SELECT /* unreviewed edit */ EXISTS');
 admin(badHealth);denied(repair,'unreviewed installed body');admin('BEGIN;'+legacy+'COMMIT;');
 admin('ALTER TABLE taxiqaid_private.login_attempt_counters DROP CONSTRAINT login_attempt_counters_attempts_check;');denied(repair,'missing live CHECK');admin('ALTER TABLE taxiqaid_private.login_attempt_counters ADD CONSTRAINT login_attempt_counters_attempts_check CHECK(attempts>0);');
 const rateDefinition=JSON.parse(admin("SELECT to_json(pg_get_functiondef('taxiqaid_auth_api.consume_login_counters(text,text,text)'::regprocedure));"));
 admin(rateDefinition.replace('ARRAY[20,10,10]','ARRAY[19,10,10]'));denied(repair,'unreviewed rate policy');admin(rateDefinition);
 const fixedHealthy=definition(read('supabase/review/public-login/01_signed_attempt_and_cleanup.sql'),signatures[0]).create.replace(/^CREATE FUNCTION /,'CREATE OR REPLACE FUNCTION ');
 admin(fixedHealthy);denied(repair,'mixed repaired/legacy definitions');admin('BEGIN;'+legacy+'COMMIT;');
 admin('ALTER TABLE taxiqaid_private.login_attempt_counters DROP CONSTRAINT login_attempt_counters_attempts_check;ALTER TABLE taxiqaid_private.login_attempt_counters ADD CONSTRAINT login_attempt_counters_attempts_check CHECK(attempts>0) NOT VALID;');denied(repair,'unvalidated CHECK');admin('ALTER TABLE taxiqaid_private.login_attempt_counters VALIDATE CONSTRAINT login_attempt_counters_attempts_check;');
 const previous=records(),catalog=metadata();sql(repair);assert.equal(records(),previous,'DDL repair must not prune, reset or insert any counter/account records');
 const beforeMetadata=JSON.parse(catalog),afterMetadata=JSON.parse(metadata());
 for(const key of ['members','schemas','constraints','table','cron'])assert.deepEqual(afterMetadata[key],beforeMetadata[key],'Successful repair preserves '+key);
 const changed=[];
 for(let n=0;n<beforeMetadata.functions.length;n++){
  const beforeFunction={...beforeMetadata.functions[n]},afterFunction={...afterMetadata.functions[n]};
  if(beforeFunction.prosrc!==afterFunction.prosrc)changed.push(beforeFunction.proname);
  delete beforeFunction.prosrc;delete afterFunction.prosrc;assert.deepEqual(afterFunction,beforeFunction,'All non-body pg_proc metadata is preserved');
 }
 assert.deepEqual(changed.sort(),['begin_signed_login_attempt','claim_gateway_nonce','maintain_public_login_counters','public_login_limits_healthy']);
 const final=statuses();assert.ok(Object.entries(final).every(([key,value])=>value===(key==='existing_cron_state'?'DISABLED':'PASS')));assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'f');
 denied(repair,'already-repaired reapplication');
 // Rollback-only browser probe really exercises maintenance and leaves all counter rows untouched.
 const beforeProbe=records();assert.match(sql(probe),/PASS\|PASS\|PASS\|PASS/);assert.equal(records(),beforeProbe);
 assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'f');
 assert.equal(sql('SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);'),'1');
 const watermarkRow=JSON.parse(admin(`SELECT json_build_array(length(bucket),attempts,window_start=to_timestamp(0),expires_at>clock_timestamp()+interval '4 minutes 55 seconds') FROM taxiqaid_private.login_attempt_counters WHERE bucket=${lit(watermark)} AND window_start=to_timestamp(0);`));assert.deepEqual(watermarkRow,[64,1,true,true]);
 admin(`UPDATE taxiqaid_private.login_attempt_counters SET expires_at=clock_timestamp()-interval '1 second' WHERE bucket=${lit(watermark)} AND window_start=to_timestamp(0);`);
 assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'f');sql('SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);');assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'t');
 const signedIssued=admin('SELECT floor(extract(epoch FROM clock_timestamp()))::bigint;');
 const signed=(key,nonce=hash('repair-nonce'))=>`SELECT allowed FROM taxiqaid_auth_api.begin_signed_login_attempt('unknownfixture',${lit(key[0])},${lit(key[1])},${lit(key[2])},${lit(nonce)},${signedIssued});`;
 const keys=[hash('repair-ip'),hash('repair-account'),hash('repair-global')];
 for(let n=0;n<4;n++){
  const changed=[...keys];if(n<3)changed[n]=watermark;
  const before=records();assert.equal(runtime(signed(changed,n===3?watermark:hash('repair-reserved-nonce-'+n))),'f');assert.equal(records(),before,'Reserved input denied before rate writes/private lookup');
 }
 const nonceIssued=admin('SELECT floor(extract(epoch FROM clock_timestamp()))::bigint;');
 const claim=nonce=>admin(`BEGIN;SET LOCAL ROLE taxiqaid_auth_lookup_owner;SELECT taxiqaid_auth_api.claim_gateway_nonce(${lit(nonce)},${nonceIssued});COMMIT;`);
 assert.equal(claim(watermark),'f');assert.equal(claim(hash('repair-unique-nonce')),'t');assert.equal(claim(hash('repair-unique-nonce')),'f');
 assert.equal(runtime(signed(keys)),'t');assert.equal(runtime(signed(keys)),'f');
 // A digest could equal the reserved value; its current-time rate row still cannot collide with epoch zero.
 const beforeWatermark=admin(`SELECT expires_at::text FROM taxiqaid_private.login_attempt_counters WHERE bucket=${lit(watermark)} AND window_start=to_timestamp(0);`);
 assert.equal(runtime(`SELECT allowed FROM taxiqaid_auth_api.begin_login_attempt('unknownfixture',${lit(watermark)},${lit(hash('legacy-reserved-account'))},${lit(hash('legacy-reserved-global'))});`),'t');
 assert.equal(admin(`SELECT expires_at::text FROM taxiqaid_private.login_attempt_counters WHERE bucket=${lit(watermark)} AND window_start=to_timestamp(0);`),beforeWatermark);
 assert.equal(admin(`SELECT count(*) FROM taxiqaid_private.login_attempt_counters WHERE bucket=${lit(watermark)};`),'2');
 // Leave the health gate stale for the existing admission/backlog/race suite; no rows are deleted here.
 admin(`UPDATE taxiqaid_private.login_attempt_counters SET expires_at=clock_timestamp()-interval '1 second' WHERE bucket=${lit(watermark)} AND window_start=to_timestamp(0);`);
 assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'f');
 admin('UPDATE cron.job SET active=true;');assert.equal(statuses().existing_cron_state,'ENABLED');admin('UPDATE cron.job SET active=false;');
 const beforeMembers=JSON.parse(catalog).members,afterMembers=JSON.parse(metadata()).members;assert.deepEqual(afterMembers,beforeMembers);
 process.stderr.write('PASS: exact live CHECK reproduction, '+rejected+' repair rollback/rejection cases, unchanged DDL data/ACLs, canonical definitions, rollback-only probe, watermark refresh, reserved-key isolation and nonce uniqueness. Cron catalog is mocked; no live repair.\n');
};
