/** Exact existing frontend contract/evaluator, evaluated privately without returning account data. */
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ownerContract=require('../../../shared/auth-contract.js');
const ownerCatalog=require('../../../shared/permission-catalog.js');
const ownerModel=require('../../../shared/permission-model.js');
export function inspectMasterAccess(raw:unknown,uid:string,expiresAt:number){
 const context=ownerContract.access(raw,uid,expiresAt);
 const activeMaster=context.role==='super_admin'&&context.username==='dohanyan'&&context.accountStatus==='Active'&&context.accountType==='Management';
 const grants=new Set(context.roleDefaults);for(const [key,effect]of Object.entries(context.overrides)){if(effect==='allow')grants.add(key);if(effect==='deny')grants.delete(key);}
 const management=ownerCatalog.ALL.filter((p:{key:string;audience:string})=>p.audience!=='Driver'&&ownerModel.draftDecision(p.key,context).allowed).length;
 // Check both effective denial and absence of a direct driver-only grant.
 const driverDenied=ownerCatalog.ALL.filter((p:{key:string;audience:string})=>p.audience==='Driver'&&!grants.has(p.key)&&!ownerModel.draftDecision(p.key,context).allowed).length;
 return {activeMaster,compatible:true,management,driverDenied};
}
