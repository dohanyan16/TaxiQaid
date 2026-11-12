// Disposable PostgreSQL fixture, including managed Auth RLS default-deny. No real Supabase requests or credentials.
const {execFileSync,spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),name='taxiqaid-broker-test-'+process.pid,docker=['--host=unix:///var/run/docker.sock'],dockerEnv={...process.env};
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
const run=(args,options={})=>execFileSync('docker',[...docker,...args],{env:dockerEnv,encoding:'utf8',stdio:['pipe','pipe','pipe'],...options});
const sql=(input,{user='postgres',failure=false}={})=>{
 let output;try{output=run(['exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-d','postgres'],{input});}catch(error){if(failure)return '';throw new Error('Disposable SQL verification failed: '+String(error.stderr||error.message));}
 assert.equal(failure,false,'Expected SQL failure did not occur');return output.trim();
};
const lit=value=>"'"+String(value).replaceAll("'","''")+"'",hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const uid='00000000-0000-4000-8000-000000000001',driver='00000000-0000-4000-8000-000000000002',disabled='00000000-0000-4000-8000-000000000003';
const inventory=require('../supabase/baseline/permission-definitions.json').definitions,review=file=>fs.readFileSync(path.join(root,'supabase/review/username-broker',file),'utf8');
const api=(identifier,ip,account,global)=>`SELECT allowed FROM taxiqaid_auth_api.begin_login_attempt(${lit(identifier)},${lit(hash(ip))},${lit(hash(account))},${lit(hash(global))});`;
const access=(revision='1',subject=uid)=>`SELECT taxiqaid_auth_api.get_management_access(${lit(subject)},${lit(revision)}::bigint);`;
const runtime=(query,options={})=>sql('BEGIN;SET LOCAL ROLE taxiqaid_auth_backend;'+query+'COMMIT;',{user:'taxiqaid_auth_login',...options});
const authState=()=>sql("SELECT json_build_array(pg_get_userbyid(relowner),relrowsecurity,relforcerowsecurity,(SELECT count(*) FROM pg_policies WHERE schemaname='auth' AND tablename='users')) FROM pg_class WHERE oid='auth.users'::regclass;");
async function concurrent(queries){return Promise.all(queries.map(query=>new Promise((resolve,reject)=>{const child=spawn('docker',[...docker,'exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','taxiqaid_auth_login','-d','postgres'],{env:dockerEnv,stdio:['pipe','pipe','pipe']});let output='',error='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>error+=v);child.on('exit',code=>code?reject(new Error('Disposable concurrency failed: '+error)):resolve(output.trim()));child.stdin.end('BEGIN;SET LOCAL ROLE taxiqaid_auth_backend;'+query+'COMMIT;');})));}
(async()=>{
 let started=false;
 try{
  run(['run','--detach','--rm','--network','none','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:15-alpine']);started=true;
  let ready=false;for(let n=0;n<100;n++){try{run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}assert.ok(ready,'Disposable database startup failed');
  sql(`CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE taxiqaid_auth_backend NOLOGIN NOBYPASSRLS NOSUPERUSER;
CREATE ROLE supabase_auth_admin NOLOGIN NOBYPASSRLS;CREATE ROLE fixture_auth_reader NOLOGIN NOBYPASSRLS;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');ALTER TABLE auth.users OWNER TO supabase_auth_admin;ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA auth TO fixture_auth_reader;GRANT SELECT(id,email) ON auth.users TO fixture_auth_reader;
CREATE SCHEMA taxiqaid_private;
CREATE TABLE taxiqaid_private.user_accounts(user_id uuid PRIMARY KEY,username text,full_name text,account_type text,role_key text,status text,created_at timestamptz,updated_at timestamptz);
CREATE TABLE taxiqaid_private.departments(department_key text PRIMARY KEY,department_name text,is_active boolean,created_at timestamptz);
CREATE TABLE taxiqaid_private.user_departments(user_id uuid,department_key text,assigned_at timestamptz);
CREATE TABLE taxiqaid_private.permissions(permission_key text PRIMARY KEY,module_key text,action_key text,display_name text,description text,is_active boolean);
CREATE TABLE taxiqaid_private.role_permissions(role_key text,permission_key text,is_allowed boolean);
CREATE TABLE taxiqaid_private.user_permission_overrides(user_id uuid,permission_key text,is_allowed boolean,updated_at timestamptz,updated_by uuid);
CREATE TABLE taxiqaid_private.login_attempt_counters(bucket text,window_start timestamptz,expires_at timestamptz,attempts bigint,PRIMARY KEY(bucket,window_start));CREATE INDEX ON taxiqaid_private.login_attempt_counters(expires_at);
${['user_accounts','departments','user_departments','permissions','role_permissions','user_permission_overrides','login_attempt_counters'].map(t=>'ALTER TABLE taxiqaid_private.'+t+' ENABLE ROW LEVEL SECURITY;').join('\n')}
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(${lit(uid)},'synthetic-private@example.invalid','{"email":"untrusted-metadata@example.invalid","role":"untrusted"}'),(${lit(driver)},'synthetic-driver@example.invalid','{}'),(${lit(disabled)},'synthetic-disabled@example.invalid','{}');
INSERT INTO taxiqaid_private.user_accounts(user_id,username,full_name,account_type,role_key,status) VALUES(${lit(uid)},'dohanyan','Synthetic Manager','management','super_admin','active'),(${lit(driver)},'1000000001','Synthetic Driver','driver','driver','active'),(${lit(disabled)},'disabledfixture','Synthetic Disabled','management','staff','disabled');
INSERT INTO taxiqaid_private.departments(department_key,is_active) VALUES('it',true),('hr',false);
INSERT INTO taxiqaid_private.user_departments(user_id,department_key) VALUES(${lit(uid)},'it'),(${lit(uid)},'hr');
INSERT INTO taxiqaid_private.permissions(permission_key,module_key,action_key,display_name,is_active) VALUES ${inventory.map(p=>`(${lit(p.key)},${lit(p.module)},'test','Synthetic',true)`).join(',')};
INSERT INTO taxiqaid_private.role_permissions(role_key,permission_key,is_allowed) VALUES ${inventory.map(p=>`('super_admin',${lit(p.key)},${p.audience!=='Driver'})`).join(',')};`);
  assert.equal(sql('SET ROLE fixture_auth_reader;SELECT count(*) FROM auth.users;'),'0','Column grants alone must not bypass managed Auth RLS');
  const originalAuthState=authState(),originalAuthRows=sql('SELECT json_agg(id ORDER BY id) FROM auth.users;');
  assert.deepEqual(JSON.parse(originalAuthState),['supabase_auth_admin',true,false,0]);
  for(const file of ['00_inspect.sql','01_roles_and_policies.sql','02_functions.sql','03_verify_privileges.sql'])sql(review(file));
  // Model Vault without retaining/revealing the synthetic database credential.
  sql(`CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;CREATE SCHEMA vault;CREATE TABLE vault.secrets(name text);CREATE FUNCTION vault.create_secret(new_secret text,new_name text,new_description text,new_key_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$ BEGIN INSERT INTO vault.secrets VALUES(new_name);RETURN pg_catalog.gen_random_uuid();END $$;`);
  sql(review('04_provision_connection.sql'),{failure:true}); // Mapping readiness blocks connection provisioning.
  sql(review('02a_provision_existing_master.sql'));sql(review('02a_provision_existing_master.sql'),{failure:true});
  assert.equal(sql('SELECT json_agg(id ORDER BY id) FROM auth.users;'),originalAuthRows,'Existing Auth identities must not be recreated');
  assert.equal(sql(`SELECT technical_email='synthetic-private@example.invalid' AND revision=1 AND is_enabled FROM taxiqaid_private.auth_login_identities WHERE user_id=${lit(uid)};`),'t','Authoritative email must ignore user-editable metadata');
  sql(review('03_verify_privileges.sql'));sql(review('04_provision_connection.sql'));sql(review('04_provision_connection.sql'),{failure:true});
  const columns=JSON.parse(sql("SELECT json_agg(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='taxiqaid_private' AND table_name='auth_login_identities';"));assert.deepEqual(columns,['user_id','technical_email','is_enabled','revision','synchronized_at','updated_by_db_role']);
  // UID PK, Auth FK and case-insensitive unique email prevent duplicate/cross-identity routing entries.
  for(const query of [`INSERT INTO taxiqaid_private.auth_login_identities(user_id,technical_email) VALUES(${lit(uid)},'another@example.invalid');`,`INSERT INTO taxiqaid_private.auth_login_identities(user_id,technical_email) VALUES(${lit(driver)},'SYNTHETIC-PRIVATE@example.invalid');`,`INSERT INTO taxiqaid_private.auth_login_identities(user_id,technical_email) VALUES('00000000-0000-4000-8000-000000000099','absent@example.invalid');`])sql(query,{failure:true});
  for(const user of ['anon','authenticated','taxiqaid_auth_login']){
   for(const table of ['auth.users','taxiqaid_private.user_accounts','taxiqaid_private.login_attempt_counters','taxiqaid_private.auth_login_identities'])sql('SET ROLE '+user+';SELECT * FROM '+table+';',{failure:true});
   sql('SET ROLE '+user+";SELECT * FROM taxiqaid_auth_api.begin_login_attempt('x','a','b','c');",{failure:true});
  }
  for(const query of ['SELECT * FROM auth.users;','SELECT * FROM taxiqaid_private.auth_login_identities;',"SELECT taxiqaid_auth_api.consume_login_counters('a','b','c');",'SELECT taxiqaid_auth_api.prune_login_counters();',`SELECT taxiqaid_auth_api.synchronize_management_identity(${lit(uid)},'dohanyan',1);`,'SET ROLE taxiqaid_auth_lookup_owner;','SET ROLE postgres;'])runtime(query,{failure:true});
  for(const role of ['taxiqaid_auth_lookup_owner','taxiqaid_auth_access_owner','taxiqaid_auth_rate_owner'])sql('SET ROLE '+role+';SELECT id,email FROM auth.users;',{failure:true});
  assert.equal(runtime(api('dohanyan','ip1','account1','global1')),'t');
  assert.equal(runtime("CREATE TEMP TABLE user_accounts(user_id uuid);"+access().replace(');',")->>'uid';")),uid);
  const payload=JSON.parse(runtime(access())),contract=require('../shared/auth-contract.js'),model=require('../shared/permission-model.js'),catalog=require('../shared/permission-catalog.js'),context=contract.access(payload,uid,Date.now()/1000+3600);
  assert.equal(catalog.ALL.filter(p=>model.draftDecision(p.key,context).allowed).length,101);assert.deepEqual(payload.departments,['it']);assert.equal(JSON.stringify(payload).includes('@'),false);
  for(const [identifier,key]of [['1000000001','driver'],['disabledfixture','disabled'],['unknownfixture','unknown']])assert.equal(runtime(api(identifier,'ip-'+key,'account-'+key,'global-'+key).replace('SELECT allowed','SELECT allowed AND uid IS NULL AND email IS NULL AND mapping_revision IS NULL')),'t');
  sql(`SELECT taxiqaid_auth_api.synchronize_management_identity(${lit(disabled)},'disabledfixture',0);`,{failure:true});
  sql(`SELECT taxiqaid_auth_api.synchronize_management_identity(${lit(uid)},'wrongusername',1);`,{failure:true});
  sql(`SELECT taxiqaid_auth_api.synchronize_management_identity(${lit(uid)},'dohanyan',0);`,{failure:true});
  // Suspend + official-provider email change + administrative resync, with optimistic revision checks.
  sql(`SELECT taxiqaid_auth_api.suspend_management_identity(${lit(uid)},1);`);runtime(access('1'),{failure:true});assert.equal(runtime(api('dohanyan','suspended-ip','suspended-account','suspended-global').replace('SELECT allowed','SELECT uid IS NULL AND email IS NULL')),'t');
  sql(`UPDATE auth.users SET email='synthetic-updated@example.invalid' WHERE id=${lit(uid)};`); // Auth service simulation inside this disposable fixture only.
  sql(`SELECT taxiqaid_auth_api.synchronize_management_identity(${lit(uid)},'dohanyan',2);`);runtime(access('1'),{failure:true});assert.equal(JSON.parse(runtime(access('3'))).uid,uid);
  sql(`UPDATE auth.users SET email='out-of-band@example.invalid' WHERE id=${lit(uid)};`);sql(`SELECT taxiqaid_auth_api.synchronize_management_identity(${lit(uid)},'dohanyan',3);`,{failure:true});
  sql(`UPDATE auth.users SET email='synthetic-updated@example.invalid' WHERE id=${lit(uid)};`);
  sql(`INSERT INTO taxiqaid_private.user_permission_overrides(user_id,permission_key,is_allowed) VALUES(${lit(uid)},'fuel.view',false),(${lit(uid)},'fuel.create',true);`);
  const denied=JSON.parse(runtime(access('3')));assert.equal(model.can(contract.access(denied,uid,Date.now()/1000+3600),'fuel.create'),false);
  sql("UPDATE taxiqaid_private.permissions SET is_active=false WHERE permission_key='fuel.view';");const inactive=JSON.parse(runtime(access('3')));assert.equal(inactive.permissions.roleDefaults.includes('fuel.view'),false);assert.equal(Object.hasOwn(inactive.permissions.overrides,'fuel.view'),false);
  sql('ALTER ROLE taxiqaid_auth_login CONNECTION LIMIT 40;'); // Disposable fixture only.
  const parallel=await concurrent(Array.from({length:30},(_,n)=>api('dohanyan','parallel-ip-'+n,'parallel-account','parallel-global')));assert.equal(parallel.filter(v=>v==='t').length,10);sql('ALTER ROLE taxiqaid_auth_login CONNECTION LIMIT 4;');
  // A throttled request touches neither account nor mapping, even when those reads are revoked.
  sql('REVOKE SELECT(user_id,username,account_type,status) ON taxiqaid_private.user_accounts FROM taxiqaid_auth_lookup_owner;REVOKE SELECT(user_id,technical_email,is_enabled,revision) ON taxiqaid_private.auth_login_identities FROM taxiqaid_auth_lookup_owner;');assert.equal(runtime(api('dohanyan','parallel-ip-final','parallel-account','parallel-global')),'f');
  sql('GRANT SELECT(user_id,username,account_type,status) ON taxiqaid_private.user_accounts TO taxiqaid_auth_lookup_owner;');
  assert.equal(runtime(api('unknownfixture','unknown-ip2','unknown-account2','unknown-global2').replace('SELECT allowed','SELECT uid IS NULL AND email IS NULL')),'t','Unknown usernames must not even require mapping access');
  sql('GRANT SELECT(user_id,technical_email,is_enabled,revision) ON taxiqaid_private.auth_login_identities TO taxiqaid_auth_lookup_owner;');
  const before=sql('SELECT count(*) FROM taxiqaid_private.login_attempt_counters;');sql('BEGIN;SET LOCAL ROLE taxiqaid_auth_backend;'+api('dohanyan','rollback-ip','rollback-account','rollback-global')+'ROLLBACK;',{user:'taxiqaid_auth_login'});assert.equal(sql('SELECT count(*) FROM taxiqaid_private.login_attempt_counters;'),before);
  assert.equal(sql('BEGIN;SET LOCAL ROLE taxiqaid_auth_backend;COMMIT;SELECT current_user;',{user:'taxiqaid_auth_login'}),'taxiqaid_auth_login');
  sql(`UPDATE taxiqaid_private.user_accounts SET status='disabled' WHERE user_id=${lit(uid)};`);runtime(access('3'),{failure:true});assert.equal(runtime(api('dohanyan','disabled-ip2','disabled-account2','disabled-global2').replace('SELECT allowed','SELECT uid IS NULL AND email IS NULL')),'t');
  sql(`INSERT INTO taxiqaid_private.login_attempt_counters VALUES(${lit(hash('expired'))},now()-interval '2 hours',now()-interval '1 hour',1);`);assert.equal(sql('SELECT taxiqaid_auth_api.prune_login_counters(1000);'),'1');
  assert.equal(authState(),originalAuthState,'Managed Auth owner/RLS/policies must remain unchanged');
  if(process.env.TAXIQAID_TEST_PUBLIC_GATEWAY==='true'){
   sql(fs.readFileSync(path.join(root,'supabase/review/public-login/00_conservative_limits.sql'),'utf8'));
   sql(fs.readFileSync(path.join(root,'supabase/review/public-login/01_signed_attempt_and_cleanup.sql'),'utf8'));
   const epoch=sql('SELECT floor(extract(epoch FROM clock_timestamp()))::bigint;');
   const signed=(nonce,group='signed',stamp=epoch)=>`SELECT allowed FROM taxiqaid_auth_api.begin_signed_login_attempt('dohanyan',${lit(hash(group+'-ip'))},${lit(hash(group+'-account'))},${lit(hash(group+'-global'))},${lit(hash(nonce))},${stamp});`;
   assert.equal(runtime(signed('unmaintained')),'f');
   assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'f');
   sql('SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);');
   assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'t');
   assert.equal(runtime(signed('once')),'t');assert.equal(runtime(signed('once')),'f');
   const budget=(group,index,ip,account)=>`SELECT allowed FROM taxiqaid_auth_api.begin_signed_login_attempt('unknownfixture',${lit(hash(group+'-ip-'+ip))},${lit(hash(group+'-account-'+account))},${lit(hash(group+'-global'))},${lit(hash(group+'-nonce-'+index))},floor(extract(epoch FROM clock_timestamp()))::bigint);`;
   for(let n=0;n<3;n++)assert.equal(runtime(budget('ip-budget',n,'same',n)),n<2?'t':'f');
   for(let n=0;n<21;n++)assert.equal(runtime(budget('global-budget',n,n,n)),n<20?'t':'f');
   for(let n=0;n<11;n++)assert.equal(runtime(budget('identifier-budget',n,n,'same')),n<10?'t':'f');

   assert.equal(runtime(signed('stale','stale',Number(epoch)-61)),'f');
   assert.equal(runtime(signed('future','future',Number(epoch)+10)),'f');
   // Replay still consumes existing limits but never releases another usable attempt.
   sql('ALTER ROLE taxiqaid_auth_login CONNECTION LIMIT 40;');
   const nonceRace=await concurrent(Array.from({length:12},()=>signed('raced','race')));assert.equal(nonceRace.filter(v=>v==='t').length,1);
   sql('ALTER ROLE taxiqaid_auth_login CONNECTION LIMIT 4;');
   sql("UPDATE taxiqaid_private.login_attempt_counters SET expires_at=clock_timestamp()-interval '1 second' WHERE window_start=to_timestamp(0);");
   const staleCount=sql('SELECT count(*) FROM taxiqaid_private.login_attempt_counters;');assert.equal(runtime(signed('stopped','stopped')),'f');assert.equal(sql('SELECT count(*) FROM taxiqaid_private.login_attempt_counters;'),staleCount);
   sql('SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);');
   sql(`INSERT INTO taxiqaid_private.login_attempt_counters SELECT md5('backlog'||g::text)||md5('tail'||g::text),now()-interval '2 hours',now()-interval '1 hour',1 FROM generate_series(1,1001) g;`);
   assert.equal(sql('SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);'),'1000');assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'f');
   assert.equal(sql('SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);'),'1');assert.equal(sql('SELECT taxiqaid_auth_api.public_login_limits_healthy();'),'t');
   for(const fn of ['taxiqaid_auth_api.claim_gateway_nonce('+lit(hash('blocked'))+','+epoch+')','taxiqaid_auth_api.maintain_public_login_counters(1000)','taxiqaid_auth_api.public_login_limits_healthy()'])runtime('SELECT '+fn+';',{failure:true});
   sql('SELECT taxiqaid_auth_api.maintain_public_login_counters(1001);',{failure:true});
   assert.equal(authState(),originalAuthState);process.stderr.write('PASS: signed attempts, one-use nonce race, stale cleanup admission stop, bounded backlog and private function grants.\n');
  }
  console.log(JSON.stringify({result:'PASS',database:'Disposable PostgreSQL 15, no live Supabase/Auth test',managedAuth:'supabase_auth_admin owner, RLS on, FORCE off, zero policies unchanged',mapping:'Existing UID seed, authoritative source, PK/FK/email uniqueness, no passwords or grants, controlled revision/suspension/resync',parallelSessions:30,parallelIdentifierPermits:10,privileges:'No runtime/definer Auth reads or browser/runtime mapping access',checks:'101 grants, six driver denials, unknown/disabled, prelookup limiter, generic administration failures and cleanup'},null,2));
 }finally{if(started)run(['stop','--time','1',name]);}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
