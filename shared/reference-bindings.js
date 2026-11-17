/** Read-only, permission-bound references for unsaved operational forms.
 * Iqama and Plate are identifiers; a historical name or assignment is never inferred.
 * All data originates from the existing JWT-protected operational-data endpoint.
 */
const TaxiQaidReferenceBindings=(()=>{
 const byPage=Object.freeze({
  accidents:[['add-acc-plate','fleet','add-acc-model','Model'],['add-acc-iqama','drivers','add-acc-driver-name','Full Name']],
  breakdowns:[['bdw-car-plate','fleet','bdw-car-model','Model'],['bdw-driver-iqama','drivers','bdw-driver-name','Full Name']],
  maintenance:[['workorder-car-plate','fleet','workorder-car-model','Model']],
  fuel:[['fuel-plate','fleet','fuel-model','Model'],['fuel-iqama','drivers','fuel-driver-name','Full Name']],
 });
 const inputs=Object.freeze({
  ncr:[['ncr-driver-iqama','drivers','ncr-driver-options',[['ncr-driver-name','Full Name'],['ncr-driver-phone','Phone Number']]]],
  'driver-deductions':[['expense-iqama','drivers','taxiqaid-expense-driver-options',[['expense-name','Full Name']]],['deduction-iqama','drivers','taxiqaid-deduction-driver-options',[['deduction-name','Full Name']]]],
  'customer-care':[['care-plate','fleet','taxiqaid-care-plate-options',[]]]
 });
 const normalizePlate=value=>TaxiQaidSheetsModel.plate(value);
 const key=(record,type)=>String(type==='fleet'?record.Plate:record['Iqama Number']??record.Iqama??'').trim();
 const source=type=>type==='fleet'?fleetDatabase:driversDatabase;
 function unique(type){
  const seen=new Set(),out=[];
  for(const record of source(type)){
   const id=key(record,type),normalized=type==='fleet'?normalizePlate(id):id;
   if(!normalized||seen.has(normalized))continue;
   seen.add(normalized);out.push({id,record});
  }
  return out;
 }
 function match(type,value){
  const normalized=type==='fleet'?normalizePlate(value):String(value??'').trim();
  const found=unique(type).filter(item=>(type==='fleet'?normalizePlate(item.id):item.id)===normalized);
  return found.length===1?found[0].record:null;
 }
 function setDerived(value,outputs){
  for(const [id,field]of outputs){const element=document.getElementById(id);if(element)element.value=value?String(value[field]??''):'';}
 }
 function applySelect([id,type,output,field]){
  const select=document.getElementById(id);if(!select||!select.matches('select'))return;
  const old=select.value,existing=unique(type),options=[new Option('Select '+(type==='fleet'?'Plate':'Iqama'),'')];
  for(const item of existing)options.push(new Option(type==='fleet'?item.id+' ('+String(item.record.Model??'')+')':item.id+' - '+String(item.record['Full Name']??''),item.id));
  select.replaceChildren(...options);
  if(existing.some(x=>x.id===old))select.value=old;
  const update=()=>setDerived(match(type,select.value),[[output,field],...(id==='fuel-iqama'?[['fuel-driver-arrangement','Arrangement']]:[])]);
  if(select.dataset.taxiqaidRefBound!=='true'){select.addEventListener('change',update);select.dataset.taxiqaidRefBound='true';}
  update();
 }
 function applyInput([id,type,listId,outputs]){
  const input=document.getElementById(id);if(!input)return;
  let list=document.getElementById(listId);
  if(!list){list=document.createElement('datalist');list.id=listId;input.parentElement?.append(list);}
  const entries=unique(type);
  list.replaceChildren(...entries.map(item=>{const option=document.createElement('option');option.value=item.id;option.label=type==='fleet'?String(item.record.Model??''):String(item.record['Full Name']??'');return option;}));
  input.setAttribute('list',listId);
  const update=()=>setDerived(match(type,input.value),outputs);
  if(input.dataset.taxiqaidRefBound!=='true'){input.addEventListener('input',update);input.addEventListener('change',update);input.dataset.taxiqaidRefBound='true';}
  update();
 }
 const supported=new Set([...Object.keys(byPage),...Object.keys(inputs),'training']);
 async function enter(page,signal){
  if(!supported.has(page)||signal?.aborted)return;
  const needsFleet=(byPage[page]||[]).some(item=>item[1]==='fleet')||(inputs[page]||[]).some(item=>item[1]==='fleet');
  const needsDrivers=(byPage[page]||[]).some(item=>item[1]==='drivers')||(inputs[page]||[]).some(item=>item[1]==='drivers')||page==='training';
  const context=TaxiQaidAccess.getContext();
  if(context?.accountType!=='Management')return;
  let fleetReady=false,driversReady=false;
  // Serialized to respect the two-source Google read bound when the page itself is loading.
  if(needsFleet&&TaxiQaidAccess.can('fleet.view'))fleetReady=await fetchFleet({signal});
  if(signal?.aborted||TaxiQaidModules.current()!==page)return;
  if(needsDrivers&&TaxiQaidAccess.can('drivers.view'))driversReady=await fetchDrivers({signal});
  if(signal?.aborted||TaxiQaidModules.current()!==page)return;
  if(fleetReady||driversReady){
   for(const item of byPage[page]||[])if((item[1]==='fleet'?fleetReady:driversReady))applySelect(item);
   for(const item of inputs[page]||[])if((item[1]==='fleet'?fleetReady:driversReady))applyInput(item);
  }
  if(page==='training'&&driversReady&&typeof TaxiQaidTrainingPreview!=='undefined'){
   // A full directory is NOT proof that a driver is eligible for a training session.
   TaxiQaidTrainingPreview.setDriverSource(driversDatabase,{complete:false});
  }
  return {fleetReady,driversReady};
 }
 function reset(){
  for(const entries of Object.values(byPage))for(const [id,type,output]of entries){
   const select=document.getElementById(id);
   if(select)select.replaceChildren(new Option('Select '+(type==='fleet'?'Plate':'Iqama'),''));
   const derived=document.getElementById(output);if(derived)derived.value='';
  }
  for(const entries of Object.values(inputs))for(const [id,,listId,outputs]of entries){
   const input=document.getElementById(id),list=document.getElementById(listId);
   if(input){input.value='';input.removeAttribute('list');}
   list?.replaceChildren();setDerived(null,outputs);
  }
  const arrangement=document.getElementById('fuel-driver-arrangement');if(arrangement)arrangement.value='';
 }
 return Object.freeze({enter,reset,supported:page=>supported.has(page)});
})();
