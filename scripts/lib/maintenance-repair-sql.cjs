// Review artifacts only. All hashes are of public SQL function bodies, never private records.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const watermark='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279';
if(watermark.length!==64||!/^[0-9a-f]{64}$/.test(watermark))throw new Error('Invalid maintenance watermark identifier.');
function definition(source,signature){
 const name=signature.split('(')[0],pattern=new RegExp('^CREATE (?:OR REPLACE )?FUNCTION '+name.replaceAll('.','\\.')+'\\(','m'),start=source.search(pattern);
 if(start<0)throw new Error('Missing function definition: '+name);
 const stop=source.indexOf('$$;',start),create=source.slice(start,stop+3),opening=create.indexOf('AS $$');
 if(stop<0||opening<0)throw new Error('Invalid quoted function definition: '+name);
 const src=create.slice(opening+5,-3),args=create.slice(create.indexOf('(')+1,create.indexOf(')')).split(',').join(', ');
 const result=create.match(/RETURNS (.+?)\s+(?:LANGUAGE|\nLANGUAGE)/s)?.[1].replaceAll(',',', ');
 const language=create.match(/LANGUAGE (sql|plpgsql)/)?.[1];
 if(!result||!language)throw new Error('Unreviewed function interface: '+name);
 return {create,src,args,result,language,hash:crypto.createHash('sha256').update(src).digest('hex')};
}
function generate({root,output,guard,secure,added,base,schemaState,quote}){
 const read=file=>fs.readFileSync(path.join(root,file),'utf8');
 const canonical=read('supabase/review/public-login/01_signed_attempt_and_cleanup.sql'),legacy=read('tests/fixtures/cron-watermark-095f494.sql');
 const definitions=added.map(spec=>({...spec,fixed:definition(canonical,spec.signature),old:definition(legacy,spec.signature)}));
 const rate={...base[0],fixed:definition(read('supabase/review/public-login/00_conservative_limits.sql'),base[0].signature)};
 for(const spec of definitions){
  if(!spec.fixed.src.includes(watermark)||spec.fixed.src.includes(watermark+'1'))throw new Error('Watermark definition drift.');
 }
 const digest=`pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')`;
 function matches(spec,version='fixed'){
  const d=spec[version];return `(${secure(spec)} AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure(${quote(spec.signature)})
 AND ${digest}=${quote(d.hash)} AND pg_catalog.pg_get_function_arguments(p.oid)=${quote(d.args)} AND pg_catalog.pg_get_function_result(p.oid)=${quote(d.result)} AND l.lanname=${quote(d.language)}
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=${d.result.startsWith('TABLE(')?1000:0}))`;
 }
 const constraints=`(SELECT count(*)=2 AND bool_and(c.convalidated AND c.contype='c' AND
 CASE c.conname WHEN 'login_attempt_counters_attempts_check' THEN pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid),'[[:space:]]','','g')='CHECK((attempts>0))'
 WHEN 'login_attempt_counters_bucket_check' THEN pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid),'[[:space:]]','','g')=${quote("CHECK((bucket~'^[0-9a-f]{64}$'::text))")} ELSE false END)
 FROM pg_catalog.pg_constraint c WHERE c.conrelid=pg_catalog.to_regclass('taxiqaid_private.login_attempt_counters') AND c.conname IN ('login_attempt_counters_attempts_check','login_attempt_counters_bucket_check'))`;
 const cron=`(SELECT count(*)=1 AND bool_and(NOT active AND username='postgres' AND database=current_database() AND schedule='* * * * *' AND pg_catalog.btrim(command)='SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);') FROM cron.job WHERE jobname='taxiqaid-public-login-counter-maintenance')`;
 const cronState=cron.replace('NOT active AND ','');
 const cronGuard=`IF pg_catalog.to_regclass('cron.job') IS NULL THEN RAISE EXCEPTION 'Expected existing disabled Cron job is missing.'; END IF;
 IF NOT coalesce(${cron},false) THEN RAISE EXCEPTION 'Expected exactly one disabled, reviewed maintenance job.'; END IF;`;
 const expected=version=>definitions.map(spec=>matches(spec,version)).join('\n AND ');
 const contractGuard=`IF NOT coalesce(${constraints},false) THEN RAISE EXCEPTION 'Unexpected or unvalidated existing counter CHECK constraints.'; END IF;
 IF NOT ${matches(rate)} THEN RAISE EXCEPTION 'Installed SQL 00 does not match the reviewed 20/10/10 policy.'; END IF;`;
 const allMetadata=`(SELECT coalesce(pg_catalog.jsonb_object_agg(p.oid::text,(pg_catalog.to_jsonb(p)-'prosrc')||pg_catalog.jsonb_build_object('reviewed_definition',CASE WHEN p.oid IN (${definitions.map(s=>quote(s.signature)+'::regprocedure').join(',')}) THEN NULL ELSE pg_catalog.pg_get_functiondef(p.oid) END)),'{}'::jsonb) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='taxiqaid_auth_api')`;
 const tableMetadata=`(SELECT pg_catalog.jsonb_build_object('owner',c.relowner,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'constraints',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(k) ORDER BY k.oid) FROM pg_catalog.pg_constraint k WHERE k.conrelid=c.oid),'policies',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(v) ORDER BY v.oid) FROM pg_catalog.pg_policy v WHERE v.polrelid=c.oid)) FROM pg_catalog.pg_class c WHERE c.oid=pg_catalog.to_regclass('taxiqaid_private.login_attempt_counters'))`;
 const header='-- GENERATED REVIEW ONLY. No live execution authorized. Run the COMPLETE file only after owner approval.\n-- Existing deployment repair: NEVER rerun SQL 01. No operational counter rows are changed by this repair.\n';
 output('supabase/review/public-login/04_repair_maintenance_watermark.sql',header+`BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='15s';
${guard()}
DO $repair_preflight$ BEGIN
 ${contractGuard}
 ${cronGuard}
 IF NOT (${expected('old')}) THEN RAISE EXCEPTION 'Installed function bodies/interfaces differ from reviewed 095f494; do not overwrite or reapply.'; END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.login_attempt_counters WHERE bucket=${quote(watermark)} AND window_start=pg_catalog.to_timestamp(0)) THEN RAISE EXCEPTION 'Reserved watermark record already exists; stop for review.'; END IF;
END $repair_preflight$;
CREATE TEMP TABLE taxiqaid_watermark_ddl_before ON COMMIT DROP AS SELECT ${schemaState()} AS schema_state,${allMetadata} AS function_state,${tableMetadata} AS table_state;
${['taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner'].map(role=>`GRANT ${role} TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET TRUE GRANTED BY postgres;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO ${role};`).join('\n')}
${guard(['taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner'])}
-- BEGIN REVIEW REPAIR BODIES
${definitions.map(spec=>`SET LOCAL ROLE ${spec.owner};\n${spec.fixed.create.replace(/^CREATE FUNCTION /,'CREATE OR REPLACE FUNCTION ')}\nSET LOCAL ROLE postgres;`).join('\n\n')}
-- END REVIEW REPAIR BODIES
${['taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner'].map(role=>`REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM ${role} GRANTED BY postgres RESTRICT;
REVOKE ${role} FROM postgres GRANTED BY postgres RESTRICT;`).join('\n')}
${guard()}
DO $repair_postflight$ BEGIN
 ${contractGuard}
 ${cronGuard}
 IF NOT (${expected('fixed')}) THEN RAISE EXCEPTION 'Repaired definitions/interfaces do not match the reviewed sources.'; END IF;
 IF ${schemaState()} IS DISTINCT FROM (SELECT schema_state FROM pg_temp.taxiqaid_watermark_ddl_before)
 OR ${allMetadata} IS DISTINCT FROM (SELECT function_state FROM pg_temp.taxiqaid_watermark_ddl_before)
 OR ${tableMetadata} IS DISTINCT FROM (SELECT table_state FROM pg_temp.taxiqaid_watermark_ddl_before)
 THEN RAISE EXCEPTION 'Function metadata/ACLs, schema or table security/constraints changed.'; END IF;
END $repair_postflight$;
COMMIT;
`);
 output('supabase/review/public-login/05_verify_maintenance_watermark.sql',`-- READ ONLY. Returns only review statuses; no identities, counter rows or function bodies.
-- Run with 03_verify_role_state.sql before/after the separately approved repair. Cron must remain disabled.
SELECT
 CASE WHEN coalesce(${constraints},false) THEN 'PASS' ELSE 'FAIL' END AS exact_counter_constraints,
 CASE WHEN ${matches(rate)} THEN 'PASS' ELSE 'FAIL' END AS unchanged_rate_policy,
${definitions.map(spec=>` CASE WHEN ${matches(spec)} THEN 'PASS' WHEN ${matches(spec,'old')} THEN 'NEEDS_REPAIR' ELSE 'FAIL' END AS ${spec.signature.split('(')[0].split('.')[1]}`).join(',\n')},
 CASE WHEN coalesce(${cronState},false) THEN (SELECT CASE WHEN active THEN 'ENABLED' ELSE 'DISABLED' END FROM cron.job WHERE jobname='taxiqaid-public-login-counter-maintenance') ELSE 'FAIL' END AS existing_cron_state;
`);
 output('supabase/review/public-login/06_probe_maintenance_rollback.sql',`-- REVIEW ONLY. Temporary functional probe; NO persistent counter changes. Explicit approval required.
-- Run AFTER approved 04/05 and while Cron and public login remain disabled. ALWAYS finish with ROLLBACK.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='15s';
${guard()}
DO $probe$ DECLARE removed integer; first_expiry timestamptz; refreshed timestamptz; BEGIN
 ${contractGuard}
 ${cronGuard}
 IF NOT (${expected('fixed')}) THEN RAISE EXCEPTION 'Reviewed repaired definitions are required.'; END IF;
 removed:=taxiqaid_auth_api.maintain_public_login_counters(1000);
 IF removed<0 OR removed>1000 OR NOT taxiqaid_auth_api.public_login_limits_healthy() THEN RAISE EXCEPTION 'Maintenance blocked: expired backlog or unhealthy state. Keep Cron disabled for review.'; END IF;
 SELECT expires_at INTO STRICT first_expiry FROM taxiqaid_private.login_attempt_counters WHERE bucket=${quote(watermark)} AND window_start=pg_catalog.to_timestamp(0) AND attempts=1 AND length(bucket)=64;
 IF first_expiry<clock_timestamp()+interval '4 minutes 55 seconds' OR first_expiry>clock_timestamp()+interval '5 minutes' THEN RAISE EXCEPTION 'Unexpected watermark expiration.'; END IF;
 removed:=taxiqaid_auth_api.maintain_public_login_counters(1000);
 SELECT expires_at INTO STRICT refreshed FROM taxiqaid_private.login_attempt_counters WHERE bucket=${quote(watermark)} AND window_start=pg_catalog.to_timestamp(0) AND attempts=1;
 IF refreshed<first_expiry OR NOT taxiqaid_auth_api.public_login_limits_healthy() THEN RAISE EXCEPTION 'Watermark refresh failed.'; END IF;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Maintenance probe failed; keep Cron disabled. Diagnostic SQLSTATE: %',SQLSTATE;
END $probe$;
SELECT 'PASS' AS maintenance_execution,'PASS' AS watermark_shape,'PASS' AS watermark_refresh,'PASS' AS healthy_within_probe;
ROLLBACK;
-- Healthy state created inside this probe is rolled back too. This does not activate the scheduled job.
`);
}
module.exports={watermark,definition,generate};
