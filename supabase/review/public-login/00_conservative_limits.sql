-- REVIEW ONLY: conservative initial low-volume budget, not a claim of measured native capacity.
-- Existing signature, owner, ACL, table and fixed-window semantics are preserved. No counters are reset.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT FROM pg_catalog.pg_auth_members WHERE member=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='postgres') AND roleid=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='taxiqaid_auth_rate_owner')) OR pg_catalog.has_schema_privilege('taxiqaid_auth_rate_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'Review preexisting administrative privileges.'; END IF;
 IF (SELECT pg_catalog.pg_get_userbyid(proowner) FROM pg_catalog.pg_proc WHERE oid='taxiqaid_auth_api.consume_login_counters(text,text,text)'::regprocedure)<>'taxiqaid_auth_rate_owner' THEN RAISE EXCEPTION 'Unexpected existing function owner.'; END IF;
END $$;
GRANT taxiqaid_auth_rate_owner TO postgres;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_auth_rate_owner;
CREATE OR REPLACE FUNCTION taxiqaid_auth_api.consume_login_counters(p_ip text,p_account text,p_global text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog,pg_temp SET row_security = on AS $$
DECLARE
 instant timestamptz := pg_catalog.clock_timestamp();
 keys text[] := ARRAY[p_global,p_ip,p_account];
 widths integer[] := ARRAY[60,60,900];
 limits integer[] := ARRAY[20,2,10];
 start_at timestamptz; used bigint; position integer;
BEGIN
 IF p_ip IS NULL OR p_account IS NULL OR p_global IS NULL OR p_ip !~ '^[0-9a-f]{64}$' OR p_account !~ '^[0-9a-f]{64}$' OR p_global !~ '^[0-9a-f]{64}$' OR p_ip=p_account OR p_ip=p_global OR p_account=p_global THEN
  RAISE EXCEPTION 'Invalid attempt.' USING ERRCODE='22023';
 END IF;
 -- A common lock order avoids cross-bucket deadlocks. Denials also commit the consumed earlier buckets.
 FOR position IN 1..3 LOOP
  start_at := pg_catalog.to_timestamp(pg_catalog.floor(EXTRACT(epoch FROM instant)/widths[position])*widths[position]);
  INSERT INTO taxiqaid_private.login_attempt_counters AS c(bucket,window_start,expires_at,attempts)
   VALUES(keys[position],start_at,start_at+pg_catalog.make_interval(secs=>widths[position]),1)
   ON CONFLICT(bucket,window_start) DO UPDATE SET attempts=least(c.attempts,limits[position]::bigint)+1
   RETURNING attempts INTO used;
  IF used>limits[position] THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM taxiqaid_auth_rate_owner;
REVOKE taxiqaid_auth_rate_owner FROM postgres;
COMMIT;
