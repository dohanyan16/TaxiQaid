-- READ ONLY. Must pass before any credential provisioning or broker activation.
SELECT r.rolname,r.rolcanlogin,r.rolinherit,r.rolsuper,r.rolbypassrls,r.rolcreaterole,r.rolcreatedb,r.rolreplication
FROM pg_catalog.pg_roles r WHERE r.rolname LIKE 'taxiqaid_auth_%' ORDER BY r.rolname;
SELECT pg_catalog.pg_get_userbyid(m.member) AS member,pg_catalog.pg_get_userbyid(m.roleid) AS granted_role,m.admin_option
FROM pg_catalog.pg_auth_members m WHERE pg_catalog.pg_get_userbyid(m.member) LIKE 'taxiqaid_auth_%' OR pg_catalog.pg_get_userbyid(m.roleid) LIKE 'taxiqaid_auth_%';
SELECT n.nspname,p.proname,pg_catalog.pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='taxiqaid_auth_api';
SELECT conname,contype,pg_catalog.pg_get_constraintdef(oid) AS definition FROM pg_catalog.pg_constraint WHERE conrelid='taxiqaid_private.auth_login_identities'::regclass;
SELECT indexname,indexdef FROM pg_catalog.pg_indexes WHERE schemaname='taxiqaid_private' AND tablename='auth_login_identities';
SELECT count(*) AS identity_mappings,count(*) FILTER(WHERE is_enabled) AS ready_mappings FROM taxiqaid_private.auth_login_identities;
SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='taxiqaid_private' AND table_name='auth_login_identities' ORDER BY ordinal_position;
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
    -- Browser roles may legitimately have managed Auth views; this assertion targets private tables, including the proposed identity mapping, and auth.users.
    IF relation::text LIKE 'taxiqaid_private.%' OR relation='auth.users'::regclass THEN RAISE EXCEPTION 'Unexpected direct table privilege: %.',actor; END IF;
   END IF;
  END LOOP;
 END LOOP;
 FOR fn IN SELECT p.oid::regprocedure FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='taxiqaid_auth_api' LOOP
  IF pg_catalog.has_function_privilege('anon',fn,'EXECUTE') OR pg_catalog.has_function_privilege('authenticated',fn,'EXECUTE') THEN RAISE EXCEPTION 'Browser function execution must remain denied.'; END IF;
  IF pg_catalog.has_function_privilege('taxiqaid_auth_backend',fn,'EXECUTE') AND fn NOT IN ('taxiqaid_auth_api.begin_login_attempt(text,text,text,text)'::regprocedure,'taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure) THEN RAISE EXCEPTION 'Unexpected or legacy backend API execution grant.'; END IF;
  IF pg_catalog.has_function_privilege('taxiqaid_auth_login',fn,'EXECUTE') THEN RAISE EXCEPTION 'Connection role must switch locally to the restricted backend.'; END IF;
 END LOOP;
 IF pg_catalog.has_function_privilege('taxiqaid_auth_backend','taxiqaid_auth_api.consume_login_counters(text,text,text)','EXECUTE') OR pg_catalog.has_function_privilege('taxiqaid_auth_backend','taxiqaid_auth_api.prune_login_counters(integer)','EXECUTE') THEN RAISE EXCEPTION 'Backend must not consume/reset/prune counters separately.'; END IF;
 IF NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend','taxiqaid_auth_api.begin_login_attempt(text,text,text,text)','EXECUTE') OR NOT pg_catalog.has_function_privilege('taxiqaid_auth_backend','taxiqaid_auth_api.get_management_access(uuid,bigint)','EXECUTE') THEN RAISE EXCEPTION 'Two reviewed runtime functions required.'; END IF;
 FOREACH actor IN ARRAY ARRAY['taxiqaid_auth_lookup_owner','taxiqaid_auth_access_owner','taxiqaid_auth_rate_owner'] LOOP
  IF pg_catalog.has_any_column_privilege(actor,'auth.users','SELECT,INSERT,UPDATE,REFERENCES') OR pg_catalog.has_table_privilege(actor,'auth.users','DELETE,TRUNCATE,TRIGGER') THEN RAISE EXCEPTION 'Definer owners must not receive managed Auth-user access.'; END IF;
 END LOOP;
 FOREACH actor IN ARRAY ARRAY['anon','authenticated','taxiqaid_auth_login','taxiqaid_auth_backend','taxiqaid_auth_lookup_owner','taxiqaid_auth_access_owner','taxiqaid_auth_rate_owner'] LOOP
  IF pg_catalog.has_function_privilege(actor,'taxiqaid_auth_api.synchronize_management_identity(uuid,text,bigint)','EXECUTE') OR pg_catalog.has_function_privilege(actor,'taxiqaid_auth_api.suspend_management_identity(uuid,bigint)','EXECUTE') THEN RAISE EXCEPTION 'Identity administration must remain inaccessible to runtime/browser/definer roles.'; END IF;
 END LOOP;
 IF EXISTS(SELECT FROM pg_catalog.pg_proc WHERE oid IN ('taxiqaid_auth_api.synchronize_management_identity(uuid,text,bigint)'::regprocedure,'taxiqaid_auth_api.suspend_management_identity(uuid,bigint)'::regprocedure) AND prosecdef) THEN RAISE EXCEPTION 'Administrative identity helpers must use invoker authority.'; END IF;
 IF (SELECT pg_catalog.array_agg(attname::text ORDER BY attnum) FROM pg_catalog.pg_attribute WHERE attrelid='taxiqaid_private.auth_login_identities'::regclass AND attnum>0 AND NOT attisdropped) IS DISTINCT FROM ARRAY['user_id','technical_email','is_enabled','revision','synchronized_at','updated_by_db_role']::text[] THEN RAISE EXCEPTION 'Unexpected mapping fields: passwords/roles are not mapping data.'; END IF;
 IF NOT EXISTS(SELECT FROM pg_catalog.pg_class WHERE oid='taxiqaid_private.auth_login_identities'::regclass AND relrowsecurity AND relforcerowsecurity) THEN RAISE EXCEPTION 'Private mapping RLS must remain enabled and forced.'; END IF;
 IF NOT EXISTS(SELECT FROM pg_catalog.pg_constraint WHERE conrelid='taxiqaid_private.auth_login_identities'::regclass AND contype='f' AND confrelid='auth.users'::regclass AND convalidated) THEN RAISE EXCEPTION 'Reviewed Auth UID foreign key required.'; END IF;
 IF NOT EXISTS(SELECT FROM pg_catalog.pg_index WHERE indexrelid='taxiqaid_private.auth_login_identities_email_key'::regclass AND indisunique AND indisvalid) THEN RAISE EXCEPTION 'Unique technical identity index required.'; END IF;
 -- This is an administrative integrity check under the Dashboard caller's already elevated read authority.
 -- It returns no identifiers/emails and grants no such authority to broker roles.
 IF EXISTS(SELECT FROM taxiqaid_private.auth_login_identities m LEFT JOIN auth.users u ON u.id=m.user_id LEFT JOIN taxiqaid_private.user_accounts a ON a.user_id=m.user_id
  WHERE m.is_enabled AND (u.id IS NULL OR m.technical_email IS DISTINCT FROM u.email OR a.user_id IS NULL OR a.account_type IS DISTINCT FROM 'management' OR a.status IS DISTINCT FROM 'active')) THEN RAISE EXCEPTION 'Enabled identity mapping must be reconciled before activation.'; END IF;
 IF EXISTS(SELECT FROM pg_catalog.pg_roles WHERE rolname IN ('taxiqaid_auth_backend','taxiqaid_auth_lookup_owner','taxiqaid_auth_access_owner','taxiqaid_auth_rate_owner') AND rolcanlogin) THEN RAISE EXCEPTION 'Backend/definer roles must remain NOLOGIN.'; END IF;
 IF EXISTS(SELECT FROM pg_catalog.pg_roles WHERE rolname='taxiqaid_auth_login' AND rolinherit) THEN RAISE EXCEPTION 'Connection role must remain NOINHERIT.'; END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE account_type='management' GROUP BY username HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate management username requires private reconciliation.'; END IF;
 IF EXISTS(SELECT FROM pg_catalog.pg_roles WHERE rolname LIKE 'taxiqaid_auth_%' AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN RAISE EXCEPTION 'Privileged auth runtime/owner role rejected.'; END IF;
 IF EXISTS(SELECT FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles member_role ON member_role.oid=m.member JOIN pg_catalog.pg_roles parent ON parent.oid=m.roleid WHERE member_role.rolname LIKE 'taxiqaid_auth_%' AND NOT(member_role.rolname='taxiqaid_auth_login' AND parent.rolname='taxiqaid_auth_backend' AND NOT m.admin_option)) THEN RAISE EXCEPTION 'Unexpected role inheritance/SET ROLE authority.'; END IF;
END $$;
-- Inspect unrelated pre-existing private objects rather than broadening a failing assertion.
