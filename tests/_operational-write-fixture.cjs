// Runs only inside the existing disposable PostgreSQL 16 fixture, after administrative setup.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=({sql,root,uid,lit})=>{
 const admin=(q,o={})=>sql(q,{user:'supabase_admin',...o});
 const run=(action,data={},o={})=>JSON.parse(sql('BEGIN;SET LOCAL ROLE taxiqaid_operational_backend;SELECT taxiqaid_auth_api.operational_dispatch('+lit(uid)+'::uuid,'+lit(action)+','+lit(JSON.stringify({actor:uid,...data}))+'::jsonb);COMMIT;',{user:'taxiqaid_operational_login',...o})||'null');
 const snapshot=()=>admin("SELECT jsonb_build_object('accounts',(SELECT jsonb_agg(to_jsonb(a) ORDER BY user_id) FROM taxiqaid_private.user_accounts a),'permissions',(SELECT jsonb_agg(to_jsonb(a) ORDER BY permission_key) FROM taxiqaid_private.permissions a),'grants',(SELECT jsonb_agg(to_jsonb(a) ORDER BY role_key,permission_key) FROM taxiqaid_private.role_permissions a));");const before=snapshot();
 admin('CREATE ROLE service_role NOLOGIN BYPASSRLS;');
 const proposal=fs.readFileSync(path.join(root,'supabase/review/operational-data/02_write_receipts_rpc_review.sql'),'utf8');
 sql(proposal.replace(/COMMIT;\s*$/,'ROLLBACK;'));assert.equal(admin("SELECT to_regclass('taxiqaid_private.operational_write_receipts') IS NULL;"),'t');
 sql(proposal);sql(proposal,{failure:/COORDINATOR_COLLISION_REVIEW_REQUIRED/});assert.equal(snapshot(),before);
 for(const role of ['anon','authenticated','service_role','taxiqaid_operational_login','taxiqaid_auth_backend'])assert.equal(admin("SELECT has_function_privilege('"+role+"','taxiqaid_auth_api.operational_dispatch(uuid,text,jsonb)','EXECUTE') OR has_table_privilege('"+role+"','taxiqaid_private.operational_write_receipts','SELECT');"),'f');
 assert.equal(admin("SELECT has_schema_privilege('taxiqaid_operational_owner','taxiqaid_auth_api','CREATE') OR pg_has_role('postgres','taxiqaid_operational_owner','SET') OR pg_has_role('postgres','taxiqaid_user_admin_owner','SET');"),'f');
 const input={operation:crypto.randomUUID(),recordId:'ro-synthetic-record',version:0,sha:'a'.repeat(64)};
 for(const field of ['operation','recordId','version','sha'])run('claim',{...input,[field]:null},{failure:/INVALID_REQUEST/});
 const first=run('claim',input);assert.equal(first.is_new,true);assert.ok(first.key);assert.equal(run('claim',input).is_new,false);assert.equal(run('claim',input).key,null);
 run('claim',{...input,sha:'b'.repeat(64)},{failure:/OPERATION_REUSED/});run('claim',{...input,operation:crypto.randomUUID()},{failure:/WRITE_BUSY/});
 const owned={...input,key:first.key},id=crypto.randomUUID(),plan={id,version:1,operation:input.operation,drivers:[{}],fleet:[]};
 run('advance',{...owned,state:'driver_sent'},{failure:/INVALID_TRANSITION/});run('seal',{...owned,plan});
 run('seal',{...owned,plan},{failure:/INVALID_PLAN/});run('advance',{...owned,state:'driver_sent'});
 run('finish',{...owned,state:'conflict'},{failure:/INVALID_TRANSITION/});run('finish',{...owned,state:'uncertain'});
 run('claim',{...input,operation:crypto.randomUUID()},{failure:/WRITE_BUSY/});
 run('finish',{...owned,state:'applied',id,version:2},{failure:/INVALID_RESULT/});run('finish',{...input,state:'applied',id,version:1},{failure:/CLAIM_REQUIRED/});
 run('finish',{...input,state:'applied',id,version:1,reconcile:true});assert.equal(run('claim',input).state,'applied');
 const next={...input,operation:crypto.randomUUID()};const claim=run('claim',next);run('finish',{...next,key:claim.key,state:'conflict'});
 admin("UPDATE taxiqaid_private.user_accounts SET status='disabled' WHERE user_id="+lit(uid)+";");run('claim',{...input,operation:crypto.randomUUID()},{failure:/ADMIN_DENIED/});admin("UPDATE taxiqaid_private.user_accounts SET status='active' WHERE user_id="+lit(uid)+";");
 assert.equal(snapshot(),before);
 console.error('PASS: operational SQL transaction/rollback, collision rejection, narrow grants, managed memberships, nulls, idempotency, serialization, sealed plans, invalid transitions, uncertain retention and current account revocation.');
};
