/** Stable operational capabilities. Labels are presentation; keys are future backend contracts. */
const TaxiQaidPermissionCatalog = (() => {
  const modules=[];
  function add(id,label,actions,view=id,scope='authorized-records') {
    const list=[{key:id+'.view',label:'View Module',audience:'Management',scope,requires:[]}];
    actions.forEach(item=>{
      const [suffix,title,extra={}]=item;
      list.push({key:extra.key||id+'.'+suffix,label:title,audience:extra.audience||'Management',scope:extra.scope||scope,
        ...extra,requires:[id+'.view',...(extra.requires||[])]});
    });
    modules.push({id,label,view,permissions:list});
  }
  add('dashboard','Dashboard',[]);
  add('fleet','Fleet Management',[['edit','Edit / Save Vehicle Details'],['export','Export Fleet']]);
  add('drivers','Drivers Management',[['edit','Edit / Save Driver Details'],['export','Export Drivers']]);
  add('tripcheck','Trip Check',[['create','Create / Save Inspection'],['edit','Edit / Save Inspection'],['sign','Confirm Inspection Signature'],['export','Export Excel'],['generate-pdf','Generate / Download Filtered PDFs']]);
  add('accidents','Accident Tracker',[['create','Create / Save Accident'],['edit','Edit / Save Accident'],['delete','Delete Accident'],['export','Export Accidents'],['send-maintenance','Request Maintenance']]);
  add('breakdowns','Breakdown Tracker',[['create','Create / Save Breakdown'],['edit','Edit / Save Breakdown'],['delete','Delete Breakdown'],['export','Export Breakdowns'],['send-maintenance','Request Maintenance']]);
  add('maintenance','Maintenance Tracker',[['requests.view','View Maintenance Requests'],['requests.edit','Update Request Status',{requires:['maintenance.requests.view']}],['requests.export','Export Requests',{requires:['maintenance.requests.view']}],['accept','Accept / Assign Work Order',{requires:['maintenance.requests.view']}],['overview.view','View Work Orders'],['edit','Edit / Save Work Order',{requires:['maintenance.overview.view']}],['export','Export Work Orders',{requires:['maintenance.overview.view']}]]);
  add('fuel','Fuel Tracker',[['create','Create / Save Fuel Record'],['edit','Edit / Save Fuel Record'],['export','Export Fuel Records']]);
  add('ncr','NCR Tracker',[['scores.view','View Driver Scores'],['records.view','View NCR Records'],['create','Create / Save NCR',{requires:['ncr.records.view']}],['edit','Edit / Save NCR',{requires:['ncr.records.view']}],['delete','Delete NCR',{requires:['ncr.records.view']}],['export','Export NCRs',{requires:['ncr.records.view']}],['scores.export','Export Driver Scores',{requires:['ncr.scores.view']}]]);
  add('penalties','Penalties Tracker',[['export','Export Authorized Penalties']]);
  add('training','Training Tracker',[['overview.view','View Compliance'],['sessions.view','View Sessions'],['attendance.view','View Attendance'],['create-session','Create / Save Training Session',{requires:['training.sessions.view']}],['manage-enrollment','Assign / Remove Session Drivers',{requires:['training.sessions.view']}],['verify-attendance','Verify Attendance',{requires:['training.attendance.view']}],['export','Export Full Training Reports']]);
  add('customer-care','Customer Care Tracker',[['create','Create / Save Case'],['edit','Edit / Save Case'],['assign','Assign / Reassign Case'],['close','Close Case'],['export','Export Authorized Cases']]);
  add('driver-deductions','Drivers Deduction',[['expenses.view','View Driver Expenses'],['deductions.view','View Applied Deductions'],['add-expense','Add Authorized Expense',{requires:['driver-deductions.expenses.view']}],['apply-deduction','Apply Deduction',{requires:['driver-deductions.deductions.view']}],['approve-reversal','Approve Financial Reversal / Adjustment'],['export','Export Financial Records']]);
  add('driver-appeals','Driver Appeals',[['assign','Assign / Reassign Department'],['classify','Classify Appeal Type'],['update-status','Update / Resolve Appeal'],['export','Export Appeals']]);
  add('helpdesk','Helpdesk',[['create','Create Ticket'],['view-department','View Assigned Department Tickets',{scope:'department'}],['view-all','View Explicitly Authorized Departments',{scope:'authorized-departments'}],['update-status','Update / Resolve Ticket',{scope:'department'}]]);
  add('roster','Roster Management',[['import','Import / Validate Roster'],['generate-pdf','Generate Personal / All PDFs'],['download-pdf','View / Download Personal PDF'],['download-zip','Download Company ZIP'],['manage-stops','Add / Edit Stops'],['catalog-import','Import Location Catalog'],['catalog-export','Export Location Catalog'],['whatsapp-config','Manage Delivery Configuration'],['whatsapp-send','Send Personal WhatsApp Schedules']]);
  add('driver-portal','Driver Portal Preview',[
    ['preview','Preview Authorized Driver',{scope:'selected-driver'}],['preview-documents','Preview Assigned Documents',{scope:'selected-document',requires:['driver-portal.preview']}],['preview-schedule','Preview Published Schedule',{scope:'selected-driver',requires:['driver-portal.preview']}],['preview-download','Download Preview Personal PDF',{scope:'selected-driver',requires:['driver-portal.preview-schedule']}],
    ['request-changes','Request Name / Phone Changes',{audience:'Driver',scope:'own-driver'}],['files.view','View Own Assigned Files',{audience:'Driver',scope:'own-driver'}],['sign','Confirm & Sign Own Document',{audience:'Driver',scope:'own-document',requires:['driver-portal.files.view']}],['schedule.view','View Own Published Schedule',{audience:'Driver',scope:'own-driver'}],['schedule.download','Download Own Weekly PDF',{audience:'Driver',scope:'own-driver',requires:['driver-portal.schedule.view']}],['submit-appeal','Submit Own Appeal',{audience:'Driver',scope:'own-driver'}]
  ],'driver-portal-preview');
  // View Module applies to both account types; self-service and preview actions never share audiences.
  modules.at(-1).permissions[0].audience='Both';
  add('user-management','User Management',[['create-user','Create Account'],['edit-user','Edit Account / Role / Departments'],['change-status','Enable / Disable Account'],['manage-permissions','Edit / Save Permissions'],['profile-requests.view','View Driver Profile Requests'],['profile-approve','Approve Driver Profile Change',{key:'driver-profile.approve',requires:['user-management.profile-requests.view']}],['profile-reject','Reject Driver Profile Change',{key:'driver-profile.reject',requires:['user-management.profile-requests.view']}]]);
  modules.forEach(module=>{module.permissions.forEach(permission=>{Object.freeze(permission.requires);Object.freeze(permission);});Object.freeze(module.permissions);Object.freeze(module);});
  const MODULES=Object.freeze(modules),ALL=Object.freeze(modules.flatMap(module=>module.permissions.map(permission=>Object.freeze({...permission,module:module.id}))));
  const BY_KEY=Object.freeze(Object.fromEntries(ALL.map(permission=>[permission.key,permission])));
  const ROLE_TEMPLATES=Object.freeze(['Super Administrator','Administrator','Department Manager','Supervisor','Staff','Driver']);
  return Object.freeze({MODULES,ALL,BY_KEY,ROLE_TEMPLATES});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidPermissionCatalog;
