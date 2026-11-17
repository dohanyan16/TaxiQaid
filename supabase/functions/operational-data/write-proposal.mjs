/** UNCONNECTED proposal: a durable store must serialize ALL writers before this can be deployed. */
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),schema=require('../../../shared/sheets-model.js');
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function prepareDriverWrite({operation,recordId,expectedVersion,changes},context,{plates,row,now=Date.now()}={}){
 if(!uuid(operation)||!uuid(recordId)||!Number.isSafeInteger(expectedVersion)||expectedVersion<1||context?.verified!==true||context.accountType!=='Management'||!context.uid||!context.username||!Number.isSafeInteger(row)||row<2)throw new Error('INVALID_WRITE');
 const permissions=require('../../../shared/permission-model.js');if(!permissions.can(context,'drivers.edit'))throw new Error('PERMISSION_DENIED');
 const patch=schema.patch(changes,{plates,now}),fields=Object.keys(patch).sort(),time=new Date(now).toISOString();
 const cells=Object.fromEntries(fields.map(field=>[field,patch[field]]));cells['Row Version']=expectedVersion+1;cells['Updated At UTC']=time;
 const redacted=Object.fromEntries(fields.map(field=>[field,'[REDACTED]']));
 return {operation,module:'drivers',recordId,expectedVersion,row,cells,audit:[operation,time,context.uid,context.username,'TaxiQaid','UPDATE',recordId,JSON.stringify(fields),JSON.stringify(redacted),JSON.stringify(redacted),operation,'APPLIED']};
}
export async function executeReviewedWrite(plan,{receipts,readCurrent,batch}){
 // claim is a durable transaction with a workbook-wide lock, UID/body binding and unique operation ID.
 // No timeout-based automatic lease stealing is safe with an in-flight Google request.
 const claim=await receipts.claim(plan);if(claim.state==='applied')return {confirmed:true};if(claim.state!=='claimed')throw new Error('RECOVERY_REQUIRED');
 const current=await readCurrent(plan.recordId);if(current.id!==plan.recordId||current.version!==plan.expectedVersion||current.row!==plan.row){await receipts.conflict(plan.operation);throw new Error('VERSION_CONFLICT');}
 try{await batch(plan);await receipts.applied(plan.operation);return {confirmed:true};}catch{await receipts.uncertain(plan.operation);return {confirmed:false,recoveryRequired:true};}
}
export async function recoverReviewedWrite(operation,{receipts,confirmedEvent}){const event=await confirmedEvent(operation);if(event?.exactMatch!==true)return {confirmed:false,recoveryRequired:true};await receipts.applied(operation);return {confirmed:true};}
