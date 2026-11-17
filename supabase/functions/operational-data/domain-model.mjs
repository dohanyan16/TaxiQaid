/** Fixed approved template registry. Data is never permission or authentication authority. */
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),domains=require('../../../shared/operational-schemas.js');
export function operationalDomain(module){if(!Object.hasOwn(domains,module))throw new Error('INVALID_MODULE');return domains[module];}
export function operationalDomainRows(module,values,tab='DATA'){
 const domain=operationalDomain(module),headers=domain.tabs[tab];
 if(!headers||!Array.isArray(values)||JSON.stringify(values[0])!==JSON.stringify(headers))throw new Error('SHEET_HEADERS_MISMATCH');
 const seen=new Set(),naturalKeys=new Set();
 return values.slice(1).filter(r=>Array.isArray(r)&&r.some(v=>v!==''&&v!==null)).map(row=>{
  if(row.length>headers.length||row.some(v=>v!=null&&typeof v!=='string'))throw new Error('SHEET_CELL_FORMAT');
  const data=Object.fromEntries(headers.map((h,i)=>[h,row[i]??'']));
  const id=data['Record ID'],version=data['Row Version'],natural=String(data[domain.idField]??'').trim();
  // Owner may append new DATA rows manually. Both technical identity cells are
  // initially empty; the server supplies an opaque deterministic read-only ID.
  if(!natural||natural.length>128||naturalKeys.has(natural))throw new Error('SHEET_IDENTITY_CONFLICT');
  if(id&&(!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id)||seen.has(id)))throw new Error('SHEET_IDENTITY_CONFLICT');
  if(Boolean(id)!==Boolean(version)||version&&!/^[1-9][0-9]{0,8}$/.test(version))throw new Error('SHEET_VERSION_INVALID');
  naturalKeys.add(natural);if(id)seen.add(id);
  return {id:id||null,version:version?Number(version):null,updatedAt:data['Updated At UTC']||null,values:Object.fromEntries(headers.filter(h=>!['Record ID','Row Version','Updated At UTC'].includes(h)).map(h=>[h,data[h]]))};
 });
}
