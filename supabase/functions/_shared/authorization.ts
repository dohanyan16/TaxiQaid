/** Reuse the exact frontend dependency/audience model after server-side JWT and database verification. */
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const contract=require('../../../shared/auth-contract.js');
const permissions=require('../../../shared/permission-model.js');
export function authorize(snapshot:unknown,identity:{uid:string;expiresAt:number},key:string,resource:Record<string,unknown>={}){
 const context=contract.access(snapshot,identity.uid,identity.expiresAt);
 return permissions.can(context,key,resource);
}
