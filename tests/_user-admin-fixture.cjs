// Disposable PostgreSQL only. No hosted SQL, provider or account operation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=({sql,runtime,root,uid,lit})=>{
 const admin=(query,options={})=>sql(query,{user:'supabase_admin',...options});
 // Model the owner-reported active departments and Supabase-managed access-owner membership.
 admin("UPDATE taxiqaid_private.user_accounts SET status='active' WHERE role_key='super_admin';UPDATE taxiqaid_private.departments SET is_active=true;GRANT taxiqaid_auth_access_owner TO postgres WITH ADMIN TRUE,INHERIT FALSE,SET FALSE;");
 const snapshot=()=>admin("SELECT jsonb_build_object('master',(SELECT to_jsonb(a) FROM taxiqaid_private.user_accounts a WHERE role_key='super_admin'),'master_memberships',(SELECT jsonb_agg(to_jsonb(m) ORDER BY department_key) FROM taxiqaid_private.user_departments m WHERE user_id='"+uid+"'),'master_overrides',(SELECT jsonb_agg(to_jsonb(o) ORDER BY permission_key) FROM taxiqaid_private.user_permission_overrides o WHERE user_id='"+uid+"'),'master_identity',(SELECT to_jsonb(i) FROM taxiqaid_private.auth_login_identities i WHERE user_id='"+uid+"'),'grants',(SELECT jsonb_agg(to_jsonb(r) ORDER BY role_key,permission_key) FROM taxiqaid_private.role_permissions r),'permissions',(SELECT jsonb_agg(to_jsonb(p) ORDER BY permission_key) FROM taxiqaid_private.permissions p));");const before=snapshot();
 // Reproduce the exact owner-reviewed live account-type/role CHECK (not just an allowed-role list).
 // Missing reviewed role CHECK is never treated as an implicit approval.
 const proposal=fs.readFileSync(path.join(root,'supabase/review/user-management/01_admin.sql'),'utf8');
 // A malformed SQL block must not masquerade as an expected security rejection.
 const malformed=proposal.replace('DO $$ BEGIN','DO $ BEGIN');assert.notEqual(malformed,proposal);assert.throws(()=>sql(malformed,{failure:/ROLE_CONSTRAINT_REVIEW_REQUIRED/}),/SQL must fail for the expected security reason/);
 sql(proposal,{failure:/ROLE_CONSTRAINT_REVIEW_REQUIRED/});assert.equal(admin("SELECT count(*) FROM pg_roles WHERE rolname LIKE 'taxiqaid_user_admin_%';"),'0');assert.equal(snapshot(),before,'Rejected migration preserves Master, identities, grants and definitions');
 console.error('PASS: absent role CHECK rejected specifically by the role preflight; no administrative roles or record changes.');
 const approvedRoleCheck="CHECK ((((account_type = 'management'::text) AND (role_key = ANY (ARRAY['super_admin'::text,'admin'::text,'manager'::text,'supervisor'::text,'staff'::text]))) OR ((account_type = 'driver'::text) AND (role_key = 'driver'::text))))";
 admin("ALTER TABLE taxiqaid_private.user_accounts ADD CONSTRAINT user_accounts_check "+approvedRoleCheck+";");
 const constraintQuery="SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='taxiqaid_private.user_accounts'::regclass AND conname='user_accounts_check';";
 const expectedConstraint=admin(constraintQuery);
 // Extra CHECK affecting role_key must abort without creating any administrative roles.
 admin("ALTER TABLE taxiqaid_private.user_accounts ADD CONSTRAINT synthetic_role_check CHECK(role_key IN ('super_admin','staff','driver'));");
 sql(proposal,{failure:/ROLE_CONSTRAINT_REVIEW_REQUIRED/});assert.equal(admin("SELECT count(*) FROM pg_roles WHERE rolname LIKE 'taxiqaid_user_admin_%';"),'0');assert.equal(snapshot(),before,'Rejected migration preserves Master, identities, grants and definitions');
 console.error('PASS: additional role CHECK rejected specifically by the role preflight; no administrative roles or record changes.');
 admin('ALTER TABLE taxiqaid_private.user_accounts DROP CONSTRAINT synthetic_role_check;');
 // The correct name is insufficient if its expression is broader or regrouped.
 admin("ALTER TABLE taxiqaid_private.user_accounts DROP CONSTRAINT user_accounts_check;ALTER TABLE taxiqaid_private.user_accounts ADD CONSTRAINT user_accounts_check CHECK(role_key IN ('super_admin','admin','manager','supervisor','staff','driver','unexpected_role'));");
 sql(proposal,{failure:/ROLE_CONSTRAINT_REVIEW_REQUIRED/});assert.equal(admin("SELECT count(*) FROM pg_roles WHERE rolname LIKE 'taxiqaid_user_admin_%';"),'0');assert.equal(snapshot(),before,'Rejected migration preserves Master, identities, grants and definitions');
 admin("ALTER TABLE taxiqaid_private.user_accounts DROP CONSTRAINT user_accounts_check;ALTER TABLE taxiqaid_private.user_accounts ADD CONSTRAINT user_accounts_check "+approvedRoleCheck+";");
 console.error('PASS: modified role CHECK rejected specifically by the role preflight; no administrative roles or record changes.');
 // The exact reviewed CHECK accepts manager/supervisor and survives the complete migration untouched.
 sql(proposal);assert.equal(admin(constraintQuery),expectedConstraint);console.error('PASS: exact reviewed role CHECK permits complete SQL 01 migration and is preserved unchanged.');
 // Validate source-fingerprinted email compatibility in the disposable database only.
 const emailUpgrade=fs.readFileSync(path.join(root,'supabase/review/user-management/05_employee_email_compatibility.sql'),'utf8');
 sql(emailUpgrade);
 assert.equal(admin("SELECT has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE');"),'f');
 const accessUpgrade=fs.readFileSync(path.join(root,'supabase/review/user-management/03_access_compatibility.sql'),'utf8');
 admin("CREATE TEMP TABLE saved_access AS SELECT oid,prosrc FROM pg_proc WHERE oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure;UPDATE pg_proc SET prosrc=prosrc||E'\\n-- genuinely changed body' WHERE oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure;");
 sql(accessUpgrade,{failure:true});
 // Reconstruct only the synthetic original body, not a live/observed hash.
 const reviewed=fs.readFileSync(path.join(root,'supabase/review/username-broker/02_functions.sql'),'utf8').match(/CREATE FUNCTION taxiqaid_auth_api\.get_management_access\(p_uid uuid,p_mapping_revision bigint\)[\s\S]*?\nEND \$\$;/)[0];
 admin(reviewed.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));sql(accessUpgrade);
 assert.equal(admin("SELECT bool_and(relrowsecurity AND relforcerowsecurity AND relowner='taxiqaid_user_admin_owner'::regrole) FROM pg_class WHERE relnamespace='taxiqaid_private'::regnamespace AND (relname IN ('user_admin_metadata','user_admin_operations','driver_profile_requests','user_admin_audit','user_admin_outbox'));"),'t');
 assert.equal(admin("SELECT has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_private','CREATE') OR has_schema_privilege('taxiqaid_user_admin_owner','taxiqaid_auth_api','CREATE');"),'f');
 for(const role of ['anon','authenticated','taxiqaid_auth_backend','taxiqaid_user_admin_backend','taxiqaid_user_admin_login'])assert.equal(admin("SELECT has_table_privilege('"+role+"','taxiqaid_private.user_admin_metadata','SELECT') OR has_table_privilege('"+role+"','auth.users','SELECT');"),'f');

 assert.equal(snapshot(),before,'Master, grants and definitions preserved');
 const rpc=(action,data={},actor=uid,{failure=false}={})=>{
  const query='BEGIN;SET LOCAL ROLE taxiqaid_user_admin_backend;SELECT taxiqaid_auth_api.admin_dispatch('+lit(actor)+'::uuid,'+lit(action)+','+lit(JSON.stringify(data))+'::jsonb);COMMIT;';
  const raw=sql(query,{user:'taxiqaid_user_admin_login',failure});return failure?null:JSON.parse(raw);
 };
 assert.equal(admin("SELECT count(*) FROM jsonb_object_keys(taxiqaid_auth_api.admin_catalog()) capabilities(key) WHERE taxiqaid_auth_api.admin_effective('"+uid+"',key);"),'101');
 const driverOnly=require(path.join(root,'shared/permission-catalog.js')).ALL.filter(p=>p.audience==='Driver');assert.equal(driverOnly.length,6);for(const permission of driverOnly)assert.equal(admin("SELECT taxiqaid_auth_api.admin_effective('"+uid+"',"+lit(permission.key)+");"),'f');console.error('PASS: Master retains exactly 101 effective management permissions; all six Driver-only capabilities are denied.');
 const list=rpc('list',{});assert.equal(list.users.find(u=>u.role==='super_admin').roleDefaults.length,101);assert.equal(list.departments.length,7);
 const target='10000000-0000-4000-8000-000000000001',lease='10000000-0000-4000-8000-000000000002';let serial=20;
 const op=()=>('20000000-0000-4000-8000-'+String(serial++).padStart(12,'0'));
 const account={fullName:'Synthetic Manager',username:'adminfixture',contactEmail:'adminfixture@example.invalid',role:'manager',status:'active',departments:['fleet']};
 assert.equal(rpc('create-reserve',{operation:target,lease,account}).target,target);
 admin("INSERT INTO auth.users(id,email) VALUES('"+target+"','adminfixture@example.invalid');");
 let user=rpc('create-finish',{operation:target,lease,authUid:target,technicalEmail:'adminfixture@example.invalid'}).user;
 assert.equal(user.contactEmail,'adminfixture@example.invalid');assert.deepEqual(user.roleDefaults,[]);assert.equal(user.role,'manager');assert.deepEqual(user.departments,['fleet']);
 assert.equal(rpc('create-reserve',{operation:target,lease,account}).completed,true);
 const recovering=op(),recoveryAccount={...account,username:'recoverfixture',contactEmail:'recoverfixture@example.invalid',role:'supervisor',status:'disabled'};
 rpc('create-reserve',{operation:recovering,lease,account:recoveryAccount});rpc('create-recover',{operation:recovering,lease});
 assert.ok(rpc('operations').operations.some(o=>o.operation===recovering&&o.state==='recovery_required'));assert.deepEqual(rpc('create-pending',{operation:recovering}).account,recoveryAccount);
 rpc('create-reserve',{operation:recovering,lease:op(),account:recoveryAccount},uid,{failure:true});
 admin("UPDATE taxiqaid_private.user_admin_operations SET lease_until=now()-interval '1 second' WHERE id='"+recovering+"';INSERT INTO auth.users(id,email) VALUES('"+recovering+"','recoverfixture@example.invalid');");
 const recoveryLease=op();rpc('create-reserve',{operation:recovering,lease:recoveryLease,account:recoveryAccount});rpc('create-finish',{operation:recovering,lease:recoveryLease,authUid:target,technicalEmail:'recoverfixture@example.invalid'},uid,{failure:true});
 assert.equal(rpc('create-finish',{operation:recovering,lease:recoveryLease,authUid:recovering,technicalEmail:'recoverfixture@example.invalid'}).user.status,'disabled');
 assert.equal(admin("SELECT is_enabled FROM taxiqaid_private.auth_login_identities WHERE user_id='"+recovering+"';"),'f');

 rpc('create-reserve',{operation:op(),lease,account:{...account,contactEmail:null}},uid,{failure:true});
 rpc('create-reserve',{operation:op(),lease,account:{...account,username:'duplicateemail'}},uid,{failure:true});
 rpc('create-reserve',{operation:op(),lease,account},uid,{failure:true});
 rpc('create-reserve',{operation:op(),lease,account:{...account,username:'invalidmaster',role:'super_admin'}},uid,{failure:true});
 rpc('create-reserve',{operation:uid,lease,account:{...account,username:'masterreplacement'}},uid,{failure:true});
 const change=(action,extra={},actor=uid,options={})=>rpc(action,{operation:op(),uid:target,version:user.version,etag:user.etag,...extra},actor,options);
 change('permissions',{patch:{'fuel.create':true}},uid,{failure:true});
 user=change('permissions',{patch:{'dashboard.view':true,'user-management.view':true,'fuel.view':true,'fuel.create':true}}).user;
 assert.equal(typeof user.overrides['fuel.view'],'boolean');assert.ok(rpc('list',{},target).users.some(u=>u.uid===target));
 rpc('edit',{operation:op(),uid:target,version:user.version,etag:user.etag,account},target,{failure:true});
 const stale={version:user.version,etag:user.etag};user=change('permissions',{patch:{'fuel.view':false}}).user;
 rpc('permissions',{operation:op(),uid:target,...stale,patch:{'fuel.view':true}},uid,{failure:true});
 const effective=admin("SELECT taxiqaid_auth_api.admin_effective('"+target+"','fuel.create');");assert.equal(effective,'f');
 const master=list.users.find(u=>u.uid===uid);for(const action of ['edit','reset-reserve','auth-synced'])rpc(action,{operation:op(),uid,version:master.version,etag:master.etag,account},uid,{failure:true});rpc('permissions',{operation:op(),uid,version:master.version,etag:master.etag,patch:{'dashboard.view':false}},uid,{failure:true});
 user=change('edit',{account:{...account,username:'renamedfixture',contactEmail:'adminfixture@example.invalid',status:'disabled',departments:['fleet','finance']}}).user;
 assert.equal(user.status,'disabled');assert.equal(user.username,'renamedfixture');assert.equal(admin("SELECT is_enabled FROM taxiqaid_private.auth_login_identities WHERE user_id='"+target+"';"),'f');
 runtime("SELECT taxiqaid_auth_api.get_management_access('"+target+"',"+admin("SELECT revision FROM taxiqaid_private.auth_login_identities WHERE user_id='"+target+"'")+"::bigint);",{failure:true});
 user=change('edit',{account:{...account,username:'renamedfixture',role:'supervisor',departments:['fleet','finance']}}).user;assert.equal(user.role,'supervisor');
 const access=JSON.parse(runtime("SELECT taxiqaid_auth_api.get_management_access('"+target+"',"+admin("SELECT revision FROM taxiqaid_private.auth_login_identities WHERE user_id='"+target+"'")+"::bigint);"));assert.ok(access.departments.includes('fleet'));assert.equal(access.account.uid,target);
 const request=op(),queued={operation:request,driverRef:'future-authorized-source-1',iqama:'1000000001',name:'Synthetic Driver',field:'Name',oldValue:'Old Name',proposedValue:'New Name'};
 assert.equal(rpc('request-enqueue',queued).request.status,'pending');rpc('request-enqueue',queued);
 const decision={operation:op(),uid:request,version:1,note:'Reviewed locally'};const approved=rpc('request-approve',decision);assert.equal(approved.applied,false);assert.equal(approved.applicationBlocked,true);assert.equal(approved.request.status,'approved_pending_application');rpc('request-approve',decision);
 rpc('request-reject',{...decision,operation:op()},uid,{failure:true});
 const queue=rpc('requests',{}).requests;assert.equal(queue.find(r=>r.id===request).history.length,2);
 const second=op();rpc('request-enqueue',{...queued,operation:second});assert.equal(rpc('request-reject',{operation:op(),uid:second,version:1,note:''}).request.status,'rejected');
 const mirror=rpc('mirror-claim',{lease});assert.equal(mirror.batch.length,4);for(const item of mirror.batch){assert.ok(item.sheet_row>=2);for(const forbidden of ['technical_email','password','refresh_token','synthetic-admin-identity'])assert.equal(JSON.stringify(item.payload).includes(forbidden),false);}
 rpc('mirror-claim',{lease:op()},uid,{failure:true});rpc('mirror-ack',{lease,receipts:mirror.batch.map(e=>({kind:e.kind,entity:e.entity,version:e.version,ok:false}))});
 assert.equal(admin('SELECT min(attempts) FROM taxiqaid_private.user_admin_outbox;'),'1');
 for(const role of ['anon','authenticated','taxiqaid_auth_backend'])admin('SET ROLE '+role+";SELECT taxiqaid_auth_api.admin_dispatch('"+uid+"','list','{}');RESET ROLE;",{failure:true});
 const departmentsBefore=admin('SELECT jsonb_agg(to_jsonb(m) ORDER BY user_id,department_key) FROM taxiqaid_private.user_departments m;');
 admin("INSERT INTO taxiqaid_private.departments(department_key,department_name,is_active) VALUES('financial','Financial',true);INSERT INTO taxiqaid_private.user_departments(user_id,department_key) VALUES('"+target+"','financial');");
 const retirement=fs.readFileSync(path.join(root,'supabase/review/user-management/02_departments.sql'),'utf8'),ambiguous=admin('SELECT jsonb_agg(to_jsonb(m) ORDER BY user_id,department_key) FROM taxiqaid_private.user_departments m;');sql(retirement,{failure:true});assert.equal(admin('SELECT jsonb_agg(to_jsonb(m) ORDER BY user_id,department_key) FROM taxiqaid_private.user_departments m;'),ambiguous);
 sql(retirement.replace('-- Owner must insert reviewed mappings here.',"INSERT INTO approved_department_resolution VALUES('financial','finance',true);\n-- Owner must insert reviewed mappings here."));assert.equal(admin('SELECT jsonb_agg(to_jsonb(m) ORDER BY user_id,department_key) FROM taxiqaid_private.user_departments m;'),departmentsBefore);
 assert.equal(snapshot(),before,'Master and every existing permission/grant unchanged');
 console.error('PASS: persistent administrative CRUD, optional email, role checks, Master protection, 101/6, CAS/dependencies, Driver queue/history/idempotency, mirror privacy/backoff and explicit department migration.');
};
