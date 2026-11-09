// Requests and work orders remain separate, empty frontend previews.
const maintenanceTabs = [...document.querySelectorAll('#view-maintenance [role=tab]')];
function selectMaintenanceTab(tab) {
  maintenanceTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}
maintenanceTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectMaintenanceTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = maintenanceTabs[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1-index];
    selectMaintenanceTab(next); next.focus();
  });
});
document.getElementById('request-request-status').addEventListener('change', event => {
  if (event.target.value === 'In Progress') openPreviewModal(document.getElementById('acceptance-modal'));
});
// Empty previews never assign an originating record or generate an ID.
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openPreviewModal(document.getElementById(button.dataset.open))));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closePreviewModal(button.closest('.modal-overlay'))));
document.querySelectorAll('[data-pending]').forEach(button => button.addEventListener('click', showIntegrationPending));
document.querySelectorAll('#request-modal form, #acceptance-modal form, #breakdown-modal form').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); showIntegrationPending(); }));
