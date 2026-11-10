/** Transient session, selection and attendance previews; no enrollment or confirmation service. */
const TaxiQaidTrainingPreview = (() => {
  const $=id=>document.getElementById(id), ui=TaxiQaidPeopleUI;
  ui.tabs($('view-training'));
  let overview=[],sessions=[],attendance=[],selectedPage=0,assignedIds=[];
  const selection=TaxiQaidTrainingModel.createSelection({match:(record,query)=>TaxiQaidSearch.matches(record,TaxiQaidSearch.CONFIG.drivers.fields.slice(0,2),query)});
  const overviewSearch=setupSearchDropdown({input:'training-overview-search',config:'trainingOverview',getData:()=>overview,apply:renderViews});
  const sessionsSearch=setupSearchDropdown({input:'training-sessions-search',config:'trainingSessions',getData:()=>sessions,apply:renderViews});
  const attendanceSearch=setupSearchDropdown({input:'training-attendance-search',config:'trainingAttendance',getData:()=>attendance,apply:renderViews});
  // Suggestions and paginated results share the same matcher. Search never changes selected IDs.
  setupSearchDropdown({input:'training-picker-search',config:{fields:TaxiQaidSearch.CONFIG.drivers.fields.slice(0,2),id:'Iqama Number'},
    getData:()=>selection.snapshot().records,apply:()=>{selection.search($('training-picker-search').value);renderPicker();}});
  function draw(id,records,columns) {ui.table(id,records,columns);$(id+'-count').textContent=`${records.length} records found`;}
  function renderViews() {
    draw('training-overview-table',overview.filter(record=>overviewSearch.matches(record)&&(!$('training-status').value||record.Status===$('training-status').value)
      && (!$('training-requirement-filter').value||(record['Session References']||[]).includes($('training-requirement-filter').value))),['Driver Name','Driver Iqama','Training Sessions Pending','Status']);
    draw('training-sessions-table',sessions.filter(record=>sessionsSearch.matches(record)),['Session Reference','Training Name','Trainer','Session Date','Session Time','Location','Assigned Drivers','Confirmed Attendance','Session Status']);
    draw('training-attendance-table',attendance.filter(record=>attendanceSearch.matches(record)&&(!$('training-attendance-session').value||record['Session Reference']===$('training-attendance-session').value)),['Training Session','Driver Name','Driver Iqama','Attendance Status','Driver Confirmation','Confirmation Date','Trainer Verification']);
  }
  function driverName(record) {return TaxiQaidSearch.read(record,TaxiQaidSearch.CONFIG.drivers.fields[1]);}
  function empty(body,columns) {const cell=body.insertRow().insertCell();cell.colSpan=columns;cell.textContent='No drivers available — database integration pending';}
  function renderPicker() {
    const focused=document.activeElement?.matches('#training-picker-table input')?document.activeElement.getAttribute('aria-label'):null;
    const state=selection.snapshot(),body=$('training-picker-table').tBodies[0];body.replaceChildren();
    $('training-select-filtered').disabled=!state.complete||!state.total;
    $('training-picker-count').textContent=`${state.selectedCount} drivers selected · ${state.total} matching drivers`;
    $('training-picker-page').textContent=`Page ${state.page+1} of ${state.pages}`;
    $('training-picker-prev').disabled=state.page===0; $('training-picker-next').disabled=state.page+1===state.pages;
    if(!state.records.length)empty(body,3);
    state.records.forEach(record=>{
      const row=body.insertRow(),cell=row.insertCell(),label=document.createElement('label'),checkbox=document.createElement('input');
      label.className='driver-selection-hit'; checkbox.type='checkbox';checkbox.checked=state.selectedIds.includes(selection.id(record));
      checkbox.setAttribute('aria-label',`Select ${driverName(record)} (${selection.id(record)})`);
      checkbox.addEventListener('change',()=>{selection.toggle(selection.id(record),checkbox.checked);renderPicker();});label.appendChild(checkbox);cell.appendChild(label);
      row.insertCell().textContent=selection.id(record);row.insertCell().textContent=driverName(record);
    });
    const pages=Math.max(1,Math.ceil(state.selectedCount/25));selectedPage=Math.min(selectedPage,pages-1);
    const summary=$('training-selected-table').tBodies[0];summary.replaceChildren();
    if(!state.selectedCount)empty(summary,3);
    selection.selectedPage(selectedPage).forEach(record=>{
      const row=summary.insertRow();row.insertCell().textContent=selection.id(record);row.insertCell().textContent=driverName(record);
      const button=document.createElement('button');button.type='button';button.className='btn-secondary';button.textContent='Remove';
      button.setAttribute('aria-label',`Remove ${driverName(record)} (${selection.id(record)})`);
      button.addEventListener('click',()=>{selection.remove(selection.id(record));renderPicker();$('training-selected-page').focus();});row.insertCell().appendChild(button);
    });
    if(focused)[...body.querySelectorAll('input')].find(input=>input.getAttribute('aria-label')===focused)?.focus({preventScroll:true});
    $('training-selected-page').textContent=`Page ${selectedPage+1} of ${pages}`;
    $('training-selected-prev').disabled=selectedPage===0;$('training-selected-next').disabled=selectedPage+1===pages;
  }
  $('training-picker-prev').addEventListener('click',()=>{selection.move(selection.snapshot().page-1);renderPicker();});
  $('training-picker-next').addEventListener('click',()=>{selection.move(selection.snapshot().page+1);renderPicker();});
  $('training-selected-prev').addEventListener('click',()=>{selectedPage--;renderPicker();});
  $('training-selected-next').addEventListener('click',()=>{selectedPage++;renderPicker();});
  $('training-select-filtered').addEventListener('click',()=>{selection.selectAllFiltered();renderPicker();});
  $('training-deselect-all').addEventListener('click',()=>{selection.clear();renderPicker();});
  $('training-select-drivers').addEventListener('click',()=>{
    selection.clear();
    assignedIds.forEach(id=>{try{selection.toggle(id,true);}catch{/* Source changes require eligibility revalidation before saving. */}});
    renderPicker();
  });
  $('training-use-selection').addEventListener('click',()=>{
    assignedIds=selection.snapshot().selectedIds;
    $('training-assigned-count').textContent=`${assignedIds.length} drivers selected — unsaved`;
    closePreviewModal($('training-drivers-modal'));
  });
  $('training-create').addEventListener('click',()=>{
    $('training-session-form').reset();$('training-session-status').hidden=true;
    selection.clear();assignedIds=[];$('training-assigned-count').textContent='0 drivers selected — unsaved';
  });
  function savePreview() {
    const form=$('training-session-form'),capacity=$('training-capacity'),end=$('training-end');
    end.setCustomValidity(end.value&&$('training-start').value&&end.value<=$('training-start').value?'End Time must be later than Start Time for this session date.':'');
    capacity.setCustomValidity(capacity.value&&(!Number.isInteger(Number(capacity.value))||Number(capacity.value)<assignedIds.length)?'Capacity must be a whole number at least as large as the selection.':'');
    const valid=form.reportValidity();
    $('training-session-status').hidden=false;
    $('training-session-status').textContent=!valid?'Review the highlighted preview fields. Nothing was saved.':!assignedIds.length?'Select drivers before a future session can be saved. Database integration pending — session not saved.':'Database integration pending — session not saved. Driver eligibility must be verified by the future backend.';
  }
  $('training-session-save').addEventListener('click',savePreview);
  $('training-session-form').addEventListener('submit',event=>{event.preventDefault();savePreview();});
  ['training-status','training-requirement-filter','training-attendance-session'].forEach(id=>$(id).addEventListener('change',renderViews));
  renderPicker();
  return Object.freeze({
    setDriverSource(records,options={}) {selection.load(records,options);renderPicker();},
    setSnapshot(snapshot) {
      overview=(snapshot.overview||[]).map(record=>({...record}));sessions=(snapshot.sessions||[]).map(record=>({...record}));attendance=(snapshot.attendance||[]).map(record=>({...record}));
      ['training-requirement-filter','training-attendance-session'].forEach(id=>{
        const select=$(id);select.replaceChildren(new Option('All Sessions',''));
        sessions.forEach(record=>select.add(new Option(`${record['Session Reference']} · ${record['Training Name']}`,record['Session Reference'])));
      });renderViews();
    }
  });
})();
