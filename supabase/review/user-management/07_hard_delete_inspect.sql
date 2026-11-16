-- OWNER-APPROVED READ-ONLY INSPECTION ONLY. No private rows or function source output.
BEGIN READ ONLY;
SELECT c.conrelid::regclass AS dependent_table,c.conname,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c WHERE c.contype='f' AND c.confrelid IN
 ('auth.users'::regclass,'taxiqaid_private.user_accounts'::regclass,'taxiqaid_private.auth_login_identities'::regclass,'taxiqaid_private.user_admin_metadata'::regclass)
ORDER BY 1,2;
SELECT t.tgrelid::regclass AS table_name,t.tgname,t.tgenabled,t.tgtype,t.tgfoid::regprocedure AS trigger_function
FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid IN ('auth.users'::regclass,'taxiqaid_private.user_accounts'::regclass,'taxiqaid_private.auth_login_identities'::regclass,'taxiqaid_private.user_admin_metadata'::regclass);
SELECT a.attname,format_type(a.atttypid,a.atttypmod) AS type FROM pg_attribute a
WHERE a.attrelid='taxiqaid_private.user_admin_metadata'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum;
SELECT p.oid::regprocedure AS function,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl,
 encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') AS source_sha256
FROM pg_proc p WHERE p.oid IN ('taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)'::regprocedure,
 'taxiqaid_auth_api.admin_require(uuid,text,boolean)'::regprocedure) OR p.oid=to_regprocedure('taxiqaid_auth_api.admin_delete_user(uuid,text,jsonb)');
SELECT pg_get_userbyid(roleid) AS role,pg_get_userbyid(member) AS member,pg_get_userbyid(grantor) AS grantor,admin_option,inherit_option,set_option
FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole;
SELECT has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE') AS unexpected_create;
ROLLBACK;
