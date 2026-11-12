-- REVIEW ONLY. Temporary functional probe; NO persistent counter changes. Explicit approval required.
-- Run AFTER approved 04/05 and while Cron and public login remain disabled. ALWAYS finish with ROLLBACK.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='15s';
DO $role_guard$ BEGIN
 IF pg_catalog.current_setting('server_version_num')::integer<160000 THEN RAISE EXCEPTION 'PostgreSQL 16 or newer is required for grantor and membership options.'; END IF;
 IF current_user<>'postgres' OR session_user<>'postgres' OR (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'Use the ordinary postgres Dashboard session, not a superuser or another role.'; END IF;
 IF NOT coalesce((SELECT count(*)=2 AND bool_and(NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) FROM pg_catalog.pg_roles WHERE rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner')),false) THEN RAISE EXCEPTION 'Unexpected owner role attributes.'; END IF;
 IF NOT (WITH expected(role_name,member_name,grantor_name,admin_option,inherit_option,set_option) AS (VALUES ('taxiqaid_auth_rate_owner','postgres','supabase_admin',true,false,false),
 ('taxiqaid_auth_lookup_owner','postgres','supabase_admin',true,false,false)), actual AS (
 SELECT r.rolname::text,m.rolname::text,g.rolname::text,a.admin_option,a.inherit_option,a.set_option
 FROM pg_catalog.pg_auth_members a JOIN pg_catalog.pg_roles r ON r.oid=a.roleid JOIN pg_catalog.pg_roles m ON m.oid=a.member JOIN pg_catalog.pg_roles g ON g.oid=a.grantor
 WHERE r.rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner') OR m.rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner'))
 SELECT NOT EXISTS(SELECT * FROM actual EXCEPT SELECT * FROM expected) AND NOT EXISTS(SELECT * FROM expected EXCEPT SELECT * FROM actual)) THEN RAISE EXCEPTION 'Unexpected owner membership rows, grantors or options.'; END IF;
 IF pg_catalog.pg_has_role('postgres','taxiqaid_auth_rate_owner','SET') IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected effective SET ROLE state.'; END IF;
 IF pg_catalog.pg_has_role('postgres','taxiqaid_auth_lookup_owner','SET') IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected effective SET ROLE state.'; END IF;
 IF pg_catalog.has_schema_privilege('taxiqaid_auth_rate_owner','taxiqaid_auth_api','CREATE') IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected owner schema CREATE state.'; END IF;
 IF pg_catalog.has_schema_privilege('taxiqaid_auth_lookup_owner','taxiqaid_auth_api','CREATE') IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected owner schema CREATE state.'; END IF;
 IF NOT (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.consume_login_counters(text,text,text)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE'))
 AND EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_login_attempt(text,text,text,text)') AND p.proowner='taxiqaid_auth_lookup_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_lookup_owner'::regrole,'taxiqaid_auth_backend'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_backend'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE'))) THEN RAISE EXCEPTION 'Unexpected existing function ownership, hardening or EXECUTE grants.'; END IF;
END $role_guard$;
DO $probe$ DECLARE removed integer; first_expiry timestamptz; refreshed timestamptz; BEGIN
 IF NOT coalesce((SELECT count(*)=2 AND bool_and(c.convalidated AND c.contype='c' AND
 CASE c.conname WHEN 'login_attempt_counters_attempts_check' THEN pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid),'[[:space:]]','','g')='CHECK((attempts>0))'
 WHEN 'login_attempt_counters_bucket_check' THEN pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid),'[[:space:]]','','g')='CHECK((bucket~''^[0-9a-f]{64}$''::text))' ELSE false END)
 FROM pg_catalog.pg_constraint c WHERE c.conrelid=pg_catalog.to_regclass('taxiqaid_private.login_attempt_counters') AND c.conname IN ('login_attempt_counters_attempts_check','login_attempt_counters_bucket_check')),false) THEN RAISE EXCEPTION 'Unexpected or unvalidated existing counter CHECK constraints.'; END IF;
 IF NOT (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.consume_login_counters(text,text,text)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.consume_login_counters(text,text,text)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='143f160059c9c4e80b30824d8855de89de30510e1949a9950e0f49a6349e7eae' AND pg_catalog.pg_get_function_arguments(p.oid)='p_ip text, p_account text, p_global text' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0)) THEN RAISE EXCEPTION 'Installed SQL 00 does not match the reviewed 20/10/10 policy.'; END IF;
 IF pg_catalog.to_regclass('cron.job') IS NULL THEN RAISE EXCEPTION 'Expected existing disabled Cron job is missing.'; END IF;
 IF NOT coalesce((SELECT count(*)=1 AND bool_and(NOT active AND username='postgres' AND database=current_database() AND schedule='* * * * *' AND pg_catalog.btrim(command)='SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);') FROM cron.job WHERE jobname='taxiqaid-public-login-counter-maintenance'),false) THEN RAISE EXCEPTION 'Expected exactly one disabled, reviewed maintenance job.'; END IF;
 IF NOT ((EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.public_login_limits_healthy()') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.public_login_limits_healthy()')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='631a1177982123108052a091077f876772a9c9f8e11a54e7b0466fb7e6b5b0eb' AND pg_catalog.pg_get_function_arguments(p.oid)='' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='sql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0))
 AND (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='98327443f445573163ecdbbd0b8d336a68e8dc8d78e858b8013b61d1c975790e' AND pg_catalog.pg_get_function_arguments(p.oid)='p_limit integer DEFAULT 1000' AND pg_catalog.pg_get_function_result(p.oid)='integer' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0))
 AND (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='d1a4a79f3cb93bce046dd5b90d0a0b7071ff14591137d485331a839ff0dd357f' AND pg_catalog.pg_get_function_arguments(p.oid)='p_nonce text, p_issued bigint' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0))
 AND (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)') AND p.proowner='taxiqaid_auth_lookup_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_lookup_owner'::regrole,'taxiqaid_auth_backend'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_backend'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='b5526e7ec0f131e9fc4ba50bac062a4e5dfb92a54d28f306f69da488c2963bed' AND pg_catalog.pg_get_function_arguments(p.oid)='p_identifier text, p_ip text, p_account text, p_global text, p_nonce text, p_issued bigint' AND pg_catalog.pg_get_function_result(p.oid)='TABLE(allowed boolean, uid uuid, email text, status text, mapping_revision bigint)' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=1000))) THEN RAISE EXCEPTION 'Reviewed repaired definitions are required.'; END IF;
 removed:=taxiqaid_auth_api.maintain_public_login_counters(1000);
 IF removed<0 OR removed>1000 OR NOT taxiqaid_auth_api.public_login_limits_healthy() THEN RAISE EXCEPTION 'Maintenance blocked: expired backlog or unhealthy state. Keep Cron disabled for review.'; END IF;
 SELECT expires_at INTO STRICT first_expiry FROM taxiqaid_private.login_attempt_counters WHERE bucket='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' AND window_start=pg_catalog.to_timestamp(0) AND attempts=1 AND length(bucket)=64;
 IF first_expiry<clock_timestamp()+interval '4 minutes 55 seconds' OR first_expiry>clock_timestamp()+interval '5 minutes' THEN RAISE EXCEPTION 'Unexpected watermark expiration.'; END IF;
 removed:=taxiqaid_auth_api.maintain_public_login_counters(1000);
 SELECT expires_at INTO STRICT refreshed FROM taxiqaid_private.login_attempt_counters WHERE bucket='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' AND window_start=pg_catalog.to_timestamp(0) AND attempts=1;
 IF refreshed<first_expiry OR NOT taxiqaid_auth_api.public_login_limits_healthy() THEN RAISE EXCEPTION 'Watermark refresh failed.'; END IF;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Maintenance probe failed; keep Cron disabled. Diagnostic SQLSTATE: %',SQLSTATE;
END $probe$;
SELECT 'PASS' AS maintenance_execution,'PASS' AS watermark_shape,'PASS' AS watermark_refresh,'PASS' AS healthy_within_probe;
ROLLBACK;
-- Healthy state created inside this probe is rolled back too. This does not activate the scheduled job.
