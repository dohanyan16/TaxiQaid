-- REVIEW ONLY. Do not execute for readonly deployment. No existing object, grant or role is changed.
-- This table alone is NOT a complete writer: restricted owner/API functions need independent review.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
CREATE TABLE taxiqaid_private.operational_write_receipts (
 operation_id uuid PRIMARY KEY,
 actor_uid uuid NOT NULL,
 module_key text NOT NULL CHECK (module_key='drivers'),
 record_id uuid NOT NULL,
 expected_version bigint NOT NULL CHECK (expected_version>0),
 request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
 state text NOT NULL CHECK (state IN ('claimed','uncertain','applied','conflict')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- One unresolved Google write across the entire workbook. An uncertain write never expires automatically.
CREATE UNIQUE INDEX operational_write_one_writer ON taxiqaid_private.operational_write_receipts(module_key)
 WHERE state IN ('claimed','uncertain');
ALTER TABLE taxiqaid_private.operational_write_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON taxiqaid_private.operational_write_receipts FROM PUBLIC,anon,authenticated;
-- No browser policy, broad service key, grants, seed records, trigger or automatic cleanup.
-- Recovery uses exact event/record/version evidence; do not delete unresolved receipts or audit history.
COMMIT;
