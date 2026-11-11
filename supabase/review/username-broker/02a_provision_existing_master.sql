-- REVIEW ONLY. One-time mapping seed AFTER step 02, before verification/connection provisioning.
-- Reads the EXISTING active Master and its Auth UID/email. Creates no Auth identity or password and returns no private values.
BEGIN;
DO $$
DECLARE target record; matches integer;
BEGIN
 SELECT count(*) INTO matches FROM taxiqaid_private.user_accounts WHERE username='dohanyan' AND account_type='management';
 IF matches<>1 THEN RAISE EXCEPTION 'Existing Master mapping provisioning unavailable.'; END IF;
 SELECT user_id,username INTO STRICT target FROM taxiqaid_private.user_accounts WHERE username='dohanyan' AND account_type='management' AND status='active' AND role_key='super_admin';
 PERFORM taxiqaid_auth_api.synchronize_management_identity(target.user_id,target.username,0);
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Existing Master mapping provisioning unavailable.' USING ERRCODE='P0001';
END $$;
COMMIT;
-- An existing mapping stops this initial-seed script; use the separately reviewed suspension/resynchronization workflow instead.
