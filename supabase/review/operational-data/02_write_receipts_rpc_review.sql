-- REVIEW ONLY: activate only after owner signs off on this exact migration.
-- A single outstanding operation serializes writes to the Drivers workbook, including
-- uncertain Google outcomes. Never automatically release/expire uncertain operations.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';

CREATE TABLE IF NOT EXISTS taxiqaid_private.operational_write_receipts (
  operation_id uuid PRIMARY KEY,
  module_key text NOT NULL CHECK (module_key = 'drivers'),
  actor_uid uuid NOT NULL,
  record_id text NOT NULL CHECK (length(record_id) BETWEEN 1 AND 128),
  expected_version integer NOT NULL CHECK (expected_version >= 0),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  state text NOT NULL CHECK (state IN ('claimed','uncertain','applied','conflict')),
  result_record_id text,
  result_version integer,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX IF NOT EXISTS operational_write_one_pending
 ON taxiqaid_private.operational_write_receipts(module_key)
 WHERE state IN ('claimed','uncertain');
ALTER TABLE taxiqaid_private.operational_write_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON taxiqaid_private.operational_write_receipts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON taxiqaid_private.operational_write_receipts FROM service_role;

-- No browser may invoke these procedures. Backend alone may claim and resolve receipts.
CREATE OR REPLACE FUNCTION public.taxiqaid_driver_write_claim(
 p_operation uuid, p_actor uuid, p_record text, p_expected integer, p_fingerprint text
) RETURNS TABLE(result_state text, result_record_id text, result_version integer, is_new boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE r taxiqaid_private.operational_write_receipts%ROWTYPE;
BEGIN
 IF p_operation IS NULL OR p_actor IS NULL OR length(p_record) NOT BETWEEN 1 AND 128
   OR p_expected IS NULL OR p_expected < 0 OR p_fingerprint !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
 SELECT * INTO r FROM taxiqaid_private.operational_write_receipts
   WHERE operation_id=p_operation FOR UPDATE;
 IF FOUND THEN
   IF r.actor_uid<>p_actor OR r.record_id<>p_record OR
      r.expected_version<>p_expected OR r.request_sha256<>p_fingerprint
   THEN RAISE EXCEPTION 'OPERATION_REUSED'; END IF;
   RETURN QUERY SELECT r.state,r.result_record_id,r.result_version,false;
   RETURN;
 END IF;
 BEGIN
 INSERT INTO taxiqaid_private.operational_write_receipts
   (operation_id,module_key,actor_uid,record_id,expected_version,request_sha256,state)
 VALUES (p_operation,'drivers',p_actor,p_record,p_expected,p_fingerprint,'claimed');
 EXCEPTION WHEN unique_violation THEN
   RAISE EXCEPTION 'WRITE_BUSY';
 END;
 RETURN QUERY SELECT 'claimed'::text,NULL::text,NULL::integer,true;
END $fn$;

CREATE OR REPLACE FUNCTION public.taxiqaid_driver_write_finish(
 p_operation uuid, p_actor uuid, p_fingerprint text, p_state text,
 p_result_id text DEFAULT NULL, p_result_version integer DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE r taxiqaid_private.operational_write_receipts%ROWTYPE;
BEGIN
 IF p_state NOT IN ('uncertain','applied','conflict') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 SELECT * INTO r FROM taxiqaid_private.operational_write_receipts
   WHERE operation_id=p_operation FOR UPDATE;
 IF NOT FOUND OR r.actor_uid<>p_actor OR r.request_sha256<>p_fingerprint
 THEN RAISE EXCEPTION 'OPERATION_NOT_FOUND'; END IF;
 IF r.state IN ('applied','conflict') THEN RETURN r.state; END IF;
 IF r.state NOT IN ('claimed','uncertain') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 UPDATE taxiqaid_private.operational_write_receipts
 SET state=p_state, result_record_id=CASE WHEN p_state='applied' THEN p_result_id ELSE NULL END,
 result_version=CASE WHEN p_state='applied' THEN p_result_version ELSE NULL END,
 updated_at=clock_timestamp()
 WHERE operation_id=p_operation;
 RETURN p_state;
END $fn$;
REVOKE ALL ON FUNCTION public.taxiqaid_driver_write_claim(uuid,uuid,text,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.taxiqaid_driver_write_finish(uuid,uuid,text,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.taxiqaid_driver_write_claim(uuid,uuid,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.taxiqaid_driver_write_finish(uuid,uuid,text,text,text,integer) TO service_role;
COMMIT;
