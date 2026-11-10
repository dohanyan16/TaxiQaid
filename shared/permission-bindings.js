/** Stable selectors map real business controls to capabilities; local navigation/clear/cancel is excluded. */
const TaxiQaidPermissionBindings = (() => {
  const bindings=[];
  const bind=(selector,...keys)=>bindings.push({selector,keys});
  const map={
    'refresh-fleet-btn':'fleet.view','export-fleet-excel-btn':'fleet.export','edit-fleet-btn':'fleet.edit',
    'refresh-db-btn':'drivers.view','export-excel-btn':'drivers.export','edit-driver-btn':'drivers.edit',
    'refresh-tripchecks-btn':'tripcheck.view','open-add-tripcheck-modal':'tripcheck.create','save-tripcheck-btn':'tripcheck.create','tripcheck-edit-save':'tripcheck.edit','export-tripchecks-btn':'tripcheck.export','export-tripchecks-pdf-zip-btn':'tripcheck.generate-pdf','open-tripcheck-signature-btn':'tripcheck.sign','tc-confirm-signature-btn':'tripcheck.sign',
    'open-add-accident-modal':'accidents.create','refresh-accidents-btn':'accidents.view','export-accidents-date-btn':'accidents.export','delete-accident-btn':'accidents.delete',
    'requests-tab':'maintenance.requests.view','overview-tab':'maintenance.overview.view',
    'open-fuel-modal':'fuel.create','refresh-fuel-btn':'fuel.view','export-fuel-btn':'fuel.export','preview-fuel-details':'fuel.view','edit-fuel-preview':'fuel.edit',
    'ncr-scores-tab':'ncr.scores.view','ncr-tracker-tab':'ncr.records.view','open-ncr-modal':'ncr.create','preview-ncr-driver':'ncr.scores.view','preview-ncr-record':'ncr.records.view','edit-ncr-preview':'ncr.edit','delete-ncr-preview':'ncr.delete',
    'refresh-penalties-btn':'penalties.view','export-penalties-btn':'penalties.export',
    'training-overview-tab':'training.overview.view','training-sessions-tab':'training.sessions.view','training-attendance-tab':'training.attendance.view','training-create':'training.create-session','training-session-save':'training.create-session','training-select-drivers':'training.manage-enrollment','training-use-selection':'training.manage-enrollment',
    'deductions-balances-tab':'driver-deductions.view','deductions-expenses-tab':'driver-deductions.expenses.view','deductions-applied-tab':'driver-deductions.deductions.view','deductions-preview-history':'driver-deductions.view','deductions-add-expense':'driver-deductions.add-expense','expense-save':'driver-deductions.add-expense','deductions-apply':'driver-deductions.apply-deduction','deduction-save':'driver-deductions.apply-deduction',
    'care-open':'customer-care.create','care-edit':'customer-care.edit','care-preview':'customer-care.view','care-refresh':'customer-care.view','care-export':'customer-care.export','care-department':'customer-care.assign','care-assigned-to':'customer-care.assign',
    'helpdesk-create-tab':'helpdesk.create','helpdesk-submit':'helpdesk.create','helpdesk-save':'helpdesk.update-status','helpdesk-refresh':'helpdesk.view','helpdesk-preview':'helpdesk.view-department','helpdesk-manage-tab':'helpdesk.view-department','helpdesk-detail-status':'helpdesk.update-status',
    'appeals-preview':'driver-appeals.view','appeal-detail-department':'driver-appeals.assign','appeal-detail-classification':'driver-appeals.classify','appeal-detail-status':'driver-appeals.update-status',
    'roster-upload-day':'roster.import','roster-upload-night':'roster.import','roster-validate':'roster.import','roster-generate-all':'roster.generate-pdf','roster-download-zip':'roster.download-zip','roster-preview-pdf':'roster.generate-pdf','roster-download-pdf':'roster.download-pdf','roster-add-stop':'roster.manage-stops','roster-locations-add':'roster.manage-stops','roster-location-edit':'roster.manage-stops','roster-stop-save':'roster.manage-stops','roster-location-import':'roster.catalog-import','roster-catalog-apply':'roster.catalog-import','roster-location-export':'roster.catalog-export','roster-whatsapp-settings':'roster.whatsapp-config','roster-whatsapp-send':'roster.whatsapp-send',
    'um-users-tab':'user-management.view','um-access-tab':'user-management.manage-permissions','um-requests-tab':'user-management.profile-requests.view','um-request-preview':'user-management.profile-requests.view','um-edit-modules':'user-management.manage-permissions','um-edit-actions':'user-management.manage-permissions','um-create':'user-management.create-user','um-refresh':'user-management.view','um-permissions-save':'user-management.manage-permissions','um-request-approve':'driver-profile.approve','um-request-reject':'driver-profile.reject'
  };
  Object.entries(map).forEach(([id,key])=>bind('#'+id,key));
  function pending(scope,attribute,keys){keys.forEach((key,index)=>bindings.push({selector:scope+' ['+attribute+']',pickIndex:index,keys:[key]}));}
  // These attribute/position selectors are confined to stable action rows, not translated button labels.
  bind('#view-breakdowns [data-open="breakdown-modal"]','breakdowns.create');
  pending('#view-breakdowns .button-group-row','data-pending',['breakdowns.view','breakdowns.export']);
  pending('#breakdown-modal .button-group-row','data-pending',[()=>[document.getElementById('bdw-breakdown-id').value?'breakdowns.edit':'breakdowns.create',...(document.getElementById('bdw-send-to-maintenance').value==='Yes'?['breakdowns.send-maintenance']:[])],'breakdowns.delete']);
  for(const [panel,view,exportKey] of [['#requests-panel','maintenance.requests.view','maintenance.requests.export'],['#overview-panel','maintenance.overview.view','maintenance.export']])pending(panel+' .button-group-row','data-pending',[view,exportKey]);
  bind('[data-open="acceptance-modal"]','maintenance.accept');bind('#acceptance-modal [data-pending]',()=>document.getElementById('workorder-maintenance-id').value?'maintenance.edit':'maintenance.accept');bind('[data-open="request-modal"]','maintenance.requests.view');bind('#request-modal [data-pending]','maintenance.requests.edit');bind('#request-request-status','maintenance.requests.edit');
  pending('#ncr-scores-panel .button-group-row','data-ncr-pending',['ncr.scores.view','ncr.scores.export']);pending('#ncr-tracker-panel .button-group-row','data-ncr-pending',['ncr.records.view','ncr.export']);
  for(const panel of ['#training-overview-panel','#training-sessions-panel','#training-attendance-panel'])pending(panel+' .button-group-row','data-people-pending',[{'#training-overview-panel':'training.overview.view','#training-sessions-panel':'training.sessions.view','#training-attendance-panel':'training.attendance.view'}[panel],'training.export']);
  for(const panel of ['#deductions-balances-panel','#deductions-expenses-panel','#deductions-applied-panel'])pending(panel+' .button-group-row','data-people-pending',[{'#deductions-balances-panel':'driver-deductions.view','#deductions-expenses-panel':'driver-deductions.expenses.view','#deductions-applied-panel':'driver-deductions.deductions.view'}[panel],'driver-deductions.export']);
  pending('#view-driver-appeals .button-group-row','data-people-pending',['driver-appeals.view','driver-appeals.export']);
  bind('#appeals-save',()=>{const form=document.getElementById('appeals-form');return ['driver-appeals.view',...[...form.querySelectorAll('select')].filter(select=>!select.disabled&&select.value!==select.dataset.originalValue).map(select=>({'appeal-detail-department':'driver-appeals.assign','appeal-detail-classification':'driver-appeals.classify','appeal-detail-status':'driver-appeals.update-status'}[select.id]))];});
  bind('#add-acc-maintenance','accidents.send-maintenance');bind('#bdw-send-to-maintenance','breakdowns.send-maintenance');
  bind('#care-status',()=>document.getElementById('care-status').value==='Closed'?'customer-care.close':'customer-care.edit');
  bind('#um-create-submit',()=>document.getElementById('um-user-form').dataset.mode==='edit'?'user-management.edit-user':'user-management.create-user');
  bind('#roster-manage-stops','roster.manage-stops');bind('#roster-day-file,#roster-night-file','roster.import');bind('#roster-pdf-open','roster.download-pdf');bind('#roster-whatsapp','roster.view');bind('#roster-whatsapp-modal input,#roster-whatsapp-settings-modal input','roster.whatsapp-config');
  bind('#training-drivers-table input,#training-select-filtered,#training-deselect-all,#training-selected-table button','training.manage-enrollment');
  bind('#care-save',()=>document.getElementById('care-id').value?'customer-care.edit':'customer-care.create');
  const accidentWrite=()=>[document.getElementById('add-acc-id').value?'accidents.edit':'accidents.create',...(document.getElementById('add-acc-maintenance').value==='Yes'?['accidents.send-maintenance']:[])];
  bind('#save-accident-btn',accidentWrite);
  bind('#save-fuel-btn',()=>document.getElementById('fuel-record-id').value?'fuel.edit':'fuel.create');
  bind('#save-ncr-btn',()=>document.getElementById('ncr-id')?.value?'ncr.edit':'ncr.create');
  const panels={'#requests-panel':'maintenance.requests.view','#overview-panel':'maintenance.overview.view','#ncr-scores-panel':'ncr.scores.view','#ncr-tracker-panel':'ncr.records.view','#training-overview-panel':'training.overview.view','#training-sessions-panel':'training.sessions.view','#training-attendance-panel':'training.attendance.view','#deductions-expenses-panel':'driver-deductions.expenses.view','#deductions-applied-panel':'driver-deductions.deductions.view','#helpdesk-create-panel':'helpdesk.create','#helpdesk-manage-panel':'helpdesk.view-department','#um-access-panel':'user-management.manage-permissions','#um-requests-panel':'user-management.profile-requests.view'};
  Object.entries(panels).forEach(([selector,key])=>bind(selector,key));
  const modals={'#add-accident-modal':'accidents.view','#breakdown-modal':'breakdowns.view','#request-modal':'maintenance.requests.view','#acceptance-modal':'maintenance.view','#fuel-modal':'fuel.view','#ncr-modal':'ncr.records.view','#ncr-driver-modal':'ncr.scores.view','#training-session-modal':'training.sessions.view','#training-drivers-modal':'training.manage-enrollment','#deductions-expense-modal':'driver-deductions.expenses.view','#deductions-apply-modal':'driver-deductions.deductions.view','#deductions-history-modal':'driver-deductions.view','#care-modal':'customer-care.view','#helpdesk-details-modal':'helpdesk.view-department','#appeals-modal':'driver-appeals.view','#roster-stop-modal':'roster.manage-stops','#roster-catalog-modal':'roster.catalog-import','#roster-pdf-modal':'roster.download-pdf','#roster-whatsapp-modal':'roster.view','#roster-whatsapp-settings-modal':'roster.whatsapp-config','#roster-recipients-modal':'roster.view','#um-user-modal':'user-management.view','#um-request-modal':'user-management.profile-requests.view'};
  Object.entries(modals).forEach(([selector,key])=>bind(selector,key));
  bind('#add-accident-form',accidentWrite);bind('#add-tripcheck-form','tripcheck.create');bind('#tripcheck-edit-form','tripcheck.edit');bind('#roster-stop-form','roster.manage-stops');bind('#roster-location-file','roster.catalog-import');
  const rowViews={'#care-table button':'customer-care.view','#helpdesk-table button':'helpdesk.view','#appeals-table button':'driver-appeals.view','#penalties-table button':'penalties.view','#roster-daily-table button':'roster.view','#roster-weekly-table button':'roster.view'};
  Object.entries(rowViews).forEach(([selector,key])=>bind(selector,key));
  function resource(element){return ['helpdesk-save','helpdesk-detail-status','helpdesk-details-modal'].includes(element.id)?{assignedDepartment:document.getElementById('helpdesk-detail-assigned-department').value}:{};}
  function keysFor(element){return (element._taxiqaidPermissionKeys||[]).flatMap(key=>typeof key==='function'?key():key);}
  function reconcile() {
    for(const module of TaxiQaidPermissionCatalog.MODULES) {
      document.querySelectorAll('[data-view="'+module.view+'"] a,#view-'+module.view).forEach(element=>{element._taxiqaidPermissionKeys=[module.id+'.view'];});
    }
    bindings.forEach(binding=>document.querySelectorAll(binding.selector).forEach((element,index)=>{if(binding.pickIndex===undefined||binding.pickIndex===index)element._taxiqaidPermissionKeys=binding.keys;}));
    document.querySelectorAll('[data-um-capability]').forEach(element=>{element._taxiqaidPermissionKeys=[element.dataset.umCapability];});
    const context=TaxiQaidAccess.getContext();
    document.querySelectorAll('[data-permission-bound]').forEach(element=>{if(!element._taxiqaidPermissionKeys)delete element.dataset.permissionBound;});
    const elements=[...document.querySelectorAll('button,select,input,a,form,.view-section,[role=tabpanel],.modal-overlay')].filter(element=>element._taxiqaidPermissionKeys);
    elements.forEach(element=>{
      const keys=keysFor(element);element.dataset.permissionBound=keys.join(' ');
      const denied=Boolean(context?.verified&&!keys.every(key=>TaxiQaidAccess.can(key,resource(element))));
      element.toggleAttribute('data-permission-denied',denied);
      if(element.matches('button,select,input,a')){element.inert=denied;if(denied)element.setAttribute('aria-disabled','true');else element.removeAttribute('aria-disabled');}
    });
    // Only a verified Driver context invokes driver routing; legacy management admission stays separate.
    document.getElementById('erp-app').hidden=context?.accountType==='Driver';
    if(context?.accountType==='Management') {
      const active=document.querySelector('.sidebar-menu li.active[data-view] a');
      if(active?.hasAttribute('data-permission-denied'))document.querySelector('.sidebar-menu li[data-view] a:not([data-permission-denied])')?.click();
    }
  }
  let queued=false;
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;reconcile();});}
  ['click','keydown','change','submit'].forEach(type=>document.addEventListener(type,event=>{
    if(type==='keydown'&&['Tab','Escape'].includes(event.key))return;
    const element=event.target.closest?.('[data-permission-bound]');
    if(TaxiQaidAccess.getContext()?.verified&&element&&!keysFor(element).every(key=>TaxiQaidAccess.can(key,resource(element)))){event.preventDefault();event.stopImmediatePropagation();}
  },true));
  TaxiQaidAccess.subscribe(schedule);
  new MutationObserver(schedule).observe(document.getElementById('workspace'),{childList:true,subtree:true});
  schedule();return Object.freeze({bindings,reconcile});
})();
