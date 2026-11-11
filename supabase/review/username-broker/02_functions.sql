-- REVIEW ONLY. Execute as the reviewed Dashboard administrator after step 01. All objects are new.
BEGIN;
-- Temporary administrator memberships/CREATE permit ownership transfer; removed before commit.
GRANT taxiqaid_auth_lookup_owner,taxiqaid_auth_access_owner,taxiqaid_auth_rate_owner TO postgres;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_auth_lookup_owner,taxiqaid_auth_access_owner,taxiqaid_auth_rate_owner;
CREATE FUNCTION taxiqaid_auth_api.consume_login_counters(p_ip text,p_account text,p_global text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog,pg_temp SET row_security = on AS $$
DECLARE
 instant timestamptz := pg_catalog.clock_timestamp();
 keys text[] := ARRAY[p_global,p_ip,p_account];
 widths integer[] := ARRAY[60,60,900];
 limits integer[] := ARRAY[200,20,10];
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
ALTER FUNCTION taxiqaid_auth_api.consume_login_counters(text,text,text) OWNER TO taxiqaid_auth_rate_owner;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.consume_login_counters(text,text,text) FROM PUBLIC,anon,authenticated,taxiqaid_auth_backend,taxiqaid_auth_login;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.consume_login_counters(text,text,text) TO taxiqaid_auth_lookup_owner;

CREATE FUNCTION taxiqaid_auth_api.begin_login_attempt(p_identifier text,p_ip text,p_account text,p_global text)
RETURNS TABLE(allowed boolean,uid uuid,email text,status text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog,pg_temp SET row_security = on AS $$
DECLARE match_count integer; match_uid uuid; match_email text; match_status text;
BEGIN
 -- There is no separately callable unthrottled identifier/email lookup for the runtime role.
 IF NOT taxiqaid_auth_api.consume_login_counters(p_ip,p_account,p_global) THEN
  RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text; RETURN;
 END IF;
 -- Numeric Iqamas cannot resolve an identity until separately approved provisioning exists.
 IF p_identifier IS NULL OR p_identifier !~ '^[a-z][a-z0-9]{1,47}$' THEN
  RETURN QUERY SELECT true,NULL::uuid,NULL::text,NULL::text; RETURN;
 END IF;
 SELECT count(*),(pg_catalog.array_agg(m.user_id))[1],(pg_catalog.array_agg(m.email))[1],(pg_catalog.array_agg(m.status))[1]
 INTO match_count,match_uid,match_email,match_status
 FROM (SELECT a.user_id,u.email,a.status FROM taxiqaid_private.user_accounts AS a JOIN auth.users AS u ON u.id=a.user_id
  WHERE a.username=p_identifier AND a.account_type='management' AND a.status='active' LIMIT 2) AS m;
 IF match_count<>1 THEN RETURN QUERY SELECT true,NULL::uuid,NULL::text,NULL::text; RETURN; END IF;
 IF match_uid IS NULL OR match_email IS NULL OR match_email='' THEN
  RETURN QUERY SELECT true,NULL::uuid,NULL::text,NULL::text; RETURN;
 END IF;
 RETURN QUERY SELECT true,match_uid,match_email,match_status;
END $$;
ALTER FUNCTION taxiqaid_auth_api.begin_login_attempt(text,text,text,text) OWNER TO taxiqaid_auth_lookup_owner;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.begin_login_attempt(text,text,text,text) FROM PUBLIC,anon,authenticated,taxiqaid_auth_login;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.begin_login_attempt(text,text,text,text) TO taxiqaid_auth_backend;

CREATE FUNCTION taxiqaid_auth_api.get_management_access(p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog,pg_temp SET row_security = on AS $$
DECLARE profile record; memberships jsonb; defaults jsonb; effects jsonb;
BEGIN
 SELECT a.user_id,a.username,a.full_name,a.account_type,a.role_key,a.status INTO STRICT profile
 FROM taxiqaid_private.user_accounts AS a WHERE a.user_id=p_uid AND a.status='active' AND a.account_type='management';
 IF profile.full_name IS NULL OR pg_catalog.btrim(profile.full_name)='' THEN RAISE EXCEPTION 'Access unavailable.' USING ERRCODE='28000'; END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(DISTINCT d.department_key),'[]'::jsonb) INTO memberships
 FROM taxiqaid_private.user_departments AS m JOIN taxiqaid_private.departments AS d ON d.department_key=m.department_key
 WHERE m.user_id=p_uid AND d.is_active=true;
 IF EXISTS (SELECT FROM pg_catalog.jsonb_array_elements_text(memberships) AS d(code) WHERE d.code NOT IN ('customer_service','finance','financial','hr','it','maintenance','operation','planning','qhse')) THEN RAISE EXCEPTION 'Access unavailable.' USING ERRCODE='28000'; END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(DISTINCT r.permission_key),'[]'::jsonb) INTO defaults
 FROM taxiqaid_private.role_permissions AS r JOIN taxiqaid_private.permissions AS p ON p.permission_key=r.permission_key
 WHERE r.role_key=profile.role_key AND r.is_allowed=true AND p.is_active=true;
 SELECT coalesce(pg_catalog.jsonb_object_agg(e.permission_key,CASE WHEN e.allowed THEN 'allow' ELSE 'deny' END),'{}'::jsonb) INTO effects
 FROM (SELECT o.permission_key,pg_catalog.bool_and(o.is_allowed) AS allowed
  FROM taxiqaid_private.user_permission_overrides AS o JOIN taxiqaid_private.permissions AS p ON p.permission_key=o.permission_key
  WHERE o.user_id=p_uid AND p.is_active=true GROUP BY o.permission_key) AS e;
 RETURN pg_catalog.jsonb_build_object('version',1,'uid',p_uid,
  'account',pg_catalog.jsonb_build_object('uid',p_uid,'username',profile.username,'fullName',profile.full_name,'type',profile.account_type,'role',profile.role_key,'status',profile.status),
  'departments',memberships,'permissions',pg_catalog.jsonb_build_object('roleDefaults',defaults,'overrides',effects),
  'scope',pg_catalog.jsonb_build_object('departments','[]'::jsonb,'driverRecordRefs','[]'::jsonb,'documentIds','[]'::jsonb),
  'validUntil',pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.statement_timestamp())*1000)+60000);
END $$;
ALTER FUNCTION taxiqaid_auth_api.get_management_access(uuid) OWNER TO taxiqaid_auth_access_owner;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.get_management_access(uuid) FROM PUBLIC,anon,authenticated,taxiqaid_auth_login;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.get_management_access(uuid) TO taxiqaid_auth_backend;

CREATE FUNCTION taxiqaid_auth_api.prune_login_counters(p_limit integer DEFAULT 1000)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog,pg_temp SET row_security = on AS $$
DECLARE deleted integer;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>1000 THEN RAISE EXCEPTION 'Invalid cleanup limit.' USING ERRCODE='22023'; END IF;
 WITH expired AS (SELECT bucket,window_start FROM taxiqaid_private.login_attempt_counters WHERE expires_at<pg_catalog.now()-interval '5 minutes' ORDER BY expires_at LIMIT p_limit FOR UPDATE SKIP LOCKED)
 DELETE FROM taxiqaid_private.login_attempt_counters AS c USING expired AS e WHERE c.bucket=e.bucket AND c.window_start=e.window_start;
 GET DIAGNOSTICS deleted=ROW_COUNT; RETURN deleted;
END $$;
ALTER FUNCTION taxiqaid_auth_api.prune_login_counters(integer) OWNER TO taxiqaid_auth_rate_owner;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.prune_login_counters(integer) FROM PUBLIC,anon,authenticated,taxiqaid_auth_backend,taxiqaid_auth_login;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.prune_login_counters(integer) TO postgres;
REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM taxiqaid_auth_lookup_owner,taxiqaid_auth_access_owner,taxiqaid_auth_rate_owner;
REVOKE taxiqaid_auth_lookup_owner,taxiqaid_auth_access_owner,taxiqaid_auth_rate_owner FROM postgres;
COMMIT;
