/** Unified searchable single-select presentation. Underlying <select> remains authoritative.
 * No networking, persistence, permission decisions or synthetic operational options.
 */
const TaxiQaidSelectUI=(()=>{
 const bound=new WeakMap(),states=new Set();let seq=0,watching=false;
 const normalized=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/[\s\-_.]+/g,'');
 const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
 function enhanceSelect(select){
  if(bound.has(select)||select.multiple||select.size>1||select.closest('[data-tq-selector-exempt]'))return;
  const id=select.id||'tq-selector-'+(++seq),wrap=element('div','tq-select-control'),input=element('input','tq-select-query');
  input.type='search';input.id=id+'-query';input.autocomplete='off';input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');
  const list=element('div','tq-select-list');list.id=id+'-options';list.setAttribute('role','listbox');
  input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
  const clear=element('button','tq-select-clear','×'),toggle=element('button','tq-select-toggle','⌄');
  for(const button of [clear,toggle])button.type='button';
  clear.setAttribute('aria-label','Clear selection');clear.title='Clear selection';
  toggle.setAttribute('aria-label','Show options');toggle.setAttribute('aria-controls',list.id);toggle.title='Show options';
  const label=select.id?[...document.querySelectorAll('label')].find(item=>item.htmlFor===select.id):null;
  input.setAttribute('aria-label',label?.textContent?.trim()||'Choose option');
  input.placeholder=select.options[0]?.value===''?select.options[0].textContent.trim():'Type to search or select';
  if(label)label.htmlFor=input.id;
  select.before(wrap);wrap.append(input,clear,toggle,list);
  select.classList.add('tq-native-select');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  let open=false,active=-1,candidates=[],suppress=false;
  const selectedText=()=>select.selectedIndex>=0&&select.value!==''?select.selectedOptions[0]?.textContent?.trim()||'':'';
  const eligible=()=>[...select.options].filter(option=>!option.disabled&&!option.closest('optgroup[disabled]'));
  function validity(){
   input.disabled=select.disabled;
   input.required=select.required;
   input.setCustomValidity(select.required&&!select.value?'Choose an option from the list.':'');
   clear.disabled=select.disabled||(!input.value&&!select.value);
   toggle.disabled=select.disabled;
  }
  function sync(){
   input.value=selectedText();
   input.placeholder=select.options[0]?.value===''?select.options[0].textContent.trim():'Type to search or select';
   validity();
   if(open)render(true);
  }
  function close(){open=false;list.hidden=true;input.setAttribute('aria-expanded','false');toggle.setAttribute('aria-expanded','false');active=-1;input.removeAttribute('aria-activedescendant');}
  function changeNative(){
   select.dispatchEvent(new Event('input',{bubbles:true}));
   select.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function choose(option){
   suppress=true;select.selectedIndex=option.index;changeNative();suppress=false;
   sync();close();input.focus({preventScroll:true});
  }
  function focusOption(index){
   if(!candidates.length)return;
   active=Math.max(0,Math.min(index,candidates.length-1));
   for(const [i,option]of [...list.querySelectorAll('[role="option"]')].entries())option.setAttribute('aria-selected',String(i===active));
   const target=list.querySelectorAll('[role="option"]')[active];
   if(target){input.setAttribute('aria-activedescendant',target.id);target.scrollIntoView({block:'nearest'});}
  }
  function render(all=false){
   if(!open)return;
   const q=all?'':normalized(input.value);
   const found=eligible().filter(option=>option.value!==''&&(!q||normalized(option.textContent).includes(q)||normalized(option.value).includes(q)));
   candidates=found.slice(0,80);active=-1;list.replaceChildren();input.removeAttribute('aria-activedescendant');
   if(!candidates.length)list.append(element('div','tq-select-empty','No matching options'));
   for(const [i,option]of candidates.entries()){
    const item=element('button','tq-select-option',option.textContent.trim());
    item.type='button';item.id=list.id+'-'+i;item.setAttribute('role','option');item.setAttribute('aria-selected','false');
    item.addEventListener('pointerdown',event=>event.preventDefault());item.addEventListener('click',()=>choose(option));
    list.append(item);
   }
   if(found.length>candidates.length)list.append(element('div','tq-select-empty',found.length-candidates.length+' more options — type to narrow results'));
  }
  function show(all=false){if(select.disabled)return;closeOthers();open=true;list.hidden=false;input.setAttribute('aria-expanded','true');toggle.setAttribute('aria-expanded','true');render(all);}
  function clearSelection(){
   if(select.disabled)return;
   const changed=select.selectedIndex!==-1;
   suppress=true;select.selectedIndex=-1;if(changed)changeNative();suppress=false;
   input.value='';validity();close();input.focus({preventScroll:true});
  }
  input.addEventListener('input',()=>{
   const typed=input.value;
   if(select.selectedIndex!==-1){suppress=true;select.selectedIndex=-1;changeNative();suppress=false;}
   input.value=typed;validity();show();
  });
  input.addEventListener('focus',()=>{if(!open)sync();});
  input.addEventListener('keydown',event=>{
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();if(!open)show(true);
    focusOption(active<0?event.key==='ArrowDown'?0:candidates.length-1:(active+(event.key==='ArrowDown'?1:-1)+candidates.length)%candidates.length);
   }else if(event.key==='Enter'&&open){event.preventDefault();if(candidates.length)choose(candidates[active<0?0:active]);}
   else if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close();}
   else if(event.key==='Tab'){close();}
  });
  clear.addEventListener('click',clearSelection);
  toggle.addEventListener('click',()=>{if(open)close();else show(true);input.focus({preventScroll:true});});
  input.addEventListener('blur',()=>setTimeout(()=>{if(!wrap.contains(document.activeElement)){close();sync();}},0));
  select.addEventListener('change',()=>{if(!suppress)sync();});
  select.addEventListener('invalid',()=>{input.setCustomValidity(select.required&&!select.value?'Choose an option from the list.':'');input.focus({preventScroll:true});});
  select.form?.addEventListener('reset',()=>setTimeout(sync,0));
  const optionsWatcher=new MutationObserver(()=>Promise.resolve().then(()=>{if(select.isConnected)sync();}));
  optionsWatcher.observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','required','selected']});
  const state={select,wrap,sync,close,reset:()=>{close();sync();}};bound.set(select,state);states.add(state);
  close();sync();
 }
 function enhanceDatalist(input){
  if(input.dataset.tqDataClear==='true'||input.closest('.search-wrapper,.tq-select-control'))return;
  input.dataset.tqDataClear='true';const wrap=element('div','tq-datalist-control');
  input.before(wrap);wrap.append(input);const clear=element('button','tq-select-clear','×');
  clear.type='button';clear.title='Clear selection';clear.setAttribute('aria-label','Clear selection');wrap.append(clear);
  function sync(){clear.disabled=input.disabled||!input.value;}
  clear.addEventListener('click',()=>{
   if(input.disabled)return;
   input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
   input.dispatchEvent(new Event('change',{bubbles:true}));
   sync();input.focus({preventScroll:true});
  });
  input.addEventListener('input',sync);input.addEventListener('change',sync);
  input.form?.addEventListener('reset',()=>setTimeout(sync,0));sync();
 }
 function enhanceTripCheck(){
  for(const [searchId,valueId,dependent]of [['tc-plate-search','tc-plate','tc-odometer'],['tc-iqama-search','tc-iqama','tc-driver-name']]){
   const search=document.getElementById(searchId),hidden=document.getElementById(valueId);
   if(!search||!hidden||search.dataset.tqTripClear==='true')continue;
   const wrap=search.closest('.input-with-btn');if(!wrap)continue;
   search.dataset.tqTripClear='true';wrap.classList.add('tq-special-select');
   const clear=element('button','tq-select-clear','×');clear.type='button';clear.title='Clear selection';clear.setAttribute('aria-label','Clear selection');wrap.append(clear);
   function sync(){clear.disabled=!search.value&&!hidden.value;}
   clear.addEventListener('click',()=>{
    search.value='';hidden.value='';const field=document.getElementById(dependent);if(field)field.value='';
    if(typeof invalidateTripCheckSignature==='function')invalidateTripCheckSignature();
    search.dispatchEvent(new Event('input',{bubbles:true}));
    search.closest('.search-wrapper')?.querySelector('.custom-dropdown')?.style.setProperty('display','none');
    sync();search.focus({preventScroll:true});
   });
   search.addEventListener('input',sync);search.addEventListener('change',sync);sync();
  }
 }
 function closeOthers(){for(const s of states)if(s.select.isConnected)s.close();}
 function enhance(root=document.getElementById('workspace')){
  if(!root)return;
  root.querySelectorAll('select').forEach(enhanceSelect);
  root.querySelectorAll('input[list]').forEach(enhanceDatalist);
  enhanceTripCheck();
  for(const state of [...states])if(!state.select.isConnected)states.delete(state);
  if(!watching){
   watching=true;
   const observer=new MutationObserver(mutations=>{
    for(const change of mutations){
     if(change.type==='attributes'){if(change.target.matches?.('input[list]'))enhanceDatalist(change.target);continue;}
     for(const node of change.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches?.('select'))enhanceSelect(node);
      if(node.matches?.('input[list]'))enhanceDatalist(node);
      node.querySelectorAll?.('select').forEach(enhanceSelect);
      node.querySelectorAll?.('input[list]').forEach(enhanceDatalist);
     }
    }
   });
   observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['list']});
   document.addEventListener('pointerdown',event=>{for(const state of states)if(!state.wrap.contains(event.target))state.close();});
  }
 }
 function sync(root){
  for(const state of states)if(state.select.isConnected&&(!root||root.contains(state.select)))state.sync();
 }
 function close(){for(const state of states)state.close();}
 return Object.freeze({enhance,sync,close});
})();
