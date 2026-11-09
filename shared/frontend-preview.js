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
    close.type = 'button'; close.className='btn-secondary'; close.textContent = 'Dismiss';
    close.addEventListener('click', () => notice.remove());
    notice.append(text, close);
    document.body.appendChild(notice);
  }
  placeIntegrationNotice(notice);
}
function placeIntegrationNotice(notice) {
  const activeModal=[...document.querySelectorAll('.modal-overlay')].find(modal=>modal.style.display==='flex');
  if(activeModal) activeModal.querySelector('.modal-content').appendChild(notice);
  else document.querySelector('.right-wrapper').insertBefore(notice,document.querySelector('.main-content'));
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
  const notice=document.getElementById('integration-notice');
  if(notice && modal.contains(notice)) placeIntegrationNotice(notice);
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
  initializeSelectDescriptions();
  fetchFleet(); fetchDrivers(); fetchTripChecks();
}

/** Keep full native-select values readable without replacing specialized controls. */
function initializeSelectDescriptions() {
  const selects=[...document.querySelectorAll('select')];
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('2d');
  function describe(select) {
    const text=select.selectedOptions[0]?.textContent || '';
    select.title=text;
    let hint=select.nextElementSibling;
    if(!hint?.classList.contains('selected-option-text')) {
      hint=document.createElement('p');hint.className='selected-option-text';hint.id=`${select.id}-selected-text`;hint.hidden=true;select.after(hint);
      select.setAttribute('aria-describedby',[select.getAttribute('aria-describedby'),hint.id].filter(Boolean).join(' '));
    }
    context.font=getComputedStyle(select).font;
    hint.textContent=text;
    hint.hidden=!(select.getClientRects().length && context.measureText(text).width>select.clientWidth-52);
  }
  const observer=new ResizeObserver(entries=>entries.forEach(entry=>describe(entry.target)));
  const observed=new WeakSet();
  function watch(select) {if(observed.has(select))return;observed.add(select);select.addEventListener('change',()=>describe(select));observer.observe(select);describe(select);}
  selects.forEach(watch);
  new MutationObserver(mutations=>mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>{if(node.nodeType!==1)return;if(node.matches('select'))watch(node);node.querySelectorAll('select').forEach(watch);}))).observe(document.getElementById('workspace'),{childList:true,subtree:true});
}
