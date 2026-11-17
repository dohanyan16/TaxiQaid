/** Read-only live DATA panels for operational modules not yet wired to custom forms.
 * Supabase Edge Functions remain the only source; no Google credentials in the browser.
 * Do not use this component to create, edit, or approve records.
 */
const TaxiQaidLiveSheets=(()=>{
 const byPage=Object.freeze({
  breakdowns:['breakdowns'],maintenance:['maintenance'],fuel:['fuel'],
  ncr:['ncr'],training:['training'],'driver-deductions':['driver-deductions'],
  'customer-care':['customer-care'],
  'user-management':['user-directory','driver-profile-requests','driver-reset-requests']
 });
 const elem=(tag,classes,text)=>{const el=document.createElement(tag);if(classes)el.className=classes;if(text!==undefined)el.textContent=String(text);return el;};
 const values=row=>row?.values&&typeof row.values==='object'&&!Array.isArray(row.values)?row.values:{};
 const createPanel=(root,module)=>{
  const schema=TaxiQaidOperationalSchemas[module],panel=elem('section','card taxiqaid-live-records');
  panel.dataset.sheetDomain=module;
  const title=elem('h3','',schema.label+' — Live Google Sheets Records');
  const note=elem('p','preview-note','Read-only connection. Editing and cross-module actions are not enabled in this view.');
  const bar=elem('div','action-row'),refresh=elem('button','btn-secondary','Refresh'),search=elem('input','');
  refresh.type='button';search.type='search';search.placeholder='Search authorized records…';search.setAttribute('aria-label','Search '+schema.label);search.autocomplete='off';
  search.style.maxWidth='380px';search.style.minWidth='160px';search.style.flex='1';
  bar.append(search,refresh);
  const status=elem('p','preview-note','Connecting to the authorized Google Sheet…');status.setAttribute('role','status');
  const wrap=elem('div','tracker-table-container');wrap.style.overflowX='auto';
  const table=elem('table',''),thead=elem('thead',''),tbody=elem('tbody','');
  table.append(thead,tbody);wrap.append(table);
  const navigation=elem('div','action-row'),previous=elem('button','btn-secondary','Previous'),pageLabel=elem('span',''),next=elem('button','btn-secondary','Next');
  previous.type='button';next.type='button';navigation.append(previous,pageLabel,next);
  const detail=elem('section','');detail.hidden=true;detail.setAttribute('aria-live','polite');
  panel.append(title,note,bar,status,wrap,navigation,detail);root.append(panel);
  let records=[],page=0,signal=null,serial=0;
  const visibleColumns=Object.entries(schema.fields||{}).filter(([,cfg])=>cfg.overview===true).map(([field])=>field);
  function matches(row){const q=search.value.toLocaleLowerCase().trim();return !q||Object.values(values(row)).some(v=>String(v??'').toLocaleLowerCase().includes(q));}
  function showDetail(record){
   detail.replaceChildren();const label=elem('h4','','Selected record');detail.append(label);
   const dl=elem('dl','');const source=values(record);
   for(const [field,value] of Object.entries(source)){
    if(schema.fields?.[field]?.detail===false)continue;
    dl.append(elem('dt','',field),elem('dd','',String(value??'')));
   }
   detail.append(dl);detail.hidden=false;
  }
  function render(){
   thead.replaceChildren();tbody.replaceChildren();const cols=visibleColumns.length?visibleColumns:Object.keys(values(records[0]||{}));const header=elem('tr','');
   for(const field of cols)header.append(elem('th','',field));
   header.append(elem('th','','Details'));thead.append(header);
   const filtered=records.filter(matches),last=Math.max(0,Math.ceil(filtered.length/25)-1);page=Math.min(page,last);
   for(const record of filtered.slice(page*25,(page+1)*25)){
    const tr=elem('tr','');for(const field of cols){const cell=elem('td','');cell.textContent=String(values(record)[field]??'');tr.append(cell);}
    const action=elem('button','btn-secondary','View'),cell=elem('td','');action.type='button';action.addEventListener('click',()=>showDetail(record));cell.append(action);tr.append(cell);tbody.append(tr);
   }
   if(!filtered.length){const tr=elem('tr',''),cell=elem('td','table-empty','No matching authorized records.');cell.colSpan=cols.length+1;tr.append(cell);tbody.append(tr);}
   pageLabel.textContent='Page '+(page+1)+' of '+(last+1);previous.disabled=page===0;next.disabled=page>=last;
   status.textContent=records.length+' authorized records loaded'+(filtered.length!==records.length?' — '+filtered.length+' match the search':'')+'.';
  }
  search.addEventListener('input',()=>{page=0;detail.hidden=true;render();});
  previous.addEventListener('click',()=>{if(page>0){page--;render();}});
  next.addEventListener('click',()=>{page++;render();});
  async function load(activeSignal){
   signal=activeSignal;const current=++serial;
   status.textContent='Loading authorized Google Sheets data…';detail.hidden=true;
   try{
    const result=await TaxiQaidSources.read(module,{signal:activeSignal});
    if(current!==serial||activeSignal?.aborted||!panel.isConnected)return;
    if(result.connected!==true)throw new Error('The operational Google Sheet is not connected.');
    records=result.records.map(row=>({id:row.id,values:values(row)}));page=0;render();
   }catch(error){
    if(current!==serial||activeSignal?.aborted||!panel.isConnected)return;
    records=[];page=0;thead.replaceChildren();tbody.replaceChildren();
    status.textContent=error?.message||'Unable to read the authorized Google Sheet.';
    navigation.hidden=true;detail.hidden=true;
   }
   navigation.hidden=!records.length;
  }
  refresh.addEventListener('click',()=>{if(signal&&!signal.aborted)void load(signal);});
  return {load,cancel:()=>{serial++;panel.remove();}};
 };
 const mounted=new Map();
 function accepts(page){return Object.hasOwn(byPage,page);}
 function enter(page,root,signal){
  if(!accepts(page))return;
  mounted.get(page)?.forEach(x=>x.cancel());mounted.delete(page);
  const context=TaxiQaidAccess.getContext();
  if(page==='user-management'&&context?.role!=='super_admin')return;
  const panels=byPage[page].map(module=>createPanel(root,module));mounted.set(page,panels);
  for(const item of panels)void item.load(signal);
  signal?.addEventListener('abort',()=>{for(const item of panels)item.cancel();if(mounted.get(page)===panels)mounted.delete(page);},{once:true});
 }
 return Object.freeze({accepts,enter});
})();
