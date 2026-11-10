-- Review-only security addition. Never apply automatically; it does not modify the six existing identity tables.
-- Apply only after baseline inspection, approved least-privilege role grants and deployment workflow approval.
BEGIN;
CREATE TABLE taxiqaid_private.login_attempt_counters (
 bucket text NOT NULL CHECK (bucket ~ '^[0-9a-f]{64}$'),
 window_start timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 attempts bigint NOT NULL CHECK (attempts > 0),
 PRIMARY KEY (bucket, window_start)
);
ALTER TABLE taxiqaid_private.login_attempt_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON taxiqaid_private.login_attempt_counters FROM PUBLIC, anon, authenticated;
CREATE INDEX login_attempt_counters_expiry ON taxiqaid_private.login_attempt_counters(expires_at);
COMMIT;
-- Grants alone are insufficient under RLS: approve server-role-only policies or a narrowly protected counter function.
-- Never grant anonymous/authenticated access or disable RLS to make the broker work.
-- Assign only SELECT/INSERT/UPDATE to the separately reviewed backend connection role.
-- Configure bounded periodic DELETE WHERE expires_at < now(); never expose counters through the Data API.
-- Do not drop the table as a rollback while a broker may still be using it: disable the broker first.
