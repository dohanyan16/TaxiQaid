/** Empty operational sources; editable permission drafts never update runtime authority. */
const TaxiQaidUserManagement = (()=>{
  const $=id=>document.getElementById(id),catalog=TaxiQaidPermissionCatalog,model=TaxiQaidPermissionModel;
  let users=[],requests=[],selectedUser=null,selectedRequest=null,editingUser=null,draft={accountType:'Management',roleDefaults:[],overrides:{}},editMode='none';
  const userColumns=['User ID','Display Name','Account Type','Email / Login','Department','Role','Account Status','Last Sign In','Actions'];
  const requestColumns=['Request Reference','Driver Iqama','Driver Name','Requested Field','Current Value','Requested Value','Requested At','Status','Reviewed By','Reviewed At'];
  const pending=(id,value)=>{$(id).textContent=value;$(id).hidden=false;};
  const allowed=key=>!TaxiQaidAccess.getContext()?.verified||TaxiQaidAccess.can(key);
  TaxiQaidPeopleUI.tabs($('view-user-management'));
  const userSearch=TaxiQaidSearch.create({input:'um-user-search',fields:['User ID','Display Name','Email / Login','Driver Iqama'],getData:()=>users,getIdentifier:record=>record['User ID'],apply:renderUsers});
  const targetSearch=TaxiQaidSearch.create({input:'um-permission-user',fields:['User ID','Display Name','Email / Login','Driver Iqama'],getData:()=>users,getIdentifier:record=>record['User ID'],onSelect:user=>{selectedUser=user;loadDraft();}});
  const requestSearch=TaxiQaidSearch.create({input:'um-request-search',fields:['Request Reference','Driver Iqama','Driver Name'],getData:()=>requests,getIdentifier:record=>record['Request Reference'],apply:renderRequests});
  $('um-permission-user').addEventListener('input',()=>{selectedUser=null;loadDraft();});
  function renderUsers(){TaxiQaidPeopleUI.table('um-users-table',users.filter(user=>userSearch.matches(user)&&(!$('um-user-type').value||user['Account Type']===$('um-user-type').value)&&(!$('um-user-status').value||user['Account Status']===$('um-user-status').value)),userColumns,user=>{selectedUser=user;loadDraft();$('um-access-tab').click();});
    document.querySelectorAll('#um-users-table tbody tr').forEach((row,index)=>{
      if(!row.querySelector('button'))return;
      const id=row.querySelector('button').textContent,user=users.find(item=>String(item['User ID'])===id),cell=row.lastElementChild;cell.replaceChildren();
      const make=(label,key,handler)=>{const button=document.createElement('button');button.type='button';button.className='btn-secondary';button.textContent=label;button.dataset.umCapability=key;button.disabled=!allowed(key);button.addEventListener('click',()=>{if(allowed(key))handler();});cell.append(button);};
      make('Edit User','user-management.edit-user',()=>openUser(user));
      make(user['Account Status']==='Active'?'Disable User':'Enable User','user-management.change-status',()=>pending('um-users-status','Account management integration pending — status not changed.'));
      make('Access & Permissions','user-management.manage-permissions',()=>{selectedUser=user;loadDraft();$('um-access-tab').click();});
    });
  }
  function renderRequests(){TaxiQaidPeopleUI.table('um-requests-table',requests.filter(request=>requestSearch.matches(request)&&(!$('um-request-status').value||request.Status===$('um-request-status').value)&&(!$('um-request-field').value||request['Requested Field']===$('um-request-field').value)),requestColumns,openRequest);}
  ['um-user-type','um-user-status'].forEach(id=>$(id).addEventListener('change',renderUsers));['um-request-status','um-request-field'].forEach(id=>$(id).addEventListener('change',renderRequests));
  function loadDraft(){draft={accountType:selectedUser?.['Account Type']||'Management',roleDefaults:[...(selectedUser?.permissions?.roleDefaults||[])],overrides:{...(selectedUser?.permissions?.overrides||{})}};editMode='none';$('um-draft-type').value=draft.accountType;$('um-role-template').value='';$('um-selected-user').textContent=selectedUser?'Selected user: '+selectedUser['User ID']+' — unsaved draft':'No user selected. Unassigned demonstration draft only.';$('um-draft-status').hidden=true;renderMatrix();}
  function renderMatrix(){
    $('um-permission-matrix').replaceChildren();
    catalog.MODULES.forEach(module=>{
      const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=module.label+' ('+module.permissions.length+(module.permissions.length===1?' capability)':' capabilities)');details.append(summary);
      const container=document.createElement('div');container.className='tracker-table-container';container.tabIndex=0;container.setAttribute('role','region');container.setAttribute('aria-label',module.label+' permissions');
      const table=document.createElement('table'),head=table.createTHead().insertRow();['Capability','User Override','Effective','Source'].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);});const body=table.createTBody();
      module.permissions.forEach(permission=>{
        const row=body.insertRow(),label=row.insertCell();label.textContent=permission.label;label.append(document.createElement('br'));const code=document.createElement('code');code.textContent=permission.key;label.append(code);
        const select=document.createElement('select');select.setAttribute('aria-label',module.label+' — '+permission.label+' override');select.dataset.permissionKey=permission.key;
        [['inherit','Inherit'],['allow','Explicit Allow'],['deny','Explicit Deny']].forEach(([value,title])=>{const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);});select.value=draft.overrides[permission.key]||'inherit';
        const applicable=(draft.accountType!=='Driver'||module.id==='driver-portal')&&(permission.audience==='Both'||permission.audience===draft.accountType);
        select.disabled=!applicable||!(editMode==='all'||editMode==='modules'&&permission.key.endsWith('.view')&&permission.key===module.id+'.view')||!allowed('user-management.manage-permissions');
        select.addEventListener('change',()=>{draft.overrides[permission.key]=select.value;updateEffective();});row.insertCell().append(select);
        const effective=row.insertCell(),source=row.insertCell();effective.dataset.effective=permission.key;source.dataset.source=permission.key;
      });container.append(table);details.append(container);$('um-permission-matrix').append(details);
    });updateEffective();
  }
  function updateEffective(){catalog.ALL.forEach(permission=>{const decision=model.draftDecision(permission.key,draft),cell=document.querySelector('[data-effective="'+permission.key+'"]');cell.textContent=decision.allowed?'Allowed':'Denied';cell.className=decision.allowed?'um-allow':'um-deny';document.querySelector('[data-source="'+permission.key+'"]').textContent=decision.source;});}
  $('um-draft-type').addEventListener('change',()=>{draft.accountType=$('um-draft-type').value;renderMatrix();});
  $('um-role-template').addEventListener('change',()=>{draft.roleDefaults=[];renderMatrix();pending('um-draft-status','Proposed template selected. Defaults are unconfigured; no permissions have been granted.');});
  $('um-view-effective').addEventListener('click',()=>{editMode='none';renderMatrix();pending('um-draft-status','Effective preview of this unsaved target-user draft. Signed-in account permissions are unchanged.');});
  $('um-edit-modules').addEventListener('click',()=>{editMode='modules';renderMatrix();});$('um-edit-actions').addEventListener('click',()=>{editMode='all';renderMatrix();});
  $('um-permissions-save').addEventListener('click',()=>{if(!allowed('user-management.manage-permissions'))return;const errors=model.validateDraft(draft);pending('um-draft-status','Permission management integration pending — changes not saved.'+(errors.length?' Resolve draft dependencies: '+errors.join('; '):''));});$('um-permissions-cancel').addEventListener('click',loadDraft);
  const departments=window.TAXIQAID_DEDICATED_AUTH?Object.entries(TaxiQaidAuthContract.DEPARTMENTS):['Operation','Fleet','Maintenance','Finance','HR','QHSE','IT','Customer Care','Financial','Quality'].map(name=>[name,name]);
  departments.forEach(([value,name])=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=value;input.name='um-departments';label.append(input,document.createTextNode(name));$('um-create-departments').append(label);});
  function accountType(){const driver=$('um-create-type').value==='Driver';$('um-create-iqama').disabled=!driver;$('um-create-iqama').required=driver;$('um-create-login').readOnly=driver;if(driver){$('um-create-login').value=$('um-create-iqama').value;$('um-create-role').value='Driver';}else if($('um-create-role').value==='Driver')$('um-create-role').value='';$('um-create-departments').querySelectorAll('input').forEach(input=>{input.disabled=driver;if(driver)input.checked=false;});$('um-create-login-note').textContent=driver?'Iqama is the proposed login identifier. The secure Supabase identity mapping is not configured.':window.TAXIQAID_DEDICATED_AUTH?'The stable username is privately linked to Supabase Auth. Secure provisioning is not connected.':'Existing management username-to-email authentication remains unchanged. Login identity provisioning is not configured.';}
  $('um-create-type').addEventListener('change',accountType);$('um-create-iqama').addEventListener('input',accountType);
  function openUser(user=null){
    if(!allowed(user?'user-management.edit-user':'user-management.create-user'))return;
    editingUser=user;$('um-user-form').reset();$('um-user-form').dataset.mode=user?'edit':'create';$('um-user-modal-title').textContent=user?'Edit User — Unsaved Preview':'Create User';$('um-create-submit').textContent=user?'Save Changes':'Create User';$('um-create-result').hidden=true;
    if(user){$('um-create-type').value=user['Account Type'];$('um-create-name').value=user['Display Name']||'';$('um-create-role').value=catalog.ROLE_TEMPLATES.includes(user.Role)?user.Role:'';$('um-create-login').value=user['Email / Login']||'';$('um-create-iqama').value=user['Driver Iqama']||'';$('um-create-status').value=user['Account Status'];}
    accountType();const member=user?.departments||[];$('um-create-departments').querySelectorAll('input').forEach(input=>input.checked=member.includes(input.value));openPreviewModal($('um-user-modal'));
  }
  $('um-create').addEventListener('click',()=>openUser());
  $('um-user-form').addEventListener('submit',event=>{
    event.preventDefault();if(!allowed(editingUser?'user-management.edit-user':'user-management.create-user'))return;
    if(editingUser&&$('um-create-status').value!==editingUser['Account Status']&&!allowed('user-management.change-status')){pending('um-create-result','Explicit account status permission is required.');return;}
    const driver=$('um-create-type').value==='Driver',role=$('um-create-role').value;
    if(!$('um-create-name').value.trim()||!$('um-create-login').value.trim()||driver&&!/^\d{10}$/.test($('um-create-iqama').value)||driver&&role!=='Driver'||!driver&&role==='Driver'){pending('um-create-result','Provide a valid account type, display name, login identifier and compatible proposed role.');return;}
    if(!driver&&!$('um-create-departments').querySelector('input:checked')){pending('um-create-result','Select at least one management department.');return;}
    pending('um-create-result',editingUser?'Account management integration pending — changes not saved.':'Account management integration pending — user not created.');
  });
  function openRequest(request=null){if(!allowed('user-management.profile-requests.view'))return;selectedRequest=request;$('um-request-detail').replaceChildren();requestColumns.forEach(key=>{const term=document.createElement('dt'),value=document.createElement('dd');term.textContent=key;value.textContent=request?.[key]||'Unavailable — integration pending';$('um-request-detail').append(term,value);});$('um-review-note').value='';$('um-review-result').hidden=true;openPreviewModal($('um-request-modal'));}
  $('um-request-preview').addEventListener('click',()=>openRequest());
  [['um-request-approve','driver-profile.approve'],['um-request-reject','driver-profile.reject']].forEach(([id,key])=>$(id).addEventListener('click',()=>{if(allowed(key))pending('um-review-result','Approval integration pending — request not updated.');}));
  $('um-refresh').addEventListener('click',()=>pending('um-draft-status','Account management integration pending — records not reloaded.'));
  TaxiQaidAccess.subscribe(()=>{users=[];requests=[];selectedUser=null;selectedRequest=null;editingUser=null;['um-request-modal','um-user-modal'].forEach(id=>{if($(id).style.display==='flex')closePreviewModal($(id));});$('um-request-detail').replaceChildren();$('um-review-note').value='';$('um-review-result').hidden=true;$('um-users-status').hidden=true;userSearch.clear();targetSearch.clear();requestSearch.clear();$('um-user-form').reset();renderUsers();renderRequests();loadDraft();});
  renderUsers();renderRequests();loadDraft();
  return Object.freeze({getDraft:()=>structuredClone(draft),
    setAuthorizedSnapshot(snapshot){
      const context=TaxiQaidAccess.getContext();if(snapshot.source!=='authorized-backend'||snapshot.subjectUid!==context?.uid||!TaxiQaidAccess.can('user-management.view'))throw new Error('Authorized User Management source required.');
      users=(snapshot.users||[]).map(user=>structuredClone(user));requests=TaxiQaidAccess.can('user-management.profile-requests.view')?(snapshot.profileRequests||[]).map(request=>structuredClone(request)):[];renderUsers();renderRequests();
    }
  });
})();
