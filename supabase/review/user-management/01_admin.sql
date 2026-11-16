-- PROPOSAL ONLY. New isolated administrative roles/API; never execute automatically or rerun after application.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
-- The reference is session-local and disappears at COMMIT/ROLLBACK; no live account constraint is altered.
-- PostgreSQL prints both parsed CHECK expressions on the same server, avoiding brittle format/version guesses.
CREATE TEMP TABLE taxiqaid_admin_expected_role_check (
 account_type text, role_key text,
 CONSTRAINT approved_role_check CHECK (
  ((account_type = 'management'::text) AND
   (role_key = ANY (ARRAY['super_admin'::text,'admin'::text,'manager'::text,'supervisor'::text,'staff'::text])))
   OR ((account_type = 'driver'::text) AND (role_key = 'driver'::text))
 )
) ON COMMIT DROP;
DO $$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'Ordinary Dashboard postgres required'; END IF;
 IF current_setting('server_version_num')::integer<160000 THEN RAISE EXCEPTION 'PostgreSQL 16 required'; END IF;
 IF EXISTS(SELECT FROM pg_proc WHERE pronamespace='taxiqaid_auth_api'::regnamespace AND left(proname,6)='admin_') THEN RAISE EXCEPTION 'Administrative function collision';END IF;
 IF EXISTS(SELECT FROM pg_class WHERE oid IN ('taxiqaid_private.user_accounts'::regclass,'taxiqaid_private.departments'::regclass,'taxiqaid_private.user_departments'::regclass,'taxiqaid_private.permissions'::regclass,'taxiqaid_private.role_permissions'::regclass,'taxiqaid_private.user_permission_overrides'::regclass,'taxiqaid_private.auth_login_identities'::regclass) AND NOT relrowsecurity) THEN RAISE EXCEPTION 'Existing private RLS required';END IF;
 IF EXISTS(SELECT FROM pg_roles WHERE rolname IN ('taxiqaid_user_admin_owner','taxiqaid_user_admin_backend','taxiqaid_user_admin_login')) THEN RAISE EXCEPTION 'Already applied or role collision'; END IF;
 -- Match the owner's reviewed account-type/role CHECK against a temporary PostgreSQL-parsed reference.
 -- Never trust a constraint name or a list of permitted role strings alone; changed grouping/FKs must fail closed.
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint existing
  JOIN pg_constraint approved ON approved.conrelid='pg_temp.taxiqaid_admin_expected_role_check'::regclass
   AND approved.conname='approved_role_check' AND approved.contype='c'
  WHERE existing.conrelid='taxiqaid_private.user_accounts'::regclass
   AND existing.conname='user_accounts_check' AND existing.contype='c'
   AND pg_get_constraintdef(existing.oid)=pg_get_constraintdef(approved.oid)
 ) OR EXISTS (
  SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
  WHERE c.conrelid='taxiqaid_private.user_accounts'::regclass
   AND a.attname='role_key' AND c.contype IN ('c','f') AND c.conname<>'user_accounts_check'
 ) THEN RAISE EXCEPTION 'ROLE_CONSTRAINT_REVIEW_REQUIRED: only the exact reviewed user_accounts_check is accepted'; END IF;
 IF EXISTS(SELECT lower(btrim(username)) FROM taxiqaid_private.user_accounts GROUP BY lower(btrim(username)) HAVING count(*)>1) OR EXISTS(SELECT user_id,department_key FROM taxiqaid_private.user_departments GROUP BY 1,2 HAVING count(*)>1) OR EXISTS(SELECT user_id,permission_key FROM taxiqaid_private.user_permission_overrides GROUP BY 1,2 HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate identity/membership/override review required'; END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE account_type='management' AND (username IS NULL OR username !~ '^[a-z][a-z0-9]{1,47}$')) THEN RAISE EXCEPTION 'USERNAME_NORMALIZATION_REVIEW_REQUIRED';END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.role_permissions WHERE role_key='super_admin' AND is_allowed AND permission_key IN ('driver-portal.request-changes','driver-portal.files.view','driver-portal.sign','driver-portal.schedule.view','driver-portal.schedule.download','driver-portal.submit-appeal')) THEN RAISE EXCEPTION 'MASTER_DRIVER_DENIALS_REVIEW_REQUIRED';END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.role_permissions WHERE role_key IN ('manager','supervisor')) THEN RAISE EXCEPTION 'NEW_ROLE_DEFAULTS_REVIEW_REQUIRED';END IF;
 IF (SELECT count(*) FROM taxiqaid_private.permissions)<>107 OR (SELECT count(*) FROM taxiqaid_private.role_permissions WHERE role_key='super_admin' AND is_allowed)<>101 THEN RAISE EXCEPTION 'PERMISSION_BASELINE_REVIEW_REQUIRED';END IF;
 IF (SELECT count(*) FROM taxiqaid_private.user_accounts WHERE role_key='super_admin' AND account_type='management' AND status='active')<>1 THEN RAISE EXCEPTION 'Unique active Master required'; END IF;
END $$;
LOCK TABLE taxiqaid_private.user_accounts,taxiqaid_private.user_departments,taxiqaid_private.role_permissions,taxiqaid_private.permissions IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE admin_preserve ON COMMIT DROP AS SELECT (SELECT jsonb_agg(to_jsonb(a) ORDER BY user_id) FROM taxiqaid_private.user_accounts a) accounts,(SELECT jsonb_agg(to_jsonb(m) ORDER BY user_id,department_key) FROM taxiqaid_private.user_departments m) memberships,(SELECT jsonb_agg(to_jsonb(r) ORDER BY role_key,permission_key) FROM taxiqaid_private.role_permissions r) grants,(SELECT jsonb_agg(to_jsonb(p) ORDER BY permission_key) FROM taxiqaid_private.permissions p) permissions;
CREATE ROLE taxiqaid_user_admin_owner NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE taxiqaid_user_admin_backend NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE taxiqaid_user_admin_login LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 3;
-- No password is embedded. Provision a separate restricted connection only after owner approval.
GRANT taxiqaid_user_admin_backend TO taxiqaid_user_admin_login WITH ADMIN FALSE,INHERIT FALSE,SET TRUE;
CREATE TEMP TABLE admin_memberships ON COMMIT DROP AS SELECT * FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole;
GRANT taxiqaid_user_admin_owner TO postgres WITH INHERIT FALSE,SET TRUE;
GRANT USAGE,CREATE ON SCHEMA taxiqaid_private,taxiqaid_auth_api TO taxiqaid_user_admin_owner;
GRANT USAGE ON SCHEMA taxiqaid_auth_api TO taxiqaid_user_admin_backend;
GRANT SELECT ON taxiqaid_private.user_accounts,taxiqaid_private.departments,taxiqaid_private.user_departments,taxiqaid_private.permissions,taxiqaid_private.role_permissions,taxiqaid_private.user_permission_overrides,taxiqaid_private.auth_login_identities TO taxiqaid_user_admin_owner;
GRANT INSERT,UPDATE ON taxiqaid_private.user_accounts,taxiqaid_private.auth_login_identities TO taxiqaid_user_admin_owner;
GRANT INSERT,UPDATE,DELETE ON taxiqaid_private.user_departments,taxiqaid_private.user_permission_overrides TO taxiqaid_user_admin_owner;
CREATE POLICY user_admin_read_accounts ON taxiqaid_private.user_accounts FOR SELECT TO taxiqaid_user_admin_owner USING(true);
CREATE POLICY user_admin_insert_accounts ON taxiqaid_private.user_accounts FOR INSERT TO taxiqaid_user_admin_owner WITH CHECK(account_type='management' AND role_key IN ('manager','supervisor'));
CREATE POLICY user_admin_update_accounts ON taxiqaid_private.user_accounts FOR UPDATE TO taxiqaid_user_admin_owner USING(account_type='management' AND role_key<>'super_admin') WITH CHECK(account_type='management' AND role_key IN ('manager','supervisor'));
CREATE POLICY user_admin_read_departments ON taxiqaid_private.departments FOR SELECT TO taxiqaid_user_admin_owner USING(true);
CREATE POLICY user_admin_read_permissions ON taxiqaid_private.permissions FOR SELECT TO taxiqaid_user_admin_owner USING(true);
CREATE POLICY user_admin_read_roles ON taxiqaid_private.role_permissions FOR SELECT TO taxiqaid_user_admin_owner USING(true);
CREATE POLICY user_admin_memberships ON taxiqaid_private.user_departments TO taxiqaid_user_admin_owner USING(EXISTS(SELECT FROM taxiqaid_private.user_accounts a WHERE a.user_id=user_departments.user_id AND a.account_type='management' AND a.role_key<>'super_admin')) WITH CHECK(EXISTS(SELECT FROM taxiqaid_private.user_accounts a WHERE a.user_id=user_departments.user_id AND a.account_type='management' AND a.role_key<>'super_admin'));
CREATE POLICY user_admin_read_memberships ON taxiqaid_private.user_departments FOR SELECT TO taxiqaid_user_admin_owner USING(true);
CREATE POLICY user_admin_overrides ON taxiqaid_private.user_permission_overrides TO taxiqaid_user_admin_owner USING(EXISTS(SELECT FROM taxiqaid_private.user_accounts a WHERE a.user_id=user_permission_overrides.user_id AND a.account_type='management' AND a.role_key<>'super_admin')) WITH CHECK(EXISTS(SELECT FROM taxiqaid_private.user_accounts a WHERE a.user_id=user_permission_overrides.user_id AND a.account_type='management' AND a.role_key<>'super_admin'));
CREATE POLICY user_admin_read_overrides ON taxiqaid_private.user_permission_overrides FOR SELECT TO taxiqaid_user_admin_owner USING(true);
CREATE POLICY user_admin_read_mapping ON taxiqaid_private.auth_login_identities FOR SELECT TO taxiqaid_user_admin_owner USING(true);
CREATE POLICY user_admin_insert_mapping ON taxiqaid_private.auth_login_identities FOR INSERT TO taxiqaid_user_admin_owner WITH CHECK(EXISTS(SELECT FROM taxiqaid_private.user_accounts a WHERE a.user_id=auth_login_identities.user_id AND a.account_type='management' AND a.role_key<>'super_admin'));
CREATE POLICY user_admin_update_mapping ON taxiqaid_private.auth_login_identities FOR UPDATE TO taxiqaid_user_admin_owner USING(EXISTS(SELECT FROM taxiqaid_private.user_accounts a WHERE a.user_id=auth_login_identities.user_id AND a.account_type='management' AND a.role_key<>'super_admin')) WITH CHECK(EXISTS(SELECT FROM taxiqaid_private.user_accounts a WHERE a.user_id=auth_login_identities.user_id AND a.account_type='management' AND a.role_key<>'super_admin'));
CREATE UNIQUE INDEX user_admin_username_unique ON taxiqaid_private.user_accounts(lower(username));
CREATE UNIQUE INDEX user_admin_membership_unique ON taxiqaid_private.user_departments(user_id,department_key);
CREATE UNIQUE INDEX user_admin_override_unique ON taxiqaid_private.user_permission_overrides(user_id,permission_key);
INSERT INTO taxiqaid_private.departments(department_key,department_name,is_active,created_at) VALUES ('operation','Operation',true,now()),('fleet','Fleet',true,now()),('maintenance','Maintenance',true,now()),('finance','Finance',true,now()),('hr','HR',true,now()),('qhse','QHSE',true,now()),('it','IT',true,now()) ON CONFLICT(department_key) DO NOTHING;
-- Existing inactive entries are not activated silently, nor are retired memberships removed.
CREATE TABLE taxiqaid_private.user_admin_metadata(user_id uuid PRIMARY KEY REFERENCES taxiqaid_private.user_accounts(user_id),mirror_row bigint GENERATED ALWAYS AS IDENTITY (START WITH 2) UNIQUE,contact_email text CHECK(contact_email IS NULL OR (length(contact_email)<=254 AND contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),version bigint NOT NULL DEFAULT 1 CHECK(version>0),auth_sync_pending boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE taxiqaid_private.user_admin_operations(id uuid PRIMARY KEY,actor uuid NOT NULL,action text NOT NULL,payload jsonb NOT NULL,target uuid NOT NULL,username text,state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','completed','recovery_required')),lease uuid,lease_until timestamptz,result jsonb,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX user_admin_reserved_username ON taxiqaid_private.user_admin_operations(username) WHERE action='create' AND state<>'completed';
CREATE TABLE taxiqaid_private.driver_profile_requests(id uuid PRIMARY KEY,mirror_row bigint GENERATED ALWAYS AS IDENTITY (START WITH 2) UNIQUE,driver_ref text NOT NULL CHECK(length(driver_ref) BETWEEN 1 AND 100),driver_iqama text CHECK(driver_iqama ~ '^[0-9]{10}$'),driver_name text NOT NULL CHECK(length(driver_name) BETWEEN 1 AND 150),field text NOT NULL CHECK(field IN ('Name','Phone')),old_value text NOT NULL CHECK(length(old_value)<=150),proposed_value text NOT NULL CHECK(length(proposed_value) BETWEEN 1 AND 150),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved_pending_application','rejected')),version bigint NOT NULL DEFAULT 1 CHECK(version>0),requested_at timestamptz NOT NULL DEFAULT now(),reviewed_by uuid,reviewed_at timestamptz,note text CHECK(length(note)<=2000));
CREATE INDEX user_admin_request_status ON taxiqaid_private.driver_profile_requests(status,id);
CREATE TABLE taxiqaid_private.user_admin_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,operation_id uuid NOT NULL,actor uuid NOT NULL,action text NOT NULL,target uuid NOT NULL,metadata jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE taxiqaid_private.user_admin_outbox(kind text NOT NULL CHECK(kind IN ('user','profile-request')),entity uuid NOT NULL,sheet_row bigint NOT NULL CHECK(sheet_row>1),version bigint NOT NULL CHECK(version>0),payload jsonb NOT NULL,attempts integer NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(kind,entity));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['user_admin_metadata','user_admin_operations','driver_profile_requests','user_admin_audit','user_admin_outbox'] LOOP
  EXECUTE format('ALTER TABLE taxiqaid_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE taxiqaid_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON taxiqaid_private.%I FROM PUBLIC,anon,authenticated,taxiqaid_auth_login,taxiqaid_auth_backend,taxiqaid_user_admin_backend,taxiqaid_user_admin_login',t);
  EXECUTE format('CREATE POLICY admin_owner ON taxiqaid_private.%I TO taxiqaid_user_admin_owner USING(true) WITH CHECK(true)',t);
  EXECUTE format('ALTER TABLE taxiqaid_private.%I OWNER TO taxiqaid_user_admin_owner',t);
 END LOOP;
END $$;
SET LOCAL ROLE taxiqaid_user_admin_owner;
-- BEGIN GENERATED CAPABILITY POLICY
CREATE FUNCTION taxiqaid_auth_api.admin_catalog() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $policy$ SELECT '{"dashboard.view":{"requires":[],"audience":"Management"},"fleet.view":{"requires":[],"audience":"Management"},"fleet.edit":{"requires":["fleet.view"],"audience":"Management"},"fleet.export":{"requires":["fleet.view"],"audience":"Management"},"drivers.view":{"requires":[],"audience":"Management"},"drivers.edit":{"requires":["drivers.view"],"audience":"Management"},"drivers.export":{"requires":["drivers.view"],"audience":"Management"},"tripcheck.view":{"requires":[],"audience":"Management"},"tripcheck.create":{"requires":["tripcheck.view"],"audience":"Management"},"tripcheck.edit":{"requires":["tripcheck.view"],"audience":"Management"},"tripcheck.sign":{"requires":["tripcheck.view"],"audience":"Management"},"tripcheck.export":{"requires":["tripcheck.view"],"audience":"Management"},"tripcheck.generate-pdf":{"requires":["tripcheck.view"],"audience":"Management"},"accidents.view":{"requires":[],"audience":"Management"},"accidents.create":{"requires":["accidents.view"],"audience":"Management"},"accidents.edit":{"requires":["accidents.view"],"audience":"Management"},"accidents.delete":{"requires":["accidents.view"],"audience":"Management"},"accidents.export":{"requires":["accidents.view"],"audience":"Management"},"accidents.send-maintenance":{"requires":["accidents.view"],"audience":"Management"},"breakdowns.view":{"requires":[],"audience":"Management"},"breakdowns.create":{"requires":["breakdowns.view"],"audience":"Management"},"breakdowns.edit":{"requires":["breakdowns.view"],"audience":"Management"},"breakdowns.delete":{"requires":["breakdowns.view"],"audience":"Management"},"breakdowns.export":{"requires":["breakdowns.view"],"audience":"Management"},"breakdowns.send-maintenance":{"requires":["breakdowns.view"],"audience":"Management"},"maintenance.view":{"requires":[],"audience":"Management"},"maintenance.requests.view":{"requires":["maintenance.view"],"audience":"Management"},"maintenance.requests.edit":{"requires":["maintenance.view","maintenance.requests.view"],"audience":"Management"},"maintenance.requests.export":{"requires":["maintenance.view","maintenance.requests.view"],"audience":"Management"},"maintenance.accept":{"requires":["maintenance.view","maintenance.requests.view"],"audience":"Management"},"maintenance.overview.view":{"requires":["maintenance.view"],"audience":"Management"},"maintenance.edit":{"requires":["maintenance.view","maintenance.overview.view"],"audience":"Management"},"maintenance.export":{"requires":["maintenance.view","maintenance.overview.view"],"audience":"Management"},"fuel.view":{"requires":[],"audience":"Management"},"fuel.create":{"requires":["fuel.view"],"audience":"Management"},"fuel.edit":{"requires":["fuel.view"],"audience":"Management"},"fuel.export":{"requires":["fuel.view"],"audience":"Management"},"ncr.view":{"requires":[],"audience":"Management"},"ncr.scores.view":{"requires":["ncr.view"],"audience":"Management"},"ncr.records.view":{"requires":["ncr.view"],"audience":"Management"},"ncr.create":{"requires":["ncr.view","ncr.records.view"],"audience":"Management"},"ncr.edit":{"requires":["ncr.view","ncr.records.view"],"audience":"Management"},"ncr.delete":{"requires":["ncr.view","ncr.records.view"],"audience":"Management"},"ncr.export":{"requires":["ncr.view","ncr.records.view"],"audience":"Management"},"ncr.scores.export":{"requires":["ncr.view","ncr.scores.view"],"audience":"Management"},"penalties.view":{"requires":[],"audience":"Management"},"penalties.export":{"requires":["penalties.view"],"audience":"Management"},"training.view":{"requires":[],"audience":"Management"},"training.overview.view":{"requires":["training.view"],"audience":"Management"},"training.sessions.view":{"requires":["training.view"],"audience":"Management"},"training.attendance.view":{"requires":["training.view"],"audience":"Management"},"training.create-session":{"requires":["training.view","training.sessions.view"],"audience":"Management"},"training.manage-enrollment":{"requires":["training.view","training.sessions.view"],"audience":"Management"},"training.verify-attendance":{"requires":["training.view","training.attendance.view"],"audience":"Management"},"training.export":{"requires":["training.view"],"audience":"Management"},"customer-care.view":{"requires":[],"audience":"Management"},"customer-care.create":{"requires":["customer-care.view"],"audience":"Management"},"customer-care.edit":{"requires":["customer-care.view"],"audience":"Management"},"customer-care.assign":{"requires":["customer-care.view"],"audience":"Management"},"customer-care.close":{"requires":["customer-care.view"],"audience":"Management"},"customer-care.export":{"requires":["customer-care.view"],"audience":"Management"},"driver-deductions.view":{"requires":[],"audience":"Management"},"driver-deductions.expenses.view":{"requires":["driver-deductions.view"],"audience":"Management"},"driver-deductions.deductions.view":{"requires":["driver-deductions.view"],"audience":"Management"},"driver-deductions.add-expense":{"requires":["driver-deductions.view","driver-deductions.expenses.view"],"audience":"Management"},"driver-deductions.apply-deduction":{"requires":["driver-deductions.view","driver-deductions.deductions.view"],"audience":"Management"},"driver-deductions.approve-reversal":{"requires":["driver-deductions.view"],"audience":"Management"},"driver-deductions.export":{"requires":["driver-deductions.view"],"audience":"Management"},"driver-appeals.view":{"requires":[],"audience":"Management"},"driver-appeals.assign":{"requires":["driver-appeals.view"],"audience":"Management"},"driver-appeals.classify":{"requires":["driver-appeals.view"],"audience":"Management"},"driver-appeals.update-status":{"requires":["driver-appeals.view"],"audience":"Management"},"driver-appeals.export":{"requires":["driver-appeals.view"],"audience":"Management"},"helpdesk.view":{"requires":[],"audience":"Management"},"helpdesk.create":{"requires":["helpdesk.view"],"audience":"Management"},"helpdesk.view-department":{"requires":["helpdesk.view"],"audience":"Management"},"helpdesk.view-all":{"requires":["helpdesk.view"],"audience":"Management"},"helpdesk.update-status":{"requires":["helpdesk.view"],"audience":"Management"},"roster.view":{"requires":[],"audience":"Management"},"roster.import":{"requires":["roster.view"],"audience":"Management"},"roster.generate-pdf":{"requires":["roster.view"],"audience":"Management"},"roster.download-pdf":{"requires":["roster.view"],"audience":"Management"},"roster.download-zip":{"requires":["roster.view"],"audience":"Management"},"roster.manage-stops":{"requires":["roster.view"],"audience":"Management"},"roster.catalog-import":{"requires":["roster.view"],"audience":"Management"},"roster.catalog-export":{"requires":["roster.view"],"audience":"Management"},"roster.whatsapp-config":{"requires":["roster.view"],"audience":"Management"},"roster.whatsapp-send":{"requires":["roster.view"],"audience":"Management"},"driver-portal.view":{"requires":[],"audience":"Both"},"driver-portal.preview":{"requires":["driver-portal.view"],"audience":"Management"},"driver-portal.preview-documents":{"requires":["driver-portal.view","driver-portal.preview"],"audience":"Management"},"driver-portal.preview-schedule":{"requires":["driver-portal.view","driver-portal.preview"],"audience":"Management"},"driver-portal.preview-download":{"requires":["driver-portal.view","driver-portal.preview-schedule"],"audience":"Management"},"driver-portal.request-changes":{"requires":["driver-portal.view"],"audience":"Driver"},"driver-portal.files.view":{"requires":["driver-portal.view"],"audience":"Driver"},"driver-portal.sign":{"requires":["driver-portal.view","driver-portal.files.view"],"audience":"Driver"},"driver-portal.schedule.view":{"requires":["driver-portal.view"],"audience":"Driver"},"driver-portal.schedule.download":{"requires":["driver-portal.view","driver-portal.schedule.view"],"audience":"Driver"},"driver-portal.submit-appeal":{"requires":["driver-portal.view"],"audience":"Driver"},"user-management.view":{"requires":[],"audience":"Management"},"user-management.create-user":{"requires":["user-management.view"],"audience":"Management"},"user-management.edit-user":{"requires":["user-management.view"],"audience":"Management"},"user-management.change-status":{"requires":["user-management.view"],"audience":"Management"},"user-management.manage-permissions":{"requires":["user-management.view"],"audience":"Management"},"user-management.profile-requests.view":{"requires":["user-management.view"],"audience":"Management"},"driver-profile.approve":{"requires":["user-management.view","user-management.profile-requests.view"],"audience":"Management"},"driver-profile.reject":{"requires":["user-management.view","user-management.profile-requests.view"],"audience":"Management"}}'::jsonb $policy$;
-- END GENERATED CAPABILITY POLICY
CREATE FUNCTION taxiqaid_auth_api.admin_effective(p_uid uuid,p_key text,p_patch jsonb DEFAULT '{}',p_path text[] DEFAULT '{}') RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE definition jsonb; effect boolean; dependency text; BEGIN
 IF p_key=ANY(p_path) OR cardinality(p_path)>10 THEN RETURN false; END IF;
 definition:=taxiqaid_auth_api.admin_catalog()->p_key;
 IF definition IS NULL OR definition->>'audience'='Driver' OR NOT EXISTS(SELECT FROM taxiqaid_private.permissions WHERE permission_key=p_key AND is_active) THEN RETURN false; END IF;
 IF p_patch?p_key THEN effect:=(p_patch->>p_key)::boolean;
 ELSE SELECT is_allowed INTO effect FROM taxiqaid_private.user_permission_overrides WHERE user_id=p_uid AND permission_key=p_key; END IF;
 IF effect IS NULL THEN SELECT EXISTS(SELECT FROM taxiqaid_private.role_permissions r JOIN taxiqaid_private.user_accounts a ON a.role_key=r.role_key WHERE a.user_id=p_uid AND r.permission_key=p_key AND r.is_allowed) INTO effect; END IF;
 IF effect IS DISTINCT FROM true THEN RETURN false; END IF;
 FOR dependency IN SELECT jsonb_array_elements_text(definition->'requires') LOOP IF NOT taxiqaid_auth_api.admin_effective(p_uid,dependency,p_patch,p_path||p_key) THEN RETURN false; END IF; END LOOP;RETURN true;
END $$;
CREATE FUNCTION taxiqaid_auth_api.admin_require(p_actor uuid,p_capability text,p_write boolean DEFAULT true) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$ BEGIN
 IF NOT EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=p_actor AND status='active' AND account_type='management') OR NOT EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE user_id=p_actor AND is_enabled) OR NOT taxiqaid_auth_api.admin_effective(p_actor,p_capability) THEN RAISE EXCEPTION 'ADMIN_DENIED' USING ERRCODE='42501'; END IF;
 IF p_write AND ((SELECT count(*) FROM taxiqaid_private.user_accounts WHERE role_key='super_admin' AND account_type='management' AND status='active')<>1 OR NOT EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=p_actor AND role_key='super_admin' AND username='dohanyan')) THEN RAISE EXCEPTION 'MASTER_REQUIRED' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION taxiqaid_auth_api.admin_snapshot(p_uid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$ DECLARE result jsonb; BEGIN
 SELECT jsonb_build_object('uid',a.user_id,'username',a.username,'fullName',a.full_name,'role',a.role_key,'status',a.status,'contactEmail',m.contact_email,'version',coalesce(m.version,1),'authSyncPending',coalesce(m.auth_sync_pending,false),'createdAt',a.created_at,'updatedAt',greatest(a.updated_at,m.updated_at),'departments',coalesce((SELECT jsonb_agg(department_key ORDER BY department_key) FROM taxiqaid_private.user_departments WHERE user_id=a.user_id),'[]'),'roleDefaults',coalesce((SELECT jsonb_agg(r.permission_key ORDER BY r.permission_key) FROM taxiqaid_private.role_permissions r JOIN taxiqaid_private.permissions p USING(permission_key) WHERE r.role_key=a.role_key AND r.is_allowed AND p.is_active),'[]'),'overrides',coalesce((SELECT jsonb_object_agg(o.permission_key,o.is_allowed) FROM taxiqaid_private.user_permission_overrides o JOIN taxiqaid_private.permissions p USING(permission_key) WHERE o.user_id=a.user_id AND p.is_active),'{}')) INTO result FROM taxiqaid_private.user_accounts a LEFT JOIN taxiqaid_private.user_admin_metadata m USING(user_id) WHERE a.user_id=p_uid AND a.account_type='management';
 IF result IS NULL THEN RAISE EXCEPTION 'ACCOUNT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 RETURN result||jsonb_build_object('etag',encode(sha256(convert_to(result::text,'UTF8')),'hex'));
END $$;
CREATE FUNCTION taxiqaid_auth_api.admin_event(p_op uuid,p_actor uuid,p_action text,p_target uuid,p_metadata jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$ BEGIN
 INSERT INTO taxiqaid_private.user_admin_audit(operation_id,actor,action,target,metadata) VALUES(p_op,p_actor,p_action,p_target,p_metadata);
END $$;
CREATE FUNCTION taxiqaid_auth_api.admin_mirror_user(p_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$ DECLARE snapshot jsonb; BEGIN
 snapshot:=taxiqaid_auth_api.admin_snapshot(p_uid);
 IF EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE lower(technical_email)=lower(snapshot->>'contactEmail')) THEN snapshot:=jsonb_set(snapshot,'{contactEmail}','null'::jsonb);END IF;
 INSERT INTO taxiqaid_private.user_admin_outbox(kind,entity,sheet_row,version,payload) VALUES('user',p_uid,(SELECT mirror_row FROM taxiqaid_private.user_admin_metadata WHERE user_id=p_uid),(snapshot->>'version')::bigint,snapshot-'roleDefaults'-'overrides'-'etag'-'authSyncPending') ON CONFLICT(kind,entity) DO UPDATE SET version=EXCLUDED.version,payload=EXCLUDED.payload,available_at=now() WHERE user_admin_outbox.version<=EXCLUDED.version;
END $$;
CREATE FUNCTION taxiqaid_auth_api.admin_mirror_request(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$ DECLARE r taxiqaid_private.driver_profile_requests%ROWTYPE; history jsonb; BEGIN
 SELECT * INTO STRICT r FROM taxiqaid_private.driver_profile_requests WHERE id=p_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('action',action,'actor',actor,'at',created_at) ORDER BY id),'[]') INTO history FROM taxiqaid_private.user_admin_audit WHERE target=p_id;
 INSERT INTO taxiqaid_private.user_admin_outbox(kind,entity,sheet_row,version,payload) VALUES('profile-request',p_id,r.mirror_row,r.version,(to_jsonb(r)-'driver_iqama'-'driver_name'-'old_value'-'proposed_value'-'note')||jsonb_build_object('history',history)) ON CONFLICT(kind,entity) DO UPDATE SET version=EXCLUDED.version,payload=EXCLUDED.payload;
END $$;
CREATE FUNCTION taxiqaid_auth_api.admin_validate_account(p_item jsonb) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$ BEGIN
 IF jsonb_typeof(p_item) IS DISTINCT FROM 'object' OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_item) k(key)) IS DISTINCT FROM ARRAY['contactEmail','departments','fullName','role','status','username'] OR coalesce(p_item->>'role' IN ('manager','supervisor') AND p_item->>'status' IN ('active','disabled') AND p_item->>'username' ~ '^[a-z][a-z0-9]{1,47}$' AND length(btrim(p_item->>'fullName')) BETWEEN 1 AND 150 AND jsonb_typeof(p_item->'departments')='array',false) IS DISTINCT FROM true THEN RAISE EXCEPTION 'INVALID_ACCOUNT'; END IF;
 IF jsonb_array_length(p_item->'departments') NOT BETWEEN 1 AND 7 OR (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(p_item->'departments'))<>jsonb_array_length(p_item->'departments') THEN RAISE EXCEPTION 'INVALID_DEPARTMENT'; END IF;
 IF p_item->>'contactEmail' IS NOT NULL AND (jsonb_typeof(p_item->'contactEmail')<>'string' OR length(p_item->>'contactEmail')>254 OR p_item->>'contactEmail' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RAISE EXCEPTION 'INVALID_CONTACT_EMAIL'; END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE lower(technical_email)=lower(p_item->>'contactEmail')) THEN RAISE EXCEPTION 'CONTACT_EMAIL_MUST_BE_INDEPENDENT';END IF;
END $$;
CREATE FUNCTION taxiqaid_auth_api.admin_dispatch(p_actor uuid,p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE target uuid; op uuid; v_lease uuid; actor_cap text; snapshot jsonb; item jsonb; prior taxiqaid_private.user_admin_operations%ROWTYPE; request_row taxiqaid_private.driver_profile_requests%ROWTYPE; fields jsonb; permission record; dep text; names text[]:=ARRAY['operation','fleet','maintenance','finance','hr','qhse','it']; result jsonb; changed integer;
BEGIN
 actor_cap:=CASE p_action WHEN 'authorize' THEN coalesce(p_data->>'capability','user-management.view') WHEN 'list' THEN 'user-management.view' WHEN 'create-reserve' THEN 'user-management.create-user' WHEN 'create-finish' THEN 'user-management.create-user' WHEN 'create-recover' THEN 'user-management.create-user' WHEN 'create-pending' THEN 'user-management.create-user' WHEN 'permissions' THEN 'user-management.manage-permissions' WHEN 'requests' THEN 'user-management.profile-requests.view' WHEN 'request-enqueue' THEN 'user-management.profile-requests.view' WHEN 'request-approve' THEN 'driver-profile.approve' WHEN 'request-reject' THEN 'driver-profile.reject' ELSE 'user-management.edit-user' END;
 PERFORM taxiqaid_auth_api.admin_require(p_actor,actor_cap,CASE WHEN p_action='authorize' THEN NOT coalesce((p_data->>'read')::boolean,false) ELSE p_action NOT IN ('list','requests') END);
 IF p_action IN ('mirror-claim','mirror-ack') THEN RETURN taxiqaid_auth_api.admin_mirror(p_actor,p_action,p_data); END IF;
 IF p_action='authorize' THEN RETURN jsonb_build_object('authorized',true); END IF;
 IF p_action='operations' THEN
  RETURN jsonb_build_object('operations',(SELECT coalesce(jsonb_agg(jsonb_build_object('operation',id,'username',username,'state',state,'createdAt',created_at) ORDER BY created_at),'[]') FROM (SELECT * FROM taxiqaid_private.user_admin_operations WHERE actor=p_actor AND action='create' AND state<>'completed' ORDER BY created_at LIMIT 100) o));
 END IF;
 IF p_action='create-pending' THEN
  PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.create-user');
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=(p_data->>'operation')::uuid AND actor=p_actor AND action='create';
  RETURN jsonb_build_object('account',prior.payload,'operation',prior.id);
 END IF;
 IF p_action='identity' THEN
  target:=(p_data->>'uid')::uuid;
  IF NOT EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target AND account_type='management' AND role_key<>'super_admin') THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501';END IF;
  RETURN (SELECT jsonb_build_object('uid',user_id,'email',technical_email) FROM taxiqaid_private.auth_login_identities WHERE user_id=target);
 END IF;
 IF p_action='list' THEN
  IF length(coalesce(p_data->>'search',''))>100 OR coalesce((p_data->>'limit')::integer,100) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT coalesce(jsonb_agg(taxiqaid_auth_api.admin_snapshot(a.user_id) ORDER BY a.user_id),'[]') INTO result FROM (SELECT user_id FROM taxiqaid_private.user_accounts WHERE account_type='management' AND (p_data->>'after' IS NULL OR user_id>(p_data->>'after')::uuid) AND (coalesce(p_data->>'search','')='' OR username ILIKE '%'||(p_data->>'search')||'%' OR full_name ILIKE '%'||(p_data->>'search')||'%' OR user_id::text=p_data->>'search' OR EXISTS(SELECT FROM taxiqaid_private.user_admin_metadata m WHERE m.user_id=user_accounts.user_id AND m.contact_email ILIKE '%'||(p_data->>'search')||'%')) ORDER BY user_id LIMIT coalesce((p_data->>'limit')::integer,100)) a;
  RETURN jsonb_build_object('users',result,'departments',(SELECT coalesce(jsonb_agg(department_key ORDER BY department_key),'[]') FROM taxiqaid_private.departments WHERE is_active AND department_key=ANY(names)));
 END IF;
 IF p_action='requests' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('history',(SELECT coalesce(jsonb_agg(jsonb_build_object('action',action,'actor',actor,'at',created_at,'metadata',metadata) ORDER BY id),'[]') FROM taxiqaid_private.user_admin_audit audit WHERE audit.target=r.id)) ORDER BY r.id),'[]') INTO result FROM (SELECT * FROM taxiqaid_private.driver_profile_requests WHERE (p_data->>'after' IS NULL OR id>(p_data->>'after')::uuid) AND (coalesce(p_data->>'status','')='' OR status=p_data->>'status') AND (coalesce(p_data->>'field','')='' OR field=p_data->>'field') AND (coalesce(p_data->>'search','')='' OR driver_name ILIKE '%'||(p_data->>'search')||'%' OR driver_iqama ILIKE '%'||(p_data->>'search')||'%' OR id::text=p_data->>'search') ORDER BY id LIMIT 100) r;
  RETURN jsonb_build_object('requests',result);
 END IF;
 op:=(p_data->>'operation')::uuid;
 IF op IS NULL OR op IN ('00000000-0000-0000-0000-000000000000'::uuid,'11111111-1111-4111-8111-111111111111'::uuid) THEN RAISE EXCEPTION 'INVALID_OPERATION'; END IF;
 IF p_action='create-reserve' THEN
  item:=p_data->'account';target:=op;v_lease:=(p_data->>'lease')::uuid;
  PERFORM taxiqaid_auth_api.admin_validate_account(item);
  IF item->>'role' NOT IN ('manager','supervisor') OR item->>'status' NOT IN ('active','disabled') OR item->>'username' !~ '^[a-z][a-z0-9]{1,47}$' OR length(item->>'fullName') NOT BETWEEN 1 AND 150 OR jsonb_typeof(item->'departments')<>'array' OR jsonb_array_length(item->'departments') NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'INVALID_ACCOUNT'; END IF;
  FOR dep IN SELECT jsonb_array_elements_text(item->'departments') LOOP IF NOT dep=ANY(names) OR NOT EXISTS(SELECT FROM taxiqaid_private.departments WHERE department_key=dep AND is_active) THEN RAISE EXCEPTION 'INVALID_DEPARTMENT'; END IF; END LOOP;
  SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;
  IF FOUND THEN
   IF prior.actor<>p_actor OR prior.action<>'create' OR prior.payload<>item THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;
   IF prior.state='completed' THEN RETURN jsonb_build_object('completed',true,'user',taxiqaid_auth_api.admin_snapshot(prior.target)); END IF;
   IF prior.lease_until>clock_timestamp() THEN RAISE EXCEPTION 'OPERATION_IN_PROGRESS' USING ERRCODE='40001'; END IF;
   UPDATE taxiqaid_private.user_admin_operations SET lease=v_lease,lease_until=clock_timestamp()+interval '2 minutes',state='reserved' WHERE id=op;
  ELSE
   IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target) OR EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE user_id=target) THEN RAISE EXCEPTION 'PROTECTED_IDENTITY' USING ERRCODE='42501';END IF;
   IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE username=item->>'username') THEN RAISE EXCEPTION 'USERNAME_UNAVAILABLE' USING ERRCODE='23505'; END IF;
   INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,username,lease,lease_until) VALUES(op,p_actor,'create',item,target,item->>'username',v_lease,clock_timestamp()+interval '2 minutes');
  END IF;
  RETURN jsonb_build_object('target',target,'completed',false);
 END IF;
 IF p_action IN ('create-finish','create-recover') THEN
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;
  IF prior.actor<>p_actor OR prior.action<>'create' THEN RAISE EXCEPTION 'OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  IF prior.state='completed' THEN RETURN jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(prior.target),'completed',true); END IF;
  IF prior.lease IS DISTINCT FROM (p_data->>'lease')::uuid OR prior.lease_until<clock_timestamp() THEN RAISE EXCEPTION 'OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  IF p_action='create-recover' THEN UPDATE taxiqaid_private.user_admin_operations SET state='recovery_required' WHERE id=op;RETURN jsonb_build_object('recoveryRequired',true); END IF;
  target:=prior.target;item:=prior.payload;
  IF lower(item->>'contactEmail')=lower(p_data->>'technicalEmail') THEN RAISE EXCEPTION 'CONTACT_EMAIL_MUST_BE_INDEPENDENT';END IF;
  IF p_data->>'authUid' IS DISTINCT FROM target::text OR p_data->>'technicalEmail' IS NULL OR length(p_data->>'technicalEmail')>254 THEN RAISE EXCEPTION 'AUTH_IDENTITY_MISMATCH'; END IF;
  INSERT INTO taxiqaid_private.user_accounts(user_id,username,full_name,account_type,role_key,status,created_at,updated_at) VALUES(target,item->>'username',item->>'fullName','management',item->>'role',item->>'status',now(),now());
  INSERT INTO taxiqaid_private.auth_login_identities(user_id,technical_email,is_enabled,revision) VALUES(target,p_data->>'technicalEmail',item->>'status'='active',1);
  INSERT INTO taxiqaid_private.user_admin_metadata(user_id,contact_email) VALUES(target,nullif(item->>'contactEmail',''));
  INSERT INTO taxiqaid_private.user_departments(user_id,department_key,assigned_at) SELECT target,value,now() FROM jsonb_array_elements_text(item->'departments');
  UPDATE taxiqaid_private.user_admin_operations SET state='completed',lease=NULL,lease_until=NULL WHERE id=op;
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,'create',target,jsonb_build_object('version',1));PERFORM taxiqaid_auth_api.admin_mirror_user(target);
  RETURN jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(target),'completed',true);
 END IF;
 IF p_action='request-enqueue' THEN
  INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state) VALUES(op,p_actor,p_action,p_data-'operation',op,'completed') ON CONFLICT(id) DO NOTHING;
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;
  INSERT INTO taxiqaid_private.driver_profile_requests(id,driver_ref,driver_iqama,driver_name,field,old_value,proposed_value) VALUES(op,p_data->>'driverRef',p_data->>'iqama',p_data->>'name',p_data->>'field',p_data->>'oldValue',p_data->>'proposedValue') ON CONFLICT(id) DO NOTHING;
  GET DIAGNOSTICS changed=ROW_COUNT;IF changed>0 THEN PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,op,jsonb_build_object('version',1,'sourceVerified',false));PERFORM taxiqaid_auth_api.admin_mirror_request(op);END IF;
  RETURN jsonb_build_object('request',(SELECT to_jsonb(r) FROM taxiqaid_private.driver_profile_requests r WHERE id=op));
 END IF;
 IF p_action IN ('request-approve','request-reject') THEN
  target:=(p_data->>'uid')::uuid;SELECT * INTO STRICT request_row FROM taxiqaid_private.driver_profile_requests WHERE id=target FOR UPDATE;
  SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op;
  IF FOUND THEN IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;RETURN prior.result;END IF;
  IF request_row.status<>'pending' OR request_row.version IS DISTINCT FROM (p_data->>'version')::bigint THEN RAISE EXCEPTION 'REQUEST_CONFLICT' USING ERRCODE='40001'; END IF;
  UPDATE taxiqaid_private.driver_profile_requests SET status=CASE WHEN p_action='request-approve' THEN 'approved_pending_application' ELSE 'rejected' END,version=version+1,reviewed_by=p_actor,reviewed_at=now(),note=p_data->>'note' WHERE id=target RETURNING * INTO request_row;
  result:=jsonb_build_object('request',to_jsonb(request_row),'applied',false,'applicationBlocked',p_action='request-approve');
  INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state,result) VALUES(op,p_actor,p_action,p_data-'operation',target,'completed',result);
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,target,jsonb_build_object('version',request_row.version,'applied',false));
  PERFORM taxiqaid_auth_api.admin_mirror_request(target);
  RETURN result;
 END IF;
 target:=(p_data->>'uid')::uuid;
 PERFORM 1 FROM taxiqaid_private.user_accounts WHERE user_id=target FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target AND (role_key='super_admin' OR account_type<>'management')) THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501'; END IF;
 INSERT INTO taxiqaid_private.user_admin_metadata(user_id) VALUES(target) ON CONFLICT DO NOTHING;
 snapshot:=taxiqaid_auth_api.admin_snapshot(target);
 SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op;
 IF FOUND THEN IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;RETURN prior.result||jsonb_build_object('replayed',true); END IF;
 IF snapshot->>'etag' IS DISTINCT FROM p_data->>'etag' OR (snapshot->>'version')::bigint IS DISTINCT FROM (p_data->>'version')::bigint THEN RAISE EXCEPTION 'STALE_ACCOUNT' USING ERRCODE='40001'; END IF;
 IF p_action='edit' THEN
  item:=p_data->'account';PERFORM taxiqaid_auth_api.admin_validate_account(item);
  IF item->>'role' NOT IN ('manager','supervisor') OR item->>'status' NOT IN ('active','disabled') OR item->>'username' !~ '^[a-z][a-z0-9]{1,47}$' OR length(item->>'fullName') NOT BETWEEN 1 AND 150 OR jsonb_array_length(item->'departments') NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'INVALID_ACCOUNT'; END IF;
  IF item->>'status' IS DISTINCT FROM snapshot->>'status' THEN PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.change-status'); END IF;
  FOR dep IN SELECT jsonb_array_elements_text(item->'departments') LOOP IF NOT dep=ANY(names) OR NOT EXISTS(SELECT FROM taxiqaid_private.departments WHERE department_key=dep AND is_active) THEN RAISE EXCEPTION 'INVALID_DEPARTMENT'; END IF; END LOOP;
  UPDATE taxiqaid_private.user_accounts SET username=item->>'username',full_name=item->>'fullName',role_key=item->>'role',status=item->>'status',updated_at=now() WHERE user_id=target;
  UPDATE taxiqaid_private.user_admin_metadata SET contact_email=nullif(item->>'contactEmail',''),auth_sync_pending=true WHERE user_id=target;
  DELETE FROM taxiqaid_private.user_departments WHERE user_id=target;
  INSERT INTO taxiqaid_private.user_departments(user_id,department_key,assigned_at) SELECT target,value,now() FROM jsonb_array_elements_text(item->'departments');
 ELSIF p_action='permissions' THEN
  IF snapshot->>'status'<>'active' OR jsonb_typeof(p_data->'patch')<>'object' THEN RAISE EXCEPTION 'INVALID_PERMISSIONS'; END IF;
  FOR permission IN SELECT * FROM jsonb_each(p_data->'patch') LOOP
   IF NOT taxiqaid_auth_api.admin_catalog()?permission.key OR taxiqaid_auth_api.admin_catalog()->permission.key->>'audience'='Driver' OR jsonb_typeof(permission.value)<>'boolean' OR NOT EXISTS(SELECT FROM taxiqaid_private.permissions WHERE permission_key=permission.key AND is_active) THEN RAISE EXCEPTION 'INVALID_CAPABILITY'; END IF;
   IF permission.value='true'::jsonb AND NOT taxiqaid_auth_api.admin_effective(target,permission.key,p_data->'patch') THEN RAISE EXCEPTION 'DEPENDENCY_REQUIRED'; END IF;
  END LOOP;
  FOR permission IN SELECT * FROM jsonb_each(p_data->'patch') LOOP
   INSERT INTO taxiqaid_private.user_permission_overrides(user_id,permission_key,is_allowed,updated_at,updated_by) VALUES(target,permission.key,(permission.value#>>'{}')::boolean,now(),p_actor) ON CONFLICT(user_id,permission_key) DO UPDATE SET is_allowed=EXCLUDED.is_allowed,updated_at=now(),updated_by=p_actor;
  END LOOP;
 ELSIF p_action<>'reset-reserve' AND p_action<>'auth-synced' THEN RAISE EXCEPTION 'UNKNOWN_ACTION'; END IF;
 UPDATE taxiqaid_private.user_admin_metadata SET version=version+1,updated_at=now(),auth_sync_pending=CASE WHEN p_action='auth-synced' THEN false ELSE auth_sync_pending END WHERE user_id=target;
 UPDATE taxiqaid_private.auth_login_identities SET is_enabled=(SELECT status='active' FROM taxiqaid_private.user_accounts WHERE user_id=target),revision=revision+1,synchronized_at=now() WHERE user_id=target;
 result:=jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(target));
 INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state,result) VALUES(op,p_actor,p_action,p_data-'operation',target,'completed',result);
 PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,target,jsonb_build_object('version',(result->'user'->>'version')::bigint,'before',CASE WHEN p_action='permissions' THEN snapshot->'overrides' ELSE jsonb_build_object('username',snapshot->'username','role',snapshot->'role','status',snapshot->'status','departments',snapshot->'departments') END,'after',CASE WHEN p_action='permissions' THEN result->'user'->'overrides' ELSE jsonb_build_object('username',result->'user'->'username','role',result->'user'->'role','status',result->'user'->'status','departments',result->'user'->'departments') END,'fields',CASE WHEN p_action='permissions' THEN (SELECT coalesce(jsonb_agg(key),'[]') FROM jsonb_object_keys(p_data->'patch') k(key)) ELSE '[]'::jsonb END));PERFORM taxiqaid_auth_api.admin_mirror_user(target);
 RETURN result;
END $$;
CREATE FUNCTION taxiqaid_auth_api.admin_mirror(p_actor uuid,p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE lock_id uuid:='11111111-1111-4111-8111-111111111111'; job taxiqaid_private.user_admin_operations%ROWTYPE; receipt jsonb; batch jsonb;
BEGIN
 PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.edit-user');
 INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state) VALUES(lock_id,p_actor,'mirror','{}',lock_id,'reserved') ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT job FROM taxiqaid_private.user_admin_operations WHERE id=lock_id FOR UPDATE;
 IF job.action<>'mirror' THEN RAISE EXCEPTION 'MIRROR_LOCK_COLLISION';END IF;
 IF p_action='mirror-claim' THEN
  IF job.lease_until>clock_timestamp() THEN RAISE EXCEPTION 'MIRROR_BUSY' USING ERRCODE='40001';END IF;
  UPDATE taxiqaid_private.user_admin_operations SET actor=p_actor,lease=(p_data->>'lease')::uuid,lease_until=clock_timestamp()+interval '2 minutes' WHERE id=lock_id;
  SELECT coalesce(jsonb_agg(to_jsonb(o)),'[]') INTO batch FROM (SELECT * FROM taxiqaid_private.user_admin_outbox WHERE available_at<=now() ORDER BY kind,entity LIMIT 10) o;
  RETURN jsonb_build_object('batch',batch,'leaseUntil',extract(epoch from clock_timestamp()+interval '2 minutes'));
 END IF;
 IF job.actor<>p_actor OR job.lease IS DISTINCT FROM (p_data->>'lease')::uuid OR job.lease_until<=clock_timestamp() OR jsonb_typeof(p_data->'receipts')<>'array' OR jsonb_array_length(p_data->'receipts')>10 THEN RAISE EXCEPTION 'MIRROR_LEASE_CONFLICT' USING ERRCODE='40001';END IF;
 FOR receipt IN SELECT value FROM jsonb_array_elements(p_data->'receipts') LOOP
  IF receipt->>'ok'='true' THEN DELETE FROM taxiqaid_private.user_admin_outbox WHERE kind=receipt->>'kind' AND entity=(receipt->>'entity')::uuid AND version=(receipt->>'version')::bigint;
  ELSE UPDATE taxiqaid_private.user_admin_outbox SET attempts=least(attempts+1,20),available_at=clock_timestamp()+make_interval(secs=>least(3600,60*power(2,least(attempts,6)))::integer) WHERE kind=receipt->>'kind' AND entity=(receipt->>'entity')::uuid AND version=(receipt->>'version')::bigint;END IF;
 END LOOP;
 UPDATE taxiqaid_private.user_admin_operations SET lease=NULL,lease_until=NULL WHERE id=lock_id;
 RETURN jsonb_build_object('acknowledged',true);
END $$;
-- Only the dispatcher is callable by the new runtime; helper functions remain owner-private.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='taxiqaid_auth_api'::regnamespace AND left(proname,6)='admin_' LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,taxiqaid_auth_login,taxiqaid_auth_backend,taxiqaid_user_admin_login',f.signature);END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb) TO taxiqaid_user_admin_backend;
SET LOCAL ROLE postgres;
REVOKE CREATE ON SCHEMA taxiqaid_private,taxiqaid_auth_api FROM taxiqaid_user_admin_owner;
-- Restore exactly the creator's own preexisting membership options; never revoke supabase_admin's grant.
DO $$ DECLARE original record; BEGIN
 SELECT * INTO original FROM admin_memberships WHERE member='postgres'::regrole AND grantor='postgres'::regrole;
 IF FOUND THEN EXECUTE format('GRANT taxiqaid_user_admin_owner TO postgres WITH ADMIN %s,INHERIT %s,SET %s GRANTED BY postgres',original.admin_option,original.inherit_option,original.set_option);
 ELSE REVOKE taxiqaid_user_admin_owner FROM postgres GRANTED BY postgres RESTRICT;END IF;
 IF EXISTS((SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM admin_memberships) UNION ALL (SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM admin_memberships EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole)) THEN RAISE EXCEPTION 'Temporary membership cleanup failed';END IF;
 IF has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE') OR has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_private','CREATE') THEN RAISE EXCEPTION 'Temporary CREATE cleanup failed';END IF;
 IF (SELECT accounts FROM admin_preserve) IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(a) ORDER BY user_id) FROM taxiqaid_private.user_accounts a) OR (SELECT memberships FROM admin_preserve) IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(m) ORDER BY user_id,department_key) FROM taxiqaid_private.user_departments m) OR (SELECT grants FROM admin_preserve) IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(r) ORDER BY role_key,permission_key) FROM taxiqaid_private.role_permissions r) OR (SELECT permissions FROM admin_preserve) IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(p) ORDER BY permission_key) FROM taxiqaid_private.permissions p) THEN RAISE EXCEPTION 'Existing accounts/memberships/grants/definitions changed';END IF;
 IF has_function_privilege('anon','taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)','EXECUTE') OR has_function_privilege('authenticated','taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)','EXECUTE') OR has_function_privilege('taxiqaid_auth_login','taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Administrative API leaked';END IF;
END $$;
COMMIT;
