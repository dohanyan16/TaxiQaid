/** Only explicit identity queries; column mappings must be approved after the read-only baseline inspection. */
import postgres from 'npm:postgres@4.1.0';
const tables={user_accounts:['uid','username','fullName','type','role','status','iqama','driverRecordRef'],departments:['id','code'],user_departments:['uid','departmentId'],permissions:['id','key'],role_permissions:['role','permissionId','allowed'],user_permission_overrides:['uid','permissionId','effect']} as const;
type Mapping=Record<string,Record<string,string|null>>;
const departments=new Set(['customer_service','finance','financial','hr','it','maintenance','operation','planning','qhse']);
export function openStore(env:(name:string)=>string|undefined){
 const connection=env('TAXIQAID_DB_URL'),serialized=env('TAXIQAID_SCHEMA_MAPPING');
 if(!connection||!serialized)throw new Error('Identity backend is not configured.');
 const target=new URL(connection),ref='mqkflwsvnzcaylxtvsje';
 if(!['postgres:','postgresql:'].includes(target.protocol)||!(target.hostname==='db.'+ref+'.supabase.co'||target.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(target.username).endsWith('.'+ref))||target.searchParams.get('sslmode')==='disable')throw new Error('Only the approved dedicated database connection is accepted.');
 const mapping=JSON.parse(serialized) as Mapping;
 for(const [table,columns]of Object.entries(tables))for(const column of columns){const name=mapping[table]?.[column];if(name===null&&table==='user_accounts'&&['iqama','driverRecordRef'].includes(column))continue;if(typeof name!=='string'||! /^[a-z_][a-z0-9_]{0,62}$/.test(name))throw new Error('Approved column mapping required.');}
 const sql=postgres(connection,{max:2,prepare:false,idle_timeout:10,connect_timeout:5,ssl:{rejectUnauthorized:true,...(env('TAXIQAID_DB_CA')?{ca:env('TAXIQAID_DB_CA')}:{})},onnotice:()=>{}});
 const col=(table:string,key:string,alias?:string)=>mapping[table][key]===null?sql`NULL`:alias?sql`${sql(alias)}.${sql(mapping[table][key]!)}`:sql(mapping[table][key]!);
 async function account(uid:string){
  const rows=await sql`SELECT ${col('user_accounts','uid')} AS uid,${col('user_accounts','username')} AS username,${col('user_accounts','fullName')} AS "fullName",${col('user_accounts','type')} AS type,${col('user_accounts','role')} AS role,${col('user_accounts','status')} AS status,${col('user_accounts','iqama')} AS iqama,${col('user_accounts','driverRecordRef')} AS "driverRecordRef" FROM taxiqaid_private.user_accounts WHERE ${col('user_accounts','uid')}=${uid} LIMIT 2`;
  if(rows.length!==1||rows[0].status!=='active'||!['management','driver'].includes(rows[0].type)||!rows[0].fullName)throw new Error('Access unavailable.');return rows[0];
 }
 async function loadAccess(uid:string){
  const profile=await account(uid);
  const [membership,grants,overrides]=await Promise.all([
   sql`SELECT ${col('departments','code','d')} AS code FROM taxiqaid_private.user_departments AS m JOIN taxiqaid_private.departments AS d ON ${col('departments','id','d')}=${col('user_departments','departmentId','m')} WHERE ${col('user_departments','uid','m')}=${uid}`,
   sql`SELECT ${col('permissions','key','p')} AS key FROM taxiqaid_private.role_permissions AS r JOIN taxiqaid_private.permissions AS p ON ${col('permissions','id','p')}=${col('role_permissions','permissionId','r')} WHERE ${col('role_permissions','role','r')}=${profile.role} AND ${col('role_permissions','allowed','r')}=true`,
   sql`SELECT ${col('permissions','key','p')} AS key,${col('user_permission_overrides','effect','o')} AS effect FROM taxiqaid_private.user_permission_overrides AS o JOIN taxiqaid_private.permissions AS p ON ${col('permissions','id','p')}=${col('user_permission_overrides','permissionId','o')} WHERE ${col('user_permission_overrides','uid','o')}=${uid}`
  ]);
  if(membership.some(row=>!departments.has(row.code))||overrides.some(row=>!['allow','deny','inherit'].includes(row.effect)))throw new Error('Invalid authorization metadata.');
  if(profile.type==='driver'&&(!profile.driverRecordRef||!/^\d{10}$/.test(profile.iqama||'')))throw new Error('Driver link unavailable.');
  return {version:1,uid,account:profile,departments:membership.map(row=>row.code),permissions:{roleDefaults:grants.map(row=>row.key),overrides:Object.fromEntries(overrides.map(row=>[row.key,row.effect]))},scope:{departments:[],driverRecordRefs:[],documentIds:[]},validUntil:Date.now()+60000};
 }
 async function resolve(identifier:string){
  const rows=await sql`SELECT ${col('user_accounts','uid','a')} AS uid,${col('user_accounts','status','a')} AS status,u.email FROM taxiqaid_private.user_accounts AS a JOIN auth.users AS u ON u.id=${col('user_accounts','uid','a')} WHERE (${col('user_accounts','type','a')}='management' AND ${col('user_accounts','username','a')}=${identifier}) OR (${col('user_accounts','type','a')}='driver' AND ${col('user_accounts','iqama','a')}=${identifier}) LIMIT 2`;
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
