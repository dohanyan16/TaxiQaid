/** Contract/evaluator tests use synthetic metadata, never hosted Auth or a private response. */
import {inspectMasterAccess} from './master-access.ts';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),catalog=require('../../../shared/permission-catalog.js');
function assert(value:unknown):asserts value{if(!value)throw new Error('Master access assertion failed.');}
const uid='00000000-0000-4000-8000-000000000001';
function flat(){return {uid,accountType:'management',status:'active',role:'super_admin',username:'dohanyan',fullName:'Synthetic Master',roleDefaults:catalog.ALL.filter((p:{audience:string})=>p.audience!=='Driver').map((p:{key:string})=>p.key),overrides:{} as Record<string,boolean>,departments:['it']};}
Deno.test('real frontend contract and dependency model accept both response formats with exactly 101 grants and six driver denials',()=>{
 const f=flat(),nested={version:1,uid,account:{uid,type:f.accountType,status:f.status,role:f.role,username:f.username,fullName:f.fullName},permissions:{roleDefaults:f.roleDefaults,overrides:{}},departments:f.departments,validUntil:Date.now()+60000};
 for(const raw of [f,nested]){const result=inspectMasterAccess(raw,uid,Date.now()/1000+3600);assert(result.activeMaster&&result.compatible&&result.management===101&&result.driverDenied===6);}
});
Deno.test('boolean Deny/dependency effects and direct driver-only grants are not hidden by counts',()=>{
 const f=flat();f.overrides['fuel.view']=false;f.overrides['fuel.create']=true;assert(inspectMasterAccess(f,uid,Date.now()/1000+3600).management<101);
 const driver=catalog.ALL.find((p:{audience:string})=>p.audience==='Driver');f.overrides[driver.key]=true;assert(inspectMasterAccess(f,uid,Date.now()/1000+3600).driverDenied===5);
});
Deno.test('inactive/mismatched/missing security metadata and driver accounts fail closed',()=>{
 for(const raw of [{...flat(),status:'disabled'},{...flat(),uid:'wrong'},{...flat(),fullName:''},{...flat(),accountType:'driver'}]){let rejected=false;try{inspectMasterAccess(raw,uid,Date.now()/1000+3600);}catch{rejected=true;}assert(rejected);}
 assert(!inspectMasterAccess({...flat(),role:'manager'},uid,Date.now()/1000+3600).activeMaster);
});
