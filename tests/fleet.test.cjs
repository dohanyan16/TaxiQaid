// Run with: node --test tests/fleet.test.cjs (no third-party dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(process.env.FLEET_SOURCE || path.join(root, 'modules/fleet/fleet.js'), 'utf8');
const record = (date, time, km, plate = 'ABC 123') => ({
  'Car Plate': plate, Date: date, Time: time, 'Odometer (KM)': km
});

function setup({ drivers = false } = {}) {
  const elements = new Map();
  function element() {
    return {
      textContent: '', innerHTML: '', value: '', style: {}, children: [], listeners: {},
      appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      addEventListener(name, listener) { this.listeners[name] = listener; }
    };
  }
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    createElement: element
  };
  const requests = [];
  const responses = { fleet: [], post: [] };
  let exported;
  const context = vm.createContext({
    document, console: { warn() {}, error() {} }, alert() {},
    fetchDrivers: async () => true, fetchAccidents: async () => true,
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (responses[url] instanceof Error) throw responses[url];
      return { ok: true, json: async () => structuredClone(responses[url]) };
    },
    XLSX: {
      utils: {
        json_to_sheet(rows) { exported = rows; return rows; },
        book_new() { return {}; }, book_append_sheet() {}
      },
      writeFile() {}
    }
  });
  const run = code => vm.runInContext(code, context);
  run('const GOOGLE_SHEET_FLEET_URL = "fleet"; const GOOGLE_SHEET_DRIVERS_URL = "drivers"; const TRIPCHECK_SHEET_ENDPOINTS = {"Post-Trip": "post"};');
  for (const file of ['shared/state.js', 'shared/utils.js', 'shared/data.js']) {
    run(fs.readFileSync(path.join(root, file), 'utf8'));
  }
  run(source);
  if (drivers) run(fs.readFileSync(path.join(root, 'modules/drivers/drivers.js'), 'utf8'));
  return {
    run, context, responses, requests,
    element: id => document.getElementById(id),
    readings(records) { context.records = records; return run('buildLatestPostTripReadings(records)'); },
    exported: () => exported == null ? null : JSON.parse(JSON.stringify(exported))
  };
}

test('matches normalized plates and selects inspection date/time, not mileage, edit time or row order', () => {
  const app = setup();
  const latest = app.readings([
    record('2026-11-05', '09:30:01', 150, 'AbC-123'),
    { ...record('2026-11-04', '23:59', 999), 'Updated At': '2099-01-01T12:00:00Z' },
    record('2026-11-05', '09:30', 200, 'abc_123'),
    record('2026-11-05', '08:00', 300, 'abc.123'),
    { 'car plate': 'XYZ 456', date: '2026-11-06', time: '00:00', 'odometer (km)': 0 }
  ]);
  assert.equal(latest.size, 2);
  assert.equal(latest.get('abc123').km, 150);
  assert.equal(latest.get('xyz456').km, 0);
});

test('supports legacy day/month/year dates, 12-hour times and unpadded hours', () => {
  const app = setup();
  const latest = app.readings([
    record('5/11/2026', '12:00 AM', 100),
    record('05-11-2026', '12:00 pm', 200),
    record('2026-11-05', '9:30:00 PM', 250),
    record('2026-11-05', '9:30', 500)
  ]).get('abc123');
  assert.equal(latest.km, 250);
  assert.equal(latest.date, '2026-11-05');
  assert.equal(latest.time, '21:30:00');
});

test('converts serialized spreadsheet date/time cells to Asia/Riyadh across UTC midnight', () => {
  const app = setup();
  const latest = app.readings([
    record('2026-11-04T21:00:00.000Z', '2026-11-05T20:45:00.000Z', 250),
    record('2026-11-04', '23:59:59', 999),
    record('2026-11-05T00:00:00+03:00', '2026-11-05T22:30:00+02:00', 200)
  ]).get('abc123');
  assert.equal(latest.km, 250);
  assert.equal(latest.date, '2026-11-05');
  assert.equal(latest.time, '23:45:00');
  // Sheets time-only cells can use an 1899 base date. Riyadh's historical
  // offset then was +03:06:52, so do not substitute a hard-coded +03:00.
  assert.equal(app.readings([
    record('2026-11-05', '1899-12-30T20:38:08.000Z', 100)
  ]).get('abc123').time, '23:45:00');
});

test('ignores malformed dates, times, plates and odometers without treating blank as zero', () => {
  const app = setup();
  const invalid = [
    record('2026-02-30', '10:00', 200), record('31/02/2026', '10:00', 200),
    record('2026-02-30T00:00:00Z', '10:00', 200),
    record('2026-11-06', '24:00', 200), record('2026-11-06', '00:30 PM', 200),
    record('2026-11-06', '12:60', 200), record('2026-11-06', '', 200),
    record('', '10:00', 200), record('2026-11-06', '10:00', 200, ' - ')
  ];
  for (const km of [null, undefined, '', ' ', -1, Infinity, 'bad', true, [], {}]) {
    invalid.push(record('2026-11-06', '10:00', km));
  }
  const latest = app.readings([record('2024-02-29', '00:00', 0), ...invalid]);
  assert.equal(latest.size, 1);
  assert.equal(latest.get('abc123').km, 0);
});
