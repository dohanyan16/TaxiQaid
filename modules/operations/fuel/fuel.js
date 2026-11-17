/** Approved frontend tariff; transaction prices must be preserved by the future backend. */
const TAXIQAID_DEPOT_FUEL_PRICE_SAR_PER_LITER = 2.18;

/** Fuel Tracker: unsaved form previews only; no transport or record storage. */
(() => {
  setupSearchDropdown({input:'fuel-search-input',config:'fuel'});
  const modal = document.getElementById('fuel-modal');
  const form = document.getElementById('fuel-form');
  const fueledIn = document.getElementById('fuel-fueled-in');
  const location = document.getElementById('fuel-outside-location');
  const received = document.getElementById('fuel-received');
  const price = document.getElementById('fuel-price');
  const total = document.getElementById('fuel-total');
  const title = document.getElementById('fuel-modal-title');
  const save = document.getElementById('save-fuel-btn');
  const edit = document.getElementById('edit-fuel-preview');
  const validation = document.getElementById('fuel-validation');
  const editableInputs = ['fuel-date', 'fuel-time', 'fuel-plate', 'fuel-iqama',
    'fuel-fueled-in', 'fuel-outside-location', 'fuel-received', 'fuel-price']
    .map(id => document.getElementById(id));
  let detailsOnly = false;
  let refreshSerial=0;
  const refStatus=document.createElement('p'),refReload=document.createElement('button');
  refStatus.id='fuel-references-status';refStatus.className='preview-note';refStatus.setAttribute('role','status');
  refReload.type='button';refReload.className='btn-secondary';refReload.textContent='Reload drivers and vehicles';
  modal.querySelector('#fuel-preview-note').after(refStatus,refReload);
  async function loadFuelReferences(){
    const current=++refreshSerial;
    const plate=document.getElementById('fuel-plate'),iqama=document.getElementById('fuel-iqama');
    refStatus.textContent='Loading Fleet vehicles and Drivers from authorized Google Sheets…';
    refReload.disabled=true;
    try{
      if(typeof TaxiQaidReferenceBindings==='undefined')throw new Error('Reference module unavailable.');
      await TaxiQaidReferenceBindings.enter('fuel');
      if(current!==refreshSerial||TaxiQaidModules.current()!=='fuel')return;
      const vehicles=[...plate.options].filter(o=>o.value).length,drivers=[...iqama.options].filter(o=>o.value).length;
      refStatus.textContent=vehicles&&drivers
        ? vehicles+' Fleet vehicles and '+drivers+' Drivers available. Search or select an option.'
        : 'References unavailable for '+(!vehicles&&!drivers?'Fleet and Drivers':!vehicles?'Fleet':'Drivers')+'. Use Reload drivers and vehicles.';
      if(typeof TaxiQaidSelectUI!=='undefined')TaxiQaidSelectUI.sync(modal);
    }catch{
      if(current===refreshSerial)refStatus.textContent='Unable to load authorized Fleet/Drivers references. Retry using Reload drivers and vehicles.';
    }finally{if(current===refreshSerial)refReload.disabled=false;}
  }
  refReload.addEventListener('click',()=>{void loadFuelReferences();});

  function updateFuelTotal() {
    const outside = fueledIn.value === 'Outside Depot';
    const liters = received.valueAsNumber;
    const unitPrice = price.valueAsNumber;
    received.setCustomValidity(received.value !== '' && !(Number.isFinite(liters) && liters > 0)
      ? 'Enter a fuel quantity greater than zero.' : '');
    price.setCustomValidity(outside && price.value !== '' && !(Number.isFinite(unitPrice) && unitPrice > 0)
      ? 'Enter a fuel price greater than zero in SAR/L.' : '');
    location.setCustomValidity(outside && !location.value.trim() ? 'Enter the Outside Depot Location.' : '');
    const amount = liters * unitPrice;
    total.value = received.validity.valid && price.validity.valid && liters > 0 && unitPrice > 0 && Number.isFinite(amount)
      ? `SAR ${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false})}` : 'Unavailable — enter valid fuel quantity and price';
  }

  function updateFuelFields() {
    const outside = fueledIn.value === 'Outside Depot';
    location.disabled = detailsOnly || !outside;
    location.required = outside;
    price.readOnly = detailsOnly || !outside;
    price.required = outside;
    if (!outside) {
      price.value = TAXIQAID_DEPOT_FUEL_PRICE_SAR_PER_LITER.toFixed(2);
      location.value = '';
    }
    price.placeholder = outside ? 'Enter price in SAR/L' : '';
    document.getElementById('fuel-price-note').textContent = outside
      ? 'Enter the price used at fueling in SAR/L. Outside Depot Location and price are required.'
      : `Approved Depot tariff: ${TAXIQAID_DEPOT_FUEL_PRICE_SAR_PER_LITER.toFixed(2)} SAR/L. Future records must preserve the price used at fueling.`;
    updateFuelTotal();
  }

  function setPreviewMode(mode) {
    detailsOnly = mode === 'details';
    editableInputs.forEach(input => { input.disabled = detailsOnly; });
    title.textContent = detailsOnly ? 'Fuel Record Details — Empty Preview'
      : mode === 'edit' ? 'Edit Fuel Record — Preview' : 'Add Fuel Record';
    save.hidden = detailsOnly;
    edit.hidden = !detailsOnly;
    save.textContent = mode === 'edit' ? 'Save Changes' : 'Save Fuel Record';
    updateFuelFields();
  }

  function openFuelPreview(mode) {
    form.reset();
    validation.hidden = true;
    setPreviewMode(mode);
    openPreviewModal(modal);
    void loadFuelReferences();
  }

  function previewSave() {
    updateFuelTotal();
    validation.hidden = form.reportValidity();
    showIntegrationPending();
  }

  document.getElementById('open-fuel-modal').addEventListener('click', () => openFuelPreview('add'));
  document.getElementById('preview-fuel-details').addEventListener('click', () => openFuelPreview('details'));
  edit.addEventListener('click', () => { setPreviewMode('edit'); document.getElementById('fuel-date').focus(); });
  document.getElementById('close-fuel-modal').addEventListener('click', () => closePreviewModal(modal));
  fueledIn.addEventListener('change', () => {
    // Clear the previous mode's price before applying the approved Depot tariff or manual entry.
    price.value = '';
    if (fueledIn.value === 'Depot') location.value = '';
    updateFuelFields();
  });
  [received, price, location].forEach(input => input.addEventListener('input', updateFuelTotal));
  save.addEventListener('click', previewSave);
  form.addEventListener('submit', event => { event.preventDefault(); previewSave(); });
  ['refresh-fuel-btn', 'export-fuel-btn'].forEach(id => document.getElementById(id).addEventListener('click', showIntegrationPending));
  updateFuelFields();
})();
