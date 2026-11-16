-- REVIEW ONLY. Optional one-time credential provisioning through Dashboard; no secret literal or result.
-- Requires the existing Supabase Vault and pgcrypto extension. Do not install extensions automatically.
-- Requires the reviewed existing-Master mapping from step 02a; never substitutes a new Auth account.
-- The generated credential is for the new PostgreSQL connection role ONLY, never the Master/Auth account.
BEGIN;
SET LOCAL password_encryption = 'scram-sha-256';
DO $$
DECLARE credential text;
BEGIN
 IF (SELECT count(*) FROM taxiqaid_private.auth_login_identities m JOIN taxiqaid_private.user_accounts a ON a.user_id=m.user_id JOIN auth.users u ON u.id=m.user_id AND u.email=m.technical_email
  WHERE m.is_enabled=true AND a.username='dohanyan' AND a.account_type='management' AND a.status='active' AND a.role_key='super_admin')<>1 THEN RAISE EXCEPTION 'Reviewed existing-Master mapping required before connection provisioning.'; END IF;
 IF pg_catalog.to_regprocedure('vault.create_secret(text,text,text,uuid)') IS NULL OR pg_catalog.to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL THEN RAISE EXCEPTION 'Review available Vault/pgcrypto support before provisioning.'; END IF;
 IF EXISTS(SELECT FROM vault.secrets WHERE name='taxiqaid_broker_database_password') THEN RAISE EXCEPTION 'Existing credential must not be reset by this one-time procedure.'; END IF;
 IF NOT EXISTS(SELECT FROM pg_catalog.pg_roles WHERE rolname='taxiqaid_auth_login' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper AND NOT rolinherit) THEN RAISE EXCEPTION 'New disabled restricted login role required.'; END IF;
 credential:=pg_catalog.encode(extensions.gen_random_bytes(32),'hex');
 PERFORM vault.create_secret(credential,'taxiqaid_broker_database_password','Dedicated restricted broker connection only.');
 EXECUTE pg_catalog.format('ALTER ROLE taxiqaid_auth_login LOGIN PASSWORD %L',credential);
 credential:=NULL;
END $$;
COMMIT;
-- Reveal this one credential privately in Dashboard Vault only to build TAXIQAID_BROKER_DB_URL in Edge Function Secrets.
-- Never SELECT/print it in a SQL result, paste it into a saved SQL statement, Git, chat, command line or test report.
