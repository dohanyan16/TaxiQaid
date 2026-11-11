/** Offline relational fixtures exercise the real query adapter; no credentials, sockets or database writes. */
import postgres from 'npm:postgres@4.1.0';
import mapping from '../../baseline/schema-mapping.example.json' with {type:'json'};
import inventory from '../../baseline/permission-definitions.json' with {type:'json'};
import {booleanOverrides,createIdentityStore,readMapping} from './store.ts';
import {authorize} from './authorization.ts';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),contract=require('../../../shared/auth-contract.js'),model=require('../../../shared/permission-model.js');
function assert(value:unknown,message='Store assertion failed.'):asserts value{if(!value)throw new Error(message);}
function equal(actual:unknown,expected:unknown){assert(JSON.stringify(actual)===JSON.stringify(expected),'Values differ: '+JSON.stringify(actual));}
function throws(callback:()=>unknown){let rejected=false;try{callback();}catch{rejected=true;}assert(rejected,'Expected invalid metadata to be rejected.');}
type Account={user_id:string;username:string;full_name:string;account_type:string;role_key:string;status:string};
type Fixture={accounts:Account[];departments:{department_key:string;is_active:boolean}[];memberships:{user_id:string;department_key:string}[];permissions:{permission_key:string;is_active:boolean}[];grants:{role_key:string;permission_key:string;is_allowed:boolean}[];overrides:{user_id:string;permission_key:string;is_allowed:unknown}[]};
const uid='fixture-own-subject',other='fixture-other-subject';
function fixture():Fixture{return {accounts:[{user_id:uid,username:'fixtureuser',full_name:'Synthetic Manager',account_type:'management',role_key:'super_admin',status:'active'},{user_id:other,username:'otherfixture',full_name:'Other Synthetic Account',account_type:'management',role_key:'staff',status:'active'}],departments:[{department_key:'it',is_active:true},{department_key:'finance',is_active:false}],memberships:[{user_id:uid,department_key:'it'},{user_id:uid,department_key:'finance'},{user_id:other,department_key:'financial'}],permissions:inventory.definitions.map(p=>({permission_key:p.key,is_active:true})),grants:inventory.definitions.map(p=>({role_key:'super_admin',permission_key:p.key,is_allowed:p.audience!=='Driver'})),overrides:[]};}
function harness(data=fixture()){
 const queries:{text:string;values:unknown[]}[]=[];
 const permissionActive=(key:string)=>data.permissions.some(p=>p.permission_key===key&&p.is_active);
 function execute(text:string,values:unknown[]):Record<string,unknown>[] {
  queries.push({text,values});
  assert(!/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/.test(text),'Identity reads must not mutate data.');
  const validNames=new Set([...Object.values(mapping).flatMap(table=>Object.values(table)),'a','d','m','p','r','o','fullName']);
  for(const [,name]of text.matchAll(/"([^"]+)"/g))assert(validNames.has(name),'Unverified column referenced: '+name);
  assert(!text.includes('auth.users'),'The access adapter must not resolve private Auth identities.');
  if(text.includes('FROM taxiqaid_private.user_accounts')){
   assert(text.includes('WHERE "user_id"=?'),'Account read must bind the verified UID.');
   return data.accounts.filter(a=>a.user_id===values[0]).map(a=>({uid:a.user_id,username:a.username,fullName:a.full_name,type:a.account_type,role:a.role_key,status:a.status}));
  }
  if(text.includes('FROM taxiqaid_private.user_departments')){
   assert(text.includes('"d"."department_key"="m"."department_key"')&&text.includes('"m"."user_id"=?'),'Department keys and membership subject must match.');
   return data.memberships.filter(m=>m.user_id===values[0]).filter(m=>data.departments.some(d=>d.department_key===m.department_key&&(!text.includes('"d"."is_active"=true')||d.is_active))).map(m=>({code:m.department_key}));
  }
  if(text.includes('FROM taxiqaid_private.role_permissions')){
   assert(text.includes('"p"."permission_key"="r"."permission_key"')&&text.includes('"r"."role_key"=?')&&text.includes('"r"."is_allowed"=true'),'Role grants must use the verified permission key and boolean column.');
   return data.grants.filter(r=>r.role_key===values[0]&&r.is_allowed).filter(r=>!text.includes('"p"."is_active"=true')||permissionActive(r.permission_key)).map(r=>({key:r.permission_key}));
  }
  if(text.includes('FROM taxiqaid_private.user_permission_overrides')){
   assert(text.includes('"p"."permission_key"="o"."permission_key"')&&text.includes('"o"."user_id"=?')&&text.includes('"o"."is_allowed" AS allowed'),'Boolean overrides must be joined by key and scoped to the verified UID.');
   assert(!text.includes('"o"."is_allowed"=true'),'False override rows must survive selection.');
   return data.overrides.filter(o=>o.user_id===values[0]).filter(o=>!text.includes('"p"."is_active"=true')||permissionActive(o.permission_key)).map(o=>({key:o.permission_key,allowed:o.is_allowed}));
  }
  throw new Error('Unexpected query.');
 }
 class Fragment implements PromiseLike<Record<string,unknown>[]> {
  constructor(readonly text:string,readonly values:unknown[]=[]){}
  then<TResult1=Record<string,unknown>[],TResult2=never>(resolve?:((rows:Record<string,unknown>[])=>TResult1|PromiseLike<TResult1>)|null,reject?:((reason:unknown)=>TResult2|PromiseLike<TResult2>)|null):PromiseLike<TResult1|TResult2>{return Promise.resolve().then(()=>execute(this.text,this.values)).then(resolve,reject);}
 }
 const tag=(input:string|TemplateStringsArray,...values:unknown[])=>{
  if(typeof input==='string')return new Fragment('"'+input+'"');
  let text=input[0];const parameters:unknown[]=[];
  values.forEach((value,index)=>{if(value instanceof Fragment){text+=value.text;parameters.push(...value.values);}else{text+='?';parameters.push(value);}text+=input[index+1];});
  return new Fragment(text,parameters);
 };
 const store=createIdentityStore(tag as unknown as ReturnType<typeof postgres>,readMapping(JSON.stringify(mapping)));
 return {data,queries,store};
}
Deno.test('mapping contains exact verified names and no driver-link columns',()=>{
 equal(mapping.user_accounts,{uid:'user_id',username:'username',fullName:'full_name',type:'account_type',role:'role_key',status:'status',createdAt:'created_at',updatedAt:'updated_at'});
 equal(mapping.user_permission_overrides,{uid:'user_id',permissionKey:'permission_key',allowed:'is_allowed',updatedAt:'updated_at',updatedBy:'updated_by'});
 throws(()=>readMapping(JSON.stringify({...mapping,permissions:{...mapping.permissions,key:'id'}})));
 throws(()=>readMapping(JSON.stringify({...mapping,user_accounts:{...mapping.user_accounts,iqama:'iqama'}})));
});
Deno.test('boolean override conversion retains false, omits inherit and rejects non-booleans',()=>{
 equal(booleanOverrides([]),{});
 equal(booleanOverrides([{key:'fuel.view',allowed:true},{key:'fuel.create',allowed:false}]),{'fuel.view':'allow','fuel.create':'deny'});
 for(const allowed of [null,undefined,'false','allow',0])throws(()=>booleanOverrides([{key:'fuel.view',allowed}]));
 for(const sequence of [[true,false],[false,true]])equal(booleanOverrides(sequence.map(allowed=>({key:'fuel.view',allowed}))),{'fuel.view':'deny'});
});
Deno.test('101 Master grants and own-account wire response match the existing frontend contract',async()=>{
 const {store}=harness(),wire=await store.loadAccess(uid),context=contract.access(wire,uid,Date.now()/1000+3600);
 equal(wire.permissions.roleDefaults.length,101);equal(wire.permissions.overrides,{});equal(wire.departments,['it']);equal(context.uid,uid);equal(context.fullName,'Synthetic Manager');
 equal(inventory.definitions.filter(p=>model.draftDecision(p.key,context).allowed).length,101);
 assert(inventory.definitions.filter(p=>p.audience==='Driver').every(p=>!model.draftDecision(p.key,context).allowed));
 assert(!JSON.stringify(wire).includes('private-fixture'));assert(!Object.hasOwn(wire.account,'iqama'));assert(!Object.hasOwn(wire.account,'driverRecordRef'));
});
Deno.test('boolean deny overrides an inherited grant and blocks an explicitly allowed dependent action',async()=>{
 const fixture=harness();fixture.data.overrides.push({user_id:uid,permission_key:'fuel.view',is_allowed:false},{user_id:uid,permission_key:'fuel.create',is_allowed:true},{user_id:other,permission_key:'dashboard.view',is_allowed:false});
 const wire=await fixture.store.loadAccess(uid);equal(wire.permissions.overrides,{'fuel.view':'deny','fuel.create':'allow'});
 const identity={uid,expiresAt:Date.now()/1000+3600};assert(!authorize(wire,identity,'fuel.view'));assert(!authorize(wire,identity,'fuel.create'));assert(authorize(wire,identity,'dashboard.view'));
});
Deno.test('inactive definitions remove inherited grants and overrides; inactive memberships are filtered',async()=>{
 const fixture=harness();fixture.data.permissions.find(p=>p.permission_key==='fuel.view')!.is_active=false;fixture.data.overrides.push({user_id:uid,permission_key:'fuel.view',is_allowed:true},{user_id:uid,permission_key:'ncr.view',is_allowed:false});
 const wire=await fixture.store.loadAccess(uid);assert(!wire.permissions.roleDefaults.includes('fuel.view'));assert(!Object.hasOwn(wire.permissions.overrides,'fuel.view'));equal(wire.permissions.overrides['ncr.view'],'deny');equal(wire.departments,['it']);
 assert(!authorize(wire,{uid,expiresAt:Date.now()/1000+3600},'fuel.create'));
});
Deno.test('other roles inherit no Master grants; the access adapter exposes no identity resolver',async()=>{
 const fixture=harness();const wire=await fixture.store.loadAccess(other);equal(wire.permissions.roleDefaults,[]);
 assert(!Object.hasOwn(fixture.store,'resolve'));assert(!Object.hasOwn(fixture.store,'consume'));
});
Deno.test('a driver account without verified provisioning is denied without querying invented columns',async()=>{
 const fixture=harness();fixture.data.accounts[0].account_type='driver';let blocked=false;
 try{await fixture.store.loadAccess(uid);}catch(error){blocked=String(error).includes('Driver linkage pending');}
 assert(blocked);equal(fixture.queries.length,1);
});
Deno.test('boolean allows can grant an explicit user capability without inventing role defaults',async()=>{
 const fixture=harness();fixture.data.overrides.push({user_id:other,permission_key:'fuel.view',is_allowed:true},{user_id:other,permission_key:'fuel.create',is_allowed:true});
 const allowed=await fixture.store.loadAccess(other),identity={uid:other,expiresAt:Date.now()/1000+3600};equal(allowed.permissions.roleDefaults,[]);assert(authorize(allowed,identity,'fuel.create'));
 fixture.data.overrides[0].is_allowed=false;const denied=await fixture.store.loadAccess(other);assert(!authorize(denied,identity,'fuel.create'));equal(denied.permissions.overrides['fuel.view'],'deny');
});
