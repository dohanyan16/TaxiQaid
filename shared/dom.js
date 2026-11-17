/** Data values never become markup or executable attributes. */
const TaxiQaidDOM=(()=>{
 function text(id,value){const target=typeof id==='string'?document.getElementById(id):id;if(target)target.textContent=String(value??'');return target;}
 function field(id,{type='text',value='',disabled=false,options}={}){const host=document.getElementById(id);const control=document.createElement(options?'select':'input');control.id=arguments[1].id||'';if(options){for(const item of options){const option=new Option(String(item.label??item.value),String(item.value));control.add(option);}}else control.type=type;control.value=String(value??'');control.disabled=disabled;host.replaceChildren(control);return control;}
 function searchSelect(host,{id,value='',options=[]}){
  const node=document.getElementById(host),hidden=document.createElement('input'),input=document.createElement('input'),clear=document.createElement('button');hidden.type='hidden';hidden.id=id;hidden.value=value;input.id=id+'-search';input.type='search';input.setAttribute('aria-label','Car Plate');input.value=options.find(o=>o.value===value)?.label||value;clear.type='button';clear.className='btn-secondary';clear.textContent='Clear selection';
  node.replaceChildren(hidden,input,clear);
  const update=()=>{hidden.value='';input.setCustomValidity(input.value?'Select a vehicle from the suggestions or clear the selection.':'');};
  const controller=TaxiQaidSearch.create({input,fields:['value','label'],getData:()=>options.filter(o=>o.value),getIdentifier:o=>o.value,label:o=>o.label,onSelect:o=>{hidden.value=o.value;input.value=o.label;input.setCustomValidity('');},apply:update,paginate:true});
  clear.addEventListener('click',()=>controller.clear());return hidden;
 }
 function safeUrl(value,{blob=false}={}){try{const u=new URL(value,location.href);return u.protocol==='https:'||(blob&&u.protocol==='blob:')?u.href:null;}catch{return null;}}
 return Object.freeze({text,field,searchSelect,safeUrl});
})();
