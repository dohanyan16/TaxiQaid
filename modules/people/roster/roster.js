/** Local Roster Management. Private files never leave this session or enter browser databases. */
const TaxiQaidRoster = (() => {
  const $=id=>document.getElementById(id), model=TaxiQaidRosterModel, PAGE=25;
  const emptyCatalog={schemaVersion:1,coordinateOrder:'latitude,longitude',locations:[],zones:[]};
  let catalog=emptyCatalog,reference=emptyCatalog,catalogLoaded=false,roster=null,dailyRecords=[],driverRecords=[];
  let worker=null,nextTask=0,fileVersion=0,dataVersion=0,selectedDriver='',selectedStop=-1,editingStop=-1,proposedCatalog=null;
  let archive=null,archiveCount=0,pdfUrl='',pdfCache=null,batchTask=null,validating=false,generating=false,personalBusy=false;
  const requests=new Map(),pages=new Map();let validationIssues=[],generationErrors=[];
  TaxiQaidPeopleUI.tabs($('view-roster'));
  function status(message){$('roster-action-status').textContent=message;}
  function tab(key){$('roster-'+key+'-tab').click();}
  function ensureWorker() {
    if(worker)return worker;
    worker=new Worker(new URL('modules/people/roster/roster-worker.js',document.baseURI));
    worker.onmessage=event=>{
      const message=event.data,request=requests.get(message.id);if(!request)return;
      if(message.type==='progress'){request.progress?.(message);return;}
      requests.delete(message.id);
      if(message.type==='error')request.reject(new Error(message.message));
      else if(message.type==='cancelled')request.reject(new Error('Generation cancelled.'));
      else request.resolve(message);
    };
    worker.onerror=event=>{event.preventDefault();requests.forEach(request=>request.reject(new Error('Roster worker failed to load. Reload the application and try again.')));requests.clear();worker.terminate();worker=null;};
    return worker;
  }
  function task(type,payload,progress,transfer=[]) {
    const id=++nextTask;
    const promise=new Promise((resolve,reject)=>{
      requests.set(id,{resolve,reject,progress});
      try{ensureWorker().postMessage({id,type,...payload},transfer);}catch(error){requests.delete(id);reject(error);}
    });return {id,promise};
  }
  function cancelBatch(){if(batchTask)worker?.postMessage({id:batchTask,type:'cancel'});}
  function invalidateDownloads() {
    dataVersion++;cancelBatch();archive=null;archiveCount=0;pdfCache=null;
    if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl='';$('roster-pdf-frame').removeAttribute('src');}
    $('roster-download-zip').disabled=true;setProgress({total:roster?.drivers.length||0,generated:0,remaining:roster?.drivers.length||0,errors:0,percent:0});
    $('roster-batch-status').textContent='No current PDFs generated. Generate again after roster or location changes.';updateButtons();
  }
  function updateButtons() {
    $('roster-validate').disabled=validating||!catalogLoaded;
    $('roster-generate-all').disabled=!roster?.drivers.length||generating||!catalogLoaded;
    $('roster-download-zip').disabled=!archive||generating;
    $('roster-cancel-batch').disabled=!generating;
    ['roster-preview-pdf','roster-download-pdf'].forEach(id=>$(id).disabled=!roster||!selectedDriver||!catalogLoaded||personalBusy);
    $('roster-location-export').disabled=!catalogLoaded;
  }
  function setOptions(id,records,placeholder) {
    const select=$(id),previous=select.value;select.replaceChildren(new Option(placeholder,''));
    [...new Set(records)].sort().forEach(value=>select.add(new Option(value,value)));
    if(records.includes(previous))select.value=previous;select.dispatchEvent(new Event('change'));
  }
  function displayWeek(){return roster?roster.week[0]+' to '+roster.week[6]:'No validated week';}
  function node(text,tag='span'){const item=document.createElement(tag);item.textContent=String(text??'');return item;}
  function link(location,label) {if(!location)return node(label);const item=node(label,'a');item.href=model.mapUrl(location);item.target='_blank';item.rel='noopener noreferrer';return item;}
  function action(text,callback) {const item=node(text,'button');item.type='button';item.className='btn-secondary';item.addEventListener('click',callback);return item;}
  function empty(table,message) {const body=$(table).tBodies[0];body.replaceChildren();const cell=body.insertRow().insertCell();cell.colSpan=$(table).tHead.rows[0].cells.length;const span=node(message);span.className='table-empty';cell.appendChild(span);}
  function paged(key,records,render) {
    const count=Math.max(1,Math.ceil(records.length/PAGE)),page=Math.min(pages.get(key)||0,count-1);pages.set(key,page);
    $(key+'-page').textContent='Page '+(page+1)+' of '+count+' · '+records.length+' results';
    $(key+'-previous').disabled=page===0;$(key+'-next').disabled=page+1===count;
    render(records.slice(page*PAGE,(page+1)*PAGE));
  }
  function bindPager(key,render) {
    $(key+'-previous').addEventListener('click',()=>{pages.set(key,Math.max(0,(pages.get(key)||0)-1));render();});
    $(key+'-next').addEventListener('click',()=>{pages.set(key,(pages.get(key)||0)+1);render();});
  }
  const dailySearch=setupSearchDropdown({input:'roster-daily-search',config:'roster',getData:()=>dailyRecords.filter(record=>record.date===$('roster-date').value),apply:()=>{pages.set('roster-daily',0);renderDaily();}});
  const weeklySearch=setupSearchDropdown({input:'roster-weekly-search',config:'roster',getData:()=>driverRecords,apply:()=>{pages.set('roster-weekly',0);renderWeekly();}});
  const personalSearch=setupSearchDropdown({input:'roster-personal-search',config:'rosterDriver',getData:()=>driverRecords,onSelect:record=>selectDriver(record['Driver Iqama'])});
  $('roster-personal-search').addEventListener('input',()=>{selectedDriver='';pdfCache=null;renderPersonal();});
  const locationSearch=setupSearchDropdown({input:'roster-location-search',config:'rosterLocations',getData:()=>catalog.locations.map(record=>({'Stop Name':record.name,Aliases:record.aliases.join(' ')})),apply:()=>{pages.set('roster-locations',0);renderLocations();}});
  function renderDaily() {
    const records=dailyRecords.filter(record=>record.date===$('roster-date').value&&dailySearch.matches(record)
      &&(!$('roster-daily-shift').value||record.shift===$('roster-daily-shift').value)
      &&(!$('roster-duty').value||record.duty===$('roster-duty').value)
      &&(!$('roster-zone').value||record.zone===$('roster-zone').value)&&(!$('roster-stop').value||record.stop===$('roster-stop').value));
    const working=records.filter(record=>record.duty==='Working').length,day=records.filter(record=>record.shift==='Day Shift').length;
    $('roster-daily-count').textContent=records.length+' assignments · '+working+' working · '+(records.length-working)+' on Rest Day · '+day+' Day Shift · '+(records.length-day)+' Night Shift';
    paged('roster-daily',records,items=>{
      if(!items.length){empty('roster-daily-table',roster?'No assignments match these filters.':'Import and validate both shift files to view assignments.');return;}
      const body=$('roster-daily-table').tBodies[0];body.replaceChildren();
      items.forEach(record=>{
        const row=body.insertRow();if(record.duty==='Rest Day')row.className='roster-rest';
        row.insertCell().appendChild(action(record['Driver Name'],()=>selectDriver(record['Driver Iqama'])));
        [record['Driver Iqama'],record.date,record.shift,record.duty,record.start,record.end+(record.crossMidnight?' (next day)':''),record.plate].forEach(value=>row.insertCell().textContent=value||'—');
        row.insertCell().appendChild(link(model.findLocation(catalog,record.zone,'zone'),record.zone||'—'));
        row.insertCell().appendChild(link(model.findLocation(catalog,record.stop),record.stop||'—'));
      });
    });
  }
  function describeDay(assignment) {
    if(assignment.duty==='Rest Day')return node('REST DAY');
    const list=document.createElement('dl');list.className='roster-day-description';
    [['Duty','Working'],['Starting Time',assignment.start],['Ending Time',assignment.end+(assignment.crossMidnight?' (next day)':'')],['Car Plate',assignment.plate],['Starting Zone',assignment.zone],['Assigned Stop',assignment.stop]].forEach(([label,value])=>{list.append(node(label,'dt'),node(value,'dd'));});return list;
  }
  function renderWeekly() {
    const records=driverRecords.filter(record=>weeklySearch.matches(record)&&(!$('roster-weekly-shift').value||record.shift===$('roster-weekly-shift').value));
    $('roster-weekly-count').textContent=records.length+' drivers found';
    paged('roster-weekly',records,items=>{
      if(!items.length){empty('roster-weekly-table',roster?'No drivers match these filters.':'No validated roster loaded.');return;}
      const body=$('roster-weekly-table').tBodies[0];body.replaceChildren();
      items.forEach(record=>{const row=body.insertRow();row.insertCell().appendChild(action(record.name,()=>selectDriver(record.iqama)));row.insertCell().textContent=record.iqama;row.insertCell().textContent=record.shift;
        record.assignments.forEach(assignment=>{const cell=row.insertCell();if(assignment.duty==='Rest Day')cell.className='roster-rest';cell.appendChild(describeDay(assignment));});});
    });
  }
  function selectDriver(iqama) {
    selectedDriver=iqama;pdfCache=null;$('roster-personal-search').value=iqama;personalSearch.close();renderPersonal();tab('personal');
  }
  function renderPersonal() {
    const driver=roster?.drivers.find(item=>item.iqama===selectedDriver);
    $('roster-personal-name').value=driver?.name||'';$('roster-personal-iqama').value=driver?.iqama||'';
    $('roster-personal-week').value=driver?displayWeek():'';$('roster-personal-shift').value=driver?.shift||'';
    updateButtons();if(!driver){empty('roster-personal-table','Select a driver from the validated roster.');return;}
    const body=$('roster-personal-table').tBodies[0];body.replaceChildren();
    driver.assignments.forEach((a,index)=>{
      const row=body.insertRow();if(a.duty==='Rest Day')row.className='roster-rest';
      [model.DAYS[index],a.date,a.duty,a.plate,a.start,a.end+(a.crossMidnight?' ('+a.endDate+')':'')].forEach(value=>row.insertCell().textContent=value||'—');
      row.insertCell().appendChild(link(model.findLocation(catalog,a.zone,'zone'),a.zone||'—'));
      row.insertCell().appendChild(link(model.findLocation(catalog,a.stop),a.stop||'—'));
      row.insertCell().appendChild(a.duty==='Rest Day'?node('—'):link(a.station?model.findLocation(catalog,a.station.name):null,a.station?.name||'Not Configured'));
      row.insertCell().textContent=a.duty==='Rest Day'?'—':a.station?.time||'Not Configured';
    });
  }
  ['roster-date','roster-daily-shift','roster-duty','roster-zone','roster-stop'].forEach(id=>$(id).addEventListener('change',()=>{pages.set('roster-daily',0);renderDaily();}));
  ['roster-week','roster-weekly-shift'].forEach(id=>$(id).addEventListener('change',()=>{pages.set('roster-weekly',0);renderWeekly();}));
  bindPager('roster-daily',renderDaily);bindPager('roster-weekly',renderWeekly);
  function renderIssues() {
    paged('roster-validation',validationIssues,items=>{
      if(!items.length){empty('roster-validation-table','No validation errors.');return;}
      const body=$('roster-validation-table').tBodies[0];body.replaceChildren();items.forEach(issue=>{const row=body.insertRow();[issue.severity,issue.source,issue.row||'—',issue.column||'—',issue.message].forEach(value=>row.insertCell().textContent=value);});
    });
  }
  bindPager('roster-validation',renderIssues);
  ['day','night'].forEach(shift=>{
    $('roster-upload-'+shift).addEventListener('click',()=>$('roster-'+shift+'-file').click());
    $('roster-'+shift+'-file').addEventListener('change',()=>{
      fileVersion++;$('roster-'+shift+'-name').textContent=$('roster-'+shift+'-file').files[0]?.name||'Not selected';
      $('roster-validation-status').textContent='New source selected. Validate both selected files before replacing the active roster.';
    });
  });
  async function validate() {
    if(validating)return;
    const day=$('roster-day-file').files[0],night=$('roster-night-file').files[0];
    if(!day||!night){status('Select both Day Shift and Night Shift Excel files.');tab('import');return;}
    if([day,night].some(file=>!file.name.toLowerCase().endsWith('.xlsx')||file.size>10*1024*1024||!file.size)){status('Use nonempty .xlsx workbooks of at most 10 MiB each.');return;}
    const version=fileVersion;validating=true;updateButtons();$('roster-validation-status').textContent='Validating both complete sources locally...';
    try {
      const [dayBuffer,nightBuffer]=await Promise.all([day.arrayBuffer(),night.arrayBuffer()]);
      const message=await task('validate',{day:dayBuffer,night:nightBuffer},null,[dayBuffer,nightBuffer]).promise;
      if(version!==fileVersion){status('Source selection changed during validation. Validate the newly selected files.');return;}
      const result=message.result;validationIssues=result.issues;pages.set('roster-validation',0);renderIssues();
      if(!result.ok){$('roster-validation-status').textContent='Validation failed: '+result.issues.length+' errors. The previous validated roster is unchanged.';status('Resolve source errors and validate both files again.');tab('import');return;}
      roster=result;selectedDriver='';selectedStop=-1;
      dailyRecords=model.daily(roster);driverRecords=roster.drivers.map(driver=>({...driver,'Driver Name':driver.name,'Driver Iqama':driver.iqama,'Car Plate':driver.assignments.map(a=>a.plate).filter(Boolean).join(' ')}));
      invalidateDownloads();dailySearch.clear();weeklySearch.clear();personalSearch.clear();pages.clear();
      $('roster-date').replaceChildren(...roster.week.map(date=>new Option(date,date)));
      $('roster-week').replaceChildren(new Option(displayWeek(),roster.week[0]));
      [...$('roster-weekly-table').tHead.rows[0].cells].slice(3).forEach((cell,index)=>{cell.replaceChildren(node(model.DAYS[index]),node(roster.week[index],'small'));});
      ['roster-date','roster-week'].forEach(id=>$(id).dispatchEvent(new Event('change')));
      setOptions('roster-zone',dailyRecords.map(a=>a.zone).filter(Boolean),'All Zones');setOptions('roster-stop',dailyRecords.map(a=>a.stop).filter(Boolean),'All Stops');
      ['roster-daily-shift','roster-duty','roster-weekly-shift'].forEach(id=>$(id).value='');
      $('roster-active-week').textContent='Validated local preview: '+displayWeek()+' · '+roster.counts.total+' unique drivers · unpublished';
      $('roster-day-count').textContent=roster.counts.day;$('roster-night-count').textContent=roster.counts.night;$('roster-total-count').textContent=roster.counts.total;
      $('roster-validation-status').textContent='Both files validated. '+roster.counts.total+' unique drivers; no structural or assignment conflicts. Nothing was uploaded or published.';
      renderDaily();renderWeekly();renderPersonal();renderMappings();renderLocations();status('Validated roster loaded into the current session. Review unmatched stops before generating schedules.');tab('daily');
    } catch(error){$('roster-validation-status').textContent='Validation failed: '+error.message+' The previous validated roster is unchanged.';status('The selected sources could not be validated.');tab('import');}
    finally{validating=false;updateButtons();}
  }
  $('roster-validate').addEventListener('click',validate);
  function renderMappings() {
    const result=model.mappings(roster,catalog);
    $('roster-mapping-approved').textContent=reference.locations.length;$('roster-mapping-current').textContent=catalog.locations.length;
    ['used','matched'].forEach(key=>$('roster-mapping-'+key).textContent=result[key]);
    $('roster-mapping-unmatched').textContent=result.unmatched.length;$('roster-mapping-missing').textContent=result.missingCoordinates;$('roster-mapping-conflicts').textContent=result.aliasConflicts;
    if(!result.unmatched.length){empty('roster-unmatched-table','No unmatched stops in the current preview.');return;}
    const body=$('roster-unmatched-table').tBodies[0];body.replaceChildren();result.unmatched.forEach(name=>{const row=body.insertRow();row.insertCell().textContent=name;row.insertCell().appendChild(action('Add This Stop',()=>openStop(-1,name)));});
  }
  function mappingStatus(item) {
    const old=reference.locations.find(record=>model.normalize(record.name)===model.normalize(item.name));
    return old?(JSON.stringify(old)===JSON.stringify(item)?'Approved reference':'Local preview edit'):'Local preview addition';
  }
  function renderLocations() {
    const records=catalog.locations.map((item,index)=>({...item,index,'Stop Name':item.name,Aliases:item.aliases.join(' ')})).filter(item=>locationSearch.matches(item));
    paged('roster-locations',records,items=>{
      if(!items.length){empty('roster-locations-table','No locations match this search.');return;}
      const body=$('roster-locations-table').tBodies[0];body.replaceChildren();
      items.forEach(item=>{const row=body.insertRow();row.insertCell().appendChild(action(item.name,()=>{selectedStop=item.index;$('roster-location-selection').textContent='Selected stop: '+item.name;$('roster-location-edit').disabled=false;$('roster-location-map').disabled=false;}));
        row.insertCell().textContent=item.latitude;row.insertCell().textContent=item.longitude;row.insertCell().appendChild(link(item,'View on Google Maps'));row.insertCell().textContent=item.aliases.join('; ')||'—';row.insertCell().textContent=mappingStatus(catalog.locations[item.index]);});
    });
  }
  bindPager('roster-locations',renderLocations);
  function openStop(index=-1,name='') {
    editingStop=index;const item=catalog.locations[index];$('roster-stop-form').reset();
    $('roster-stop-name').value=item?.name||name;$('roster-stop-latitude').value=item?.latitude??'';$('roster-stop-longitude').value=item?.longitude??'';
    $('roster-stop-aliases').value=item?.aliases.join('\n')||'';$('roster-stop-remarks').value=item?.remarks||'';
    $('roster-stop-modal').querySelector('h2').textContent=item?'Edit Stop':'Add New Stop';$('roster-stop-save').textContent=item?'Apply Stop Changes':'Add Stop';
    $('roster-stop-confirm-group').hidden=!item;$('roster-stop-error').textContent='';previewStop();openPreviewModal($('roster-stop-modal'));
  }
  function stopEntry() {
    if(!$('roster-stop-latitude').value.trim()||!$('roster-stop-longitude').value.trim())throw new Error('Latitude and Longitude are required.');
    return {name:$('roster-stop-name').value.trim(),latitude:Number($('roster-stop-latitude').value),longitude:Number($('roster-stop-longitude').value),aliases:$('roster-stop-aliases').value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean),remarks:$('roster-stop-remarks').value};
  }
  function previewStop() {
    $('roster-stop-url').value='';$('roster-stop-preview').disabled=true;
    const similar=model.similarNames(catalog,$('roster-stop-name').value,editingStop);$('roster-stop-similar').textContent=similar.length?'Similar names require review: '+similar.join('; ')+'. No automatic matching is performed.':'';
    try {
      const entry=stopEntry();$('roster-stop-url').value=model.mapUrl(entry);$('roster-stop-preview').disabled=false;
      const proposed=model.updateLocation(catalog,entry,editingStop),before=model.mappings(roster,catalog),after=model.mappings(roster,proposed);
      $('roster-stop-impact').textContent='Mapping preview: '+after.unmatched.length+' unmatched stops ('+(after.unmatched.length-before.unmatched.length)+' change). Existing PDF/ZIP downloads will be invalidated.';
    }catch(error){$('roster-stop-impact').textContent=error.message;}
  }
  ['roster-stop-name','roster-stop-latitude','roster-stop-longitude','roster-stop-aliases','roster-stop-remarks'].forEach(id=>$(id).addEventListener('input',previewStop));
  function applyCatalog(next,message) {
    catalog=next;selectedStop=-1;$('roster-location-selection').textContent='Select a stop to edit or view it.';$('roster-location-edit').disabled=true;$('roster-location-map').disabled=true;
    invalidateDownloads();renderLocations();renderMappings();renderDaily();renderPersonal();status(message);
  }
  function saveStop() {
    if(!$('roster-stop-form').reportValidity())return;
    try {
      if(editingStop>=0&&!$('roster-stop-confirm').checked)throw new Error('Review and confirm the existing mapping changes before applying them.');
      const next=model.updateLocation(catalog,stopEntry(),editingStop);
      applyCatalog(next,editingStop<0?'Stop added to the current preview. Download the updated location catalog to retain this configuration.':'Stop updated in the current preview. Download the location catalog to retain this configuration.');
      closePreviewModal($('roster-stop-modal'));
    }catch(error){$('roster-stop-error').textContent=error.message;}
  }
  $('roster-stop-save').addEventListener('click',saveStop);$('roster-stop-form').addEventListener('submit',event=>{event.preventDefault();saveStop();});
  ['roster-add-stop','roster-locations-add'].forEach(id=>$(id).addEventListener('click',()=>openStop()));
  $('roster-manage-stops').addEventListener('click',()=>tab('locations'));
  $('roster-location-edit').addEventListener('click',()=>{if(selectedStop>=0)openStop(selectedStop);});
  function openMap(url){window.open(url,'_blank','noopener,noreferrer');}
  $('roster-location-map').addEventListener('click',()=>{if(catalog.locations[selectedStop])openMap(model.mapUrl(catalog.locations[selectedStop]));});
  $('roster-stop-preview').addEventListener('click',()=>{try{openMap(model.mapUrl(stopEntry()));}catch(error){$('roster-stop-error').textContent=error.message;}});
  function download(blob,filename) {const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('roster-location-export').addEventListener('click',()=>{download(new Blob([JSON.stringify(model.validateLocations(catalog),null,2)],{type:'application/json'}),'TaxiQaid_Roster_Locations.json');status('Location catalog downloaded. Changes remain local until the configuration is separately reviewed and updated.');});
  $('roster-location-import').addEventListener('click',()=>$('roster-location-file').click());
  $('roster-location-file').addEventListener('change',async()=>{
    const file=$('roster-location-file').files[0];if(!file)return;
    try {
      if(file.size>2*1024*1024)throw new Error('Location catalogs must be at most 2 MiB.');
      const next=model.validateLocations(JSON.parse(await file.text()));proposedCatalog=next;
      const previous=new Map(catalog.locations.map(item=>[model.normalize(item.name),item]));
      const added=next.locations.filter(item=>!previous.has(model.normalize(item.name))).length;
      const changed=next.locations.filter(item=>previous.has(model.normalize(item.name))&&JSON.stringify(previous.get(model.normalize(item.name)))!==JSON.stringify(item)).length;
      const removed=catalog.locations.filter(item=>!next.locations.some(record=>model.normalize(item.name)===model.normalize(record.name))).length;
      $('roster-catalog-review').textContent='Review '+next.locations.length+' stops and '+next.zones.length+' explicit zone mappings: '+added+' added, '+changed+' changed, '+removed+' removed. Roster stops left unmatched: '+model.mappings(roster,next).unmatched.length+'.';
      $('roster-catalog-confirm').checked=false;openPreviewModal($('roster-catalog-modal'));
    }catch(error){proposedCatalog=null;status('Catalog import rejected: '+error.message);}
    finally{$('roster-location-file').value='';}
  });
  $('roster-catalog-apply').addEventListener('click',()=>{
    if(!proposedCatalog||!$('roster-catalog-confirm').checked){$('roster-catalog-review').textContent+=' Confirm the reviewed replacement to continue.';return;}
    applyCatalog(proposedCatalog,'Location catalog replaced in the current preview. Download JSON to retain these changes.');proposedCatalog=null;closePreviewModal($('roster-catalog-modal'));
  });
  function setProgress(progress) {
    ['total','generated','remaining','errors','percent'].forEach(key=>$('roster-batch-'+key).textContent=progress[key]+(key==='percent'?'%':''));
    $('roster-batch-progress').value=progress.percent;
  }
  async function generateAll() {
    if(!roster||generating)return;
    const version=dataVersion;generating=true;archive=null;archiveCount=0;generationErrors=[];empty('roster-generation-errors','No generation errors.');updateButtons();tab('import');
    setProgress({total:roster.drivers.length,generated:0,remaining:roster.drivers.length,errors:0,percent:0});$('roster-batch-status').textContent='Loading local PDF resources...';
    try {
      const job=task('batch',{roster,catalog},progress=>{
        if(version!==dataVersion)return;setProgress(progress);$('roster-batch-status').textContent=progress.phase+(progress.zipPercent!==undefined?' · ZIP '+progress.zipPercent+'%':'');
      });batchTask=job.id;const result=await job.promise;
      if(version!==dataVersion)return;
      if(result.type==='incomplete') {
        generationErrors=result.errors;$('roster-batch-status').textContent='Incomplete generation: '+result.generated+' of '+result.total+' PDFs. ZIP download is blocked. No drivers were silently skipped.';
        const body=$('roster-generation-errors').tBodies[0];body.replaceChildren();generationErrors.forEach(error=>{const row=body.insertRow();row.insertCell().textContent=error.iqama;row.insertCell().textContent=error.message;});return;
      }
      archive=new Blob([result.buffer],{type:'application/zip'});archiveCount=result.generated;
      $('roster-batch-status').textContent='Complete: '+result.generated+' of '+result.total+' personal PDFs are ready in one ZIP for '+displayWeek()+'. Nothing was uploaded or published.';
    }catch(error){if(version===dataVersion)$('roster-batch-status').textContent=error.message+' No complete ZIP is available.';}
    finally{generating=false;batchTask=null;updateButtons();}
  }
  $('roster-generate-all').addEventListener('click',generateAll);$('roster-cancel-batch').addEventListener('click',cancelBatch);
  $('roster-download-zip').addEventListener('click',()=>{if(archive&&roster)download(archive,'TaxiQaid_Weekly_Roster_'+roster.week[0]+'.zip');});
  async function personalPdf(preview) {
    const driver=roster?.drivers.find(item=>item.iqama===selectedDriver);if(!driver||personalBusy)return;
    const version=dataVersion,identity=driver.iqama;personalBusy=true;updateButtons();
    try {
      status('Generating the selected personal schedule locally...');
      if(!pdfCache||pdfCache.iqama!==identity||pdfCache.version!==version) {
        const result=await task('pdf',{driver,week:roster.week,catalog}).promise;
        if(version!==dataVersion||identity!==selectedDriver)return;
        pdfCache={iqama:identity,version,blob:new Blob([result.buffer],{type:'application/pdf'})};
      }
      if(!preview){download(pdfCache.blob,model.filename(driver));status('Selected personal PDF downloaded locally. Nothing was published.');return;}
      if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(pdfCache.blob);$('roster-pdf-frame').src=pdfUrl;
      $('roster-pdf-status').textContent='Selected driver: '+driver.name+' · '+driver.iqama+' · '+displayWeek();openPreviewModal($('roster-pdf-modal'));status('Personal PDF ready in a private local preview.');
    }catch(error){status('PDF generation failed: '+error.message);}
    finally{personalBusy=false;updateButtons();}
  }
  $('roster-preview-pdf').addEventListener('click',()=>personalPdf(true));$('roster-download-pdf').addEventListener('click',()=>personalPdf(false));
  $('roster-pdf-open').addEventListener('click',()=>{if(pdfUrl)window.open(pdfUrl,'_blank','noopener,noreferrer');});
  function refreshWhatsApp() {
    $('roster-whatsapp-week').value=displayWeek();$('roster-whatsapp-total').value=roster?.drivers.length||0;
    ['phones','no-phones'].forEach(key=>$('roster-whatsapp-'+key).value='Unavailable — Drivers Management not connected');
    ['eligible','ineligible'].forEach(key=>$('roster-whatsapp-'+key).value='Unavailable — verification pending');
    $('roster-whatsapp-pdfs').value=archiveCount||(pdfCache?1:0);$('roster-whatsapp-connection').value='Not Configured';
  }
  $('roster-whatsapp').addEventListener('click',()=>{refreshWhatsApp();openPreviewModal($('roster-whatsapp-modal'));});
  $('roster-whatsapp-settings').addEventListener('click',()=>openPreviewModal($('roster-whatsapp-settings-modal')));
  $('roster-whatsapp-preview').addEventListener('click',()=>{$('roster-whatsapp-message').hidden=false;});
  function renderRecipients() {
    paged('roster-recipients',roster?.drivers||[],items=>{
      if(!items.length){empty('roster-recipients-table','No validated roster loaded.');return;}
      const body=$('roster-recipients-table').tBodies[0];body.replaceChildren();items.forEach(driver=>{const row=body.insertRow();[driver.iqama,driver.name,'Not linked',displayWeek(),'Not published',archiveCount?'Ready locally':pdfCache?.iqama===driver.iqama?'Ready locally':'Not generated','Pending verification'].forEach(value=>row.insertCell().textContent=value);});
    });
  }
  bindPager('roster-recipients',renderRecipients);
  $('roster-whatsapp-recipients').addEventListener('click',()=>{renderRecipients();openPreviewModal($('roster-recipients-modal'));});
  function clearPrivateData() {
    fileVersion++;dataVersion++;worker?.terminate();worker=null;requests.forEach(request=>request.reject(new Error('Private session cleared.')));requests.clear();
    roster=null;dailyRecords=[];driverRecords=[];selectedDriver='';archive=null;archiveCount=0;pdfCache=null;validationIssues=[];generationErrors=[];generating=false;validating=false;personalBusy=false;batchTask=null;
    catalog=model.validateLocations(reference);selectedStop=-1;editingStop=-1;proposedCatalog=null;locationSearch.clear();
    $('roster-stop-form').reset();$('roster-stop-url').value='';
    ['roster-stop-error','roster-stop-similar','roster-stop-impact','roster-catalog-review'].forEach(id=>$(id).textContent='');
    ['roster-whatsapp-account','roster-whatsapp-phone-id','roster-whatsapp-template','roster-location-file'].forEach(id=>$(id).value='');
    $('roster-whatsapp-message').hidden=true;$('roster-location-selection').textContent='Select a stop to edit or view it.';
    $('roster-location-edit').disabled=true;$('roster-location-map').disabled=true;
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl='';$('roster-pdf-frame').removeAttribute('src');
    ['roster-day-file','roster-night-file'].forEach(id=>$(id).value='');
    [dailySearch,weeklySearch,personalSearch].forEach(search=>search.clear());
    $('roster-pdf-status').textContent='';empty('roster-generation-errors','No generation errors.');
    ['roster-day-name','roster-night-name'].forEach(id=>$(id).textContent='Not selected');
    ['roster-day-count','roster-night-count','roster-total-count'].forEach(id=>$(id).textContent='0');
    $('roster-date').replaceChildren(new Option('Import a validated week',''));$('roster-week').replaceChildren(new Option('No validated week',''));setOptions('roster-zone',[],'All Zones');setOptions('roster-stop',[],'All Stops');
    [...$('roster-weekly-table').tHead.rows[0].cells].slice(3).forEach((cell,index)=>cell.textContent=model.DAYS[index]);
    $('roster-active-week').textContent='No validated roster loaded.';$('roster-validation-status').textContent='Private roster cleared from this session.';
    renderDaily();renderWeekly();renderPersonal();renderMappings();renderIssues();renderRecipients();refreshWhatsApp();invalidateDownloads();
    document.querySelectorAll('#module-overlays .modal-overlay[id^="roster-"]').forEach(modal=>{modal.style.display='none';modal.setAttribute('aria-hidden','true');});
    status('Private roster cleared from this session.');
  }
  $('logout-button').addEventListener('click',clearPrivateData);window.addEventListener('pagehide',clearPrivateData);
  const ready=fetch('modules/people/roster/locations.json').then(response=>{if(!response.ok)throw new Error('Approved location catalog unavailable.');return response.json();}).then(value=>{
    reference=model.validateLocations(value);catalog=reference;catalogLoaded=true;renderLocations();renderMappings();updateButtons();
  }).catch(error=>{status(error.message+' Roster generation is unavailable until the approved catalog loads.');updateButtons();});
  renderDaily();renderWeekly();renderPersonal();updateButtons();
  return Object.freeze({ready,clearPrivateData});
})();
