-- READ ONLY. Run privately in the NEW TaxiQaid project after verifying the selected project URL.
-- Contains no auth-user listing, passwords, emails, Master UID, tokens or operational data.
BEGIN TRANSACTION READ ONLY;
SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns
WHERE table_schema='taxiqaid_private'
 AND table_name IN ('user_accounts','departments','user_departments','permissions','role_permissions','user_permission_overrides')
ORDER BY table_name,ordinal_position;
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='taxiqaid_private' AND c.relkind='r';
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='taxiqaid_private';
SELECT table_name,grantee,privilege_type FROM information_schema.table_privileges
WHERE table_schema='taxiqaid_private' ORDER BY table_name,grantee,privilege_type;
SELECT table_name,constraint_name,constraint_type FROM information_schema.table_constraints WHERE table_schema='taxiqaid_private' ORDER BY table_name,constraint_name;
SELECT 'permissions' AS entity,count(*) AS row_count FROM taxiqaid_private.permissions
UNION ALL SELECT 'role_permissions',count(*) FROM taxiqaid_private.role_permissions
UNION ALL SELECT 'user_permission_overrides',count(*) FROM taxiqaid_private.user_permission_overrides
UNION ALL SELECT 'departments',count(*) FROM taxiqaid_private.departments;
ROLLBACK;
-- Expected OWNER-REPORTED counts: 107 permission definitions; 101 allowed super_admin grants,
-- zero other-role grants; zero overrides; nine canonical departments. Actual columns/grants need review.
-- Do not dump personal user_accounts or auth.users into the repository.
