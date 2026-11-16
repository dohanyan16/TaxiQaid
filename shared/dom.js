/** Data values never become markup or executable attributes. */
const TaxiQaidDOM=(()=>{
 function text(id,value){const target=typeof id==='string'?document.getElementById(id):id;if(target)target.textContent=String(value??'');return target;}
 function field(id,{type='text',value='',disabled=false,options}={}){const host=document.getElementById(id);const control=document.createElement(options?'select':'input');control.id=arguments[1].id||'';if(options){for(const item of options){const option=new Option(String(item.label??item.value),String(item.value));control.add(option);}}else control.type=type;control.value=String(value??'');control.disabled=disabled;host.replaceChildren(control);return control;}
 function safeUrl(value,{blob=false}={}){try{const u=new URL(value,location.href);return u.protocol==='https:'||(blob&&u.protocol==='blob:')?u.href:null;}catch{return null;}}
 return Object.freeze({text,field,safeUrl});
})();
