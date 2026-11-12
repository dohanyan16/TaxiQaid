-- READ ONLY. Returns only review statuses; no identities, counter rows or function bodies.
-- Run with 03_verify_role_state.sql before/after the separately approved repair. Cron must remain disabled.
SELECT
 CASE WHEN coalesce((SELECT count(*)=2 AND bool_and(c.convalidated AND c.contype='c' AND
 CASE c.conname WHEN 'login_attempt_counters_attempts_check' THEN pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid),'[[:space:]]','','g')='CHECK((attempts>0))'
 WHEN 'login_attempt_counters_bucket_check' THEN pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid),'[[:space:]]','','g')='CHECK((bucket~''^[0-9a-f]{64}$''::text))' ELSE false END)
 FROM pg_catalog.pg_constraint c WHERE c.conrelid=pg_catalog.to_regclass('taxiqaid_private.login_attempt_counters') AND c.conname IN ('login_attempt_counters_attempts_check','login_attempt_counters_bucket_check')),false) THEN 'PASS' ELSE 'FAIL' END AS exact_counter_constraints,
 CASE WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.consume_login_counters(text,text,text)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.consume_login_counters(text,text,text)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='143f160059c9c4e80b30824d8855de89de30510e1949a9950e0f49a6349e7eae' AND pg_catalog.pg_get_function_arguments(p.oid)='p_ip text, p_account text, p_global text' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0)) THEN 'PASS' ELSE 'FAIL' END AS unchanged_rate_policy,
 CASE WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.public_login_limits_healthy()') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.public_login_limits_healthy()')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='631a1177982123108052a091077f876772a9c9f8e11a54e7b0466fb7e6b5b0eb' AND pg_catalog.pg_get_function_arguments(p.oid)='' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='sql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0)) THEN 'PASS' WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.public_login_limits_healthy()') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.public_login_limits_healthy()')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='44e59d313c81eb389e1d518454d10de78000c989f5a42f2c797c3dad2a5e1f58' AND pg_catalog.pg_get_function_arguments(p.oid)='' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='sql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0)) THEN 'NEEDS_REPAIR' ELSE 'FAIL' END AS public_login_limits_healthy,
 CASE WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='98327443f445573163ecdbbd0b8d336a68e8dc8d78e858b8013b61d1c975790e' AND pg_catalog.pg_get_function_arguments(p.oid)='p_limit integer DEFAULT 1000' AND pg_catalog.pg_get_function_result(p.oid)='integer' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0)) THEN 'PASS' WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='25514a977e8b8724837f7fcc0638b6c7bcf213ea3ed07d0420dca886d1e82561' AND pg_catalog.pg_get_function_arguments(p.oid)='p_limit integer DEFAULT 1000' AND pg_catalog.pg_get_function_result(p.oid)='integer' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0)) THEN 'NEEDS_REPAIR' ELSE 'FAIL' END AS maintain_public_login_counters,
 CASE WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='d1a4a79f3cb93bce046dd5b90d0a0b7071ff14591137d485331a839ff0dd357f' AND pg_catalog.pg_get_function_arguments(p.oid)='p_nonce text, p_issued bigint' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0)) THEN 'PASS' WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='6fc0b6e815a8278768603b375056aaf4c5ab0c0ea1552fd9ed68e863a5961d97' AND pg_catalog.pg_get_function_arguments(p.oid)='p_nonce text, p_issued bigint' AND pg_catalog.pg_get_function_result(p.oid)='boolean' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=0)) THEN 'NEEDS_REPAIR' ELSE 'FAIL' END AS claim_gateway_nonce,
 CASE WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)') AND p.proowner='taxiqaid_auth_lookup_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_lookup_owner'::regrole,'taxiqaid_auth_backend'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_backend'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='b5526e7ec0f131e9fc4ba50bac062a4e5dfb92a54d28f306f69da488c2963bed' AND pg_catalog.pg_get_function_arguments(p.oid)='p_identifier text, p_ip text, p_account text, p_global text, p_nonce text, p_issued bigint' AND pg_catalog.pg_get_function_result(p.oid)='TABLE(allowed boolean, uid uuid, email text, status text, mapping_revision bigint)' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=1000)) THEN 'PASS' WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)') AND p.proowner='taxiqaid_auth_lookup_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_lookup_owner'::regrole,'taxiqaid_auth_backend'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_backend'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')) AND EXISTS(SELECT FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='9f86bd933fc93215b064953cf6bd7695aae6cbd98178fd600650be1c472445cf' AND pg_catalog.pg_get_function_arguments(p.oid)='p_identifier text, p_ip text, p_account text, p_global text, p_nonce text, p_issued bigint' AND pg_catalog.pg_get_function_result(p.oid)='TABLE(allowed boolean, uid uuid, email text, status text, mapping_revision bigint)' AND l.lanname='plpgsql'
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=1000)) THEN 'NEEDS_REPAIR' ELSE 'FAIL' END AS begin_signed_login_attempt,
 CASE WHEN coalesce((SELECT count(*)=1 AND bool_and(username='postgres' AND database=current_database() AND schedule='* * * * *' AND pg_catalog.btrim(command)='SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);') FROM cron.job WHERE jobname='taxiqaid-public-login-counter-maintenance'),false) THEN (SELECT CASE WHEN active THEN 'ENABLED' ELSE 'DISABLED' END FROM cron.job WHERE jobname='taxiqaid-public-login-counter-maintenance') ELSE 'FAIL' END AS existing_cron_state;
