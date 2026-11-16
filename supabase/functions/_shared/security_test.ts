/** Offline backend tests. No real account or database connection is used. */
import {openStore} from './store.ts';
import {configuredOrigins} from './security.mjs';
import {authorize} from './authorization.ts';
function assert(value:unknown){if(!value)throw new Error('Backend assertion failed.');}
Deno.test('old project database connections are rejected before any query',()=>{
 let rejected=false;try{openStore(name=>name==='TAXIQAID_DB_URL'?'postgresql://fixture@db.gycijhgmmaznvcoxphlh.supabase.co/postgres':name==='TAXIQAID_SCHEMA_MAPPING'?'{}':undefined);}catch(error){rejected=String(error).includes('approved dedicated database');}assert(rejected);
});
Deno.test('unreviewed private schema mapping fails closed',()=>{let rejected=false;try{openStore(name=>name==='TAXIQAID_DB_URL'?'postgresql://fixture@db.mqkflwsvnzcaylxtvsje.supabase.co/postgres':name==='TAXIQAID_SCHEMA_MAPPING'?'{}':undefined);}catch(error){rejected=String(error).includes('Verified column mapping');}assert(rejected);});
Deno.test('only exact HTTPS origins are accepted by default',()=>{const origins=configuredOrigins('https://app.example.test,*,http://untrusted.test,https://app.example.test/path,null');assert(origins.length===1);assert(configuredOrigins('http://127.0.0.1:8005').length===0);assert(configuredOrigins('http://127.0.0.1:8005',true).length===1);});
Deno.test('backend shares scoped audience/dependency evaluation with frontend',()=>{
 const raw={version:1,uid:'fixture-auth-subject',account:{type:'management',status:'active',username:'fixtureuser',fullName:'Fixture Full Name',role:'super_admin'},departments:['it'],permissions:{roleDefaults:['helpdesk.view','helpdesk.update-status','driver-portal.view','driver-portal.files.view','driver-portal.sign'],overrides:{}},scope:{departments:[],driverRecordRefs:[],documentIds:[]},validUntil:Date.now()+60000};
 const identity={uid:raw.uid,expiresAt:Date.now()/1000+3600};assert(authorize(raw,identity,'helpdesk.update-status',{assignedDepartment:'IT'}));assert(!authorize(raw,identity,'helpdesk.update-status',{assignedDepartment:'HR'}));assert(!authorize(raw,identity,'driver-portal.sign',{ownerUid:raw.uid}));
});
