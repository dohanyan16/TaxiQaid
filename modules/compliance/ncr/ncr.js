/** NCR frontend previews. No driver/NCR records, persistence or network requests. */
(() => {
  const policy = TaxiQaidNcrPolicy;
  const tabs = [...document.querySelectorAll('#view-ncr [role=tab]')];
  function selectTab(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index];
      selectTab(next); next.focus();
    });
  });

  const modal = document.getElementById('ncr-modal');
  const form = document.getElementById('ncr-form');
  const date = document.getElementById('ncr-date');
  const category = document.getElementById('ncr-category');
  const tbtDate = document.getElementById('ncr-tbt-date');
  const score = document.getElementById('ncr-score');
  const expiry = document.getElementById('ncr-expiry-date');
  const status = document.getElementById('ncr-expiry-status');
  const calculationStatus = document.getElementById('ncr-calculation-status');
  const saveStatus = document.getElementById('ncr-save-status');
  let lastPreviewDate = '';
  policy.CATEGORIES.forEach(item => category.add(new Option(`${item.label} (${item.penalty} pt)`, item.key)));

  function updatePreview() {
    lastPreviewDate = policy.getKsaDate(new Date());
    score.value = category.value ? `${policy.getCategoryPenalty(category.value)} pt` : '';
    score.classList.toggle('ncr-score-negative', Boolean(category.value));
    try {
      document.getElementById('ncr-tbt-status').value = policy.getTbtStatus(tbtDate.value);
      tbtDate.setCustomValidity('');
    } catch (error) {
      document.getElementById('ncr-tbt-status').value = 'Unresolved — invalid TBT date';
      tbtDate.setCustomValidity(error.message);
    }
    expiry.value = ''; status.value = '';
    date.setCustomValidity('');
    if (!date.value) {
      calculationStatus.textContent = 'Select a valid NCR Date to preview expiry. No points have been deducted.';
      return;
    }
    try {
      expiry.value = policy.getExpiryDate(date.value);
      const calculated = policy.getNcrStatus(date.value, lastPreviewDate);
      status.value = calculated || '';
      calculationStatus.textContent = calculated === null
        ? 'Future NCR Date — not yet active; no Active/Expired status or deduction applies before this date.'
        : calculated === 'Expired'
          ? 'Expired preview — this penalty no longer affects the current score. The NCR and its original penalty remain in history.'
          : `Active preview as of ${lastPreviewDate} in Asia/Riyadh. Points recover at the beginning of ${expiry.value}; history is retained.`;
    } catch (error) {
      date.setCustomValidity(error.message);
      calculationStatus.textContent = `Unresolved — ${error.message} No score can be calculated for an invalid record.`;
    }
  }

  function setMode(mode) {
    const details = mode === 'details';
    form.querySelectorAll('input:not([readonly]), select, textarea').forEach(input => { input.disabled = details; });
    document.getElementById('ncr-modal-title').textContent = details ? 'NCR Details — Empty Preview'
      : mode === 'edit' ? 'Edit NCR — Preview' : 'Report New NCR';
    document.getElementById('save-ncr-btn').hidden = details;
    document.getElementById('edit-ncr-preview').hidden = !details;
    document.getElementById('delete-ncr-preview').hidden = mode === 'add';
  }
  function openRecord(mode) {
    form.reset(); saveStatus.hidden = true;
    setMode(mode); updatePreview(); openPreviewModal(modal);
  }
  function previewSave() {
    updatePreview();
    saveStatus.textContent = 'Database integration pending — NCR not saved.';
    saveStatus.hidden = false;
    form.reportValidity();
  }
  document.getElementById('open-ncr-modal').addEventListener('click', () => openRecord('add'));
  document.getElementById('preview-ncr-record').addEventListener('click', () => openRecord('details'));
  document.getElementById('edit-ncr-preview').addEventListener('click', () => { setMode('edit'); date.focus(); });
  document.getElementById('delete-ncr-preview').addEventListener('click', () => {
    saveStatus.textContent = 'Database integration pending — NCR not deleted.'; saveStatus.hidden = false;
  });
  document.getElementById('close-ncr-modal').addEventListener('click', () => closePreviewModal(modal));
  document.getElementById('save-ncr-btn').addEventListener('click', previewSave);
  form.addEventListener('submit', event => { event.preventDefault(); previewSave(); });
  [date, category, tbtDate].forEach(input => {
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
  });

  // Unsaved previews update on KSA day changes and when the tab regains visibility.
  // Production will derive scores on the backend even without any browser session.
  setInterval(() => {
    if (modal.style.display === 'flex' && policy.getKsaDate(new Date()) !== lastPreviewDate) updatePreview();
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && modal.style.display === 'flex') updatePreview(); });

  const driverModal = document.getElementById('ncr-driver-modal');
  document.getElementById('preview-ncr-driver').addEventListener('click', () => openPreviewModal(driverModal));
  document.getElementById('close-ncr-driver-modal').addEventListener('click', () => closePreviewModal(driverModal));
  document.querySelectorAll('[data-ncr-pending]').forEach(button => button.addEventListener('click', showIntegrationPending));
  function validateScoreFilters() {
    const message = document.getElementById('ncr-score-filter-status');
    try {
      // The disconnected collection is deliberately empty; never fabricate drivers.
      policy.filterDriversByPoints([], {
        exact: document.getElementById('ncr-points-exact').value,
        min: document.getElementById('ncr-points-min').value,
        max: document.getElementById('ncr-points-max').value
      });
      message.textContent = 'No driver scores available — database not connected. Filters are retained when switching views.';
    } catch (error) { message.textContent = error.message; }
  }
  ['ncr-points-exact', 'ncr-points-min', 'ncr-points-max'].forEach(id => document.getElementById(id).addEventListener('input', validateScoreFilters));
  validateScoreFilters(); updatePreview();
})();
