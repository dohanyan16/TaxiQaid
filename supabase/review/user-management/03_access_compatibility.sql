-- PROPOSAL ONLY. Exact known access body, plus Fleet; preserve signatures, owners, ACL and existing memberships.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'Ordinary Dashboard postgres required';END IF;
 IF NOT EXISTS(SELECT FROM pg_proc WHERE oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure AND proowner='taxiqaid_auth_access_owner'::regrole AND prosecdef AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(proconfig)=2 AND encode(sha256(convert_to(prosrc,'UTF8')),'hex') IN ('54f29a66eaae889ce27abb617b4912c7dd2e426b0dc95586e87106f4c3932776','fb52a647162288d388b0394920895ede27edbe793361ca51eda22c6905ddee9e')) THEN RAISE EXCEPTION 'ACCESS_SOURCE_REVIEW_REQUIRED: do not replace an unverified live body';END IF;
 IF has_schema_privilege('taxiqaid_auth_access_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'Unexpected existing CREATE privilege';END IF;
END $$;
CREATE TEMP TABLE access_memberships ON COMMIT DROP AS SELECT * FROM pg_auth_members WHERE roleid='taxiqaid_auth_access_owner'::regrole;
CREATE TEMP TABLE access_security ON COMMIT DROP AS SELECT proowner,proacl,proconfig,prosecdef FROM pg_proc WHERE oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure;
GRANT taxiqaid_auth_access_owner TO postgres WITH INHERIT FALSE,SET TRUE;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_auth_access_owner;
SET LOCAL ROLE taxiqaid_auth_access_owner;
CREATE OR REPLACE FUNCTION taxiqaid_auth_api.get_management_access(p_uid uuid,p_mapping_revision bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog,pg_temp SET row_security = on AS $$
DECLARE profile record; memberships jsonb; defaults jsonb; effects jsonb;
BEGIN
 IF p_mapping_revision IS NULL OR p_mapping_revision<1 OR NOT EXISTS(SELECT FROM taxiqaid_private.auth_login_identities AS m WHERE m.user_id=p_uid AND m.is_enabled=true AND m.revision=p_mapping_revision) THEN RAISE EXCEPTION 'Access unavailable.' USING ERRCODE='28000'; END IF;
 SELECT a.user_id,a.username,a.full_name,a.account_type,a.role_key,a.status INTO STRICT profile
 FROM taxiqaid_private.user_accounts AS a WHERE a.user_id=p_uid AND a.status='active' AND a.account_type='management';
 IF profile.full_name IS NULL OR pg_catalog.btrim(profile.full_name)='' THEN RAISE EXCEPTION 'Access unavailable.' USING ERRCODE='28000'; END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(DISTINCT d.department_key),'[]'::jsonb) INTO memberships
 FROM taxiqaid_private.user_departments AS m JOIN taxiqaid_private.departments AS d ON d.department_key=m.department_key
 WHERE m.user_id=p_uid AND d.is_active=true;
 IF EXISTS (SELECT FROM pg_catalog.jsonb_array_elements_text(memberships) AS d(code) WHERE d.code NOT IN ('customer_service','finance','financial','fleet','hr','it','maintenance','operation','planning','qhse')) THEN RAISE EXCEPTION 'Access unavailable.' USING ERRCODE='28000'; END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(DISTINCT r.permission_key),'[]'::jsonb) INTO defaults
 FROM taxiqaid_private.role_permissions AS r JOIN taxiqaid_private.permissions AS p ON p.permission_key=r.permission_key
 WHERE r.role_key=profile.role_key AND r.is_allowed=true AND p.is_active=true;
 SELECT coalesce(pg_catalog.jsonb_object_agg(e.permission_key,CASE WHEN e.allowed THEN 'allow' ELSE 'deny' END),'{}'::jsonb) INTO effects
 FROM (SELECT o.permission_key,pg_catalog.bool_and(o.is_allowed) AS allowed
  FROM taxiqaid_private.user_permission_overrides AS o JOIN taxiqaid_private.permissions AS p ON p.permission_key=o.permission_key
  WHERE o.user_id=p_uid AND p.is_active=true GROUP BY o.permission_key) AS e;
 RETURN pg_catalog.jsonb_build_object('version',1,'uid',p_uid,
  'account',pg_catalog.jsonb_build_object('uid',p_uid,'username',profile.username,'fullName',profile.full_name,'type',profile.account_type,'role',profile.role_key,'status',profile.status),
  'departments',memberships,'permissions',pg_catalog.jsonb_build_object('roleDefaults',defaults,'overrides',effects),
  'scope',pg_catalog.jsonb_build_object('departments','[]'::jsonb,'driverRecordRefs','[]'::jsonb,'documentIds','[]'::jsonb),
  'validUntil',pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.statement_timestamp())*1000)+60000);
END $$;
SET LOCAL ROLE postgres;
REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM taxiqaid_auth_access_owner;
DO $$ DECLARE original record; BEGIN
 SELECT * INTO original FROM access_memberships WHERE member='postgres'::regrole AND grantor='postgres'::regrole;
 IF FOUND THEN EXECUTE format('GRANT taxiqaid_auth_access_owner TO postgres WITH ADMIN %s,INHERIT %s,SET %s GRANTED BY postgres',original.admin_option,original.inherit_option,original.set_option);ELSE REVOKE taxiqaid_auth_access_owner FROM postgres GRANTED BY postgres RESTRICT;END IF;
 IF EXISTS((SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_auth_access_owner'::regrole EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM access_memberships) UNION ALL (SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM access_memberships EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_auth_access_owner'::regrole)) THEN RAISE EXCEPTION 'Membership cleanup failed';END IF;
 IF EXISTS((SELECT proowner,proacl,proconfig,prosecdef FROM pg_proc WHERE oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure EXCEPT SELECT * FROM access_security)) OR has_schema_privilege('taxiqaid_auth_access_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'Access hardening/ACL changed';END IF;
END $$;
COMMIT;
