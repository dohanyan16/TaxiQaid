/** Shared frontend preview behavior. No operational persistence. */
function showIntegrationPending() {
  let notice = document.getElementById('integration-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'integration-notice';
    notice.className = 'integration-notice';
    notice.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = 'Database integration pending — no records were saved, deleted, exported or sent.';
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Dismiss';
    close.addEventListener('click', () => notice.remove());
    notice.append(text, close);
    document.body.appendChild(notice);
  }
}
const previewReturnFocus = new WeakMap();
const previewParentModal = new WeakMap();
function openPreviewModal(modal) {
  previewReturnFocus.set(modal, document.activeElement);
  const parent = [...document.querySelectorAll('.modal-overlay')].find(item => item !== modal && item.style.display === 'flex');
  if (parent) { previewParentModal.set(modal, parent); parent.style.display = 'none'; parent.setAttribute('aria-hidden', 'true'); }
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.modal-content').scrollTop = 0;
  [...modal.querySelectorAll('input, select, textarea, button, [tabindex="0"]')].find(control => !control.disabled && control.getClientRects().length)?.focus();
}
function closePreviewModal(modal) {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  const parent = previewParentModal.get(modal);
  if (parent) { parent.style.display = 'flex'; parent.setAttribute('aria-hidden', 'false'); previewParentModal.delete(modal); }
  previewReturnFocus.get(modal)?.focus();
}
// Applied after all feature scripts initialize, including existing dialogs.
function initializeFrontendPreview() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    const panel = modal.querySelector('.modal-content');
    if (!panel) return;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    const title = panel.querySelector('h2, h3');
    if (title) { title.id ||= `${modal.id}-title`; panel.setAttribute('aria-labelledby', title.id); }
    modal.addEventListener('click', event => { if (event.target === modal) closePreviewModal(modal); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closePreviewModal(modal); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.querySelectorAll('button, input, select, textarea, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  });
  document.querySelectorAll('.form-group label, .search-row label').forEach(label => {
    const control = label.parentElement.querySelector('input, select, textarea');
    if (control?.id) label.htmlFor = control.id;
  });
  fetchFleet(); fetchDrivers(); fetchTripChecks();
}
