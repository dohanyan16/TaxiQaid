// Disposable, network-isolated PostgreSQL integration. Never connects to a real Supabase database.
const {execFileSync,spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),name='taxiqaid-broker-test-'+process.pid;
const docker=['--host=unix:///var/run/docker.sock'];
const dockerEnv={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
const run=(args,options={})=>execFileSync('docker',[...docker,...args],{env:dockerEnv,encoding:'utf8',stdio:['pipe','pipe','pipe'],...options});
const sql=(input,{user='postgres',failure=false}={})=>{try{const out=run(['exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-d','postgres'],{input});assert.equal(failure,false,'Expected a privilege/query failure');return out.trim();}catch(error){if(failure)return '';throw new Error('Disposable SQL verification failed: '+String(error.stderr||error.message));}};
const lit=value=>"'"+String(value).replaceAll("'","''")+"'",hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const uid='00000000-0000-4000-8000-000000000001',driver='00000000-0000-4000-8000-000000000002',disabled='00000000-0000-4000-8000-000000000003';
const inventory=require('../supabase/baseline/permission-definitions.json').definitions;
const api=(identifier,ip,account,global)=>`SELECT allowed FROM taxiqaid_auth_api.begin_login_attempt(${lit(identifier)},${lit(hash(ip))},${lit(hash(account))},${lit(hash(global))});`;
const runtime=query=>sql('BEGIN; SET LOCAL ROLE taxiqaid_auth_backend; '+query+' COMMIT;',{user:'taxiqaid_auth_login'});
async function concurrent(queries){return Promise.all(queries.map(query=>new Promise((resolve,reject)=>{const child=spawn('docker',[...docker,'exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','taxiqaid_auth_login','-d','postgres'],{env:dockerEnv,stdio:['pipe','pipe','pipe']});let output='',error='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>error+=v);child.on('exit',code=>code?reject(new Error('Disposable concurrency failed: '+error)):resolve(output.trim()));child.stdin.end('BEGIN;SET LOCAL ROLE taxiqaid_auth_backend;'+query+'COMMIT;');})));}
(async()=>{
 let started=false;
 try{
  run(['run','--detach','--rm','--network','none','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:15-alpine']);started=true;
  let ready=false;for(let n=0;n<100;n++){try{run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}assert.ok(ready,'Disposable database startup failed');
  sql(`CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE taxiqaid_auth_backend NOLOGIN NOBYPASSRLS NOSUPERUSER;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
CREATE SCHEMA taxiqaid_private;
CREATE TABLE taxiqaid_private.user_accounts(user_id uuid PRIMARY KEY,username text,full_name text,account_type text,role_key text,status text,created_at timestamptz,updated_at timestamptz);
CREATE TABLE taxiqaid_private.departments(department_key text PRIMARY KEY,department_name text,is_active boolean,created_at timestamptz);
CREATE TABLE taxiqaid_private.user_departments(user_id uuid,department_key text,assigned_at timestamptz);
CREATE TABLE taxiqaid_private.permissions(permission_key text PRIMARY KEY,module_key text,action_key text,display_name text,description text,is_active boolean);
CREATE TABLE taxiqaid_private.role_permissions(role_key text,permission_key text,is_allowed boolean);
CREATE TABLE taxiqaid_private.user_permission_overrides(user_id uuid,permission_key text,is_allowed boolean,updated_at timestamptz,updated_by uuid);
CREATE TABLE taxiqaid_private.login_attempt_counters(bucket text,window_start timestamptz,expires_at timestamptz,attempts bigint,PRIMARY KEY(bucket,window_start));
CREATE INDEX ON taxiqaid_private.login_attempt_counters(expires_at);
${['user_accounts','departments','user_departments','permissions','role_permissions','user_permission_overrides','login_attempt_counters'].map(t=>'ALTER TABLE taxiqaid_private.'+t+' ENABLE ROW LEVEL SECURITY;').join('\n')}
INSERT INTO auth.users VALUES(${lit(uid)},'synthetic-private@example.invalid'),(${lit(driver)},'synthetic-driver@example.invalid'),(${lit(disabled)},'synthetic-disabled@example.invalid');
INSERT INTO taxiqaid_private.user_accounts(user_id,username,full_name,account_type,role_key,status) VALUES(${lit(uid)},'syntheticmanager','Synthetic Manager','management','super_admin','active'),(${lit(driver)},'1000000001','Synthetic Driver','driver','driver','active'),(${lit(disabled)},'disabledfixture','Synthetic Disabled','management','staff','disabled');
INSERT INTO taxiqaid_private.departments(department_key,is_active) VALUES('it',true),('hr',false);
INSERT INTO taxiqaid_private.user_departments(user_id,department_key) VALUES(${lit(uid)},'it'),(${lit(uid)},'hr');
INSERT INTO taxiqaid_private.permissions(permission_key,module_key,action_key,display_name,is_active) VALUES ${inventory.map(p=>`(${lit(p.key)},${lit(p.module)},'test','Synthetic',true)`).join(',')};
INSERT INTO taxiqaid_private.role_permissions(role_key,permission_key,is_allowed) VALUES ${inventory.map(p=>`('super_admin',${lit(p.key)},${p.audience!=='Driver'})`).join(',')};`);
  for(const file of ['00_inspect.sql','01_roles_and_policies.sql','02_functions.sql','03_verify_privileges.sql'])sql(fs.readFileSync(path.join(root,'supabase/review/username-broker',file),'utf8'));
  // Model Vault's provisioning API without retaining/revealing a credential. This is not real Vault validation.
  sql(`CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;CREATE SCHEMA vault;CREATE TABLE vault.secrets(name text);CREATE FUNCTION vault.create_secret(new_secret text,new_name text,new_description text,new_key_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$ BEGIN INSERT INTO vault.secrets VALUES(new_name);RETURN pg_catalog.gen_random_uuid();END $$;`);
  const provision=fs.readFileSync(path.join(root,'supabase/review/username-broker/04_provision_connection.sql'),'utf8');sql(provision);sql(provision,{failure:true});
  assert.equal(sql("SELECT rolcanlogin FROM pg_roles WHERE rolname='taxiqaid_auth_login';"),'t');
  // Local socket trust is limited to this disposable, network-isolated fixture. No credential is read by the test.

  for(const user of ['anon','authenticated','taxiqaid_auth_login']){
   for(const table of ['auth.users','taxiqaid_private.user_accounts','taxiqaid_private.login_attempt_counters'])sql('SET ROLE '+user+';SELECT * FROM '+table+';',{failure:true});
   sql('SET ROLE '+user+";SELECT * FROM taxiqaid_auth_api.begin_login_attempt('x','a','b','c');",{failure:true});
  }
  for(const query of ['SELECT * FROM auth.users;','SELECT * FROM taxiqaid_private.user_accounts;',"SELECT taxiqaid_auth_api.consume_login_counters('a','b','c');",'SELECT taxiqaid_auth_api.prune_login_counters();','SET ROLE taxiqaid_auth_lookup_owner;','SET ROLE postgres;'])sql('SET ROLE taxiqaid_auth_backend;'+query,{user:'taxiqaid_auth_login',failure:true});
  assert.equal(runtime(api('syntheticmanager','ip1','account1','global1')),'t');
  assert.equal(runtime("CREATE TEMP TABLE user_accounts(user_id uuid);"+`SELECT taxiqaid_auth_api.get_management_access(${lit(uid)})->>'uid';`),uid);
  const payload=JSON.parse(runtime(`SELECT taxiqaid_auth_api.get_management_access(${lit(uid)});`));
  const contract=require('../shared/auth-contract.js'),model=require('../shared/permission-model.js'),catalog=require('../shared/permission-catalog.js'),context=contract.access(payload,uid,Date.now()/1000+3600);
  assert.equal(catalog.ALL.filter(p=>model.draftDecision(p.key,context).allowed).length,101);assert.deepEqual(payload.departments,['it']);assert.equal(JSON.stringify(payload).includes('@'),false);
  for(const [identifier,key]of [['1000000001','driver'],['disabledfixture','disabled'],['unknownfixture','unknown']])assert.equal(runtime(api(identifier,'ip-'+key,'account-'+key,'global-'+key).replace('SELECT allowed','SELECT allowed AND uid IS NULL AND email IS NULL')),'t');
  sql(`INSERT INTO taxiqaid_private.user_permission_overrides(user_id,permission_key,is_allowed) VALUES(${lit(uid)},'fuel.view',false),(${lit(uid)},'fuel.create',true);`);
  const denied=JSON.parse(runtime(`SELECT taxiqaid_auth_api.get_management_access(${lit(uid)});`));assert.equal(model.can(contract.access(denied,uid,Date.now()/1000+3600),'fuel.create'),false);
  sql(`UPDATE taxiqaid_private.permissions SET is_active=false WHERE permission_key='fuel.view';`);const inactive=JSON.parse(runtime(`SELECT taxiqaid_auth_api.get_management_access(${lit(uid)});`));assert.equal(inactive.permissions.roleDefaults.includes('fuel.view'),false);assert.equal(Object.hasOwn(inactive.permissions.overrides,'fuel.view'),false);
  // Simultaneous independent database sessions must grant at most ten attempts for one identifier.
  sql('ALTER ROLE taxiqaid_auth_login CONNECTION LIMIT 40;'); // Disposable fixture only, to exercise 30 concurrent transactions.
  const parallel=await concurrent(Array.from({length:30},(_,n)=>api('syntheticmanager','parallel-ip-'+n,'parallel-account','parallel-global')));assert.equal(parallel.filter(v=>v==='t').length,10);sql('ALTER ROLE taxiqaid_auth_login CONNECTION LIMIT 4;');
  // Throttle before touching Auth: a denied bucket still returns false with Auth lookup permission revoked.
  sql('REVOKE SELECT(id,email) ON auth.users FROM taxiqaid_auth_lookup_owner;');assert.equal(runtime(api('syntheticmanager','parallel-ip-final','parallel-account','parallel-global')),'f');
  sql('GRANT SELECT(id,email) ON auth.users TO taxiqaid_auth_lookup_owner;');
  // Transaction rollback cannot leak a private result, and SET LOCAL ROLE never survives a transaction.
  const before=Number(sql('SELECT count(*) FROM taxiqaid_private.login_attempt_counters;'));
  sql('BEGIN;SET LOCAL ROLE taxiqaid_auth_backend;'+api('syntheticmanager','rollback-ip','rollback-account','rollback-global')+'ROLLBACK;',{user:'taxiqaid_auth_login'});assert.equal(Number(sql('SELECT count(*) FROM taxiqaid_private.login_attempt_counters;')),before);
  assert.equal(sql('BEGIN;SET LOCAL ROLE taxiqaid_auth_backend;COMMIT;SELECT current_user;',{user:'taxiqaid_auth_login'}),'taxiqaid_auth_login');
  sql(`UPDATE taxiqaid_private.user_accounts SET status='disabled' WHERE user_id=${lit(uid)};`);sql('SET ROLE taxiqaid_auth_backend;'+`SELECT taxiqaid_auth_api.get_management_access(${lit(uid)});`,{user:'taxiqaid_auth_login',failure:true});
  sql(`INSERT INTO taxiqaid_private.login_attempt_counters VALUES(${lit(hash('expired'))},now()-interval '2 hours',now()-interval '1 hour',1);`);assert.equal(sql('SELECT taxiqaid_auth_api.prune_login_counters(1000);'),'1');
  console.log(JSON.stringify({result:'PASS',database:'Disposable PostgreSQL 15; no genuine Supabase/Auth test',parallelSessions:30,parallelIdentifierPermits:10,privileges:'No browser/runtime table reads, role escalation or direct counter calls',checks:'Existing table reuse, RLS/owners, 101 grants, active departments/permissions, boolean deny, disabled/unknown/driver, transaction cleanup, expiry cleanup; credential procedure simulated without real Vault'},null,2));
 }finally{if(started)run(['stop','--time','1',name]);}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
