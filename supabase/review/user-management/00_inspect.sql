-- READ ONLY. Review metadata/counts privately before approving any migration. No account or identity export.
SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='taxiqaid_private' AND table_name IN ('user_accounts','departments','user_departments','role_permissions','user_permission_overrides','auth_login_identities') ORDER BY table_name,ordinal_position;
SELECT c.conname,c.conrelid::regclass AS relation,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c WHERE c.conrelid IN ('taxiqaid_private.user_accounts'::regclass,'taxiqaid_private.user_departments'::regclass,'taxiqaid_private.departments'::regclass) OR c.confrelid='taxiqaid_private.departments'::regclass;
SELECT d.department_key,d.department_name,d.is_active,count(m.user_id) AS memberships,count(*) FILTER(WHERE a.role_key='super_admin') AS master_memberships FROM taxiqaid_private.departments d LEFT JOIN taxiqaid_private.user_departments m USING(department_key) LEFT JOIN taxiqaid_private.user_accounts a USING(user_id) GROUP BY 1,2,3 ORDER BY 1;
SELECT role_key,count(*) AS accounts FROM taxiqaid_private.user_accounts GROUP BY 1 ORDER BY 1;
SELECT count(*) AS duplicate_usernames FROM (SELECT lower(btrim(username)) FROM taxiqaid_private.user_accounts GROUP BY lower(btrim(username)) HAVING count(*)>1) d;
SELECT count(*) AS duplicate_memberships FROM (SELECT user_id,department_key FROM taxiqaid_private.user_departments GROUP BY 1,2 HAVING count(*)>1) d;
SELECT p.oid::regprocedure,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') AS body_sha256 FROM pg_proc p WHERE p.oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure;
-- Any unreviewed role_key CHECK/FK or ambiguous retired-department reference blocks the relevant proposal.

SELECT count(*) AS noncanonical_management_usernames FROM taxiqaid_private.user_accounts WHERE account_type='management' AND (username IS NULL OR username !~ '^[a-z][a-z0-9]{1,47}$');

SELECT role_key,count(*) FILTER(WHERE is_allowed) AS allowed_definitions,count(*) FILTER(WHERE NOT is_allowed) AS denied_definitions FROM taxiqaid_private.role_permissions GROUP BY role_key ORDER BY role_key;
SELECT count(*) AS duplicate_overrides FROM (SELECT user_id,permission_key FROM taxiqaid_private.user_permission_overrides GROUP BY 1,2 HAVING count(*)>1) d;
