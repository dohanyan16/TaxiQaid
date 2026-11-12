-- TEST FIXTURE ONLY: historical broken bodies from 095f494. Never execute against Supabase.
CREATE FUNCTION taxiqaid_auth_api.public_login_limits_healthy()
RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
 SELECT EXISTS(SELECT FROM taxiqaid_private.login_attempt_counters
 WHERE bucket='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d282791' AND window_start=to_timestamp(0) AND expires_at>clock_timestamp());
$$;
ALTER FUNCTION taxiqaid_auth_api.public_login_limits_healthy() OWNER TO taxiqaid_auth_rate_owner;
SET LOCAL ROLE taxiqaid_auth_rate_owner;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.public_login_limits_healthy() FROM PUBLIC,anon,authenticated,taxiqaid_auth_login,taxiqaid_auth_backend;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.public_login_limits_healthy() TO taxiqaid_auth_lookup_owner,postgres;
SET LOCAL ROLE postgres;

CREATE FUNCTION taxiqaid_auth_api.maintain_public_login_counters(p_limit integer DEFAULT 1000)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE removed integer;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>1000 THEN RAISE EXCEPTION 'Invalid cleanup limit.'; END IF;
 removed:=taxiqaid_auth_api.prune_login_counters(p_limit);
 IF EXISTS(SELECT FROM taxiqaid_private.login_attempt_counters WHERE expires_at<now()-interval '5 minutes') THEN
  UPDATE taxiqaid_private.login_attempt_counters SET expires_at=clock_timestamp() WHERE bucket='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d282791' AND window_start=to_timestamp(0);
  RETURN removed;
 END IF;
 -- One reserved maintenance watermark in the existing table; no private identity/IP is stored here.
 INSERT INTO taxiqaid_private.login_attempt_counters(bucket,window_start,expires_at,attempts)
 VALUES('dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d282791',to_timestamp(0),clock_timestamp()+interval '5 minutes',1)
 ON CONFLICT(bucket,window_start) DO UPDATE SET expires_at=EXCLUDED.expires_at,attempts=1;
 RETURN removed;
END $$;
ALTER FUNCTION taxiqaid_auth_api.maintain_public_login_counters(integer) OWNER TO taxiqaid_auth_rate_owner;
SET LOCAL ROLE taxiqaid_auth_rate_owner;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.maintain_public_login_counters(integer) FROM PUBLIC,anon,authenticated,taxiqaid_auth_login,taxiqaid_auth_backend,taxiqaid_auth_lookup_owner;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.maintain_public_login_counters(integer) TO postgres;
SET LOCAL ROLE postgres;

CREATE FUNCTION taxiqaid_auth_api.claim_gateway_nonce(p_nonce text,p_issued bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE claimed integer;
BEGIN
 IF NOT taxiqaid_auth_api.public_login_limits_healthy() OR p_nonce IS NULL OR p_nonce !~ '^[0-9a-f]{64}$' OR p_nonce='dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d282791' OR p_issued IS NULL OR p_issued<floor(extract(epoch FROM clock_timestamp()))-60 OR p_issued>floor(extract(epoch FROM clock_timestamp()))+5 THEN RETURN false; END IF;
 INSERT INTO taxiqaid_private.login_attempt_counters(bucket,window_start,expires_at,attempts)
 VALUES(p_nonce,to_timestamp(p_issued),to_timestamp(p_issued)+interval '2 minutes',1)
 ON CONFLICT(bucket,window_start) DO NOTHING RETURNING 1 INTO claimed;
 RETURN coalesce(claimed=1,false);
END $$;
ALTER FUNCTION taxiqaid_auth_api.claim_gateway_nonce(text,bigint) OWNER TO taxiqaid_auth_rate_owner;
SET LOCAL ROLE taxiqaid_auth_rate_owner;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.claim_gateway_nonce(text,bigint) FROM PUBLIC,anon,authenticated,taxiqaid_auth_login,taxiqaid_auth_backend;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.claim_gateway_nonce(text,bigint) TO taxiqaid_auth_lookup_owner;
SET LOCAL ROLE postgres;

CREATE FUNCTION taxiqaid_auth_api.begin_signed_login_attempt(p_identifier text,p_ip text,p_account text,p_global text,p_nonce text,p_issued bigint)
RETURNS TABLE(allowed boolean,uid uuid,email text,status text,mapping_revision bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE attempt record;
BEGIN
 IF NOT taxiqaid_auth_api.public_login_limits_healthy() THEN RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text,NULL::bigint; RETURN; END IF;
 -- Reuses existing atomic global/IP/identifier limits BEFORE its internal private lookup.
 SELECT * INTO STRICT attempt FROM taxiqaid_auth_api.begin_login_attempt(p_identifier,p_ip,p_account,p_global);
 IF NOT attempt.allowed THEN RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text,NULL::bigint; RETURN; END IF;
 IF NOT coalesce(taxiqaid_auth_api.claim_gateway_nonce(p_nonce,p_issued),false) THEN
  RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text,NULL::bigint; RETURN;
 END IF;
 -- A nonce is claimed only after global admission, bounding nonce growth. Replay releases no mapping/session.
 RETURN QUERY SELECT attempt.allowed,attempt.uid,attempt.email,attempt.status,attempt.mapping_revision;
END $$;
ALTER FUNCTION taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint) OWNER TO taxiqaid_auth_lookup_owner;
SET LOCAL ROLE taxiqaid_auth_lookup_owner;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint) FROM PUBLIC,anon,authenticated,taxiqaid_auth_login;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.begin_signed_login_attempt(text,text,text,text,text,bigint) TO taxiqaid_auth_backend;
SET LOCAL ROLE postgres;
