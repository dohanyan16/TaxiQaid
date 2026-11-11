-- READ ONLY. Dashboard SQL Editor, dedicated project only. Aggregate/schema metadata; no account/Auth rows or secrets.
SELECT current_database() AS database_name,version() AS postgres_version;
SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication
FROM pg_catalog.pg_roles WHERE rolname LIKE 'taxiqaid_auth_%' ORDER BY rolname;
SELECT n.nspname AS schema,c.relname AS table_name,c.relrowsecurity,c.relforcerowsecurity,pg_catalog.pg_get_userbyid(c.relowner) AS owner
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='taxiqaid_private' AND c.relkind='r' OR n.nspname='auth' AND c.relname='users' ORDER BY 1,2;
SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='taxiqaid_private' ORDER BY table_name,ordinal_position;
SELECT schemaname,tablename,policyname,roles,cmd FROM pg_catalog.pg_policies WHERE schemaname IN ('taxiqaid_private','auth') ORDER BY 1,2,3;
SELECT tablename,indexname,indexdef FROM pg_catalog.pg_indexes WHERE schemaname='taxiqaid_private' ORDER BY 1,2;
SELECT count(*) AS active_permission_definitions FROM taxiqaid_private.permissions WHERE is_active=true;
SELECT count(*) AS master_allowed_rows FROM taxiqaid_private.role_permissions WHERE role_key='super_admin' AND is_allowed=true;
SELECT count(*) AS individual_override_rows FROM taxiqaid_private.user_permission_overrides;
SELECT count(*) AS active_departments FROM taxiqaid_private.departments WHERE is_active=true;
SELECT count(*) AS active_linked_master_accounts FROM taxiqaid_private.user_accounts a JOIN auth.users u ON u.id=a.user_id WHERE a.status='active' AND a.account_type='management' AND a.role_key='super_admin';
SELECT count(*) AS duplicate_management_identifiers FROM (SELECT username FROM taxiqaid_private.user_accounts WHERE account_type='management' GROUP BY username HAVING count(*)<>1) AS d;
SELECT r.role_name,t.table_name,
 pg_catalog.has_schema_privilege(r.role_name,'taxiqaid_private','USAGE') AS schema_usage,
 pg_catalog.has_any_column_privilege(r.role_name,'taxiqaid_private.'||t.table_name,'SELECT') AS column_read,
 pg_catalog.has_table_privilege(r.role_name,'taxiqaid_private.'||t.table_name,'INSERT,UPDATE,DELETE,TRUNCATE') AS table_write
FROM (VALUES('anon'),('authenticated'),('taxiqaid_auth_backend')) r(role_name)
CROSS JOIN (VALUES('user_accounts'),('departments'),('user_departments'),('permissions'),('role_permissions'),('user_permission_overrides'),('login_attempt_counters')) t(table_name);
-- Expect 107,101,0,9,1; no duplicates/browser access. Confirm the existing counter PK, expiry index and types.
-- If auth.users itself has RLS and denies the new lookup owner, stop for a provider-supported narrow policy review.

-- PUBLIC is inherited even by NOINHERIT roles. Review accessible existing definers without exporting their bodies.
SELECT n.nspname,p.proname,pg_catalog.pg_get_userbyid(p.proowner) AS owner
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE p.prosecdef AND pg_catalog.has_schema_privilege('taxiqaid_auth_backend',n.oid,'USAGE') AND pg_catalog.has_function_privilege('taxiqaid_auth_backend',p.oid,'EXECUTE') ORDER BY 1,2;
