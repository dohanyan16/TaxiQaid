/** Parameterized queries for the owner's inspected identity schema; no schema or grant writes. */
import postgres from 'npm:postgres@4.1.0';
import verifiedMapping from '../../baseline/schema-mapping.example.json' with {type:'json'};
export type Mapping=Record<string,Record<string,string>>;
const departments=new Set(['customer_service','finance','financial','hr','it','maintenance','operation','planning','qhse']);
export function readMapping(serialized:string):Mapping{
 const mapping=JSON.parse(serialized) as Mapping;
 if(!mapping||typeof mapping!=='object'||Object.keys(mapping).sort().join(',')!==Object.keys(verifiedMapping).sort().join(','))throw new Error('Verified column mapping required.');
 for(const [table,columns]of Object.entries(verifiedMapping)){
  const supplied=mapping[table];
  if(!supplied||Object.keys(supplied).sort().join(',')!==Object.keys(columns).sort().join(',')||Object.entries(columns).some(([key,column])=>supplied[key]!==column))throw new Error('Verified column mapping required.');
 }
 return mapping;
}
export function booleanOverrides(rows:{key:string;allowed:unknown}[]):Record<string,'allow'|'deny'>{
 const effects=new Map<string,'allow'|'deny'>();
 for(const {key,allowed}of rows){
  if(typeof allowed!=='boolean')throw new Error('Invalid authorization metadata.');
  // No row means inherit. Preserve false explicitly; deny also wins if conflicting rows are supplied.
  if(allowed===false)effects.set(key,'deny');else if(effects.get(key)!=='deny')effects.set(key,'allow');
 }
 return Object.fromEntries(effects);
}
/** A query adapter allows offline fixtures to exercise these same joins and wire conversion. */
export function createIdentityStore(sql:ReturnType<typeof postgres>,mapping:Mapping){
 const col=(table:string,key:string,alias?:string)=>alias?sql`${sql(alias)}.${sql(mapping[table][key])}`:sql(mapping[table][key]);
 async function account(uid:string){
  const rows=await sql`SELECT ${col('user_accounts','uid')} AS uid,${col('user_accounts','username')} AS username,${col('user_accounts','fullName')} AS "fullName",${col('user_accounts','type')} AS type,${col('user_accounts','role')} AS role,${col('user_accounts','status')} AS status FROM taxiqaid_private.user_accounts WHERE ${col('user_accounts','uid')}=${uid} LIMIT 2`;
  if(rows.length!==1||rows[0].uid!==uid||rows[0].status!=='active'||!['management','driver'].includes(rows[0].type)||!rows[0].fullName)throw new Error('Access unavailable.');
  // The verified schema has no Iqama or driver-record linkage. Never invent that identity relationship.
  if(rows[0].type==='driver')throw new Error('Driver linkage pending account provisioning.');
  return rows[0];
 }
 async function loadAccess(uid:string){
  const profile=await account(uid);
  const [membership,grants,overrides]=await Promise.all([
   sql`SELECT ${col('departments','key','d')} AS code FROM taxiqaid_private.user_departments AS m JOIN taxiqaid_private.departments AS d ON ${col('departments','key','d')}=${col('user_departments','departmentKey','m')} WHERE ${col('user_departments','uid','m')}=${uid} AND ${col('departments','active','d')}=true`,
   sql`SELECT ${col('permissions','key','p')} AS key FROM taxiqaid_private.role_permissions AS r JOIN taxiqaid_private.permissions AS p ON ${col('permissions','key','p')}=${col('role_permissions','permissionKey','r')} WHERE ${col('role_permissions','role','r')}=${profile.role} AND ${col('role_permissions','allowed','r')}=true AND ${col('permissions','active','p')}=true`,
   sql`SELECT ${col('permissions','key','p')} AS key,${col('user_permission_overrides','allowed','o')} AS allowed FROM taxiqaid_private.user_permission_overrides AS o JOIN taxiqaid_private.permissions AS p ON ${col('permissions','key','p')}=${col('user_permission_overrides','permissionKey','o')} WHERE ${col('user_permission_overrides','uid','o')}=${uid} AND ${col('permissions','active','p')}=true`
  ]);
  if(membership.some(row=>!departments.has(row.code)))throw new Error('Invalid authorization metadata.');
  const effects=booleanOverrides(overrides.map(row=>({key:row.key,allowed:row.allowed})));
  return {version:1,uid,account:profile,departments:membership.map(row=>row.code),permissions:{roleDefaults:grants.map(row=>row.key),overrides:effects},scope:{departments:[],driverRecordRefs:[],documentIds:[]},validUntil:Date.now()+60000};
 }
 async function resolve(identifier:string){
  // Iqama remains a visible future identifier, but no verified driver mapping exists in this schema.
  if(/^\d{10}$/.test(identifier))return null;
  const rows=await sql`SELECT ${col('user_accounts','uid','a')} AS uid,${col('user_accounts','status','a')} AS status,u.email FROM taxiqaid_private.user_accounts AS a JOIN auth.users AS u ON u.id=${col('user_accounts','uid','a')} WHERE ${col('user_accounts','type','a')}='management' AND ${col('user_accounts','username','a')}=${identifier} LIMIT 2`;
  return rows.length===1?rows[0]:null;
 }
 async function consume(keys:string[]){
  const windows=[{seconds:60,limit:20},{seconds:900,limit:10},{seconds:60,limit:200}],current=Math.floor(Date.now()/1000);let allowed=true;
  await sql.begin(async transaction=>{for(let index=0;index<keys.length;index++){const rule=windows[index],start=Math.floor(current/rule.seconds)*rule.seconds;
   const rows=await transaction`INSERT INTO taxiqaid_private.login_attempt_counters(bucket,window_start,expires_at,attempts) VALUES(${keys[index]},to_timestamp(${start}),to_timestamp(${start+rule.seconds}),1) ON CONFLICT(bucket,window_start) DO UPDATE SET attempts=taxiqaid_private.login_attempt_counters.attempts+1 RETURNING attempts`;
   if(rows[0].attempts>rule.limit)allowed=false;
  }});return allowed;
 }
 return {loadAccess,resolve,consume};
}
export function openStore(env:(name:string)=>string|undefined){
 const connection=env('TAXIQAID_DB_URL'),serialized=env('TAXIQAID_SCHEMA_MAPPING');
 if(!connection||!serialized)throw new Error('Identity backend is not configured.');
 const target=new URL(connection),ref='mqkflwsvnzcaylxtvsje';
 if(!['postgres:','postgresql:'].includes(target.protocol)||!(target.hostname==='db.'+ref+'.supabase.co'||target.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(target.username).endsWith('.'+ref))||target.searchParams.get('sslmode')==='disable')throw new Error('Only the approved dedicated database connection is accepted.');
 const mapping=readMapping(serialized);
 const sql=postgres(connection,{max:2,prepare:false,idle_timeout:10,connect_timeout:5,ssl:{rejectUnauthorized:true,...(env('TAXIQAID_DB_CA')?{ca:env('TAXIQAID_DB_CA')}:{})},onnotice:()=>{}});
 return createIdentityStore(sql,mapping);
}
