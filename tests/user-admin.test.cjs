const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const model=require('../shared/user-admin-model.js'),catalog=require('../shared/permission-catalog.js'),contract=require('../shared/auth-contract.js');
const account={username:'testmanager',fullName:'Synthetic Manager',contactEmail:null,role:'manager',status:'active',departments:['fleet']};
test('seven administrative departments and two creatable roles; legacy memberships remain read-compatible without aliases',()=>{assert.deepEqual(Object.values(catalog.DEPARTMENTS),['Operation','Fleet','Maintenance','Finance','HR','QHSE','IT']);assert.deepEqual(Object.keys(catalog.MANAGEMENT_ROLES),['manager','supervisor']);assert.equal(catalog.ALL.length,107);assert.equal(catalog.ALL.filter(p=>p.audience!=='Driver').length,101);assert.equal(contract.department('financial'),'financial');assert.notEqual(contract.department('financial'),contract.department('finance'));});
test('strict account schema, optional contact email and normalized unique username input',()=>{assert.equal(model.account({...account,username:' TestManager '}).username,'testmanager');assert.equal(model.account({...account,contactEmail:''}).contactEmail,null);for(const patch of [{role:'super_admin'},{role:'driver'},{departments:['financial']},{departments:['fleet','fleet']},{departments:[]},{username:'1bad'},{fullName:''},{contactEmail:'bad'},{password:'do-not-persist'}])assert.throws(()=>model.account({...account,...patch}));});
test('two-state UI saves only dirty effective decisions and retains absent/inherited override rows',()=>{const user={roleDefaults:['fuel.view','fuel.create'],overrides:{}};assert.deepEqual(model.changes(user,{'fuel.view':true,'fuel.create':true}),{});assert.deepEqual(model.changes(user,{'fuel.view':false}),{'fuel.view':false});assert.throws(()=>model.permissions({roleDefaults:[],overrides:{}},{'fuel.create':true}));assert.deepEqual(model.permissions(user,{'fuel.view':false}),{'fuel.view':false});for(const patch of [{'driver-portal.sign':true},{'fuel.view':'allow'},{unknown:true}])assert.throws(()=>model.permissions(user,patch));});
test('SQL and administration Dashboard artifacts are generated without drift',()=>{cp.execFileSync(process.execPath,['scripts/build-user-admin-sql.cjs','--check']);cp.execFileSync(process.execPath,['scripts/build-user-admin-dashboard.cjs','--check']);});
test('administrative code keeps provider secrets server-side and active authentication admission flags unchanged',()=>{const source=fs.readFileSync('modules/administration/user-management/user-management.js','utf8');assert.equal(/service_role|TAXIQAID_AUTH_ADMIN_KEY|localStorage|indexedDB/.test(source),false);assert.match(fs.readFileSync('shared/auth-dedicated-config.js','utf8'),/enabled:true/);assert.match(fs.readFileSync('supabase/functions/manage-users/runtime.ts','utf8'),/TAXIQAID_USER_ADMIN_ENABLED/);const sql=fs.readFileSync('supabase/review/user-management/01_admin.sql','utf8');assert.equal(/ALTER ROLE taxiqaid_auth_|GRANT .* TO taxiqaid_auth_backend/.test(sql),false);assert.match(sql,/SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on/);assert.match(sql,/ROLE_CONSTRAINT_REVIEW_REQUIRED/);assert.equal(/(?:password_hash|password\s+(?:text|bytea)|p_password)/i.test(sql),false);});

test('admin migration permits only the exact owner-reviewed role CHECK without weakening live constraints',()=>{
 const sql=fs.readFileSync('supabase/review/user-management/01_admin.sql','utf8');
 const fixture=fs.readFileSync('tests/_user-admin-fixture.cjs','utf8');
 assert.match(sql,/CREATE TEMP TABLE taxiqaid_admin_expected_role_check/);
 assert.match(sql,/CONSTRAINT approved_role_check CHECK/);
 assert.match(sql,/pg_get_constraintdef\(existing\.oid\)=pg_get_constraintdef\(approved\.oid\)/);
 assert.match(sql,/existing\.conname='user_accounts_check' AND existing\.contype='c'/);
 assert.match(sql,/a\.attname='role_key' AND c\.contype IN \('c','f'\) AND c\.conname<>'user_accounts_check'/);
 assert.match(sql,/ROLE_CONSTRAINT_REVIEW_REQUIRED/);
 assert.match(sql,/ON COMMIT DROP/);
 assert.doesNotMatch(sql,/DROP CONSTRAINT user_accounts_check|ALTER CONSTRAINT user_accounts_check/);
 assert.match(fixture,/ADD CONSTRAINT user_accounts_check/);
 assert.match(fixture,/ADD CONSTRAINT synthetic_role_check/);
 assert.match(fixture,/unexpected_role/);
 assert.match(fixture,/sql\(proposal\);assert\.equal\(admin\(constraintQuery\),expectedConstraint\)/);
});

test('employee email is mandatory for office provisioning and pinned across SQL/Auth identity',()=>{
 const runtime=fs.readFileSync('supabase/functions/manage-users/runtime.ts','utf8');
 const upgrade=fs.readFileSync('supabase/review/user-management/05_employee_email_compatibility.sql','utf8');
 const html=fs.readFileSync('modules/administration/user-management/user-management.html','utf8');
 assert.match(runtime,/if\(!account\.contactEmail\)throw new Error\('INVALID_INPUT'\)/);
 assert.match(runtime,/const email=account\.contactEmail\.toLowerCase\(\)/);
 assert.doesNotMatch(runtime,/TAXIQAID_TECHNICAL_EMAIL_DOMAIN/);
 assert.match(runtime,/data\.account\.contactEmail\.trim\(\)\.toLowerCase\(\)!==identity\.email\.toLowerCase\(\)/);
 assert.match(upgrade,/ADMIN_EMAIL_SOURCE_REVIEW_REQUIRED/);
 assert.match(upgrade,/EMPLOYEE_EMAIL_REQUIRED/);
 assert.match(upgrade,/EMPLOYEE_EMAIL_ALREADY_USED/);
 assert.match(upgrade,/CONTACT_EMAIL_IMMUTABLE/);
 assert.match(upgrade,/ADMIN_EMAIL_ACL_CHANGED/);
 assert.match(upgrade,/BEGIN;[\s\S]*COMMIT;/);
 assert.match(html,/Employee Email \(required for new accounts\)/);
 assert.match(html,/id="um-create-email"[^>]+required/);
 assert.doesNotMatch(upgrade,/CREATE ROLE|ALTER ROLE|DROP TABLE|DROP ROLE/);
});

test('recovery email never sets passwords for existing employees or exposes a temporary secret',()=>{
 const runtime=fs.readFileSync('supabase/functions/manage-users/runtime.ts','utf8');
 const ui=fs.readFileSync('modules/administration/user-management/user-management.js','utf8');
 const html=fs.readFileSync('reset-password.html','utf8');
 const recovery=fs.readFileSync('modules/login/reset-password.js','utf8');
 const backend=runtime.split("if(action==='reset-password'){")[1].split("if(action==='sync-sheets')")[0];
 assert.match(backend,/resetPasswordForEmail\(email,\{redirectTo\}\)/);
 assert.match(backend,/found\.data\?\.user\?\.id!==data\.uid/);
 assert.match(backend,/target\.status!=='active'/);
 assert.match(backend,/return \{delivery:'requested'\}/);
 assert.doesNotMatch(backend,/password=credential\(|updateUserById|temporaryPassword|reset-reserve/);
 assert.match(ui,/Password reset email requested/);
 assert.match(html,/autocomplete="new-password"/);
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(recovery,/PASSWORD_RECOVERY/);
 assert.match(recovery,/updateUser\(\{ password: value \}\)/);
 assert.match(recovery,/persistSession: false/);
 assert.doesNotMatch(recovery,/localStorage|indexedDB|service_role|TAXIQAID_AUTH_ADMIN_KEY/);
 assert.equal(runtime.includes("https://dohanyan16.github.io/TaxiQaid/reset-password.html"),true);
 new Function(recovery);
});
