/** Independent Customer Care previews. No case creation, refund, export or operational requests. */
const TaxiQaidCustomerCare = (() => {
  const $=id=>document.getElementById(id),policy=TaxiQaidSupportPolicy;
  const form=$('care-form'),modal=$('care-modal');
  const audit=new Set([...form.querySelectorAll('[readonly]')].map(control=>control.id));
  let records=[],mode='add',actorId=null;
  const fields={'ID':'id','Received Date':'received-date','Customer Name':'customer-name','Customer Contact':'contact','Channel':'channel','Case Type':'type','Category':'category','Car Plate':'plate','Trip/Route':'trip','Complaint/Requirement Details':'details','Priority':'priority','Department':'department','Status':'status','Date':'created-date','Time':'created-time','Created By':'created-by','Root Cause':'root-cause','Action Taken':'action-taken','Solved Date':'solved-date','Solved Hour':'solved-hour'};
  const caseSearch=setupSearchDropdown({input:'care-search',config:'customerCare',getData:()=>records,apply:render});
  const fleetSearch=setupSearchDropdown({input:'care-plate',config:{fields:[{key:'Car Plate',aliases:['Plate'],plate:true}],id:'Car Plate'},getData:()=>fleetDatabase});
  function ratingValue(){return policy.rating(form.querySelector('[name=care-rating]:checked')?.value);}
  function renderRating() {
    const rating=ratingValue();$('care-rating-label').textContent=rating===null?'Unrated':rating+' / 5';
    [...form.querySelectorAll('.support-rating-choice')].forEach((label,index)=>label.classList.toggle('is-filled',rating!==null&&index<rating));
  }
  form.querySelectorAll('[name=care-rating]').forEach(control=>control.addEventListener('change',renderRating));
  $('care-rating-clear').addEventListener('click',()=>{form.querySelectorAll('[name=care-rating]').forEach(control=>control.checked=false);renderRating();});
  function setMode(value) {
    mode=value;const details=mode==='details';
    $('care-modal-title').textContent=mode==='add'?'Add New Customer Care Case':details?'Customer Care Case Details':'Edit Customer Care Case — Preview';
    form.querySelectorAll('input:not([type=radio]),textarea').forEach(control=>{control.readOnly=audit.has(control.id)||details||(mode==='edit'&&control.id==='care-received-date');});
    form.querySelectorAll('select').forEach(control=>{control.disabled=details||control.id==='care-assigned-to';});
    $('care-plate').disabled=details;$('care-plate').closest('.search-wrapper').querySelector('.dropdown-arrow-btn').disabled=details;
    form.querySelectorAll('[name=care-rating]').forEach(control=>control.disabled=details);
    $('care-rating-clear').hidden=details;$('care-save').hidden=details;$('care-edit').hidden=!details;
    $('care-save').textContent=mode==='edit'?'Save Changes':'Save Case';$('care-history-section').hidden=mode==='add';
  }
  function open(mode,record=null) {
    fleetSearch.clear();form.reset();$('care-refund-amount').setCustomValidity('');$('care-save-status').hidden=true;$('care-validation').hidden=true;
    Object.entries(fields).forEach(([key,id])=>{$('care-'+id).value=String(record?.[key]??(key==='Status'?'New':''));});
    $('care-current-assignee').textContent=record?.['Assigned To']?'Current assignment: '+record['Assigned To']:'No current assignment available.';
    const refund=record?.Refund;
    $('care-refund-details').value=typeof refund==='object'&&refund!==null?String(refund.details||''):String(refund??'');
    $('care-refund-amount').value=typeof refund==='object'&&refund!==null?policy.sar(refund.amount):'';
    const rating=policy.rating(record?.['Customer Satisfaction']);
    form.querySelectorAll('[name=care-rating]').forEach(control=>control.checked=Number(control.value)===rating);renderRating();
    const history=$('care-history');history.replaceChildren();
    const events=Array.isArray(record?.['Resolution History'])?record['Resolution History']:[];
    if(!events.length){const item=document.createElement('li');item.textContent='No history available — database integration pending.';history.appendChild(item);}
    events.forEach(event=>{const item=document.createElement('li');item.textContent=[event.status,event.changedBy,event.changedAt,event.details].filter(Boolean).join(' · ');history.appendChild(item);});
    setMode(mode);openPreviewModal(modal);
  }
  function value(record,column) {
    if(column==='Refund')return policy.refund(record.Refund);
    if(column==='Customer Satisfaction'){const rating=policy.rating(record[column]);return rating===null?'Unrated':rating+' / 5';}
    return String(record[column]??'');
  }
  function render() {
    const filtered=records.filter(record=>caseSearch.matches(record)&&policy.matchesCase(record,{plate:$('care-car-filter').value,status:$('care-status-filter').value}));
    $('care-count').textContent=filtered.length+' cases found';const body=$('care-table').tBodies[0];body.replaceChildren();
    if(!filtered.length){const cell=body.insertRow().insertCell();cell.colSpan=policy.CASE_COLUMNS.length;const empty=document.createElement('span');empty.className='table-empty';empty.textContent='No customer care cases available — database integration pending.';cell.appendChild(empty);return;}
    filtered.forEach(record=>{const row=body.insertRow();policy.CASE_COLUMNS.forEach((column,index)=>{
      const cell=row.insertCell(),text=value(record,column);
      if(index===0){const button=document.createElement('button');button.type='button';button.className='btn-secondary';button.textContent=text||'View Case Details';button.addEventListener('click',()=>open('details',record));cell.appendChild(button);}
      else {const span=document.createElement('span');span.className=['Priority','Status'].includes(column)?'status-badge':'care-cell-text';span.textContent=text;span.title=text;cell.appendChild(span);}
    });});
  }
  function savePreview() {
    $('care-refund-amount').setCustomValidity('');let error='';
    try {policy.sar($('care-refund-amount').value);}catch(problem){$('care-refund-amount').setCustomValidity(problem.message);}
    const valid=form.reportValidity();
    try {policy.validateCase({receivedDate:$('care-received-date').value,channel:$('care-channel').value,type:$('care-type').value,category:$('care-category').value,priority:$('care-priority').value,details:$('care-details').value,status:$('care-status').value,department:$('care-department').value,rating:ratingValue(),refundAmount:$('care-refund-amount').value});}catch(problem){error=problem.message;}
    $('care-validation').hidden=valid&&!error;$('care-validation').textContent=error||'Review the highlighted preview fields.';
    $('care-save-status').hidden=false;
  }
  $('care-refund-amount').addEventListener('input',()=>$('care-refund-amount').setCustomValidity(''));
  $('care-refund-amount').addEventListener('blur',()=>{try{$('care-refund-amount').value=policy.sar($('care-refund-amount').value);}catch{/* Keep invalid input visible for validation. */}});
  $('care-open').addEventListener('click',()=>open('add'));$('care-preview').addEventListener('click',()=>open('details'));
  $('care-edit').addEventListener('click',()=>{setMode('edit');$('care-department').focus();});$('care-save').addEventListener('click',savePreview);
  form.addEventListener('submit',event=>{event.preventDefault();savePreview();});
  ['care-car-filter','care-status-filter'].forEach(id=>$(id).addEventListener('change',render));
  ['care-refresh','care-export'].forEach(id=>$(id).addEventListener('click',showIntegrationPending));
  function setAuthorizedSnapshot(snapshot) {
    // Future adapter input must already be authorized and validated; no client-side permission claim is made.
    records=snapshot.map(record=>({...record}));const previous=$('care-car-filter').value;
    $('care-car-filter').replaceChildren(new Option('All Car Plates',''));
    [...new Set(records.map(record=>record['Car Plate']).filter(Boolean))].forEach(plate=>$('care-car-filter').add(new Option(plate,plate)));
    if(records.some(record=>record['Car Plate']===previous))$('care-car-filter').value=previous;
    $('care-car-filter').dispatchEvent(new Event('change'));render();
  }
  function clearPrivateData() {
    records=[];caseSearch.clear();fleetSearch.clear();form.reset();$('care-refund-amount').setCustomValidity('');renderRating();$('care-status-filter').value='';$('care-car-filter').replaceChildren(new Option('All Car Plates',''));
    $('care-current-assignee').textContent='No current assignment available.';$('care-history').replaceChildren();$('care-save-status').hidden=true;$('care-validation').hidden=true;
    modal.style.display='none';modal.setAttribute('aria-hidden','true');render();
  }
  $('logout-button').addEventListener('click',clearPrivateData);window.addEventListener('pagehide',clearPrivateData);
  supabaseClient.auth.onAuthStateChange((event,session)=>{
    const next=session?.user?.id||null;if(event==='SIGNED_OUT'||(actorId&&next!==actorId))clearPrivateData();actorId=next;
  });
  return Object.freeze({setAuthorizedSnapshot,clearPrivateData});
})();
