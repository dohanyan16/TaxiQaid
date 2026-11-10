/** Shared multi-field search. No requests, persistence or operational fixtures. */
const TaxiQaidSearch = (() => {
  const configs = {
    fleet: {fields: [{key:'Plate', aliases:['Car Plate'], plate:true}, 'VIN', 'Model', 'Brand'], id:'Plate'},
    drivers: {fields: [{key:'Iqama Number', aliases:['Iqama','Driver Iqama']}, {key:'Full Name', aliases:['Name','Driver Name']}, {key:'Phone Number',aliases:['Phone','Driver Phone Number']}], id:'Iqama Number'},
    accidents: {fields:['Accident ID',{key:'Car Plate',plate:true},'Driver Iqama','Driver Name'], id:'Accident ID'},
    breakdowns: {fields:['Breakdown ID',{key:'Car Plate',plate:true},'Driver Iqama','Driver Name'], id:'Breakdown ID'},
    requests: {fields:[{key:'Original Source ID',aliases:['ID']},{key:'Car Plate',plate:true},'Car Model','Sent By'], id:'Original Source ID'},
    overview: {fields:['Maintenance ID','Original Source ID',{key:'Car Plate',plate:true},'Maintenance Engineer Iqama'], id:'Maintenance ID'},
    fuel: {fields:['Fuel Record ID',{key:'Car Plate',plate:true},'Driver Iqama','Driver Name'], id:'Fuel Record ID'},
    ncr: {fields:['NCR ID','Driver Iqama','Driver Name'], id:'NCR ID'},
    scores: {fields:['Driver Iqama','Driver Name'], id:'Driver Iqama'},
    penalties: {fields:['ID','Driver Iqama','Driver Name',{key:'Car Plate',plate:true}], id:'ID'},
    appeals: {fields:['Appeal ID','Driver Iqama','Driver Name'], id:'Appeal ID'},
    trainingOverview: {fields:['Driver Iqama','Driver Name'], id:'Driver Iqama'},
    trainingSessions: {fields:['Session Reference','Training Name','Trainer'], id:'Session Reference'},
    trainingAttendance: {fields:['Driver Iqama','Driver Name','Training Session'], id:'Driver Iqama'},
    driverBalances: {fields:['Driver Iqama','Driver Name'], id:'Driver Iqama'},
    driverExpenses: {fields:['Expense Reference','Driver Iqama','Driver Name','Source Reference'], id:'Expense Reference'},
    appliedDeductions: {fields:['Deduction Reference','Driver Iqama','Driver Name','Related Expense'], id:'Deduction Reference'},
    tripcheck: {fields:['Check ID',{key:'Car Plate',plate:true},'Driver Iqama','Driver Name'], id:'Check ID'}
  };
  Object.values(configs).forEach(config => { config.fields.forEach(field => { if(typeof field==='object') Object.freeze(field); }); Object.freeze(config.fields); Object.freeze(config); });
  const CONFIG = Object.freeze(configs);
  const text = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  const plate = value => text(value).replace(/[\s\-_.]/g,'');
  function read(record, field) {
    const spec = typeof field === 'string' ? {key:field} : field;
    for (const key of [spec.key,...(spec.aliases || [])]) {
      const actual = Object.keys(record).find(name => name.toLowerCase() === key.toLowerCase());
      if (actual !== undefined && record[actual] !== null && record[actual] !== undefined) return record[actual];
    }
    return '';
  }
  function matches(record, fields, query) {
    const q = text(query);
    if (!q) return true;
    return fields.some(field => {
      const value = read(record,field);
      const isPlate = typeof field==='object' ? field.plate : /plate/i.test(field);
      return text(value).includes(q) || Boolean(isPlate && plate(q) && plate(value).includes(plate(q)));
    });
  }
  const controllers = new Map();
  function create({input, btn, dd, config, fields, keys, getData=()=>[], getIdentifier, label, apply=()=>{}, onSelect}) {
    const inp = typeof input === 'string' ? document.getElementById(input) : input;
    if (!inp) throw new Error(`Missing search input: ${input}`);
    if (controllers.has(inp.id)) return controllers.get(inp.id);
    const settings = typeof config==='string' ? CONFIG[config] : config;
    const searchable = fields || settings?.fields || keys;
    if (!searchable?.length) throw new Error('Search fields are required.');
    const identify = getIdentifier || (record => {
      const preferred = settings?.id && searchable.find(field => (typeof field==='string' ? field : field.key) === settings.id);
      const value = preferred ? read(record,preferred) : '';
      const fallback = String(value??'').trim() ? value : searchable.map(field=>read(record,field)).find(item=>String(item??'').trim());
      return String(fallback ?? '');
    });
    const describe = label || (record => [...new Set(searchable.map(field=>String(read(record,field))).filter(Boolean))].join(' · '));
    let wrapper = inp.closest('.search-wrapper');
    if (!wrapper) { wrapper=document.createElement('div'); wrapper.className='search-wrapper'; inp.before(wrapper); wrapper.appendChild(inp); }
    wrapper.dataset.sharedSearch='true';
    wrapper.closest('.form-group')?.classList.add('record-search-field');
    let controls=inp.closest('.input-with-btn');
    if (!controls) { controls=document.createElement('div');controls.className='input-with-btn';inp.before(controls);controls.appendChild(inp); }
    let button=(btn && document.getElementById(btn)) || wrapper.querySelector('.dropdown-arrow-btn');
    if (!button) { button=document.createElement('button');button.type='button';button.className='dropdown-arrow-btn';controls.appendChild(button); }
    button.textContent='⌄';button.setAttribute('aria-label','Show search suggestions');
    const help=document.createElement('p');help.className='search-fields-description';help.id=`${inp.id}-search-fields`;
    help.textContent='Search fields: '+searchable.map(field=>typeof field==='string'?field:field.key).join(', ');
    wrapper.appendChild(help);inp.setAttribute('aria-describedby',[inp.getAttribute('aria-describedby'),help.id].filter(Boolean).join(' '));

    let list=(dd && document.getElementById(dd)) || wrapper.querySelector('.custom-dropdown');
    if (!list) { list=document.createElement('div');list.className='custom-dropdown';wrapper.appendChild(list); }
    list.id ||= `${inp.id}-suggestions`;list.setAttribute('role','listbox');list.setAttribute('aria-label','Search suggestions');
    inp.setAttribute('role','combobox');inp.setAttribute('aria-autocomplete','list');inp.setAttribute('aria-controls',list.id);
    inp.setAttribute('autocomplete','off');inp.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls',list.id);button.setAttribute('aria-expanded','false');
    let items=[], active=-1, selected=null;
    function close() { list.style.display='none'; inp.setAttribute('aria-expanded','false');button.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');active=-1; }
    function choose(record) {
      selected=record;inp.value=identify(record);close();inp.focus({preventScroll:true});
      apply();if (onSelect) onSelect(record);
    }
    function highlight(index) {
      active=index;
      [...list.querySelectorAll('[role=option]')].forEach((option,i)=>{option.classList.toggle('keyboard-active',i===active);option.setAttribute('aria-selected',String(i===active));});
      if(active>=0) { const option=list.querySelectorAll('[role=option]')[active];inp.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'}); }
    }
    function show() {
      controllers.forEach(controller=>{if(controller.input!==inp)controller.close();});
      items=getData().filter(record=>matches(record,searchable,inp.value)).slice(0,100);
      list.replaceChildren();active=-1;inp.removeAttribute('aria-activedescendant');
      if(!items.length) {const empty=document.createElement('p');empty.className='search-empty';empty.textContent='No matching records available';list.appendChild(empty);}
      items.forEach((record,index)=>{
        const option=document.createElement('div');option.className='custom-dropdown-item';option.id=`${list.id}-${index}`;
        option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.textContent=describe(record);
        option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>choose(record));list.appendChild(option);
      });
      list.style.top=`${controls.offsetTop+controls.offsetHeight+4}px`;
      list.style.display='block';inp.setAttribute('aria-expanded','true');button.setAttribute('aria-expanded','true');
    }
    inp.addEventListener('input',()=>{selected=null;apply();show();});
    inp.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp') {event.preventDefault();if(list.style.display!=='block')show();if(items.length)highlight(event.key==='ArrowDown'?(active+1)%items.length:(active<=0?items.length-1:active-1));}
      else if(event.key==='Enter' && list.style.display==='block' && items.length) {event.preventDefault();choose(items[active<0?0:active]);}
      else if(event.key==='Escape' && list.style.display==='block') {event.preventDefault();event.stopPropagation();close();}
      else if(event.key==='Tab') close();
    });
    inp.addEventListener('blur',()=>setTimeout(()=>{if(!wrapper.contains(document.activeElement))close();},0));
    button.addEventListener('click',()=>{if(list.style.display==='block')close();else show();inp.focus({preventScroll:true});});
    const controller={input:inp,close,show,clear(){selected=null;inp.value='';close();apply();},
      matches(record){return selected ? identify(record)===identify(selected) : matches(record,searchable,inp.value);}};
    controllers.set(inp.id,controller);close();return controller;
  }
  if(typeof document!=='undefined') {
    document.addEventListener('click',event=>controllers.forEach(controller=>{if(!controller.input.closest('.search-wrapper').contains(event.target))controller.close();}));
    // Preserve keyboard interaction of Trip Check's specialized vehicle/driver selectors.
    document.addEventListener('keydown',event=>{
      const wrapper=event.target.closest?.('#add-tripcheck-modal .search-wrapper');
      if(!wrapper || wrapper.dataset.sharedSearch) return;
      const dropdown=wrapper.querySelector('.custom-dropdown');
      if(dropdown?.style.display!=='block') return;
      const options=[...dropdown.querySelectorAll('.custom-dropdown-item')];
      if(event.key==='Escape'){dropdown.style.display='none';event.preventDefault();event.stopPropagation();return;}
      const current=options.findIndex(option=>option.classList.contains('keyboard-active'));
      if((event.key==='ArrowDown'||event.key==='ArrowUp')&&options.length){event.preventDefault();const next=event.key==='ArrowDown'?(current+1)%options.length:(current<=0?options.length-1:current-1);options.forEach(option=>option.classList.remove('keyboard-active'));options[next].classList.add('keyboard-active');options[next].scrollIntoView({block:'nearest'});}
      else if(event.key==='Enter'&&options.length){event.preventDefault();options[current<0?0:current].click();}
    });
    document.addEventListener('click',event=>{if(!event.target.closest('.search-wrapper'))document.querySelectorAll('#add-tripcheck-modal .custom-dropdown').forEach(list=>list.style.display='none');});
  }
  return Object.freeze({CONFIG,text,plate,read,matches,create});
})();
function getField(record,key) { return TaxiQaidSearch.read(record,key); }
function matchText(record,keys,query) { return TaxiQaidSearch.matches(record,keys,query); }
function setupSearchDropdown(options) { return TaxiQaidSearch.create(options); }
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidSearch;
