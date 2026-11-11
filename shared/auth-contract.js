/** Dedicated-project wire contract. A parsed response is never a substitute for backend authorization. */
const TaxiQaidAuthContract=(()=>{
 const catalog=typeof TaxiQaidPermissionCatalog!=='undefined'?TaxiQaidPermissionCatalog:require('./permission-catalog.js');
 const DEPARTMENTS=Object.freeze({customer_service:'Customer Service',finance:'Finance',financial:'Financial',hr:'HR',it:'IT',maintenance:'Maintenance',operation:'Operation',planning:'Planning',qhse:'QHSE'});
 const department=value=>{const key=String(value||'').trim().toLowerCase().replace(/[ -]+/g,'_'),aliases={quality:'qhse',customer_care:'customer_service'};return Object.hasOwn(aliases,key)?aliases[key]:(Object.hasOwn(DEPARTMENTS,key)?key:null);};
 function identifier(value){const normalized=String(value||'').trim().toLowerCase();if(!/^(?:[a-z][a-z0-9]{1,47}|\d{10})$/.test(normalized))throw new Error('Enter a valid username or ten-digit Driver Iqama.');return normalized;}
 function credentials(value,password){const normalized=identifier(value);if(typeof password!=='string'||!password.length||password.length>1024)throw new Error('Enter your password.');return {identifier:normalized,password};}
 function normalize(raw,now){
  if(raw?.account)return raw;
  // Existing deployed get-my-access uses top-level fields. Never guess missing profile/status metadata.
  if(!raw||raw.version!==undefined&&raw.version!==1||!Object.hasOwn(raw,'accountType'))throw new Error('Invalid access response.');
  const type=typeof raw.accountType==='string'?raw.accountType.toLowerCase():null;
  const suppliedStatus=raw.status??raw.accountStatus,status=typeof suppliedStatus==='string'?suppliedStatus.toLowerCase():null;
  let overrides=raw.overrides;
  if(Array.isArray(overrides)){
   const effects={};for(const row of overrides){if(typeof row?.permission_key!=='string'||typeof row.is_allowed!=='boolean')throw new Error('Invalid permission override.');if(!row.is_allowed||effects[row.permission_key]!=='deny')effects[row.permission_key]=row.is_allowed?'allow':'deny';}overrides=effects;
  }else if(overrides&&typeof overrides==='object')overrides=Object.fromEntries(Object.entries(overrides).map(([key,effect])=>[key,effect===true?'allow':effect===false?'deny':effect]));
  return {version:1,uid:raw.uid,account:{uid:raw.uid,type,status,role:raw.role,fullName:raw.fullName??raw.full_name,username:raw.username},
   departments:raw.departments,permissions:{roleDefaults:raw.roleDefaults,overrides},scope:raw.scope,
   // A fresh authenticated legacy response without a lease receives only a bounded local read lease.
   validUntil:raw.validUntil===undefined?now+60000:raw.validUntil};
 }
 function access(raw,uid,sessionExpiresAt,now=Date.now()){
  raw=normalize(raw,now);const account=raw?.account;
  if(raw?.version!==1||raw.uid!==uid||typeof uid!=='string'||!uid||!account||account.status!=='active'||account.type!=='management'||typeof account.fullName!=='string'||!account.fullName.trim())throw new Error('Authorized active account information is unavailable.');
  if(!Number.isFinite(raw.validUntil)||raw.validUntil<=now||raw.validUntil>now+120000||!Number.isFinite(sessionExpiresAt)||sessionExpiresAt*1000<=now)throw new Error('Access information has expired.');
  const defaults=raw.permissions?.roleDefaults,overrides=raw.permissions?.overrides;
  if(!Array.isArray(defaults)||!overrides||typeof overrides!=='object'||Array.isArray(overrides)||!Array.isArray(raw.departments)||raw.departments.some(id=>typeof id!=='string'||!Object.hasOwn(DEPARTMENTS,id)))throw new Error('Invalid access response.');
  for(const effect of Object.values(overrides))if(!['inherit','allow','deny'].includes(effect))throw new Error('Invalid permission override.');
  if(account.uid!==undefined&&account.uid!==uid)throw new Error('Account identity does not match.');
  if(typeof account.role!=='string'||!account.role||typeof account.username!=='string'||!account.username)throw new Error('Verified account metadata unavailable.');
  const scope=raw.scope??{};for(const key of ['departments','driverRecordRefs','documentIds'])if(scope[key]!==undefined&&(!Array.isArray(scope[key])||scope[key].some(id=>typeof id!=='string'||!id)))throw new Error('Invalid record scope.');
  if((scope.departments||[]).some(id=>!Object.hasOwn(DEPARTMENTS,id)))throw new Error('Invalid department scope.');
  const known=key=>typeof key==='string'&&Object.hasOwn(catalog.BY_KEY,key);
  return {source:'authorized-backend',verified:true,uid,accountType:account.type==='management'?'Management':'Driver',accountStatus:'Active',role:account.role,username:account.username,fullName:account.fullName,
   departments:[...new Set(raw.departments)].sort(),roleDefaults:[...new Set(defaults.filter(known))].sort(),overrides:Object.fromEntries(Object.entries(overrides).filter(([key])=>known(key)).sort(([a],[b])=>a.localeCompare(b))),
   driverRecordRef:account.driverRecordRef||null,iqama:account.iqama||null,expiresAt:Math.min(raw.validUntil,sessionExpiresAt*1000),
   scope:{departments:[...(scope.departments||[])],driverRecordRefs:[...(scope.driverRecordRefs||[])],documentIds:[...(scope.documentIds||[])]}};
 }
 return Object.freeze({DEPARTMENTS,department,identifier,credentials,access});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidAuthContract;
