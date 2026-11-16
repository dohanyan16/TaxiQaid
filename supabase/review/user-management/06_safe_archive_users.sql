-- TaxiQaid controlled account archival; no Auth user, historical record, or audit deletion.
-- Existing admin SQL must exactly match the installed, owner-reviewed baseline.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $preflight$
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'Dashboard postgres required';END IF;
 IF has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'Unexpected owner CREATE grant';END IF;
 IF EXISTS(SELECT FROM information_schema.columns WHERE table_schema='taxiqaid_private' AND table_name='user_admin_metadata' AND column_name='archived_at') THEN RAISE EXCEPTION 'Archive column already present';END IF;
 IF NOT EXISTS(SELECT FROM pg_proc p WHERE p.oid='taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)'::regprocedure AND p.proowner='taxiqaid_user_admin_owner'::regrole AND p.prosecdef AND replace(p.prosrc,E'\r\n',E'\n')=$baseline$
DECLARE target uuid; op uuid; v_lease uuid; actor_cap text; snapshot jsonb; item jsonb; prior taxiqaid_private.user_admin_operations%ROWTYPE; request_row taxiqaid_private.driver_profile_requests%ROWTYPE; fields jsonb; permission record; dep text; names text[]:=ARRAY['operation','fleet','maintenance','finance','hr','qhse','it']; result jsonb; changed integer;
BEGIN
 actor_cap:=CASE p_action WHEN 'authorize' THEN coalesce(p_data->>'capability','user-management.view') WHEN 'list' THEN 'user-management.view' WHEN 'create-reserve' THEN 'user-management.create-user' WHEN 'create-finish' THEN 'user-management.create-user' WHEN 'create-recover' THEN 'user-management.create-user' WHEN 'create-pending' THEN 'user-management.create-user' WHEN 'permissions' THEN 'user-management.manage-permissions' WHEN 'requests' THEN 'user-management.profile-requests.view' WHEN 'request-enqueue' THEN 'user-management.profile-requests.view' WHEN 'request-approve' THEN 'driver-profile.approve' WHEN 'request-reject' THEN 'driver-profile.reject' ELSE 'user-management.edit-user' END;
 PERFORM taxiqaid_auth_api.admin_require(p_actor,actor_cap,CASE WHEN p_action='authorize' THEN NOT coalesce((p_data->>'read')::boolean,false) ELSE p_action NOT IN ('list','requests') END);
 IF p_action IN ('mirror-claim','mirror-ack') THEN RETURN taxiqaid_auth_api.admin_mirror(p_actor,p_action,p_data); END IF;
 IF p_action='authorize' THEN RETURN jsonb_build_object('authorized',true); END IF;
 IF p_action='operations' THEN
  RETURN jsonb_build_object('operations',(SELECT coalesce(jsonb_agg(jsonb_build_object('operation',id,'username',username,'state',state,'createdAt',created_at) ORDER BY created_at),'[]') FROM (SELECT * FROM taxiqaid_private.user_admin_operations WHERE actor=p_actor AND action='create' AND state<>'completed' ORDER BY created_at LIMIT 100) o));
 END IF;
 IF p_action='create-pending' THEN
  PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.create-user');
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=(p_data->>'operation')::uuid AND actor=p_actor AND action='create';
  RETURN jsonb_build_object('account',prior.payload,'operation',prior.id);
 END IF;
 IF p_action='identity' THEN
  target:=(p_data->>'uid')::uuid;
  IF NOT EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target AND account_type='management' AND role_key<>'super_admin') THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501';END IF;
  RETURN (SELECT jsonb_build_object('uid',user_id,'email',technical_email) FROM taxiqaid_private.auth_login_identities WHERE user_id=target);
 END IF;
 IF p_action='list' THEN
  IF length(coalesce(p_data->>'search',''))>100 OR coalesce((p_data->>'limit')::integer,100) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT coalesce(jsonb_agg(taxiqaid_auth_api.admin_snapshot(a.user_id) ORDER BY a.user_id),'[]') INTO result FROM (SELECT user_id FROM taxiqaid_private.user_accounts WHERE account_type='management' AND (p_data->>'after' IS NULL OR user_id>(p_data->>'after')::uuid) AND (coalesce(p_data->>'search','')='' OR username ILIKE '%'||(p_data->>'search')||'%' OR full_name ILIKE '%'||(p_data->>'search')||'%' OR user_id::text=p_data->>'search' OR EXISTS(SELECT FROM taxiqaid_private.user_admin_metadata m WHERE m.user_id=user_accounts.user_id AND m.contact_email ILIKE '%'||(p_data->>'search')||'%')) ORDER BY user_id LIMIT coalesce((p_data->>'limit')::integer,100)) a;
  RETURN jsonb_build_object('users',result,'departments',(SELECT coalesce(jsonb_agg(department_key ORDER BY department_key),'[]') FROM taxiqaid_private.departments WHERE is_active AND department_key=ANY(names)));
 END IF;
 IF p_action='requests' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('history',(SELECT coalesce(jsonb_agg(jsonb_build_object('action',action,'actor',actor,'at',created_at,'metadata',metadata) ORDER BY id),'[]') FROM taxiqaid_private.user_admin_audit audit WHERE audit.target=r.id)) ORDER BY r.id),'[]') INTO result FROM (SELECT * FROM taxiqaid_private.driver_profile_requests WHERE (p_data->>'after' IS NULL OR id>(p_data->>'after')::uuid) AND (coalesce(p_data->>'status','')='' OR status=p_data->>'status') AND (coalesce(p_data->>'field','')='' OR field=p_data->>'field') AND (coalesce(p_data->>'search','')='' OR driver_name ILIKE '%'||(p_data->>'search')||'%' OR driver_iqama ILIKE '%'||(p_data->>'search')||'%' OR id::text=p_data->>'search') ORDER BY id LIMIT 100) r;
  RETURN jsonb_build_object('requests',result);
 END IF;
 op:=(p_data->>'operation')::uuid;
 IF op IS NULL OR op IN ('00000000-0000-0000-0000-000000000000'::uuid,'11111111-1111-4111-8111-111111111111'::uuid) THEN RAISE EXCEPTION 'INVALID_OPERATION'; END IF;
 IF p_action='create-reserve' THEN
  item:=p_data->'account';target:=op;v_lease:=(p_data->>'lease')::uuid;
  PERFORM taxiqaid_auth_api.admin_validate_account(item);
  IF item->>'contactEmail' IS NULL THEN RAISE EXCEPTION 'EMPLOYEE_EMAIL_REQUIRED';END IF;
  IF EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE user_id<>target AND lower(technical_email)=lower(item->>'contactEmail')) THEN RAISE EXCEPTION 'EMPLOYEE_EMAIL_ALREADY_USED' USING ERRCODE='23505';END IF;
  IF item->>'role' NOT IN ('manager','supervisor') OR item->>'status' NOT IN ('active','disabled') OR item->>'username' !~ '^[a-z][a-z0-9]{1,47}$' OR length(item->>'fullName') NOT BETWEEN 1 AND 150 OR jsonb_typeof(item->'departments')<>'array' OR jsonb_array_length(item->'departments') NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'INVALID_ACCOUNT'; END IF;
  FOR dep IN SELECT jsonb_array_elements_text(item->'departments') LOOP IF NOT dep=ANY(names) OR NOT EXISTS(SELECT FROM taxiqaid_private.departments WHERE department_key=dep AND is_active) THEN RAISE EXCEPTION 'INVALID_DEPARTMENT'; END IF; END LOOP;
  SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;
  IF FOUND THEN
   IF prior.actor<>p_actor OR prior.action<>'create' OR prior.payload<>item THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;
   IF prior.state='completed' THEN RETURN jsonb_build_object('completed',true,'user',taxiqaid_auth_api.admin_snapshot(prior.target)); END IF;
   IF prior.lease_until>clock_timestamp() THEN RAISE EXCEPTION 'OPERATION_IN_PROGRESS' USING ERRCODE='40001'; END IF;
   UPDATE taxiqaid_private.user_admin_operations SET lease=v_lease,lease_until=clock_timestamp()+interval '2 minutes',state='reserved' WHERE id=op;
  ELSE
   IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target) OR EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE user_id=target) THEN RAISE EXCEPTION 'PROTECTED_IDENTITY' USING ERRCODE='42501';END IF;
   IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE username=item->>'username') THEN RAISE EXCEPTION 'USERNAME_UNAVAILABLE' USING ERRCODE='23505'; END IF;
   INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,username,lease,lease_until) VALUES(op,p_actor,'create',item,target,item->>'username',v_lease,clock_timestamp()+interval '2 minutes');
  END IF;
  RETURN jsonb_build_object('target',target,'completed',false);
 END IF;
 IF p_action IN ('create-finish','create-recover') THEN
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;
  IF prior.actor<>p_actor OR prior.action<>'create' THEN RAISE EXCEPTION 'OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  IF prior.state='completed' THEN RETURN jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(prior.target),'completed',true); END IF;
  IF prior.lease IS DISTINCT FROM (p_data->>'lease')::uuid OR prior.lease_until<clock_timestamp() THEN RAISE EXCEPTION 'OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  IF p_action='create-recover' THEN UPDATE taxiqaid_private.user_admin_operations SET state='recovery_required' WHERE id=op;RETURN jsonb_build_object('recoveryRequired',true); END IF;
  target:=prior.target;item:=prior.payload;
  IF item->>'contactEmail' IS NULL OR lower(item->>'contactEmail') IS DISTINCT FROM lower(p_data->>'technicalEmail') THEN RAISE EXCEPTION 'AUTH_IDENTITY_MISMATCH';END IF;
  IF p_data->>'authUid' IS DISTINCT FROM target::text OR p_data->>'technicalEmail' IS NULL OR length(p_data->>'technicalEmail')>254 THEN RAISE EXCEPTION 'AUTH_IDENTITY_MISMATCH'; END IF;
  INSERT INTO taxiqaid_private.user_accounts(user_id,username,full_name,account_type,role_key,status,created_at,updated_at) VALUES(target,item->>'username',item->>'fullName','management',item->>'role',item->>'status',now(),now());
  INSERT INTO taxiqaid_private.auth_login_identities(user_id,technical_email,is_enabled,revision) VALUES(target,p_data->>'technicalEmail',item->>'status'='active',1);
  INSERT INTO taxiqaid_private.user_admin_metadata(user_id,contact_email) VALUES(target,nullif(item->>'contactEmail',''));
  INSERT INTO taxiqaid_private.user_departments(user_id,department_key,assigned_at) SELECT target,value,now() FROM jsonb_array_elements_text(item->'departments');
  UPDATE taxiqaid_private.user_admin_operations SET state='completed',lease=NULL,lease_until=NULL WHERE id=op;
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,'create',target,jsonb_build_object('version',1));PERFORM taxiqaid_auth_api.admin_mirror_user(target);
  RETURN jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(target),'completed',true);
 END IF;
 IF p_action='request-enqueue' THEN
  INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state) VALUES(op,p_actor,p_action,p_data-'operation',op,'completed') ON CONFLICT(id) DO NOTHING;
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;
  INSERT INTO taxiqaid_private.driver_profile_requests(id,driver_ref,driver_iqama,driver_name,field,old_value,proposed_value) VALUES(op,p_data->>'driverRef',p_data->>'iqama',p_data->>'name',p_data->>'field',p_data->>'oldValue',p_data->>'proposedValue') ON CONFLICT(id) DO NOTHING;
  GET DIAGNOSTICS changed=ROW_COUNT;IF changed>0 THEN PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,op,jsonb_build_object('version',1,'sourceVerified',false));PERFORM taxiqaid_auth_api.admin_mirror_request(op);END IF;
  RETURN jsonb_build_object('request',(SELECT to_jsonb(r) FROM taxiqaid_private.driver_profile_requests r WHERE id=op));
 END IF;
 IF p_action IN ('request-approve','request-reject') THEN
  target:=(p_data->>'uid')::uuid;SELECT * INTO STRICT request_row FROM taxiqaid_private.driver_profile_requests WHERE id=target FOR UPDATE;
  SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op;
  IF FOUND THEN IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;RETURN prior.result;END IF;
  IF request_row.status<>'pending' OR request_row.version IS DISTINCT FROM (p_data->>'version')::bigint THEN RAISE EXCEPTION 'REQUEST_CONFLICT' USING ERRCODE='40001'; END IF;
  UPDATE taxiqaid_private.driver_profile_requests SET status=CASE WHEN p_action='request-approve' THEN 'approved_pending_application' ELSE 'rejected' END,version=version+1,reviewed_by=p_actor,reviewed_at=now(),note=p_data->>'note' WHERE id=target RETURNING * INTO request_row;
  result:=jsonb_build_object('request',to_jsonb(request_row),'applied',false,'applicationBlocked',p_action='request-approve');
  INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state,result) VALUES(op,p_actor,p_action,p_data-'operation',target,'completed',result);
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,target,jsonb_build_object('version',request_row.version,'applied',false));
  PERFORM taxiqaid_auth_api.admin_mirror_request(target);
  RETURN result;
 END IF;
 target:=(p_data->>'uid')::uuid;
 PERFORM 1 FROM taxiqaid_private.user_accounts WHERE user_id=target FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target AND (role_key='super_admin' OR account_type<>'management')) THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501'; END IF;
 INSERT INTO taxiqaid_private.user_admin_metadata(user_id) VALUES(target) ON CONFLICT DO NOTHING;
 snapshot:=taxiqaid_auth_api.admin_snapshot(target);
 SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op;
 IF FOUND THEN IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;RETURN prior.result||jsonb_build_object('replayed',true); END IF;
 IF snapshot->>'etag' IS DISTINCT FROM p_data->>'etag' OR (snapshot->>'version')::bigint IS DISTINCT FROM (p_data->>'version')::bigint THEN RAISE EXCEPTION 'STALE_ACCOUNT' USING ERRCODE='40001'; END IF;
 IF p_action='edit' THEN
  item:=p_data->'account';PERFORM taxiqaid_auth_api.admin_validate_account(item);
  IF item->>'contactEmail' IS NULL OR lower(item->>'contactEmail') IS DISTINCT FROM lower((SELECT technical_email FROM taxiqaid_private.auth_login_identities WHERE user_id=target)) THEN RAISE EXCEPTION 'CONTACT_EMAIL_IMMUTABLE';END IF;
  IF item->>'role' NOT IN ('manager','supervisor') OR item->>'status' NOT IN ('active','disabled') OR item->>'username' !~ '^[a-z][a-z0-9]{1,47}$' OR length(item->>'fullName') NOT BETWEEN 1 AND 150 OR jsonb_array_length(item->'departments') NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'INVALID_ACCOUNT'; END IF;
  IF item->>'status' IS DISTINCT FROM snapshot->>'status' THEN PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.change-status'); END IF;
  FOR dep IN SELECT jsonb_array_elements_text(item->'departments') LOOP IF NOT dep=ANY(names) OR NOT EXISTS(SELECT FROM taxiqaid_private.departments WHERE department_key=dep AND is_active) THEN RAISE EXCEPTION 'INVALID_DEPARTMENT'; END IF; END LOOP;
  UPDATE taxiqaid_private.user_accounts SET username=item->>'username',full_name=item->>'fullName',role_key=item->>'role',status=item->>'status',updated_at=now() WHERE user_id=target;
  UPDATE taxiqaid_private.user_admin_metadata SET contact_email=nullif(item->>'contactEmail',''),auth_sync_pending=true WHERE user_id=target;
  DELETE FROM taxiqaid_private.user_departments WHERE user_id=target;
  INSERT INTO taxiqaid_private.user_departments(user_id,department_key,assigned_at) SELECT target,value,now() FROM jsonb_array_elements_text(item->'departments');
 ELSIF p_action='permissions' THEN
  IF snapshot->>'status'<>'active' OR jsonb_typeof(p_data->'patch')<>'object' THEN RAISE EXCEPTION 'INVALID_PERMISSIONS'; END IF;
  FOR permission IN SELECT * FROM jsonb_each(p_data->'patch') LOOP
   IF NOT taxiqaid_auth_api.admin_catalog()?permission.key OR taxiqaid_auth_api.admin_catalog()->permission.key->>'audience'='Driver' OR jsonb_typeof(permission.value)<>'boolean' OR NOT EXISTS(SELECT FROM taxiqaid_private.permissions WHERE permission_key=permission.key AND is_active) THEN RAISE EXCEPTION 'INVALID_CAPABILITY'; END IF;
   IF permission.value='true'::jsonb AND NOT taxiqaid_auth_api.admin_effective(target,permission.key,p_data->'patch') THEN RAISE EXCEPTION 'DEPENDENCY_REQUIRED'; END IF;
  END LOOP;
  FOR permission IN SELECT * FROM jsonb_each(p_data->'patch') LOOP
   INSERT INTO taxiqaid_private.user_permission_overrides(user_id,permission_key,is_allowed,updated_at,updated_by) VALUES(target,permission.key,(permission.value#>>'{}')::boolean,now(),p_actor) ON CONFLICT(user_id,permission_key) DO UPDATE SET is_allowed=EXCLUDED.is_allowed,updated_at=now(),updated_by=p_actor;
  END LOOP;
 ELSIF p_action<>'reset-reserve' AND p_action<>'auth-synced' THEN RAISE EXCEPTION 'UNKNOWN_ACTION'; END IF;
 UPDATE taxiqaid_private.user_admin_metadata SET version=version+1,updated_at=now(),auth_sync_pending=CASE WHEN p_action='auth-synced' THEN false ELSE auth_sync_pending END WHERE user_id=target;
 UPDATE taxiqaid_private.auth_login_identities SET is_enabled=(SELECT status='active' FROM taxiqaid_private.user_accounts WHERE user_id=target),revision=revision+1,synchronized_at=now() WHERE user_id=target;
 result:=jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(target));
 INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state,result) VALUES(op,p_actor,p_action,p_data-'operation',target,'completed',result);
 PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,target,jsonb_build_object('version',(result->'user'->>'version')::bigint,'before',CASE WHEN p_action='permissions' THEN snapshot->'overrides' ELSE jsonb_build_object('username',snapshot->'username','role',snapshot->'role','status',snapshot->'status','departments',snapshot->'departments') END,'after',CASE WHEN p_action='permissions' THEN result->'user'->'overrides' ELSE jsonb_build_object('username',result->'user'->'username','role',result->'user'->'role','status',result->'user'->'status','departments',result->'user'->'departments') END,'fields',CASE WHEN p_action='permissions' THEN (SELECT coalesce(jsonb_agg(key),'[]') FROM jsonb_object_keys(p_data->'patch') k(key)) ELSE '[]'::jsonb END));PERFORM taxiqaid_auth_api.admin_mirror_user(target);
 RETURN result;
END $baseline$) THEN RAISE EXCEPTION 'ADMIN_ARCHIVE_SOURCE_REVIEW_REQUIRED';END IF;
END $preflight$;
CREATE TEMP TABLE archive_saved_security ON COMMIT DROP AS SELECT oid,proowner,proacl,proconfig,prosecdef,provolatile FROM pg_proc WHERE oid='taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)'::regprocedure;
CREATE TEMP TABLE archive_saved_memberships ON COMMIT DROP AS SELECT * FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole;
GRANT taxiqaid_user_admin_owner TO postgres WITH INHERIT FALSE,SET TRUE;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_user_admin_owner;
GRANT SELECT ON pg_temp.archive_saved_security TO taxiqaid_user_admin_owner;
SET LOCAL ROLE taxiqaid_user_admin_owner;
ALTER TABLE taxiqaid_private.user_admin_metadata ADD COLUMN archived_at timestamptz;
CREATE OR REPLACE FUNCTION taxiqaid_auth_api.admin_dispatch(p_actor uuid,p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE target uuid; op uuid; v_lease uuid; actor_cap text; snapshot jsonb; item jsonb; prior taxiqaid_private.user_admin_operations%ROWTYPE; request_row taxiqaid_private.driver_profile_requests%ROWTYPE; fields jsonb; permission record; dep text; names text[]:=ARRAY['operation','fleet','maintenance','finance','hr','qhse','it']; result jsonb; changed integer;
BEGIN
 actor_cap:=CASE p_action WHEN 'authorize' THEN coalesce(p_data->>'capability','user-management.view') WHEN 'list' THEN 'user-management.view' WHEN 'create-reserve' THEN 'user-management.create-user' WHEN 'create-finish' THEN 'user-management.create-user' WHEN 'create-recover' THEN 'user-management.create-user' WHEN 'create-pending' THEN 'user-management.create-user' WHEN 'permissions' THEN 'user-management.manage-permissions' WHEN 'requests' THEN 'user-management.profile-requests.view' WHEN 'request-enqueue' THEN 'user-management.profile-requests.view' WHEN 'request-approve' THEN 'driver-profile.approve' WHEN 'request-reject' THEN 'driver-profile.reject' ELSE 'user-management.edit-user' END;
 PERFORM taxiqaid_auth_api.admin_require(p_actor,actor_cap,CASE WHEN p_action='authorize' THEN NOT coalesce((p_data->>'read')::boolean,false) ELSE p_action NOT IN ('list','requests') END);
 IF p_action IN ('mirror-claim','mirror-ack') THEN RETURN taxiqaid_auth_api.admin_mirror(p_actor,p_action,p_data); END IF;
 IF p_action='authorize' THEN RETURN jsonb_build_object('authorized',true); END IF;
 IF p_action='operations' THEN
  RETURN jsonb_build_object('operations',(SELECT coalesce(jsonb_agg(jsonb_build_object('operation',id,'username',username,'state',state,'createdAt',created_at) ORDER BY created_at),'[]') FROM (SELECT * FROM taxiqaid_private.user_admin_operations WHERE actor=p_actor AND action='create' AND state<>'completed' ORDER BY created_at LIMIT 100) o));
 END IF;
 IF p_action='create-pending' THEN
  PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.create-user');
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=(p_data->>'operation')::uuid AND actor=p_actor AND action='create';
  RETURN jsonb_build_object('account',prior.payload,'operation',prior.id);
 END IF;
 IF p_action='identity' THEN
  target:=(p_data->>'uid')::uuid;
  IF NOT EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target AND account_type='management' AND role_key<>'super_admin') THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501';END IF;
  RETURN (SELECT jsonb_build_object('uid',user_id,'email',technical_email) FROM taxiqaid_private.auth_login_identities WHERE user_id=target);
 END IF;
 IF p_action='list' THEN
  IF length(coalesce(p_data->>'search',''))>100 OR coalesce((p_data->>'limit')::integer,100) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT coalesce(jsonb_agg(taxiqaid_auth_api.admin_snapshot(a.user_id) ORDER BY a.user_id),'[]') INTO result FROM (SELECT user_id FROM taxiqaid_private.user_accounts WHERE account_type='management' AND NOT EXISTS(SELECT FROM taxiqaid_private.user_admin_metadata archived WHERE archived.user_id=user_accounts.user_id AND archived.archived_at IS NOT NULL) AND (p_data->>'after' IS NULL OR user_id>(p_data->>'after')::uuid) AND (coalesce(p_data->>'search','')='' OR username ILIKE '%'||(p_data->>'search')||'%' OR full_name ILIKE '%'||(p_data->>'search')||'%' OR user_id::text=p_data->>'search' OR EXISTS(SELECT FROM taxiqaid_private.user_admin_metadata m WHERE m.user_id=user_accounts.user_id AND m.contact_email ILIKE '%'||(p_data->>'search')||'%')) ORDER BY user_id LIMIT coalesce((p_data->>'limit')::integer,100)) a;
  RETURN jsonb_build_object('users',result,'departments',(SELECT coalesce(jsonb_agg(department_key ORDER BY department_key),'[]') FROM taxiqaid_private.departments WHERE is_active AND department_key=ANY(names)));
 END IF;
 IF p_action='requests' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('history',(SELECT coalesce(jsonb_agg(jsonb_build_object('action',action,'actor',actor,'at',created_at,'metadata',metadata) ORDER BY id),'[]') FROM taxiqaid_private.user_admin_audit audit WHERE audit.target=r.id)) ORDER BY r.id),'[]') INTO result FROM (SELECT * FROM taxiqaid_private.driver_profile_requests WHERE (p_data->>'after' IS NULL OR id>(p_data->>'after')::uuid) AND (coalesce(p_data->>'status','')='' OR status=p_data->>'status') AND (coalesce(p_data->>'field','')='' OR field=p_data->>'field') AND (coalesce(p_data->>'search','')='' OR driver_name ILIKE '%'||(p_data->>'search')||'%' OR driver_iqama ILIKE '%'||(p_data->>'search')||'%' OR id::text=p_data->>'search') ORDER BY id LIMIT 100) r;
  RETURN jsonb_build_object('requests',result);
 END IF;
 op:=(p_data->>'operation')::uuid;
 IF op IS NULL OR op IN ('00000000-0000-0000-0000-000000000000'::uuid,'11111111-1111-4111-8111-111111111111'::uuid) THEN RAISE EXCEPTION 'INVALID_OPERATION'; END IF;
 IF p_action='create-reserve' THEN
  item:=p_data->'account';target:=op;v_lease:=(p_data->>'lease')::uuid;
  PERFORM taxiqaid_auth_api.admin_validate_account(item);
  IF item->>'contactEmail' IS NULL THEN RAISE EXCEPTION 'EMPLOYEE_EMAIL_REQUIRED';END IF;
  IF EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE user_id<>target AND lower(technical_email)=lower(item->>'contactEmail')) THEN RAISE EXCEPTION 'EMPLOYEE_EMAIL_ALREADY_USED' USING ERRCODE='23505';END IF;
  IF item->>'role' NOT IN ('manager','supervisor') OR item->>'status' NOT IN ('active','disabled') OR item->>'username' !~ '^[a-z][a-z0-9]{1,47}$' OR length(item->>'fullName') NOT BETWEEN 1 AND 150 OR jsonb_typeof(item->'departments')<>'array' OR jsonb_array_length(item->'departments') NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'INVALID_ACCOUNT'; END IF;
  FOR dep IN SELECT jsonb_array_elements_text(item->'departments') LOOP IF NOT dep=ANY(names) OR NOT EXISTS(SELECT FROM taxiqaid_private.departments WHERE department_key=dep AND is_active) THEN RAISE EXCEPTION 'INVALID_DEPARTMENT'; END IF; END LOOP;
  SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;
  IF FOUND THEN
   IF prior.actor<>p_actor OR prior.action<>'create' OR prior.payload<>item THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;
   IF prior.state='completed' THEN RETURN jsonb_build_object('completed',true,'user',taxiqaid_auth_api.admin_snapshot(prior.target)); END IF;
   IF prior.lease_until>clock_timestamp() THEN RAISE EXCEPTION 'OPERATION_IN_PROGRESS' USING ERRCODE='40001'; END IF;
   UPDATE taxiqaid_private.user_admin_operations SET lease=v_lease,lease_until=clock_timestamp()+interval '2 minutes',state='reserved' WHERE id=op;
  ELSE
   IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target) OR EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE user_id=target) THEN RAISE EXCEPTION 'PROTECTED_IDENTITY' USING ERRCODE='42501';END IF;
   IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE username=item->>'username') THEN RAISE EXCEPTION 'USERNAME_UNAVAILABLE' USING ERRCODE='23505'; END IF;
   INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,username,lease,lease_until) VALUES(op,p_actor,'create',item,target,item->>'username',v_lease,clock_timestamp()+interval '2 minutes');
  END IF;
  RETURN jsonb_build_object('target',target,'completed',false);
 END IF;
 IF p_action IN ('create-finish','create-recover') THEN
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;
  IF prior.actor<>p_actor OR prior.action<>'create' THEN RAISE EXCEPTION 'OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  IF prior.state='completed' THEN RETURN jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(prior.target),'completed',true); END IF;
  IF prior.lease IS DISTINCT FROM (p_data->>'lease')::uuid OR prior.lease_until<clock_timestamp() THEN RAISE EXCEPTION 'OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  IF p_action='create-recover' THEN UPDATE taxiqaid_private.user_admin_operations SET state='recovery_required' WHERE id=op;RETURN jsonb_build_object('recoveryRequired',true); END IF;
  target:=prior.target;item:=prior.payload;
  IF item->>'contactEmail' IS NULL OR lower(item->>'contactEmail') IS DISTINCT FROM lower(p_data->>'technicalEmail') THEN RAISE EXCEPTION 'AUTH_IDENTITY_MISMATCH';END IF;
  IF p_data->>'authUid' IS DISTINCT FROM target::text OR p_data->>'technicalEmail' IS NULL OR length(p_data->>'technicalEmail')>254 THEN RAISE EXCEPTION 'AUTH_IDENTITY_MISMATCH'; END IF;
  INSERT INTO taxiqaid_private.user_accounts(user_id,username,full_name,account_type,role_key,status,created_at,updated_at) VALUES(target,item->>'username',item->>'fullName','management',item->>'role',item->>'status',now(),now());
  INSERT INTO taxiqaid_private.auth_login_identities(user_id,technical_email,is_enabled,revision) VALUES(target,p_data->>'technicalEmail',item->>'status'='active',1);
  INSERT INTO taxiqaid_private.user_admin_metadata(user_id,contact_email) VALUES(target,nullif(item->>'contactEmail',''));
  INSERT INTO taxiqaid_private.user_departments(user_id,department_key,assigned_at) SELECT target,value,now() FROM jsonb_array_elements_text(item->'departments');
  UPDATE taxiqaid_private.user_admin_operations SET state='completed',lease=NULL,lease_until=NULL WHERE id=op;
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,'create',target,jsonb_build_object('version',1));PERFORM taxiqaid_auth_api.admin_mirror_user(target);
  RETURN jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(target),'completed',true);
 END IF;
 IF p_action='request-enqueue' THEN
  INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state) VALUES(op,p_actor,p_action,p_data-'operation',op,'completed') ON CONFLICT(id) DO NOTHING;
  SELECT * INTO STRICT prior FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;
  INSERT INTO taxiqaid_private.driver_profile_requests(id,driver_ref,driver_iqama,driver_name,field,old_value,proposed_value) VALUES(op,p_data->>'driverRef',p_data->>'iqama',p_data->>'name',p_data->>'field',p_data->>'oldValue',p_data->>'proposedValue') ON CONFLICT(id) DO NOTHING;
  GET DIAGNOSTICS changed=ROW_COUNT;IF changed>0 THEN PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,op,jsonb_build_object('version',1,'sourceVerified',false));PERFORM taxiqaid_auth_api.admin_mirror_request(op);END IF;
  RETURN jsonb_build_object('request',(SELECT to_jsonb(r) FROM taxiqaid_private.driver_profile_requests r WHERE id=op));
 END IF;
 IF p_action IN ('request-approve','request-reject') THEN
  target:=(p_data->>'uid')::uuid;SELECT * INTO STRICT request_row FROM taxiqaid_private.driver_profile_requests WHERE id=target FOR UPDATE;
  SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op;
  IF FOUND THEN IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;RETURN prior.result;END IF;
  IF request_row.status<>'pending' OR request_row.version IS DISTINCT FROM (p_data->>'version')::bigint THEN RAISE EXCEPTION 'REQUEST_CONFLICT' USING ERRCODE='40001'; END IF;
  UPDATE taxiqaid_private.driver_profile_requests SET status=CASE WHEN p_action='request-approve' THEN 'approved_pending_application' ELSE 'rejected' END,version=version+1,reviewed_by=p_actor,reviewed_at=now(),note=p_data->>'note' WHERE id=target RETURNING * INTO request_row;
  result:=jsonb_build_object('request',to_jsonb(request_row),'applied',false,'applicationBlocked',p_action='request-approve');
  INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state,result) VALUES(op,p_actor,p_action,p_data-'operation',target,'completed',result);
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,target,jsonb_build_object('version',request_row.version,'applied',false));
  PERFORM taxiqaid_auth_api.admin_mirror_request(target);
  RETURN result;
 END IF;
 target:=(p_data->>'uid')::uuid;
 PERFORM 1 FROM taxiqaid_private.user_accounts WHERE user_id=target FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=target AND (role_key='super_admin' OR account_type<>'management')) THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501'; END IF;
 INSERT INTO taxiqaid_private.user_admin_metadata(user_id) VALUES(target) ON CONFLICT DO NOTHING;
 snapshot:=taxiqaid_auth_api.admin_snapshot(target);
 SELECT * INTO prior FROM taxiqaid_private.user_admin_operations WHERE id=op;
 IF FOUND THEN IF prior.actor<>p_actor OR prior.action<>p_action OR prior.payload<>p_data-'operation' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='40001'; END IF;RETURN prior.result||jsonb_build_object('replayed',true); END IF;
 IF snapshot->>'etag' IS DISTINCT FROM p_data->>'etag' OR (snapshot->>'version')::bigint IS DISTINCT FROM (p_data->>'version')::bigint THEN RAISE EXCEPTION 'STALE_ACCOUNT' USING ERRCODE='40001'; END IF;
 IF p_action='archive-user' THEN
  IF (snapshot->>'role') NOT IN ('manager','supervisor') OR EXISTS(SELECT FROM taxiqaid_private.user_admin_metadata archived WHERE archived.user_id=target AND archived.archived_at IS NOT NULL) THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501'; END IF;
  PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.change-status');
  UPDATE taxiqaid_private.user_accounts SET status='disabled',updated_at=clock_timestamp() WHERE user_id=target;
  UPDATE taxiqaid_private.user_admin_metadata SET archived_at=clock_timestamp(),version=version+1,updated_at=clock_timestamp(),auth_sync_pending=true WHERE user_id=target;
  UPDATE taxiqaid_private.auth_login_identities SET is_enabled=false,revision=revision+1,synchronized_at=clock_timestamp() WHERE user_id=target;
  result:=jsonb_build_object('archived',true,'user',taxiqaid_auth_api.admin_snapshot(target));
  INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state,result) VALUES(op,p_actor,p_action,p_data-'operation',target,'completed',result);
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,'archive-user',target,jsonb_build_object('username',snapshot->'username','previousStatus',snapshot->'status','version',(result->'user'->>'version')::bigint));
  RETURN result;
 END IF;
 IF p_action IN ('edit','permissions','reset-reserve') AND EXISTS(SELECT FROM taxiqaid_private.user_admin_metadata archived WHERE archived.user_id=target AND archived.archived_at IS NOT NULL) THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501'; END IF;
 IF p_action='edit' THEN
  item:=p_data->'account';PERFORM taxiqaid_auth_api.admin_validate_account(item);
  IF item->>'contactEmail' IS NULL OR lower(item->>'contactEmail') IS DISTINCT FROM lower((SELECT technical_email FROM taxiqaid_private.auth_login_identities WHERE user_id=target)) THEN RAISE EXCEPTION 'CONTACT_EMAIL_IMMUTABLE';END IF;
  IF item->>'role' NOT IN ('manager','supervisor') OR item->>'status' NOT IN ('active','disabled') OR item->>'username' !~ '^[a-z][a-z0-9]{1,47}$' OR length(item->>'fullName') NOT BETWEEN 1 AND 150 OR jsonb_array_length(item->'departments') NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'INVALID_ACCOUNT'; END IF;
  IF item->>'status' IS DISTINCT FROM snapshot->>'status' THEN PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.change-status'); END IF;
  FOR dep IN SELECT jsonb_array_elements_text(item->'departments') LOOP IF NOT dep=ANY(names) OR NOT EXISTS(SELECT FROM taxiqaid_private.departments WHERE department_key=dep AND is_active) THEN RAISE EXCEPTION 'INVALID_DEPARTMENT'; END IF; END LOOP;
  UPDATE taxiqaid_private.user_accounts SET username=item->>'username',full_name=item->>'fullName',role_key=item->>'role',status=item->>'status',updated_at=now() WHERE user_id=target;
  UPDATE taxiqaid_private.user_admin_metadata SET contact_email=nullif(item->>'contactEmail',''),auth_sync_pending=true WHERE user_id=target;
  DELETE FROM taxiqaid_private.user_departments WHERE user_id=target;
  INSERT INTO taxiqaid_private.user_departments(user_id,department_key,assigned_at) SELECT target,value,now() FROM jsonb_array_elements_text(item->'departments');
 ELSIF p_action='permissions' THEN
  IF snapshot->>'status'<>'active' OR jsonb_typeof(p_data->'patch')<>'object' THEN RAISE EXCEPTION 'INVALID_PERMISSIONS'; END IF;
  FOR permission IN SELECT * FROM jsonb_each(p_data->'patch') LOOP
   IF NOT taxiqaid_auth_api.admin_catalog()?permission.key OR taxiqaid_auth_api.admin_catalog()->permission.key->>'audience'='Driver' OR jsonb_typeof(permission.value)<>'boolean' OR NOT EXISTS(SELECT FROM taxiqaid_private.permissions WHERE permission_key=permission.key AND is_active) THEN RAISE EXCEPTION 'INVALID_CAPABILITY'; END IF;
   IF permission.value='true'::jsonb AND NOT taxiqaid_auth_api.admin_effective(target,permission.key,p_data->'patch') THEN RAISE EXCEPTION 'DEPENDENCY_REQUIRED'; END IF;
  END LOOP;
  FOR permission IN SELECT * FROM jsonb_each(p_data->'patch') LOOP
   INSERT INTO taxiqaid_private.user_permission_overrides(user_id,permission_key,is_allowed,updated_at,updated_by) VALUES(target,permission.key,(permission.value#>>'{}')::boolean,now(),p_actor) ON CONFLICT(user_id,permission_key) DO UPDATE SET is_allowed=EXCLUDED.is_allowed,updated_at=now(),updated_by=p_actor;
  END LOOP;
 ELSIF p_action<>'reset-reserve' AND p_action<>'auth-synced' THEN RAISE EXCEPTION 'UNKNOWN_ACTION'; END IF;
 UPDATE taxiqaid_private.user_admin_metadata SET version=version+1,updated_at=now(),auth_sync_pending=CASE WHEN p_action='auth-synced' THEN false ELSE auth_sync_pending END WHERE user_id=target;
 UPDATE taxiqaid_private.auth_login_identities SET is_enabled=(SELECT status='active' FROM taxiqaid_private.user_accounts WHERE user_id=target),revision=revision+1,synchronized_at=now() WHERE user_id=target;
 result:=jsonb_build_object('user',taxiqaid_auth_api.admin_snapshot(target));
 INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,state,result) VALUES(op,p_actor,p_action,p_data-'operation',target,'completed',result);
 PERFORM taxiqaid_auth_api.admin_event(op,p_actor,p_action,target,jsonb_build_object('version',(result->'user'->>'version')::bigint,'before',CASE WHEN p_action='permissions' THEN snapshot->'overrides' ELSE jsonb_build_object('username',snapshot->'username','role',snapshot->'role','status',snapshot->'status','departments',snapshot->'departments') END,'after',CASE WHEN p_action='permissions' THEN result->'user'->'overrides' ELSE jsonb_build_object('username',result->'user'->'username','role',result->'user'->'role','status',result->'user'->'status','departments',result->'user'->'departments') END,'fields',CASE WHEN p_action='permissions' THEN (SELECT coalesce(jsonb_agg(key),'[]') FROM jsonb_object_keys(p_data->'patch') k(key)) ELSE '[]'::jsonb END));PERFORM taxiqaid_auth_api.admin_mirror_user(target);
 RETURN result;
END  $$;
DO $restore_path$
DECLARE definition record; reviewed_path text; original_path text:=current_setting('search_path');
BEGIN
 FOR definition IN SELECT oid,proconfig FROM pg_temp.archive_saved_security LOOP
  SELECT substr(setting,length('search_path=')+1) INTO STRICT reviewed_path FROM unnest(definition.proconfig) setting WHERE left(setting,length('search_path='))='search_path=';
  PERFORM set_config('search_path',reviewed_path,true);
  EXECUTE format('ALTER FUNCTION %s SET search_path FROM CURRENT',definition.oid::regprocedure);
 END LOOP;
 PERFORM set_config('search_path',original_path,true);
END $restore_path$;
SET LOCAL ROLE postgres;
REVOKE SELECT ON pg_temp.archive_saved_security FROM taxiqaid_user_admin_owner;
REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM taxiqaid_user_admin_owner;
DO $verify$
DECLARE previous record;
BEGIN
 SELECT * INTO previous FROM archive_saved_memberships WHERE member='postgres'::regrole AND grantor='postgres'::regrole;
 IF FOUND THEN EXECUTE format('GRANT taxiqaid_user_admin_owner TO postgres WITH ADMIN %s,INHERIT %s,SET %s GRANTED BY postgres',previous.admin_option,previous.inherit_option,previous.set_option);
 ELSE REVOKE taxiqaid_user_admin_owner FROM postgres GRANTED BY postgres RESTRICT; END IF;
 IF EXISTS((SELECT oid,proowner,proacl,proconfig,prosecdef,provolatile FROM pg_proc WHERE oid='taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)'::regprocedure EXCEPT SELECT * FROM archive_saved_security)
 UNION ALL (SELECT * FROM archive_saved_security EXCEPT SELECT oid,proowner,proacl,proconfig,prosecdef,provolatile FROM pg_proc WHERE oid='taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)'::regprocedure)) THEN RAISE EXCEPTION 'ADMIN_ARCHIVE_SECURITY_METADATA_CHANGED';END IF;
 IF EXISTS((SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM archive_saved_memberships)
 UNION ALL (SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM archive_saved_memberships EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole)) THEN RAISE EXCEPTION 'ADMIN_ARCHIVE_MEMBERSHIP_CHANGED';END IF;
 IF has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE') OR has_function_privilege('anon','taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)','EXECUTE') OR has_function_privilege('authenticated','taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)','EXECUTE') OR has_function_privilege('taxiqaid_user_admin_login','taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'ADMIN_ARCHIVE_PRIVILEGE_LEAK';END IF;
END $verify$;
COMMIT;
