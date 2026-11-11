-- REVIEW ONLY. Owner-run after 00_inspect.sql. No automatic deployment or Auth-account changes. The private identity mapping is a new security-only proposal.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname='taxiqaid_auth_backend' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication) THEN
  RAISE EXCEPTION 'Existing backend NOLOGIN role must be reviewed first.';
 END IF;
 IF EXISTS (SELECT FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.member WHERE r.rolname='taxiqaid_auth_backend') THEN
  RAISE EXCEPTION 'Unexpected backend role memberships.';
 END IF;
 IF pg_catalog.to_regclass('taxiqaid_private.login_attempt_counters') IS NULL THEN RAISE EXCEPTION 'Existing counter table required; do not recreate it.'; END IF;
 IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='taxiqaid_private' AND c.relname IN ('user_accounts','departments','user_departments','permissions','role_permissions','user_permission_overrides','login_attempt_counters') AND NOT c.relrowsecurity) THEN
  RAISE EXCEPTION 'Existing RLS must remain enabled.';
 END IF;
END $$;
-- New, dedicated roles only. An existing name stops this one-time script; inspect rather than overwriting it.
CREATE ROLE taxiqaid_auth_login NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 4;
CREATE ROLE taxiqaid_auth_lookup_owner NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE taxiqaid_auth_access_owner NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE taxiqaid_auth_rate_owner NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE SCHEMA taxiqaid_auth_api;
REVOKE ALL ON SCHEMA taxiqaid_auth_api FROM PUBLIC,anon,authenticated;
GRANT CONNECT ON DATABASE postgres TO taxiqaid_auth_login;
GRANT taxiqaid_auth_backend TO taxiqaid_auth_login;
GRANT USAGE ON SCHEMA taxiqaid_auth_api TO taxiqaid_auth_backend,taxiqaid_auth_lookup_owner,taxiqaid_auth_access_owner,taxiqaid_auth_rate_owner;
GRANT USAGE ON SCHEMA taxiqaid_private TO taxiqaid_auth_lookup_owner,taxiqaid_auth_access_owner,taxiqaid_auth_rate_owner;
-- Only this private security table is new. The Auth FK requires administrator REFERENCES(id), not runtime Auth access.
CREATE TABLE taxiqaid_private.auth_login_identities (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 technical_email text NOT NULL CHECK (technical_email=pg_catalog.btrim(technical_email) AND technical_email ~ '^[^[:space:]@]+@[^[:space:]@]+$'),
 is_enabled boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 1 CHECK (revision>0),
 synchronized_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 updated_by_db_role text NOT NULL DEFAULT session_user
);
CREATE UNIQUE INDEX auth_login_identities_email_key ON taxiqaid_private.auth_login_identities (pg_catalog.lower(technical_email));
ALTER TABLE taxiqaid_private.auth_login_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxiqaid_private.auth_login_identities FORCE ROW LEVEL SECURITY;
REVOKE ALL ON taxiqaid_private.auth_login_identities FROM PUBLIC,anon,authenticated,taxiqaid_auth_backend,taxiqaid_auth_login;
GRANT SELECT(user_id,technical_email,is_enabled,revision) ON taxiqaid_private.auth_login_identities TO taxiqaid_auth_lookup_owner;
GRANT SELECT(user_id,is_enabled,revision) ON taxiqaid_private.auth_login_identities TO taxiqaid_auth_access_owner;
CREATE POLICY taxiqaid_lookup_identities ON taxiqaid_private.auth_login_identities FOR SELECT TO taxiqaid_auth_lookup_owner USING (is_enabled);
CREATE POLICY taxiqaid_access_identity_revision ON taxiqaid_private.auth_login_identities FOR SELECT TO taxiqaid_auth_access_owner USING (is_enabled);
-- No runtime role or definer owner gets any auth.users grant, including schema USAGE. Managed Auth RLS is untouched.

GRANT SELECT(user_id,username,account_type,status) ON taxiqaid_private.user_accounts TO taxiqaid_auth_lookup_owner;
CREATE POLICY taxiqaid_lookup_accounts ON taxiqaid_private.user_accounts FOR SELECT TO taxiqaid_auth_lookup_owner USING (account_type='management');
GRANT SELECT(user_id,username,full_name,account_type,role_key,status) ON taxiqaid_private.user_accounts TO taxiqaid_auth_access_owner;
GRANT SELECT(department_key,is_active) ON taxiqaid_private.departments TO taxiqaid_auth_access_owner;
GRANT SELECT(user_id,department_key) ON taxiqaid_private.user_departments TO taxiqaid_auth_access_owner;
GRANT SELECT(permission_key,is_active) ON taxiqaid_private.permissions TO taxiqaid_auth_access_owner;
GRANT SELECT(role_key,permission_key,is_allowed) ON taxiqaid_private.role_permissions TO taxiqaid_auth_access_owner;
GRANT SELECT(user_id,permission_key,is_allowed) ON taxiqaid_private.user_permission_overrides TO taxiqaid_auth_access_owner;
CREATE POLICY taxiqaid_access_accounts ON taxiqaid_private.user_accounts FOR SELECT TO taxiqaid_auth_access_owner USING (account_type='management' AND status='active');
CREATE POLICY taxiqaid_access_departments ON taxiqaid_private.departments FOR SELECT TO taxiqaid_auth_access_owner USING (is_active);
CREATE POLICY taxiqaid_access_memberships ON taxiqaid_private.user_departments FOR SELECT TO taxiqaid_auth_access_owner USING (true);
CREATE POLICY taxiqaid_access_definitions ON taxiqaid_private.permissions FOR SELECT TO taxiqaid_auth_access_owner USING (is_active);
CREATE POLICY taxiqaid_access_roles ON taxiqaid_private.role_permissions FOR SELECT TO taxiqaid_auth_access_owner USING (true);
CREATE POLICY taxiqaid_access_overrides ON taxiqaid_private.user_permission_overrides FOR SELECT TO taxiqaid_auth_access_owner USING (true);
GRANT SELECT,INSERT,UPDATE,DELETE ON taxiqaid_private.login_attempt_counters TO taxiqaid_auth_rate_owner;
CREATE POLICY taxiqaid_rate_select ON taxiqaid_private.login_attempt_counters FOR SELECT TO taxiqaid_auth_rate_owner USING (true);
CREATE POLICY taxiqaid_rate_insert ON taxiqaid_private.login_attempt_counters FOR INSERT TO taxiqaid_auth_rate_owner WITH CHECK (true);
CREATE POLICY taxiqaid_rate_update ON taxiqaid_private.login_attempt_counters FOR UPDATE TO taxiqaid_auth_rate_owner USING (true) WITH CHECK (true);
CREATE POLICY taxiqaid_rate_delete ON taxiqaid_private.login_attempt_counters FOR DELETE TO taxiqaid_auth_rate_owner USING (expires_at < pg_catalog.now()-interval '5 minutes');
COMMIT;
