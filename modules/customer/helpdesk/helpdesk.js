/** Internal Helpdesk previews only. Department authorization and the unified registry require a backend. */
const TaxiQaidHelpdesk = (() => {
  const $=id=>document.getElementById(id),policy=TaxiQaidSupportPolicy;
  let tickets=[],actorId=null,email='';
  const createForm=$('helpdesk-create-form'),detailForm=$('helpdesk-details-form'),modal=$('helpdesk-details-modal');
  TaxiQaidPeopleUI.tabs($('view-helpdesk'));
  const search=setupSearchDropdown({input:'helpdesk-search',config:'helpdesk',getData:()=>tickets,apply:render});
  function render() {
    // No department permission filtering occurs here. The future backend must restrict the response first.
    const filtered=tickets.filter(ticket=>search.matches(ticket)&&policy.matchesTicket(ticket,{creator:$('helpdesk-creator-filter').value,status:$('helpdesk-status-filter').value}));
    $('helpdesk-count').textContent=filtered.length+' tickets found';const body=$('helpdesk-table').tBodies[0];body.replaceChildren();
    if(!filtered.length){const cell=body.insertRow().insertCell();cell.colSpan=policy.TICKET_COLUMNS.length;const message=document.createElement('span');message.className='table-empty';message.textContent='No helpdesk tickets available — database integration pending.';cell.appendChild(message);return;}
    filtered.forEach(ticket=>{const row=body.insertRow();policy.TICKET_COLUMNS.forEach((column,index)=>{
      const cell=row.insertCell(),text=String(ticket[column]??'');
      if(index===0){const button=document.createElement('button');button.type='button';button.className='btn-secondary';button.textContent=text||'View Ticket Details';button.addEventListener('click',()=>openDetails(ticket));cell.appendChild(button);}
      else {const span=document.createElement('span');span.className=column==='Status'?'status-badge':'helpdesk-cell-text';span.textContent=text;span.title=text;cell.appendChild(span);}
    });});
  }
  function updateIdentity(user) {
    email=policy.verifiedEmail(user);$('helpdesk-email').value=email;
    $('helpdesk-identity-note').textContent=email?'Verified email from your authenticated account. Your profile department is pending integration.':'Account information pending. Your verified account email will appear here.';
    // User-editable account metadata is not a department membership or authorization source.
    $('helpdesk-own-department').value='';
  }
  function submitPreview() {
    const valid=createForm.reportValidity();let message='';
    try{policy.validateTicket({department:$('helpdesk-department').value,description:$('helpdesk-description').value});}catch(error){message=error.message;}
    $('helpdesk-create-validation').hidden=valid&&!message;$('helpdesk-create-validation').textContent=message||'Review the highlighted preview fields.';
    $('helpdesk-submit-status').hidden=false;
  }
  function clearForm() {createForm.reset();$('helpdesk-email').value=email;$('helpdesk-create-validation').hidden=true;$('helpdesk-submit-status').hidden=true;}
  function openDetails(ticket=null) {
    detailForm.reset();$('helpdesk-save-status').hidden=true;
    const fields={'Ticket ID':'id','Created By':'created-by','Creator User ID':'creator-id','Creator Email':'creator-email',"Requester's Department":'requester-department','Assigned Department':'assigned-department','Description':'description','Created Date':'created-date','Created Time':'created-time','Status':'status','Last Updated By':'updated-by','Last Updated At':'updated-at','Resolved At':'resolved-at'};
    Object.entries(fields).forEach(([key,id])=>{$('helpdesk-detail-'+id).value=String(ticket?.[key]??(key==='Status'?'Pending':''));});
    modal.querySelector('h2').textContent=ticket?'Helpdesk Ticket Details':'Helpdesk Ticket Details — Empty Preview';openPreviewModal(modal);
  }
  function savePreview() {
    if(!policy.TICKET_STATUSES.includes($('helpdesk-detail-status').value))return;
    $('helpdesk-save-status').hidden=false;
  }
  $('helpdesk-submit').addEventListener('click',submitPreview);$('helpdesk-clear').addEventListener('click',clearForm);
  createForm.addEventListener('submit',event=>{event.preventDefault();submitPreview();});
  $('helpdesk-preview').addEventListener('click',()=>openDetails());$('helpdesk-save').addEventListener('click',savePreview);
  detailForm.addEventListener('submit',event=>{event.preventDefault();savePreview();});
  $('helpdesk-refresh').addEventListener('click',showIntegrationPending);
  ['helpdesk-creator-filter','helpdesk-status-filter'].forEach(id=>$(id).addEventListener('change',render));
  function setAuthorizedSnapshot({tickets:source,scopeDescription=''}) {
    tickets=source.map(ticket=>({...ticket}));const previous=$('helpdesk-creator-filter').value;
    const creators=new Map(tickets.map(ticket=>[policy.creatorId(ticket),ticket['Creator Name']||ticket['Creator Email']||ticket['Created By']]));
    $('helpdesk-creator-filter').replaceChildren(new Option('All Creators',''));
    creators.forEach((label,key)=>{if(key)$('helpdesk-creator-filter').add(new Option(String(label||key),key));});
    if(creators.has(previous))$('helpdesk-creator-filter').value=previous;
    $('helpdesk-scope').textContent=scopeDescription||'Ticket source and department permissions are not connected.';
    $('helpdesk-creator-filter').dispatchEvent(new Event('change'));render();
  }
  function clearPrivateData() {
    tickets=[];email='';clearForm();updateIdentity(null);search.clear();$('helpdesk-status-filter').value='';$('helpdesk-creator-filter').replaceChildren(new Option('All Creators',''));
    $('helpdesk-scope').textContent='Ticket source and department permissions are not connected.';detailForm.reset();$('helpdesk-save-status').hidden=true;modal.style.display='none';modal.setAttribute('aria-hidden','true');render();
  }
  $('logout-button').addEventListener('click',clearPrivateData);window.addEventListener('pagehide',clearPrivateData);
  supabaseClient.auth.onAuthStateChange((event,session)=>{
    const user=session?.user||null,next=user?.id||null;
    if(event==='SIGNED_OUT'||(actorId&&next!==actorId))clearPrivateData();actorId=next;updateIdentity(user);
  });
  return Object.freeze({setAuthorizedSnapshot,clearPrivateData});
})();
