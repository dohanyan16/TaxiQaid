/** Dedicated-project wire contract. A parsed response is never a substitute for backend authorization. */
const TaxiQaidAuthContract=(()=>{
 const catalog=typeof TaxiQaidPermissionCatalog!=='undefined'?TaxiQaidPermissionCatalog:require('./permission-catalog.js');
 const DEPARTMENTS=Object.freeze({customer_service:'Customer Service',finance:'Finance',financial:'Financial',hr:'HR',it:'IT',maintenance:'Maintenance',operation:'Operation',planning:'Planning',qhse:'QHSE'});
 const department=value=>{const key=String(value||'').trim().toLowerCase().replace(/[ -]+/g,'_');return ({quality:'qhse',customer_care:'customer_service'})[key]|| (DEPARTMENTS[key]?key:null);};
 function identifier(value){const normalized=String(value||'').trim().toLowerCase();if(!/^(?:[a-z][a-z0-9]{1,47}|\d{10})$/.test(normalized))throw new Error('Enter a valid username or ten-digit Driver Iqama.');return normalized;}
 function credentials(value,password){const normalized=identifier(value);if(typeof password!=='string'||!password.length||password.length>1024)throw new Error('Enter your password.');return {identifier:normalized,password};}
 function access(raw,uid,sessionExpiresAt,now=Date.now()){
  const account=raw?.account;
  if(raw?.version!==1||raw.uid!==uid||!uid||!account||account.status!=='active'||!['management','driver'].includes(account.type)||typeof account.fullName!=='string'||!account.fullName.trim())throw new Error('Authorized active account information is unavailable.');
  if(!Number.isFinite(raw.validUntil)||raw.validUntil<=now||raw.validUntil>now+120000||!Number.isFinite(sessionExpiresAt)||sessionExpiresAt*1000<=now)throw new Error('Access information has expired.');
  const defaults=raw.permissions?.roleDefaults,overrides=raw.permissions?.overrides;
  if(!Array.isArray(defaults)||!overrides||typeof overrides!=='object'||Array.isArray(overrides)||!Array.isArray(raw.departments)||raw.departments.some(id=>!DEPARTMENTS[id]))throw new Error('Invalid access response.');
  for(const effect of Object.values(overrides))if(!['inherit','allow','deny'].includes(effect))throw new Error('Invalid permission override.');
  if(account.type==='driver'&&(!account.driverRecordRef||!/^\d{10}$/.test(account.iqama||'')))throw new Error('Verified driver linkage unavailable.');
  const known=key=>typeof key==='string'&&Object.hasOwn(catalog.BY_KEY,key);
  return {source:'authorized-backend',verified:true,uid,accountType:account.type==='management'?'Management':'Driver',accountStatus:'Active',role:account.role,username:account.username,fullName:account.fullName,
   departments:[...new Set(raw.departments)].sort(),roleDefaults:[...new Set(defaults.filter(known))].sort(),overrides:Object.fromEntries(Object.entries(overrides).filter(([key])=>known(key)).sort(([a],[b])=>a.localeCompare(b))),
   driverRecordRef:account.driverRecordRef||null,iqama:account.iqama||null,expiresAt:Math.min(raw.validUntil,sessionExpiresAt*1000),
   scope:{departments:(raw.scope?.departments||[]).filter(id=>DEPARTMENTS[id]),driverRecordRefs:[...(raw.scope?.driverRecordRefs||[])],documentIds:[...(raw.scope?.documentIds||[])]}};
 }
 return Object.freeze({DEPARTMENTS,department,identifier,credentials,access});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidAuthContract;
