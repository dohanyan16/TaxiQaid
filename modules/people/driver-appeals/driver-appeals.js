/** Appeals arrive only from a future authorized source. Administrative drafts are never saved. */
const TaxiQaidAppealsPreview = (() => {
  const $ = id=>document.getElementById(id), policy=TaxiQaidAppealsPolicy;
  const columns=['Appeal ID','Driver Name','Driver Iqama','Nationality','Appeal Type','Description','Status','Department'];
  let records=[];
  const search=setupSearchDropdown({input:'appeals-search',config:'appeals',getData:()=>records,apply:render});
  function render() {
    const start=$('appeals-start').value,end=$('appeals-end').value;
    $('appeals-date-error').hidden=!(start&&end&&start>end);
    const filtered=records.filter(record=>search.matches(record)&&policy.matches(record,{start,end,
      type:$('appeals-type').value,department:$('appeals-department').value,status:$('appeals-status').value}));
    TaxiQaidPeopleUI.table('appeals-table',filtered,columns,openDetails);
    $('appeals-table-count').textContent=`${filtered.length} records found`;
  }
  function openDetails(record=null) {
    $('appeals-form').reset(); $('appeals-save-status').hidden=true;
    $('appeals-modal').querySelector('h2').textContent=record?'Appeal Details':'Appeal Details — Empty Preview';
    $('appeals-form').querySelectorAll('[readonly]').forEach(input=>{
      const label=input.closest('.form-group').querySelector('label').textContent;
      input.value=record?String(record[label]??''):'';
    });
    $('appeal-detail-status').value=record?.Status || 'Pending';
    $('appeal-detail-department').value=record?.Department || 'Pending';
    openPreviewModal($('appeals-modal'));
  }
  $('appeals-preview').addEventListener('click',()=>openDetails());
  ['appeals-start','appeals-end','appeals-type','appeals-department','appeals-status'].forEach(id=>$(id).addEventListener('change',render));
  $('appeals-save').addEventListener('click',()=>{
    policy.assignment($('appeal-detail-status').value,$('appeal-detail-department').value);
    $('appeals-save-status').hidden=false;
  });
  $('appeals-form').addEventListener('submit',event=>{event.preventDefault();$('appeals-save').click();});
  return Object.freeze({setRecords(snapshot){records=snapshot.map(record=>({...record}));render();},openDetails});
})();
