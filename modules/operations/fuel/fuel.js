/** Fuel Tracker: unsaved form previews only; no transport, tariffs or record storage. */
(() => {
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

  function updateFuelTotal() {
    const outside = fueledIn.value === 'Outside Depot';
    const liters = received.valueAsNumber;
    const unitPrice = price.valueAsNumber;
    received.setCustomValidity(received.value !== '' && !(Number.isFinite(liters) && liters > 0)
      ? 'Enter a fuel quantity greater than zero.' : '');
    price.setCustomValidity(outside && price.value !== '' && !(Number.isFinite(unitPrice) && unitPrice > 0)
      ? 'Enter a fuel price greater than zero in SAR/L.' : '');
    location.setCustomValidity(outside && !location.value.trim() ? 'Enter the Outside Depot Location.' : '');
    if (!outside) {
      total.value = 'Unavailable — Depot tariff not configured';
      return;
    }
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
    price.placeholder = outside ? 'Enter price in SAR/L' : 'Depot tariff not configured';
    document.getElementById('fuel-price-note').textContent = outside
      ? 'Enter the price used at fueling in SAR/L. Outside Depot Location and price are required.'
      : 'Depot pricing will come from a future configured tariff. No tariff is connected.';
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
    // Discard manual pricing when switching mode; it must never become a Depot tariff.
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
