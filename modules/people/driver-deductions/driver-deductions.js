/** Read-only financial snapshots and unsaved forms. No financial writes or source imports. */
const TaxiQaidDeductionsPreview = (() => {
  const $=id=>document.getElementById(id),ui=TaxiQaidPeopleUI,policy=TaxiQaidDeductionsPolicy;
  ui.tabs($('view-driver-deductions'));
  let drivers=[],expenses=[],deductions=[],selectedDriver='',selectedExpense=null,complete=false;
  const eligible=record=>record.authorized===true&&record.posted===true&&record.disputed!==true&&record.reversed!==true;
  const money=value=>{try{return policy.format(policy.cents(value));}catch{return 'Unavailable';}};
  const balancesSearch=setupSearchDropdown({input:'deductions-balances-search',config:'driverBalances',getData:()=>drivers,apply:render});
  const expensesSearch=setupSearchDropdown({input:'deductions-expenses-search',config:'driverExpenses',getData:()=>expenses,apply:render});
  const appliedSearch=setupSearchDropdown({input:'deductions-applied-search',config:'appliedDeductions',getData:()=>deductions,apply:render});
  ui.driverSearch('expense-iqama','expense-name');
  ui.driverSearch('deduction-iqama','deduction-name',record=>{
    selectedDriver=record?String(TaxiQaidSearch.read(record,TaxiQaidSearch.CONFIG.drivers.fields[0])):'';populateExpenses();
  });
  const expenseColumns=['Expense Reference','Date','Driver Iqama','Driver Name','Source Type','Source Reference','Description',record=>money(record['Original Amount (SAR)']),record=>money(record['Amount Deducted (SAR)']),record=>money(record['Outstanding Amount (SAR)']),'Status'];
  const appliedColumns=['Deduction Reference','Date','Driver Iqama','Driver Name','Related Expense',record=>money(record['Deduction Amount (SAR)']),record=>money(record['Remaining Outstanding (SAR)']),'Deduction Method','Applied By','Remarks'];
  function draw(id,records,columns,onOpen) {ui.table(id,records,columns,onOpen);$(id+'-count').textContent=`${records.length} records found`;}
  function render() {
    const balances=drivers.map(driver=>{
      const id=driver['Driver Iqama'];
      try {
        if(!complete)throw new Error('Complete authorized financial history is required.');
        const result=policy.balance(expenses.filter(item=>item['Driver Iqama']===id).map(item=>({...item,amount:item['Original Amount (SAR)']})),deductions.filter(item=>item['Driver Iqama']===id).map(item=>({...item,amount:item['Deduction Amount (SAR)']})));
        return {...driver,charged:policy.format(result.charged),deducted:policy.format(result.deducted),balance:policy.format(result.outstanding)};
      }catch{return {...driver,charged:'Unavailable',deducted:'Unavailable',balance:'Unavailable'};}
    });
    draw('deductions-balances-table',balances.filter(record=>balancesSearch.matches(record)),['Driver Iqama','Driver Name','charged','deducted','balance'],openHistory);
    draw('deductions-expenses-table',expenses.filter(record=>expensesSearch.matches(record)),expenseColumns);
    draw('deductions-applied-table',deductions.filter(record=>appliedSearch.matches(record)),appliedColumns);
  }
  function openHistory(driver=null) {
    $('deductions-history-iqama').value=driver?.['Driver Iqama']||'';$('deductions-history-name').value=driver?.['Driver Name']||'';
    const id=driver?.['Driver Iqama'];
    draw('deductions-history-expenses',id?expenses.filter(item=>item['Driver Iqama']===id):[],expenseColumns);
    draw('deductions-history-applied',id?deductions.filter(item=>item['Driver Iqama']===id):[],appliedColumns);
    openPreviewModal($('deductions-history-modal'));
  }
  $('deductions-preview-history').addEventListener('click',()=>openHistory());
  function populateExpenses() {
    const select=$('deduction-expense');select.replaceChildren(new Option('Select an authorized outstanding expense',''));
    expenses.filter(item=>item['Driver Iqama']===selectedDriver&&eligible(item)).forEach(item=>{
      try {if(policy.cents(item['Outstanding Amount (SAR)'])>0)select.add(new Option(`${item['Expense Reference']} · ${money(item['Outstanding Amount (SAR)'])} SAR`,item['Expense Reference']));}catch{/* Invalid source amounts remain unavailable. */}
    });selectExpense();
  }
  function selectExpense() {
    selectedExpense=expenses.find(item=>item['Expense Reference']===$('deduction-expense').value&&item['Driver Iqama']===selectedDriver&&eligible(item))||null;
    [['deduction-original','Original Amount (SAR)'],['deduction-previous','Amount Deducted (SAR)'],['deduction-outstanding','Outstanding Amount (SAR)']].forEach(([id,key])=>{$(id).value=selectedExpense?money(selectedExpense[key]):'';});
    updateCalculation();
  }
  function updateCalculation() {
    const amount=$('deduction-amount');amount.setCustomValidity('');
    $('deduction-remaining').textContent='Unavailable — select an expense and enter a valid deduction';$('deduction-validation').textContent='';
    if(!selectedExpense||!amount.value)return;
    try {
      const result=policy.preview(selectedExpense['Original Amount (SAR)'],selectedExpense['Amount Deducted (SAR)'],amount.value);
      if(result.outstanding!==policy.cents(selectedExpense['Outstanding Amount (SAR)']))throw new Error('Source balance is inconsistent. An authorized refresh is required.');
      $('deduction-remaining').textContent=policy.format(result.remaining)+' SAR';
    }catch(error){amount.setCustomValidity(error.message);$('deduction-validation').textContent=error.message;}
  }
  ['expense-amount','deduction-amount'].forEach(id=>$(id).addEventListener('blur',()=>{
    try {$(id).value=policy.format(policy.cents($(id).value,{positive:true}));}catch{/* Invalid input remains visible for validation. */}
    if(id==='deduction-amount')updateCalculation();
  }));
  $('deduction-expense').addEventListener('change',selectExpense);$('deduction-amount').addEventListener('input',updateCalculation);
  $('expense-source').addEventListener('change',()=>{$('expense-source-reference').required=Boolean($('expense-source').value&&$('expense-source').value!=='Manual Expense');});
  $('deductions-add-expense').addEventListener('click',()=>{$('deductions-expense-form').reset();$('expense-amount').setCustomValidity('');$('expense-source-reference').required=false;$('expense-save-status').hidden=true;});
  $('deductions-apply').addEventListener('click',()=>{$('deductions-apply-form').reset();selectedDriver='';populateExpenses();$('deduction-save-status').hidden=true;});
  function saveExpense() {
    const amount=$('expense-amount');amount.setCustomValidity('');
    try {policy.expense($('expense-source').value,amount.value,$('expense-source-reference').value);}catch(error){amount.setCustomValidity(error.message);}
    const valid=$('deductions-expense-form').reportValidity();
    $('expense-save-status').hidden=false;$('expense-save-status').textContent=valid?'Database integration pending — expense not saved. Driver identity, source liability and permissions require backend validation.':'Review the highlighted preview fields. Database integration pending — expense not saved.';
  }
  function saveDeduction() {
    updateCalculation();const valid=$('deductions-apply-form').reportValidity();
    $('deduction-save-status').hidden=false;$('deduction-save-status').textContent=valid?'Database integration pending — deduction not applied.':'Review the highlighted preview fields. Database integration pending — deduction not applied.';
  }
  $('expense-save').addEventListener('click',saveExpense);$('deduction-save').addEventListener('click',saveDeduction);
  $('deductions-expense-form').addEventListener('submit',event=>{event.preventDefault();saveExpense();});
  $('deductions-apply-form').addEventListener('submit',event=>{event.preventDefault();saveDeduction();});
  return Object.freeze({setSnapshot(snapshot){complete=snapshot.complete===true;drivers=(snapshot.drivers||[]).map(record=>({...record}));expenses=(snapshot.expenses||[]).map(record=>({...record}));deductions=(snapshot.deductions||[]).map(record=>({...record}));render();populateExpenses();}});
})();
