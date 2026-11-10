const {test}=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../shared/permission-catalog.js'),permissions=require('../shared/permission-model.js'),portal=require('../modules/driver-portal/portal-policy.js');
const manager={verified:true,source:'authorized-backend',uid:'fixture-manager',accountType:'Management',accountStatus:'Active',departments:['IT'],roleDefaults:['helpdesk.view','helpdesk.view-department','helpdesk.update-status'],overrides:{}};
const driver={...manager,uid:'fixture-driver',accountType:'Driver',driverRecordRef:'fixture-record',iqama:'1000000001',roleDefaults:['driver-portal.view','driver-portal.files.view','driver-portal.sign']};
test('all 18 modules have independent stable view dependencies and Penalties remains read-only',()=>{
 assert.equal(catalog.MODULES.length,18);assert.equal(new Set(catalog.ALL.map(p=>p.key)).size,catalog.ALL.length);
 for(const module of catalog.MODULES)for(const action of module.permissions){assert.ok(action.key===module.id+'.view'||action.requires.includes(module.id+'.view'));for(const dependency of action.requires)assert.ok(catalog.BY_KEY[dependency]);}
 assert.deepEqual(catalog.MODULES.find(m=>m.id==='penalties').permissions.map(p=>p.key),['penalties.view','penalties.export']);
});
test('missing or disabled source denies, explicit deny wins, actions require module and nested views',()=>{
 assert.equal(permissions.can(null,'dashboard.view'),false);assert.equal(permissions.can({...manager,accountStatus:'Disabled'},'helpdesk.view'),false);
 assert.equal(permissions.draftDecision('fuel.create',{overrides:{'fuel.create':'allow'}}).allowed,false);
 assert.equal(permissions.draftDecision('fuel.view',{roleDefaults:['fuel.view'],overrides:{'fuel.view':'deny'}}).source,'Explicit deny');
 assert.equal(permissions.draftDecision('maintenance.export',{roleDefaults:['maintenance.view','maintenance.export']}).allowed,false);
 assert.match(permissions.validateDraft({overrides:{'fuel.create':'allow'}})[0],/Missing dependency/);
 assert.equal(permissions.can({...manager,roleDefaults:[]},'helpdesk.view'),false);
});
test('driver self service, management preview, selected document and Helpdesk department scopes stay separate',()=>{
 const own={ownerUid:driver.uid,driverRecordRef:driver.driverRecordRef};assert.equal(permissions.can(driver,'driver-portal.sign',own),true);assert.equal(permissions.can(driver,'driver-portal.sign',{...own,ownerUid:'other'}),false);
 assert.equal(permissions.can({...driver,roleDefaults:['user-management.view']},'user-management.view'),false);
 assert.equal(permissions.can({...manager,roleDefaults:driver.roleDefaults},'driver-portal.sign',own),false);
 const preview={...manager,roleDefaults:['driver-portal.view','driver-portal.preview','driver-portal.preview-documents'],scope:{driverRecordRefs:['fixture-record'],documentIds:['fixture-document']}};
 assert.equal(permissions.can(preview,'driver-portal.preview-documents',{driverRecordRef:'fixture-record',documentId:'fixture-document'}),true);
 assert.equal(permissions.can(preview,'driver-portal.preview-documents',{driverRecordRef:'fixture-record',documentId:'other'}),false);
 assert.equal(permissions.can(manager,'helpdesk.update-status',{assignedDepartment:'IT'}),true);assert.equal(permissions.can(manager,'helpdesk.update-status',{assignedDepartment:'HR'}),false);
 assert.equal(permissions.can({...manager,roleDefaults:[...manager.roleDefaults,'helpdesk.view-all'],scope:{departments:['HR']}},'helpdesk.update-status',{assignedDepartment:'HR'}),true);
});
test('international phone metadata normalizes real calling codes and rejects invalid or duplicated prefixes',()=>{
 assert.ok(portal.countries().length>200);assert.equal(portal.normalizePhone('SA','501234567'),'+966501234567');assert.equal(portal.normalizePhone('GB','07911123456'),'+447911123456');assert.equal(portal.normalizePhone('US','2025550123'),'+12025550123');assert.equal(portal.normalizePhone('IN','9123456789'),'+919123456789');
 for(const value of ['+966501234567','00966501234567','966501234567','501','word'])assert.throws(()=>portal.normalizePhone('SA',value));
 assert.throws(()=>portal.normalizePhone('ZZ','501234567'));assert.throws(()=>portal.changes({name:'Fixture Name'},'Fixture Name',null,''));
 assert.deepEqual(portal.changes({name:'Fixture Name'},'New Fixture Name',null,''),{name:'New Fixture Name'});assert.deepEqual(portal.changes({},'','SA','501234567'),{phone:'+966501234567'});
});
test('personal source rejects another UID, ownership, draft schedules and non-consecutive dates',()=>{
 const packet={source:'authorized-backend',subjectUid:driver.uid,ownerUid:driver.uid,driverRecordRef:driver.driverRecordRef,iqama:driver.iqama};assert.deepEqual(portal.snapshot(driver,packet),packet);
 for(const bad of [{...packet,subjectUid:'other'},{...packet,driverRecordRef:'other'},{...packet,iqama:'other'},{...packet,profileRequests:[{ownerUid:'other'}]},{...packet,documents:[{documentId:'fixture',version:'v1',sha256:'0'.repeat(64),ownerUid:'other'}]}])assert.throws(()=>portal.snapshot(driver,bad));
 assert.throws(()=>portal.snapshot(driver,{...packet,schedule:{published:false}}));
 const week=Array.from({length:7},(_,i)=>'2026-11-'+String(8+i).padStart(2,'0')),schedule={published:true,approved:true,version:'fixture-v1',driverRecordRef:packet.driverRecordRef,ownerUid:driver.uid,week,driver:{iqama:driver.iqama,assignments:week.map(date=>({date,duty:'Rest Day'}))}};
 assert.equal(portal.snapshot(driver,{...packet,schedule}).schedule.version,'fixture-v1');assert.throws(()=>portal.snapshot(driver,{...packet,schedule:{...schedule,week:[...week].reverse()}}));
});
