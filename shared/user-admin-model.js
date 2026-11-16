/** Administrative input/permission contract. Server and database enforce these rules independently. */
const TaxiQaidUserAdminModel=(()=>{
 const catalog=typeof TaxiQaidPermissionCatalog!=='undefined'?TaxiQaidPermissionCatalog:require('./permission-catalog.js'),model=typeof TaxiQaidPermissionModel!=='undefined'?TaxiQaidPermissionModel:require('./permission-model.js');
 const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
 function account(raw){
  if(!raw||typeof raw.username!=='string'||typeof raw.fullName!=='string'||raw.contactEmail!==null&&typeof raw.contactEmail!=='string'||Object.keys(raw).sort().join(',')!=='contactEmail,departments,fullName,role,status,username')throw new Error('Invalid account fields.');
  const username=String(raw.username||'').trim().toLowerCase(),fullName=String(raw.fullName||'').trim(),contactEmail=raw.contactEmail===null||raw.contactEmail===''?null:String(raw.contactEmail).trim();
  if(!/^[a-z][a-z0-9]{1,47}$/.test(username)||!fullName||fullName.length>150||contactEmail!==null&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)||contactEmail.length>254)||!Object.hasOwn(catalog.MANAGEMENT_ROLES,raw.role)||!['active','disabled'].includes(raw.status)||!Array.isArray(raw.departments)||!raw.departments.length||raw.departments.length>7||raw.departments.some(key=>!Object.hasOwn(catalog.DEPARTMENTS,key))||new Set(raw.departments).size!==raw.departments.length)throw new Error('Provide valid account details, role and departments.');
  return {username,fullName,contactEmail,role:raw.role,status:raw.status,departments:[...raw.departments].sort()};
 }
 function changes(user,draft){return Object.fromEntries(Object.entries(draft).filter(([key,value])=>typeof value==='boolean'&&value!==model.draftDecision(key,{accountType:'Management',roleDefaults:user.roleDefaults,overrides:Object.fromEntries(Object.entries(user.overrides).map(([k,v])=>[k,v?'allow':'deny']))}).allowed));}
 function permissions(user,patch){
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).length>101)throw new Error('Invalid permissions.');
  for(const [key,value]of Object.entries(patch))if(!Object.hasOwn(catalog.BY_KEY,key)||catalog.BY_KEY[key].audience==='Driver'||typeof value!=='boolean')throw new Error('Invalid capability.');
  const overrides={...user.overrides,...patch},context={accountType:'Management',roleDefaults:user.roleDefaults,overrides:Object.fromEntries(Object.entries(overrides).map(([key,value])=>[key,value?'allow':'deny']))};
  for(const [key,value]of Object.entries(patch))if(value&&!model.draftDecision(key,context).allowed)throw new Error('Allowed capability requires its module and dependencies.');return patch;
 }
 return Object.freeze({uuid,account,changes,permissions});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidUserAdminModel;
