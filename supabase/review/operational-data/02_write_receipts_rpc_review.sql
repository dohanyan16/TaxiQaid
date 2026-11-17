-- REVIEW ONLY. Transactional first installation; never rerun over an earlier receipt proposal.
-- No public RPC, service-role key, authentication-table changes or automatic activation.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) OR current_setting('server_version_num')::integer<160000 THEN RAISE EXCEPTION 'Ordinary Dashboard postgres / PostgreSQL 16 required';END IF;
 IF to_regclass('taxiqaid_private.operational_write_receipts') IS NOT NULL OR to_regprocedure('public.taxiqaid_driver_write_claim(uuid,uuid,text,integer,text)') IS NOT NULL OR EXISTS(SELECT FROM pg_roles WHERE rolname IN ('taxiqaid_operational_owner','taxiqaid_operational_backend','taxiqaid_operational_login')) THEN RAISE EXCEPTION 'COORDINATOR_COLLISION_REVIEW_REQUIRED';END IF;
 IF NOT EXISTS(SELECT FROM pg_proc p WHERE p.oid='taxiqaid_auth_api.admin_require(uuid,text,boolean)'::regprocedure AND p.proowner='taxiqaid_user_admin_owner'::regrole AND p.prosecdef AND 'row_security=on'=ANY(p.proconfig) AND EXISTS(SELECT FROM unnest(p.proconfig)c WHERE c IN ('search_path=pg_catalog, pg_temp','search_path=pg_catalog,pg_temp')) AND encode(sha256(convert_to(replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')='a09758b1330d5aaf243063e9a0453f5de268cbc9161fc87c7c7ceb00481d1df6') THEN RAISE EXCEPTION 'AUTHORIZATION_SOURCE_REVIEW_REQUIRED';END IF;
 IF has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'UNEXPECTED_EXISTING_CREATE';END IF;
END $$;
CREATE TEMP TABLE operational_existing_memberships ON COMMIT DROP AS SELECT * FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole;
DO $$ BEGIN
 IF EXISTS(SELECT FROM operational_existing_memberships WHERE member<>'postgres'::regrole OR grantor<>'supabase_admin'::regrole OR NOT admin_option OR inherit_option OR set_option) THEN RAISE EXCEPTION 'UNEXPECTED_ADMIN_MEMBERSHIP';END IF;
END $$;
CREATE ROLE taxiqaid_operational_owner NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION;
CREATE ROLE taxiqaid_operational_backend NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION;
CREATE ROLE taxiqaid_operational_login LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION CONNECTION LIMIT 3;
-- Provision the new restricted password privately only after SQL approval. No existing Secret changes.
GRANT taxiqaid_operational_backend TO taxiqaid_operational_login WITH ADMIN FALSE,INHERIT FALSE,SET TRUE;
CREATE TEMP TABLE operational_owner_memberships ON COMMIT DROP AS SELECT * FROM pg_auth_members WHERE roleid='taxiqaid_operational_owner'::regrole;
DO $$ BEGIN
 IF EXISTS(SELECT FROM operational_owner_memberships WHERE member<>'postgres'::regrole OR grantor<>'supabase_admin'::regrole OR NOT admin_option OR inherit_option OR set_option) THEN RAISE EXCEPTION 'UNEXPECTED_OWNER_MEMBERSHIP';END IF;
END $$;
GRANT taxiqaid_user_admin_owner TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET TRUE GRANTED BY postgres;
SET LOCAL ROLE taxiqaid_user_admin_owner;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.admin_require(uuid,text,boolean) TO taxiqaid_operational_owner;
SET LOCAL ROLE postgres;
REVOKE taxiqaid_user_admin_owner FROM postgres GRANTED BY postgres RESTRICT;
GRANT taxiqaid_operational_owner TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET TRUE GRANTED BY postgres;
GRANT USAGE,CREATE ON SCHEMA taxiqaid_private,taxiqaid_auth_api TO taxiqaid_operational_owner;
GRANT USAGE ON SCHEMA taxiqaid_auth_api TO taxiqaid_operational_backend;
SET LOCAL ROLE taxiqaid_operational_owner;
CREATE TABLE taxiqaid_private.operational_write_receipts (
 operation_id uuid PRIMARY KEY, actor_uid uuid NOT NULL, record_id text NOT NULL CHECK(length(record_id) BETWEEN 1 AND 128),
 expected_version integer NOT NULL CHECK(expected_version>=0),request_sha256 text NOT NULL CHECK(request_sha256~'^[a-f0-9]{64}$'),
 claim_key uuid NOT NULL,state text NOT NULL CHECK(state IN ('claimed','planned','driver_sent','driver_confirmed','fleet_sent','uncertain','applied','conflict')),
 plan jsonb CHECK(plan IS NULL OR jsonb_typeof(plan)='object' AND octet_length(plan::text)<=131072),
 result_record_id text,result_version integer,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((state='applied')=(result_record_id IS NOT NULL AND result_version IS NOT NULL)),
 CHECK(result_version IS NULL OR result_version>0)
);
-- A single global gate covers both Drivers and Fleet. Uncertain operations never expire automatically.
CREATE UNIQUE INDEX operational_write_one_pending ON taxiqaid_private.operational_write_receipts((1)) WHERE state NOT IN ('applied','conflict');
ALTER TABLE taxiqaid_private.operational_write_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxiqaid_private.operational_write_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY operational_owner_only ON taxiqaid_private.operational_write_receipts TO taxiqaid_operational_owner USING(true) WITH CHECK(true);
REVOKE ALL ON taxiqaid_private.operational_write_receipts FROM PUBLIC,anon,authenticated,service_role,taxiqaid_operational_login,taxiqaid_operational_backend;
CREATE FUNCTION taxiqaid_auth_api.operational_dispatch(p_actor uuid,p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE r taxiqaid_private.operational_write_receipts%ROWTYPE;op uuid;fingerprint text;next_state text;is_new boolean:=false;
BEGIN
 IF p_actor IS NULL OR p_action IS NULL OR p_action NOT IN ('ready','claim','seal','advance','finish') OR p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR octet_length(p_data::text)>140000 OR p_data->>'actor' IS DISTINCT FROM p_actor::text THEN RAISE EXCEPTION 'INVALID_REQUEST';END IF;
 -- Existing authoritative account/status/mapping/dependency/override checks. No copied permissions or new Auth policies.
 PERFORM taxiqaid_auth_api.admin_require(p_actor,'drivers.edit',false);
 IF p_action='ready' THEN RETURN jsonb_build_object('version',2);END IF;
 IF p_data->>'operation' IS NULL OR p_data->>'sha' IS NULL OR p_data->>'sha'!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'INVALID_REQUEST';END IF;
 op:=(p_data->>'operation')::uuid;fingerprint:=p_data->>'sha';
 IF p_action='claim' THEN
  IF p_data->>'recordId' IS NULL OR length(p_data->>'recordId') NOT BETWEEN 1 AND 128 OR jsonb_typeof(p_data->'version') IS DISTINCT FROM 'number' OR (p_data->>'version')!~'^[0-9]{1,9}$' THEN RAISE EXCEPTION 'INVALID_REQUEST';END IF;
  BEGIN
   INSERT INTO taxiqaid_private.operational_write_receipts(operation_id,actor_uid,record_id,expected_version,request_sha256,claim_key,state) VALUES(op,p_actor,p_data->>'recordId',(p_data->>'version')::integer,fingerprint,gen_random_uuid(),'claimed');is_new:=true;
  EXCEPTION WHEN unique_violation THEN NULL;END;
  SELECT * INTO r FROM taxiqaid_private.operational_write_receipts WHERE operation_id=op FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WRITE_BUSY';END IF;
  IF r.actor_uid<>p_actor OR r.request_sha256<>fingerprint OR r.record_id<>p_data->>'recordId' OR r.expected_version<>(p_data->>'version')::integer THEN RAISE EXCEPTION 'OPERATION_REUSED';END IF;
  RETURN jsonb_build_object('is_new',is_new,'state',r.state,'key',CASE WHEN is_new THEN r.claim_key ELSE NULL END,'plan',r.plan,'id',r.result_record_id,'version',r.result_version);
 END IF;
 SELECT * INTO r FROM taxiqaid_private.operational_write_receipts WHERE operation_id=op FOR UPDATE;
 IF NOT FOUND OR r.actor_uid<>p_actor OR r.request_sha256<>fingerprint THEN RAISE EXCEPTION 'OPERATION_NOT_FOUND';END IF;
 IF p_action='finish' AND p_data->>'state'='applied' AND r.state='applied' THEN RETURN jsonb_build_object('state',r.state);END IF;
 IF p_data->>'key' IS DISTINCT FROM r.claim_key::text AND NOT(coalesce(p_action='finish' AND p_data->>'state'='applied' AND p_data->'reconcile'='true'::jsonb AND r.state IN ('driver_sent','driver_confirmed','fleet_sent','uncertain'),false)) THEN RAISE EXCEPTION 'CLAIM_REQUIRED';END IF;
 IF p_action='seal' THEN
  IF r.state<>'claimed' OR r.plan IS NOT NULL OR jsonb_typeof(p_data->'plan') IS DISTINCT FROM 'object' OR jsonb_typeof(p_data->'plan'->'drivers') IS DISTINCT FROM 'array' OR jsonb_typeof(p_data->'plan'->'fleet') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'plan'->'drivers')<>1 OR jsonb_array_length(p_data->'plan'->'fleet')>2 OR p_data->'plan'->>'operation' IS DISTINCT FROM op::text OR p_data->'plan'->>'id' IS NULL OR (p_data->'plan'->>'version')::integer IS DISTINCT FROM r.expected_version+1 THEN RAISE EXCEPTION 'INVALID_PLAN';END IF;
  UPDATE taxiqaid_private.operational_write_receipts SET plan=p_data->'plan',state='planned',updated_at=clock_timestamp() WHERE operation_id=op;
  RETURN jsonb_build_object('state','planned');
 END IF;
 next_state:=p_data->>'state';
 IF next_state IS NULL OR NOT(
  p_action='advance' AND (r.state='planned' AND next_state='driver_sent' OR r.state='driver_sent' AND next_state='driver_confirmed' OR r.state='driver_confirmed' AND next_state='fleet_sent') OR
  p_action='finish' AND (next_state='conflict' AND r.state IN ('claimed','planned') OR next_state='uncertain' AND r.state IN ('driver_sent','driver_confirmed','fleet_sent','uncertain') OR next_state='applied' AND r.state IN ('driver_sent','driver_confirmed','fleet_sent','uncertain') AND r.plan IS NOT NULL)
 ) THEN RAISE EXCEPTION 'INVALID_TRANSITION';END IF;
 IF next_state='applied' AND (p_data->>'id' IS DISTINCT FROM r.plan->>'id' OR (p_data->>'version')::integer IS DISTINCT FROM (r.plan->>'version')::integer) THEN RAISE EXCEPTION 'INVALID_RESULT';END IF;
 UPDATE taxiqaid_private.operational_write_receipts SET state=next_state,result_record_id=CASE WHEN next_state='applied' THEN p_data->>'id' END,result_version=CASE WHEN next_state='applied' THEN (p_data->>'version')::integer END,updated_at=clock_timestamp() WHERE operation_id=op;
 RETURN jsonb_build_object('state',next_state);
END $$;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.operational_dispatch(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role,taxiqaid_operational_login;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.operational_dispatch(uuid,text,jsonb) TO taxiqaid_operational_backend;
SET LOCAL ROLE postgres;
REVOKE CREATE ON SCHEMA taxiqaid_private,taxiqaid_auth_api FROM taxiqaid_operational_owner;
REVOKE taxiqaid_operational_owner FROM postgres GRANTED BY postgres RESTRICT;
DO $$ BEGIN
 IF EXISTS((SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM operational_existing_memberships) UNION ALL (SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM operational_existing_memberships EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole)) OR EXISTS((SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_operational_owner'::regrole EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM operational_owner_memberships) UNION ALL (SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM operational_owner_memberships EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_operational_owner'::regrole)) THEN RAISE EXCEPTION 'TEMPORARY_MEMBERSHIP_REMAINS';END IF;
 IF has_schema_privilege('taxiqaid_operational_owner','taxiqaid_private','CREATE') OR has_schema_privilege('taxiqaid_operational_owner','taxiqaid_auth_api','CREATE') OR has_function_privilege('authenticated','taxiqaid_auth_api.operational_dispatch(uuid,text,jsonb)','EXECUTE') OR has_function_privilege('anon','taxiqaid_auth_api.operational_dispatch(uuid,text,jsonb)','EXECUTE') OR has_function_privilege('service_role','taxiqaid_auth_api.operational_dispatch(uuid,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'COORDINATOR_PRIVILEGES_UNSAFE';END IF;
END $$;
COMMIT;
