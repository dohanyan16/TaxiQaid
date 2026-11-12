-- GENERATED REVIEW ONLY. No live execution authorized. Run the COMPLETE file only after owner approval.
-- Existing deployment repair: NEVER rerun SQL 01. No operational counter rows are changed by this repair.
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
DO $repair_preflight$ BEGIN
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
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='44e59d313c81eb389e1d518454d10de78000c989f5a42f2c797c3dad2a5e1f58' AND pg_catalog.pg_get_function_arguments(p.oid)='' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='sql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0))
 AND (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='25514a977e8b8724837f7fcc0638b6c7bcf213ea3ed07d0420dca886d1e82561' AND pg_catalog.pg_get_function_arguments(p.oid)='p_limit integer DEFAULT 1000' AND pg_catalog.pg_get_function_result(p.oid)='integer' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0))
 AND (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='6fc0b6e815a8278768603b375056aaf4c5ab0c0ea1552fd9ed68e863a5961d97' AND pg_catalog.pg_get_function_arguments(p.oid)='p_nonce text, p_issued bigint' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0))
 AND (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)') AND p.proowner='taxiqaid_auth_lookup_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_lookup_owner'::regrole,'taxiqaid_auth_backend'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_backend'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='9f86bd933fc93215b064953cf6bd7695aae6cbd98178fd600650be1c472445cf' AND pg_catalog.pg_get_function_arguments(p.oid)='p_identifier text, p_ip text, p_account text, p_global text, p_nonce text, p_issued bigint' AND pg_catalog.pg_get_function_result(p.oid)='TABLE(allowed boolean, uid uuid, email text, status text, mapping_revision bigint)' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=1000))) THEN RAISE EXCEPTION 'Installed function bodies/interfaces differ from reviewed 095f494; do not overwrite or reapply.'; END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.login_attempt_counters WHERE bucket='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' AND window_start=pg_catalog.to_timestamp(0)) THEN RAISE EXCEPTION 'Reserved watermark record already exists; stop for review.'; END IF;
END $repair_preflight$;
CREATE TEMP TABLE taxiqaid_watermark_ddl_before ON COMMIT DROP AS SELECT (SELECT pg_catalog.jsonb_build_object('owner',n.nspowner,'acl',(SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.grantor,a.grantee,a.privilege_type,a.is_grantable),'[]'::jsonb) FROM pg_catalog.aclexplode(coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a)) FROM pg_catalog.pg_namespace n WHERE n.nspname='taxiqaid_auth_api') AS schema_state,(SELECT coalesce(pg_catalog.jsonb_object_agg(p.oid::text,(pg_catalog.to_jsonb(p)-'prosrc')||pg_catalog.jsonb_build_object('reviewed_definition',CASE WHEN p.oid IN ('taxiqaid_auth_api.public_login_limits_healthy()'::regprocedure,'taxiqaid_auth_api.maintain_public_login_counters(integer)'::regprocedure,'taxiqaid_auth_api.claim_gateway_nonce(text,bigint)'::regprocedure,'taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)'::regprocedure) THEN NULL ELSE pg_catalog.pg_get_functiondef(p.oid) END)),'{}'::jsonb) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='taxiqaid_auth_api') AS function_state,(SELECT pg_catalog.jsonb_build_object('owner',c.relowner,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'constraints',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(k) ORDER BY k.oid) FROM pg_catalog.pg_constraint k WHERE k.conrelid=c.oid),'policies',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(v) ORDER BY v.oid) FROM pg_catalog.pg_policy v WHERE v.polrelid=c.oid)) FROM pg_catalog.pg_class c WHERE c.oid=pg_catalog.to_regclass('taxiqaid_private.login_attempt_counters')) AS table_state;
GRANT taxiqaid_auth_rate_owner TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET TRUE GRANTED BY postgres;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_auth_rate_owner;
GRANT taxiqaid_auth_lookup_owner TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET TRUE GRANTED BY postgres;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_auth_lookup_owner;
DO $role_guard$ BEGIN
 IF pg_catalog.current_setting('server_version_num')::integer<160000 THEN RAISE EXCEPTION 'PostgreSQL 16 or newer is required for grantor and membership options.'; END IF;
 IF current_user<>'postgres' OR session_user<>'postgres' OR (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'Use the ordinary postgres Dashboard session, not a superuser or another role.'; END IF;
 IF NOT coalesce((SELECT count(*)=2 AND bool_and(NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) FROM pg_catalog.pg_roles WHERE rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner')),false) THEN RAISE EXCEPTION 'Unexpected owner role attributes.'; END IF;
 IF NOT (WITH expected(role_name,member_name,grantor_name,admin_option,inherit_option,set_option) AS (VALUES ('taxiqaid_auth_rate_owner','postgres','supabase_admin',true,false,false),
 ('taxiqaid_auth_lookup_owner','postgres','supabase_admin',true,false,false),
 ('taxiqaid_auth_rate_owner','postgres','postgres',false,false,true),
 ('taxiqaid_auth_lookup_owner','postgres','postgres',false,false,true)), actual AS (
 SELECT r.rolname::text,m.rolname::text,g.rolname::text,a.admin_option,a.inherit_option,a.set_option
 FROM pg_catalog.pg_auth_members a JOIN pg_catalog.pg_roles r ON r.oid=a.roleid JOIN pg_catalog.pg_roles m ON m.oid=a.member JOIN pg_catalog.pg_roles g ON g.oid=a.grantor
 WHERE r.rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner') OR m.rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner'))
 SELECT NOT EXISTS(SELECT * FROM actual EXCEPT SELECT * FROM expected) AND NOT EXISTS(SELECT * FROM expected EXCEPT SELECT * FROM actual)) THEN RAISE EXCEPTION 'Unexpected owner membership rows, grantors or options.'; END IF;
 IF pg_catalog.pg_has_role('postgres','taxiqaid_auth_rate_owner','SET') IS DISTINCT FROM true THEN RAISE EXCEPTION 'Unexpected effective SET ROLE state.'; END IF;
 IF pg_catalog.pg_has_role('postgres','taxiqaid_auth_lookup_owner','SET') IS DISTINCT FROM true THEN RAISE EXCEPTION 'Unexpected effective SET ROLE state.'; END IF;
 IF pg_catalog.has_schema_privilege('taxiqaid_auth_rate_owner','taxiqaid_auth_api','CREATE') IS DISTINCT FROM true THEN RAISE EXCEPTION 'Unexpected owner schema CREATE state.'; END IF;
 IF pg_catalog.has_schema_privilege('taxiqaid_auth_lookup_owner','taxiqaid_auth_api','CREATE') IS DISTINCT FROM true THEN RAISE EXCEPTION 'Unexpected owner schema CREATE state.'; END IF;
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
-- BEGIN REVIEW REPAIR BODIES
SET LOCAL ROLE taxiqaid_auth_rate_owner;
CREATE OR REPLACE FUNCTION taxiqaid_auth_api.public_login_limits_healthy()
RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
 SELECT EXISTS(SELECT FROM taxiqaid_private.login_attempt_counters
 WHERE bucket='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' AND window_start=to_timestamp(0) AND expires_at>clock_timestamp());
$$;
SET LOCAL ROLE postgres;

SET LOCAL ROLE taxiqaid_auth_rate_owner;
CREATE OR REPLACE FUNCTION taxiqaid_auth_api.maintain_public_login_counters(p_limit integer DEFAULT 1000)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE removed integer;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>1000 THEN RAISE EXCEPTION 'Invalid cleanup limit.'; END IF;
 removed:=taxiqaid_auth_api.prune_login_counters(p_limit);
 IF EXISTS(SELECT FROM taxiqaid_private.login_attempt_counters WHERE expires_at<now()-interval '5 minutes') THEN
  UPDATE taxiqaid_private.login_attempt_counters SET expires_at=clock_timestamp() WHERE bucket='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' AND window_start=to_timestamp(0);
  RETURN removed;
 END IF;
 -- One reserved maintenance watermark in the existing table; no private identity/IP is stored here.
 INSERT INTO taxiqaid_private.login_attempt_counters(bucket,window_start,expires_at,attempts)
 VALUES('dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279',to_timestamp(0),clock_timestamp()+interval '5 minutes',1)
 ON CONFLICT(bucket,window_start) DO UPDATE SET expires_at=EXCLUDED.expires_at,attempts=1;
 RETURN removed;
END $$;
SET LOCAL ROLE postgres;

SET LOCAL ROLE taxiqaid_auth_rate_owner;
CREATE OR REPLACE FUNCTION taxiqaid_auth_api.claim_gateway_nonce(p_nonce text,p_issued bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE claimed integer;
BEGIN
 IF NOT taxiqaid_auth_api.public_login_limits_healthy() OR p_nonce IS NULL OR p_nonce !~ '^[0-9a-f]{64}$' OR p_nonce='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' OR p_issued IS NULL OR p_issued<floor(extract(epoch FROM clock_timestamp()))-60 OR p_issued>floor(extract(epoch FROM clock_timestamp()))+5 THEN RETURN false; END IF;
 INSERT INTO taxiqaid_private.login_attempt_counters(bucket,window_start,expires_at,attempts)
 VALUES(p_nonce,to_timestamp(p_issued),to_timestamp(p_issued)+interval '2 minutes',1)
 ON CONFLICT(bucket,window_start) DO NOTHING RETURNING 1 INTO claimed;
 RETURN coalesce(claimed=1,false);
END $$;
SET LOCAL ROLE postgres;

SET LOCAL ROLE taxiqaid_auth_lookup_owner;
CREATE OR REPLACE FUNCTION taxiqaid_auth_api.begin_signed_login_attempt(p_identifier text,p_ip text,p_account text,p_global text,p_nonce text,p_issued bigint)
RETURNS TABLE(allowed boolean,uid uuid,email text,status text,mapping_revision bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE attempt record;
BEGIN
 -- Reserved-key admission guard: neither a rate key nor a nonce may use the maintenance identifier.
 IF p_ip='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' OR p_account='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' OR p_global='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' OR p_nonce='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279' THEN
  RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text,NULL::bigint; RETURN;
 END IF;
 IF NOT taxiqaid_auth_api.public_login_limits_healthy() THEN RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text,NULL::bigint; RETURN; END IF;
 -- Reuses existing atomic global/IP/identifier limits BEFORE its internal private lookup.
 SELECT * INTO STRICT attempt FROM taxiqaid_auth_api.begin_login_attempt(p_identifier,p_ip,p_account,p_global);
 IF NOT attempt.allowed THEN RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text,NULL::bigint; RETURN; END IF;
 IF NOT coalesce(taxiqaid_auth_api.claim_gateway_nonce(p_nonce,p_issued),false) THEN
  RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text,NULL::bigint; RETURN;
 END IF;
 -- A nonce is claimed only after global admission, bounding nonce growth. Replay releases no mapping/session.
 RETURN QUERY SELECT attempt.allowed,attempt.uid,attempt.email,attempt.status,attempt.mapping_revision;
END $$;
SET LOCAL ROLE postgres;
-- END REVIEW REPAIR BODIES
REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM taxiqaid_auth_rate_owner GRANTED BY postgres RESTRICT;
REVOKE taxiqaid_auth_rate_owner FROM postgres GRANTED BY postgres RESTRICT;
REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM taxiqaid_auth_lookup_owner GRANTED BY postgres RESTRICT;
REVOKE taxiqaid_auth_lookup_owner FROM postgres GRANTED BY postgres RESTRICT;
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
DO $repair_postflight$ BEGIN
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
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=1000))) THEN RAISE EXCEPTION 'Repaired definitions/interfaces do not match the reviewed sources.'; END IF;
 IF (SELECT pg_catalog.jsonb_build_object('owner',n.nspowner,'acl',(SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.grantor,a.grantee,a.privilege_type,a.is_grantable),'[]'::jsonb) FROM pg_catalog.aclexplode(coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a)) FROM pg_catalog.pg_namespace n WHERE n.nspname='taxiqaid_auth_api') IS DISTINCT FROM (SELECT schema_state FROM pg_temp.taxiqaid_watermark_ddl_before)
 OR (SELECT coalesce(pg_catalog.jsonb_object_agg(p.oid::text,(pg_catalog.to_jsonb(p)-'prosrc')||pg_catalog.jsonb_build_object('reviewed_definition',CASE WHEN p.oid IN ('taxiqaid_auth_api.public_login_limits_healthy()'::regprocedure,'taxiqaid_auth_api.maintain_public_login_counters(integer)'::regprocedure,'taxiqaid_auth_api.claim_gateway_nonce(text,bigint)'::regprocedure,'taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)'::regprocedure) THEN NULL ELSE pg_catalog.pg_get_functiondef(p.oid) END)),'{}'::jsonb) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='taxiqaid_auth_api') IS DISTINCT FROM (SELECT function_state FROM pg_temp.taxiqaid_watermark_ddl_before)
 OR (SELECT pg_catalog.jsonb_build_object('owner',c.relowner,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'constraints',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(k) ORDER BY k.oid) FROM pg_catalog.pg_constraint k WHERE k.conrelid=c.oid),'policies',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(v) ORDER BY v.oid) FROM pg_catalog.pg_policy v WHERE v.polrelid=c.oid)) FROM pg_catalog.pg_class c WHERE c.oid=pg_catalog.to_regclass('taxiqaid_private.login_attempt_counters')) IS DISTINCT FROM (SELECT table_state FROM pg_temp.taxiqaid_watermark_ddl_before)
 THEN RAISE EXCEPTION 'Function metadata/ACLs, schema or table security/constraints changed.'; END IF;
END $repair_postflight$;
COMMIT;
