-- READ ONLY. Expected before/after: permanent rows PASS; no temporary SET/CREATE. No private rows are returned.
-- Requires PostgreSQL 16+. Run before proposals and again after each COMPLETE approved transaction.
SELECT
 CASE WHEN current_user='postgres' AND session_user='postgres' AND NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) THEN 'PASS' ELSE 'FAIL' END AS ordinary_postgres_executor,
 CASE WHEN (WITH expected(role_name,member_name,grantor_name,admin_option,inherit_option,set_option) AS (VALUES ('taxiqaid_auth_rate_owner','postgres','supabase_admin',true,false,false),
 ('taxiqaid_auth_lookup_owner','postgres','supabase_admin',true,false,false)), actual AS (
 SELECT r.rolname::text,m.rolname::text,g.rolname::text,a.admin_option,a.inherit_option,a.set_option
 FROM pg_catalog.pg_auth_members a JOIN pg_catalog.pg_roles r ON r.oid=a.roleid JOIN pg_catalog.pg_roles m ON m.oid=a.member JOIN pg_catalog.pg_roles g ON g.oid=a.grantor
 WHERE r.rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner') OR m.rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner'))
 SELECT NOT EXISTS(SELECT * FROM actual EXCEPT SELECT * FROM expected) AND NOT EXISTS(SELECT * FROM expected EXCEPT SELECT * FROM actual)) THEN 'PASS' ELSE 'FAIL' END AS managed_memberships,
 CASE WHEN (SELECT count(*)=2 AND bool_and(NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) FROM pg_catalog.pg_roles WHERE rolname IN ('taxiqaid_auth_rate_owner','taxiqaid_auth_lookup_owner')) THEN 'PASS' ELSE 'FAIL' END AS owner_attributes,
 CASE WHEN NOT pg_catalog.pg_has_role('postgres','taxiqaid_auth_rate_owner','SET') AND NOT pg_catalog.pg_has_role('postgres','taxiqaid_auth_lookup_owner','SET') THEN 'PASS' ELSE 'FAIL' END AS temporary_set_removed,
 CASE WHEN NOT pg_catalog.has_schema_privilege('taxiqaid_auth_rate_owner','taxiqaid_auth_api','CREATE') AND NOT pg_catalog.has_schema_privilege('taxiqaid_auth_lookup_owner','taxiqaid_auth_api','CREATE') THEN 'PASS' ELSE 'FAIL' END AS temporary_create_removed,
 CASE WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.consume_login_counters(text,text,text)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
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
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE'))) THEN 'PASS' ELSE 'FAIL' END AS existing_function_security,
 CASE WHEN (EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.public_login_limits_healthy()') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE'))
 AND EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'postgres'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE'))
 AND EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)') AND p.proowner='taxiqaid_auth_rate_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_rate_owner'::regrole,'taxiqaid_auth_lookup_owner'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_lookup_owner'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE'))
 AND EXISTS(SELECT FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)') AND p.proowner='taxiqaid_auth_lookup_owner'::regrole AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.privilege_type<>'EXECUTE' OR a.grantee NOT IN ('taxiqaid_auth_lookup_owner'::regrole,'taxiqaid_auth_backend'::regrole) OR (a.grantee<>p.proowner AND a.is_grantable) OR a.grantor<>p.proowner)
 AND EXISTS(SELECT FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee='taxiqaid_auth_backend'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('taxiqaid_auth_login',p.oid,'EXECUTE'))) THEN 'PASS' WHEN pg_catalog.to_regprocedure('taxiqaid_auth_api.public_login_limits_healthy()') IS NULL AND pg_catalog.to_regprocedure('taxiqaid_auth_api.maintain_public_login_counters(integer)') IS NULL AND pg_catalog.to_regprocedure('taxiqaid_auth_api.claim_gateway_nonce(text,bigint)') IS NULL AND pg_catalog.to_regprocedure('taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint)') IS NULL THEN 'NOT_APPLIED' ELSE 'FAIL' END AS proposed_function_security,
 CASE WHEN EXISTS(SELECT FROM pg_catalog.pg_extension WHERE extname='pg_cron') THEN 'INSTALLED' ELSE 'NOT_INSTALLED' END AS cron_extension;
