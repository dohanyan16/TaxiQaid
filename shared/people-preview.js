/** Shared transient interface helpers. No requests, record mutations or persistence. */
const TaxiQaidPeopleUI = (() => {
  function tabs(root) {
    const items = [...root.querySelectorAll('[role=tab]')];
    function select(tab) {
      items.forEach(item => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1;
        document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
      });
    }
    items.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const next = items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length];
        select(next); next.focus();
      });
    });
  }
  function table(id, records, columns, onOpen) {
    const body = document.querySelector(`#${id} tbody`); body.replaceChildren();
    if (!records.length) {
      const row = body.insertRow(), cell = row.insertCell(); cell.colSpan = columns.length;
      const message = document.createElement('span'); message.className = 'table-empty';
      message.textContent = 'No records available — database not connected'; cell.appendChild(message); return;
    }
    records.forEach(record => {
      const row = body.insertRow();
      columns.forEach((column, index) => {
        const value = typeof column === 'function' ? column(record) : TaxiQaidSearch.read(record,column);
        const cell = row.insertCell();
        if (onOpen && index === 0) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-secondary';
          button.textContent = String(value || 'View details'); button.addEventListener('click', () => onOpen(record)); cell.appendChild(button);
        } else cell.textContent = String(value ?? '');
      });
    });
  }
  function driverSearch(input, name, onSelect=()=>{}) {
    const control = document.getElementById(input), derived = document.getElementById(name);
    control.addEventListener('input', () => { derived.value = ''; onSelect(null); });
    return setupSearchDropdown({input, config:{fields:['Driver Iqama','Driver Name'].map((key,index)=>({key,aliases:index?['Full Name','Name']:['Iqama Number','Iqama']})),id:'Driver Iqama'},
      getData:()=>driversDatabase, onSelect:record => { derived.value = TaxiQaidSearch.read(record,TaxiQaidSearch.CONFIG.drivers.fields[1]); onSelect(record); }});
  }
  document.querySelectorAll('[data-people-open]').forEach(button => button.addEventListener('click',()=>openPreviewModal(document.getElementById(button.dataset.peopleOpen))));
  document.querySelectorAll('[data-people-close]').forEach(button => button.addEventListener('click',()=>closePreviewModal(document.getElementById(button.dataset.peopleClose))));
  document.querySelectorAll('[data-people-pending]').forEach(button => button.addEventListener('click',showIntegrationPending));
  return Object.freeze({tabs,table,driverSearch});
})();
