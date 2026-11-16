// Pure diagnostic fixtures only; no live Auth request or private record is used.
const {test}=require('node:test'),assert=require('node:assert/strict');
const validate=require('../scripts/_local_master_smoke/validator.js'),catalog=require('../shared/permission-catalog.js');
const uid='synthetic-smoke-subject';
const management=catalog.ALL.filter(p=>p.audience!=='Driver').map(p=>p.key);
const sample=()=>({version:1,uid,account:{uid,type:'management',status:'active',role:'super_admin',fullName:'SYNTHETIC_PRIVATE_NAME',email:'synthetic@example.invalid'},permissions:{roleDefaults:[...management],overrides:{}}});
test('valid Master response produces only boolean statuses and permission counts',()=>{
 const result=validate.inspect(sample(),uid);assert.equal(result.passed,true);assert.equal(result.managementCount,101);assert.equal(result.driverDenied,6);assert.equal(result.unknownGranted,0);const serialized=JSON.stringify(result);for(const value of [uid,'synthetic@example.invalid','SYNTHETIC_PRIVATE_NAME','dashboard.view'])assert.equal(serialized.includes(value),false);
});
test('wrong UID, inactive/nonmanagement account and non-Master role never pass',()=>{
 for(const raw of [{...sample(),uid:'another'},{...sample(),account:{...sample().account,user_id:'another'}},{...sample(),account:{...sample().account,status:'disabled'}},{...sample(),account:{...sample().account,role:'staff'}},{...sample(),account:{...sample().account,type:'driver'}}])assert.equal(validate.inspect(raw,uid).passed,false);
});
test('schema-shaped permission rows preserve false overrides and nested dependency denial',()=>{
 const raw={account:{user_id:uid,account_type:'management',status:'active',role_key:'super_admin'},role_permissions:management.map(permission_key=>({permission_key,is_allowed:true})),user_permission_overrides:[{permission_key:'fuel.view',is_allowed:false},{permission_key:'fuel.create',is_allowed:true}]};
 const result=validate.inspect(raw,uid);assert.equal(result.passed,false);assert.ok(result.managementCount<101);assert.equal(result.driverDenied,6);
});
test('driver actions must be denied by the server response as well as by management audience filtering',()=>{
 const raw=sample();raw.permissions.roleDefaults=catalog.ALL.map(p=>p.key);const result=validate.inspect(raw,uid);assert.equal(result.managementCount,101);assert.equal(result.driverDenied,0);assert.equal(result.passed,false);
});
test('unknown grants, incomplete permission data and unsafe response shapes fail without echoing data',()=>{
 const raw=sample();raw.permissions.roleDefaults.push('future.unknown');assert.equal(validate.inspect(raw,uid).unknownGranted,1);assert.equal(validate.inspect(raw,uid).passed,false);
 for(const bad of [null,[],{error:'synthetic-secret'},{...sample(),permissions:[{permission_key:'dashboard.view'}]},{...sample(),permissions:{roleDefaults:management,overrides:{'dashboard.view':'unsafe-secret'}}}]){const result=validate.inspect(bad,uid);assert.equal(result.passed,false);assert.equal(JSON.stringify(result).includes('secret'),false);}
});
test('explicit effective key lists and boolean maps are evaluated without inventing grants',()=>{
 const raw=sample();raw.effective_permissions=management;delete raw.permissions;assert.equal(validate.inspect(raw,uid).passed,true);
 delete raw.effective_permissions;raw.permissions=Object.fromEntries(catalog.ALL.map(p=>[p.key,p.audience!=='Driver']));assert.equal(validate.inspect(raw,uid).passed,true);raw.permissions['fleet.view']=false;assert.equal(validate.inspect(raw,uid).passed,false);
});
