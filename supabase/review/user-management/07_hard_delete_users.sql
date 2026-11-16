-- Controlled upgrade after SQL 06. Installation never deletes an account.
-- Live schema inspection and owner approval are required before application.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'Ordinary Dashboard postgres required';END IF;
 IF to_regprocedure('taxiqaid_auth_api.admin_delete_user(uuid,text,jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'Already installed; review existing version';END IF;
 IF NOT EXISTS(SELECT FROM pg_attribute WHERE attrelid='taxiqaid_private.user_admin_metadata'::regclass AND attname='archived_at' AND NOT attisdropped) THEN RAISE EXCEPTION 'SQL 06 required';END IF;
 IF has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'Unexpected owner CREATE';END IF;
 IF NOT EXISTS(SELECT FROM pg_proc p WHERE p.oid='taxiqaid_auth_api.admin_require(uuid,text,boolean)'::regprocedure AND p.proowner='taxiqaid_user_admin_owner'::regrole AND p.prosecdef AND 'row_security=on'=ANY(p.proconfig) AND EXISTS(SELECT FROM unnest(p.proconfig) c WHERE c IN ('search_path=pg_catalog, pg_temp','search_path=pg_catalog,pg_temp')) AND encode(sha256(convert_to(replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')='a09758b1330d5aaf243063e9a0453f5de268cbc9161fc87c7c7ceb00481d1df6') THEN RAISE EXCEPTION 'DELETE_AUTHORIZATION_SOURCE_REVIEW_REQUIRED';END IF;
END $$;
CREATE TEMP TABLE delete_existing_security ON COMMIT DROP AS SELECT oid,proowner,proacl,proconfig,prosecdef FROM pg_proc WHERE oid IN ('taxiqaid_auth_api.admin_dispatch(uuid,text,jsonb)'::regprocedure,'taxiqaid_auth_api.admin_require(uuid,text,boolean)'::regprocedure);
CREATE TEMP TABLE delete_memberships ON COMMIT DROP AS SELECT * FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole;
GRANT taxiqaid_user_admin_owner TO postgres WITH INHERIT FALSE,SET TRUE;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_user_admin_owner;
GRANT DELETE ON taxiqaid_private.user_accounts,taxiqaid_private.auth_login_identities TO taxiqaid_user_admin_owner;
-- Only an already revoked, explicitly reserved office account can be physically removed.
CREATE POLICY user_admin_delete_account ON taxiqaid_private.user_accounts FOR DELETE TO taxiqaid_user_admin_owner USING(account_type='management' AND role_key IN ('manager','supervisor') AND status='disabled' AND EXISTS(SELECT FROM taxiqaid_private.user_admin_operations o WHERE o.target=user_accounts.user_id AND o.action='delete-user' AND o.state<>'completed'));
CREATE POLICY user_admin_delete_mapping ON taxiqaid_private.auth_login_identities FOR DELETE TO taxiqaid_user_admin_owner USING(NOT is_enabled AND EXISTS(SELECT FROM taxiqaid_private.user_admin_operations o WHERE o.target=auth_login_identities.user_id AND o.action='delete-user' AND o.state<>'completed'));
SET LOCAL ROLE taxiqaid_user_admin_owner;
CREATE FUNCTION taxiqaid_auth_api.admin_delete_user(p_actor uuid,p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE v_target uuid; op uuid; job taxiqaid_private.user_admin_operations%ROWTYPE; snapshot jsonb; email text; mirror bigint; dependency record; auth_users oid;
BEGIN
 PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.edit-user');
 PERFORM taxiqaid_auth_api.admin_require(p_actor,'user-management.change-status');
 SELECT c.oid INTO STRICT auth_users FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relname='users';
 -- Catalog OIDs avoid granting the restricted owner any auth schema/table access.
 -- Unknown application dependencies must never be cascaded or silently discarded.
 FOR dependency IN SELECT c.conrelid,c.confrelid,c.confdeltype,c.conkey,c.confkey,n.nspname,c.conname FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE c.contype='f' AND c.confrelid IN (auth_users,'taxiqaid_private.user_accounts'::regclass,'taxiqaid_private.auth_login_identities'::regclass,'taxiqaid_private.user_admin_metadata'::regclass) LOOP
  IF dependency.confrelid=auth_users AND dependency.nspname='auth' THEN CONTINUE;END IF;
  IF dependency.confrelid=auth_users AND dependency.conrelid='taxiqaid_private.user_accounts'::regclass AND dependency.confdeltype='r' AND dependency.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=dependency.conrelid AND attname='user_id')]::smallint[] AND dependency.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=auth_users AND attname='id')]::smallint[] THEN CONTINUE;END IF;
  IF dependency.confrelid=auth_users AND dependency.conrelid='taxiqaid_private.auth_login_identities'::regclass AND dependency.confdeltype='c' THEN CONTINUE;END IF;
  IF dependency.confrelid='taxiqaid_private.user_accounts'::regclass AND dependency.conrelid IN ('taxiqaid_private.user_admin_metadata'::regclass,'taxiqaid_private.user_departments'::regclass,'taxiqaid_private.user_permission_overrides'::regclass) THEN CONTINUE;END IF;
  RAISE EXCEPTION 'DELETE_DEPENDENCY_REVIEW_REQUIRED' USING ERRCODE='42501';
 END LOOP;
 IF EXISTS(SELECT FROM pg_trigger WHERE NOT tgisinternal AND tgenabled<>'D' AND (tgtype::integer & 8)<>0 AND tgrelid IN (auth_users,'taxiqaid_private.user_accounts'::regclass,'taxiqaid_private.auth_login_identities'::regclass,'taxiqaid_private.user_admin_metadata'::regclass)) THEN RAISE EXCEPTION 'DELETE_TRIGGER_REVIEW_REQUIRED' USING ERRCODE='42501';END IF;
 IF p_action='ready' THEN RETURN jsonb_build_object('version',2);END IF;
 IF p_action='pending' THEN RETURN jsonb_build_object('operations',(SELECT coalesce(jsonb_agg(jsonb_build_object('operation',id,'uid',o.target,'username',username,'user',payload->'user','state',state) ORDER BY created_at),'[]') FROM taxiqaid_private.user_admin_operations o WHERE action='delete-user' AND state<>'completed' AND actor=p_actor),'archived',(SELECT coalesce(jsonb_agg(taxiqaid_auth_api.admin_snapshot(a.user_id)),'[]') FROM taxiqaid_private.user_accounts a JOIN taxiqaid_private.user_admin_metadata m USING(user_id) WHERE m.archived_at IS NOT NULL AND a.account_type='management' AND a.role_key IN ('manager','supervisor') AND NOT EXISTS(SELECT FROM taxiqaid_private.user_admin_operations o WHERE o.action='delete-user' AND o.target=a.user_id AND o.state<>'completed')));END IF;
 op:=(p_data->>'operation')::uuid;v_target:=(p_data->>'uid')::uuid;
 IF op IS NULL OR v_target IS NULL OR v_target=p_actor OR op='11111111-1111-4111-8111-111111111111'::uuid THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501';END IF;
 SELECT * INTO job FROM taxiqaid_private.user_admin_operations WHERE id=op FOR UPDATE;
 IF FOUND THEN
  IF job.actor<>p_actor OR job.action<>'delete-user' OR job.target<>v_target OR job.username IS DISTINCT FROM p_data->>'confirmedUsername' THEN RAISE EXCEPTION 'DELETE_OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  IF job.state='completed' THEN RETURN jsonb_build_object('deleted',true,'uid',v_target);END IF;
 ELSE
  IF p_action NOT IN ('inspect','reserve') THEN RAISE EXCEPTION 'DELETE_OPERATION_REQUIRED';END IF;
  PERFORM 1 FROM taxiqaid_private.user_accounts WHERE user_id=v_target FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=v_target AND account_type='management' AND role_key IN ('manager','supervisor')) THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501';END IF;
  snapshot:=taxiqaid_auth_api.admin_snapshot(v_target);
  IF snapshot->>'username' IS DISTINCT FROM p_data->>'confirmedUsername' OR snapshot->>'etag' IS DISTINCT FROM p_data->>'etag' OR (snapshot->>'version')::bigint IS DISTINCT FROM (p_data->>'version')::bigint THEN RAISE EXCEPTION 'STALE_ACCOUNT' USING ERRCODE='40001';END IF;
  SELECT technical_email INTO STRICT email FROM taxiqaid_private.auth_login_identities WHERE user_id=v_target;
  IF p_action='inspect' THEN RETURN jsonb_build_object('uid',v_target,'email',email,'pending',false);END IF;
  SELECT mirror_row INTO mirror FROM taxiqaid_private.user_admin_metadata WHERE user_id=v_target;
  UPDATE taxiqaid_private.user_accounts SET status='disabled',updated_at=now() WHERE user_id=v_target;
  INSERT INTO taxiqaid_private.user_admin_metadata(user_id,archived_at,auth_sync_pending) VALUES(v_target,now(),true) ON CONFLICT(user_id) DO UPDATE SET archived_at=now(),auth_sync_pending=true,version=user_admin_metadata.version+1,updated_at=now();
  UPDATE taxiqaid_private.auth_login_identities SET is_enabled=false,revision=revision+1,synchronized_at=now() WHERE user_id=v_target;
  INSERT INTO taxiqaid_private.user_admin_operations(id,actor,action,payload,target,username,lease,lease_until) VALUES(op,p_actor,'delete-user',jsonb_build_object('email',email,'user',snapshot,'mirror',mirror),v_target,snapshot->>'username',(p_data->>'lease')::uuid,clock_timestamp()+interval '2 minutes') RETURNING * INTO job;
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,'delete-started',v_target,jsonb_build_object('accessRevoked',true));
 END IF;
 IF p_action='inspect' THEN RETURN jsonb_build_object('uid',v_target,'email',job.payload->>'email','pending',true);END IF;
 IF p_action='reserve' THEN
  IF job.lease_until>clock_timestamp() AND job.lease IS DISTINCT FROM (p_data->>'lease')::uuid THEN RAISE EXCEPTION 'DELETE_IN_PROGRESS' USING ERRCODE='40001';END IF;
  UPDATE taxiqaid_private.user_admin_operations SET state='reserved',lease=(p_data->>'lease')::uuid,lease_until=clock_timestamp()+interval '2 minutes' WHERE id=op;
  RETURN jsonb_build_object('uid',v_target,'email',job.payload->>'email');
 END IF;
 IF job.lease IS DISTINCT FROM (p_data->>'lease')::uuid OR job.lease_until<clock_timestamp() THEN RAISE EXCEPTION 'DELETE_LEASE_CONFLICT' USING ERRCODE='40001';END IF;
 IF p_action='release' THEN UPDATE taxiqaid_private.user_admin_operations SET state='recovery_required',lease=NULL,lease_until=NULL WHERE id=op;RETURN jsonb_build_object('pending',true);END IF;
 IF p_action='detach' THEN
  IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=v_target AND (account_type<>'management' OR role_key NOT IN ('manager','supervisor') OR status<>'disabled')) THEN RAISE EXCEPTION 'PROTECTED_ACCOUNT' USING ERRCODE='42501';END IF;
  IF coalesce((job.payload->>'privateDetached')::boolean,false) THEN RETURN jsonb_build_object('uid',v_target,'email',job.payload->>'email');END IF;
  PERFORM 1 FROM taxiqaid_private.user_accounts WHERE user_id=v_target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRIVATE_ACCOUNT_MISSING';END IF;
  -- Preserve the existing Auth FK RESTRICT. Remove its active child only after receipt + revocation + provider ban.
  DELETE FROM taxiqaid_private.user_permission_overrides WHERE user_id=v_target;
  DELETE FROM taxiqaid_private.user_departments WHERE user_id=v_target;
  DELETE FROM taxiqaid_private.user_admin_outbox WHERE kind='user' AND entity=v_target;
  DELETE FROM taxiqaid_private.user_admin_metadata WHERE user_id=v_target;
  DELETE FROM taxiqaid_private.user_accounts WHERE user_id=v_target AND account_type='management' AND role_key IN ('manager','supervisor') AND status='disabled';
  IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=v_target) THEN RAISE EXCEPTION 'PRIVATE_DELETION_UNCONFIRMED';END IF;
  UPDATE taxiqaid_private.user_admin_operations SET payload=payload||jsonb_build_object('privateDetached',true) WHERE id=op;
  PERFORM taxiqaid_auth_api.admin_event(op,p_actor,'delete-private-detached',v_target,jsonb_build_object('accessRevoked',true));
  RETURN jsonb_build_object('uid',v_target,'email',job.payload->>'email');
 END IF;
 IF p_action<>'finalize' OR (p_data->>'authAbsent')::boolean IS DISTINCT FROM true OR (job.payload->>'privateDetached')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'AUTH_DELETION_NOT_CONFIRMED';END IF;
 -- Auth absence is confirmed through official Admin API. Never delete Auth rows through SQL.
 DELETE FROM taxiqaid_private.auth_login_identities WHERE user_id=v_target;
 IF EXISTS(SELECT FROM taxiqaid_private.user_accounts WHERE user_id=v_target) OR EXISTS(SELECT FROM taxiqaid_private.user_departments WHERE user_id=v_target) OR EXISTS(SELECT FROM taxiqaid_private.user_permission_overrides WHERE user_id=v_target) OR EXISTS(SELECT FROM taxiqaid_private.user_admin_metadata WHERE user_id=v_target) OR EXISTS(SELECT FROM taxiqaid_private.auth_login_identities WHERE user_id=v_target) OR EXISTS(SELECT FROM taxiqaid_private.user_admin_outbox WHERE kind='user' AND entity=v_target) THEN RAISE EXCEPTION 'PRIVATE_DELETION_UNCONFIRMED';END IF;
 UPDATE taxiqaid_private.user_admin_operations SET state='completed',lease=NULL,lease_until=NULL,result=jsonb_build_object('deleted',true,'uid',v_target) WHERE id=op;
 PERFORM taxiqaid_auth_api.admin_event(op,p_actor,'delete-completed',v_target,jsonb_build_object('authAbsenceConfirmed',true));
 RETURN jsonb_build_object('deleted',true,'uid',v_target);
END $$;
REVOKE ALL ON FUNCTION taxiqaid_auth_api.admin_delete_user(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,taxiqaid_auth_login,taxiqaid_auth_backend,taxiqaid_user_admin_login;
GRANT EXECUTE ON FUNCTION taxiqaid_auth_api.admin_delete_user(uuid,text,jsonb) TO taxiqaid_user_admin_backend;
SET LOCAL ROLE postgres;
REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM taxiqaid_user_admin_owner;
DO $$ DECLARE previous record;BEGIN
 SELECT * INTO previous FROM delete_memberships WHERE member='postgres'::regrole AND grantor='postgres'::regrole;
 IF FOUND THEN EXECUTE format('GRANT taxiqaid_user_admin_owner TO postgres WITH ADMIN %s,INHERIT %s,SET %s GRANTED BY postgres',previous.admin_option,previous.inherit_option,previous.set_option);ELSE REVOKE taxiqaid_user_admin_owner FROM postgres GRANTED BY postgres RESTRICT;END IF;
 IF EXISTS((SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM delete_memberships) UNION ALL (SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM delete_memberships EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_user_admin_owner'::regrole)) OR has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'DELETE_TEMPORARY_GRANTS_REMAIN';END IF;
 IF NOT EXISTS(SELECT FROM pg_proc p WHERE p.oid='taxiqaid_auth_api.admin_delete_user(uuid,text,jsonb)'::regprocedure AND p.proowner='taxiqaid_user_admin_owner'::regrole AND p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on']) THEN RAISE EXCEPTION 'DELETE_FUNCTION_SECURITY_CHANGED';END IF;
 IF EXISTS(SELECT FROM unnest(ARRAY['anon','authenticated','taxiqaid_auth_login','taxiqaid_auth_backend','taxiqaid_user_admin_login']) r WHERE has_function_privilege(r,'taxiqaid_auth_api.admin_delete_user(uuid,text,jsonb)','EXECUTE')) OR NOT has_function_privilege('taxiqaid_user_admin_backend','taxiqaid_auth_api.admin_delete_user(uuid,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'DELETE_EXECUTE_PRIVILEGE_LEAK';END IF;
 IF EXISTS((SELECT oid,proowner,proacl,proconfig,prosecdef FROM pg_proc WHERE oid IN (SELECT oid FROM delete_existing_security) EXCEPT SELECT * FROM delete_existing_security) UNION ALL (SELECT * FROM delete_existing_security EXCEPT SELECT oid,proowner,proacl,proconfig,prosecdef FROM pg_proc WHERE oid IN (SELECT oid FROM delete_existing_security))) THEN RAISE EXCEPTION 'DELETE_EXISTING_SECURITY_CHANGED';END IF;
END $$;
COMMIT;
