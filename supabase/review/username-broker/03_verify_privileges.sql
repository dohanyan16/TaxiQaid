-- READ ONLY. Must pass before any credential provisioning or broker activation.
SELECT r.rolname,r.rolcanlogin,r.rolinherit,r.rolsuper,r.rolbypassrls,r.rolcreaterole,r.rolcreatedb,r.rolreplication
FROM pg_catalog.pg_roles r WHERE r.rolname LIKE 'taxiqaid_auth_%' ORDER BY r.rolname;
SELECT pg_catalog.pg_get_userbyid(m.member) AS member,pg_catalog.pg_get_userbyid(m.roleid) AS granted_role,m.admin_option
FROM pg_catalog.pg_auth_members m WHERE pg_catalog.pg_get_userbyid(m.member) LIKE 'taxiqaid_auth_%' OR pg_catalog.pg_get_userbyid(m.roleid) LIKE 'taxiqaid_auth_%';
SELECT n.nspname,p.proname,pg_catalog.pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='taxiqaid_auth_api';
DO $$
DECLARE actor text; relation regclass; fn regprocedure;
BEGIN
 IF pg_catalog.to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
  FOREACH actor IN ARRAY ARRAY['anon','authenticated','taxiqaid_auth_backend','taxiqaid_auth_login'] LOOP
   IF pg_catalog.has_any_column_privilege(actor,'vault.decrypted_secrets','SELECT') THEN RAISE EXCEPTION 'Unexpected secret-store read privilege: %.',actor; END IF;
  END LOOP;
 END IF;
 FOREACH actor IN ARRAY ARRAY['anon','authenticated','taxiqaid_auth_backend','taxiqaid_auth_login'] LOOP
  FOR relation IN SELECT c.oid::regclass FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('taxiqaid_private','auth') AND c.relkind IN ('r','p','v') LOOP
   IF pg_catalog.has_any_column_privilege(actor,relation,'SELECT,INSERT,UPDATE,REFERENCES') OR pg_catalog.has_table_privilege(actor,relation,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
    -- Browser roles may legitimately have managed Auth views; this assertion targets the seven private tables and auth.users.
    IF relation::text LIKE 'taxiqaid_private.%' OR relation='auth.users'::regclass THEN RAISE EXCEPTION 'Unexpected direct table privilege: %.',actor; END IF;
   END IF;
  END LOOP;
 END LOOP;
 FOR fn IN SELECT p.oid::regprocedure FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='taxiqaid_auth_api' LOOP
  IF pg_catalog.has_function_privilege('anon',fn,'EXECUTE') OR pg_catalog.has_function_privilege('authenticated',fn,'EXECUTE') THEN RAISE EXCEPTION 'Browser function execution must remain denied.'; END IF;
 END LOOP;
 IF pg_catalog.has_function_privilege('taxiqaid_auth_backend','taxiqaid_auth_api.consume_login_counters(text,text,text)','EXECUTE') OR pg_catalog.has_function_privilege('taxiqaid_auth_backend','taxiqaid_auth_api.prune_login_counters(integer)','EXECUTE') THEN RAISE EXCEPTION 'Backend must not consume/reset/prune counters separately.'; END IF;
 IF NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend','taxiqaid_auth_api.begin_login_attempt(text,text,text,text)','EXECUTE') OR NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend','taxiqaid_auth_api.get_management_access(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Two reviewed runtime functions required.'; END IF;
 IF EXISTS(SELECT FROM pg_catalog.pg_roles WHERE rolname LIKE 'taxiqaid_auth_%' AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN RAISE EXCEPTION 'Privileged auth runtime/owner role rejected.'; END IF;
 IF EXISTS(SELECT FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles member_role ON member_role.oid=m.member JOIN pg_catalog.pg_roles parent ON parent.oid=m.roleid WHERE member_role.rolname LIKE 'taxiqaid_auth_%' AND NOT(member_role.rolname='taxiqaid_auth_login' AND parent.rolname='taxiqaid_auth_backend' AND NOT m.admin_option)) THEN RAISE EXCEPTION 'Unexpected role inheritance/SET ROLE authority.'; END IF;
END $$;
-- Inspect unrelated pre-existing private objects rather than broadening a failing assertion.
