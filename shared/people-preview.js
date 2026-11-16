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
        const visible=items.filter(item=>!item.hidden&&!item.hasAttribute('data-permission-denied'));if(!visible.length)return;const visibleIndex=visible.indexOf(tab);
        const next = visible[event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : (visibleIndex + (event.key === 'ArrowRight' ? 1 : -1) + visible.length) % visible.length];
        select(next); next.focus();
      });
    });
  }
  function table(id, records, columns, onOpen) {
    const body = document.querySelector(`#${id} tbody`), fragment = document.createDocumentFragment();
    if (!records.length) {
      const row = document.createElement('tr'), cell = row.insertCell(); fragment.append(row); cell.colSpan = columns.length;
      const message = document.createElement('span'); message.className = 'table-empty';
      message.textContent = 'No records available — database not connected'; cell.appendChild(message); body.replaceChildren(fragment); return;
    }
    records.forEach(record => {
      const row = document.createElement('tr'); fragment.append(row);
      columns.forEach((column, index) => {
        const value = typeof column === 'function' ? column(record) : TaxiQaidTime.field(column,TaxiQaidSearch.read(record,column));
        const cell = row.insertCell();
        if (onOpen && index === 0) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-secondary';
          button.textContent = String(value || 'View details'); button.addEventListener('click', () => onOpen(record)); cell.appendChild(button);
        } else cell.textContent = String(value ?? '');
      });
    });
    body.replaceChildren(fragment);
  }
  function driverSearch(input, name, onSelect=()=>{}) {
    const control = document.getElementById(input), derived = document.getElementById(name);
    control.addEventListener('input', () => { derived.value = ''; onSelect(null); });
    return setupSearchDropdown({input, config:{fields:['Driver Iqama','Driver Name'].map((key,index)=>({key,aliases:index?['Full Name','Name']:['Iqama Number','Iqama']})),id:'Driver Iqama'},
      getData:()=>driversDatabase, onSelect:record => { derived.value = TaxiQaidSearch.read(record,TaxiQaidSearch.CONFIG.drivers.fields[1]); onSelect(record); }});
  }
  return Object.freeze({tabs,table,driverSearch});
})();
