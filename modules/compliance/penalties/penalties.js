/** Read-only rendering and filtering for future authorized Penalties source records. */
const TaxiQaidPenalties = (() => {
  const search = typeof module !== 'undefined' && module.exports ? require('../../../shared/search.js') : TaxiQaidSearch;
  const COLUMNS = Object.freeze(['ID', 'Details', 'Date', 'Time', 'Car Plate', 'Driver Iqama', 'Driver Name', 'Amount', 'Charged To']);
  const EMPTY_MESSAGE = 'No penalties available — database integration pending.';
  const sourceText = value => value === null || value === undefined || value === '' ? 'Unavailable' : String(value);

  function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function formatAmount(value) {
    // Never coerce missing values to zero or interpret a negative amount as a business rule.
    return typeof value === 'number' && Number.isFinite(value)
      ? `SAR ${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'Unavailable';
  }

  function formatTime(value) {
    // Canonical source times preserve supplied seconds; no browser-clock conversion is applied.
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value) ? value : 'Unavailable';
  }

  function displayValue(record, column) {
    const value = record[column];
    if (column === 'Amount') return formatAmount(value);
    if (column === 'Date') return isIsoDate(value) ? value : 'Unavailable';
    if (column === 'Time') return formatTime(value);
    return sourceText(value);
  }

  function filterRecords(records, {query = '', startDate = '', endDate = ''} = {}) {
    for (const [label, value] of [['Start Date', startDate], ['End Date', endDate]]) {
      if (value && !isIsoDate(value)) throw new RangeError(`${label} must be a valid date (YYYY-MM-DD).`);
    }
    if (startDate && endDate && startDate > endDate) throw new RangeError('Start Date must be on or before End Date.');
    return records.filter(record => {
      if (!search.matches(record,search.CONFIG.penalties.fields,query)) return false;
      if (startDate || endDate) {
        const date = record.Date;
        if (!isIsoDate(date) || (startDate && date < startDate) || (endDate && date > endDate)) return false;
      }
      return true;
    });
  }

  function buildReadOnlyRow(record, onOpen, ownerDocument = document) {
    const row = ownerDocument.createElement('tr');
    row.tabIndex = 0;
    row.setAttribute('aria-label', `Open read-only penalty details: ${sourceText(record.ID)}`);
    COLUMNS.forEach(column => {
      const cell = ownerDocument.createElement('td');
      cell.textContent = displayValue(record, column);
      if (column === 'Details') cell.className = 'penalty-details-cell';
      if (column === 'Charged To') cell.className = 'penalty-charged-to-cell';
      row.appendChild(cell);
    });
    row.addEventListener('click', () => onOpen(record));
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(record); }
    });
    return row;
  }

  function initialize() {
    // Deliberately empty and immutable: no imports, data source, storage or sample records.
    const records = Object.freeze([]);
    const tbody = document.getElementById('penalties-table-body');
    const modal = document.getElementById('penalty-details-modal');
    const inputs = ['penalties-search-input', 'penalties-start-date', 'penalties-end-date']
      .map(id => document.getElementById(id));
    const status = document.getElementById('penalties-filter-status');
    const detailsIds = ['id', 'description', 'date', 'time', 'plate', 'iqama', 'name', 'amount', 'charged-to'];
    function openDetails(record) {
      COLUMNS.forEach((column, index) => {
        document.getElementById(`penalty-detail-${detailsIds[index]}`).textContent = displayValue(record, column);
      });
      openPreviewModal(modal);
    }
    function applyFilters() {
      tbody.replaceChildren();
      let filtered = [];
      try {
        filtered = filterRecords(records, {query: inputs[0].value, startDate: inputs[1].value, endDate: inputs[2].value}).filter(record=>recordSearch.matches(record));
        status.textContent = 'Search matches ID, Car Plate, Iqama or Name. Date ranges include both boundary dates.';
      } catch (error) { status.textContent = error.message; }
      if (!filtered.length) {
        const row = document.createElement('tr'), cell = document.createElement('td'), text = document.createElement('span');
        cell.colSpan = COLUMNS.length; text.className = 'table-empty'; text.textContent = EMPTY_MESSAGE;
        cell.appendChild(text); row.appendChild(cell); tbody.appendChild(row);
      } else filtered.forEach(record => tbody.appendChild(buildReadOnlyRow(record, openDetails)));
    }
    const recordSearch = setupSearchDropdown({input:'penalties-search-input', config:'penalties', getData:()=>records, apply:applyFilters});
    inputs.slice(1).forEach(input => { input.addEventListener('input', applyFilters); input.addEventListener('change', applyFilters); });
    document.getElementById('clear-penalties-filters').addEventListener('click', () => { inputs.slice(1).forEach(input => { input.value = ''; }); recordSearch.clear(); });
    document.getElementById('close-penalty-details').addEventListener('click', () => closePreviewModal(modal));
    ['refresh-penalties-btn', 'export-penalties-btn'].forEach(id => document.getElementById(id).addEventListener('click', showIntegrationPending));
    applyFilters();
    // A read-only detail opener is returned for a future authorized source adapter; no adapter runs now.
    return Object.freeze({openDetails});
  }
  return Object.freeze({COLUMNS, EMPTY_MESSAGE, isIsoDate, formatAmount, formatTime, displayValue, filterRecords, buildReadOnlyRow, initialize});
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TaxiQaidPenalties;
const TaxiQaidPenaltiesView = typeof document !== 'undefined' ? TaxiQaidPenalties.initialize() : null;
