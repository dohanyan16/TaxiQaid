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

test('opening/refreshing Fleet loads fresh Post-Trip data and updates the selected vehicle read-only', async () => {
  const app = setup();
  app.responses.fleet = [{ Plate: 'ABC-123', 'Total KM': 50, Availability: 'Unassigned' }];
  app.responses.post = [record('2026-11-05', '10:00', 100)];
  await app.run('fetchFleet()');
  app.run('renderVehicleProfile(fleetDatabase[0])');
  assert.equal(app.element('f-val-km').children[0].textContent, '100');
  assert.match(app.element('f-val-km').children[1].textContent, /05\/11\/2026 10:00 \(KSA\)/);
  app.responses.post.push(record('2026-11-05', '11:00', 150));
  await app.element('refresh-fleet-btn').listeners.click();
  assert.equal(app.element('f-val-km').children[0].textContent, '150');
  assert.equal(app.run('fleetDatabase[0]["Total KM"]'), 50);
  assert.deepEqual(app.requests.map(r => r.url), ['fleet', 'post', 'fleet', 'post']);
  assert.ok(app.requests.every(r => r.options.cache === 'no-store' && !r.options.method));
});

test('Refresh updates locked mileage while preserving an availability edit', async () => {
  const app = setup();
  app.responses.fleet = [{ Plate: 'ABC-123', 'Total KM': 50, Availability: 'Unassigned' }];
  app.responses.post = [record('2026-11-05', '10:00', 100)];
  await app.run('fetchFleet()');
  app.run('currentActiveVehicle = fleetDatabase[0]; isFleetEditMode = true;');
  app.element('edit-fleet-km').value = 100;
  app.element('edit-fleet-availability').value = 'Under Maintenance';
  app.responses.post.push(record('2026-11-05', '12:00', 200));
  await app.element('refresh-fleet-btn').listeners.click();
  assert.equal(Number(app.element('edit-fleet-km').value), 200);
  assert.equal(app.element('edit-fleet-availability').value, 'Under Maintenance');
  assert.equal(app.run('isFleetEditMode'), true);
});

test('Excel uses the displayed odometer without duplicate lowercase KM or mutating sheet data', async () => {
  const app = setup();
  app.responses.fleet = [
    { plate: 'abc_123', 'total km': 50, availability: 'Unassigned' },
    { Plate: 'XYZ 456', 'Total KM': 0, Availability: 'Under Maintenance' }
  ];
  app.responses.post = [record('2026-11-05', '10:00', 100)];
  await app.run('fetchFleet()');
  await app.element('export-fleet-excel-btn').listeners.click({ currentTarget: app.element('export-fleet-excel-btn') });
  const rows = app.exported();
  assert.equal(rows[0]['Total KM'], 100);
  assert.equal(Object.hasOwn(rows[0], 'total km'), false);
  assert.equal(rows[0].availability, 'Unassigned');
  assert.equal(rows[1]['Total KM'], 0);
  assert.equal(app.run('fleetDatabase[0]["total km"]'), 50);
  assert.equal(app.run('getFleetOdometer(fleetDatabase[1]).source'), null);
});

test('availability saves omit Total KM and preserve sheet mileage, driver assignments and accident counts', async () => {
  const app = setup();
  app.responses.fleet = [{ Plate: 'ABC 123', 'Total KM': 50, Availability: 'Assigned' }];
  app.responses.post = [record('2026-11-05', '10:00', 100)];
  app.run('driversDatabase = [{"Car Plate": "abc-123", "Full Name": "Fixture Driver"}];');
  app.run('accidentsDatabase = [{"Car Plate": "ABC 123"}];');
  await app.run('fetchFleet()');
  app.run('renderVehicleProfile(fleetDatabase[0]); enableFleetEditMode();');
  app.element('edit-fleet-availability').value = 'Assigned';
  let saved;
  app.context.postAuthorizedSheetUpdate = async (url, payload) => {
    saved = { url, payload };
    return { json: async () => ({ status: 'success' }) };
  };
  await app.run('saveEditedVehicle()');
  assert.equal(saved.url, 'fleet');
  assert.equal(saved.payload.Availability, 'Assigned');
  assert.deepEqual(Object.keys(saved.payload).sort(), ['Availability', 'Plate', 'action']);
  assert.equal(Object.hasOwn(saved.payload, 'Total KM'), false);
  assert.equal(Object.hasOwn(saved.payload, 'total km'), false);
  assert.equal(app.run('fleetDatabase[0]["Total KM"]'), 50);
  assert.equal(app.run('fleetDatabase[0].Accidents'), 1);
  assert.equal(app.run('getAssignedDrivers("ABC_123")[0]["Full Name"]'), 'Fixture Driver');
  assert.equal(app.run('getFleetOdometer(fleetDatabase[0]).value'), 100);
});

test('derived accident counts normalize plates and reset to zero after the last accident is removed', async () => {
  const app = setup();
  app.responses.fleet = [{ Plate: 'ABC-123', Accidents: 99 }];
  app.run('accidentsDatabase = [{"Car Plate": "abc_123"}, {"Car Plate": "ABC 123"}];');
  await app.run('fetchFleet()');
  assert.equal(app.run('fleetDatabase[0].Accidents'), 2);
  app.run('accidentsDatabase = []; updateAllFleetAccidentCounts();');
  assert.equal(app.run('fleetDatabase[0].Accidents'), 0);
});

test('exports reload manually edited Sheet rows and cancel instead of exporting stale snapshots', async () => {
  const app = setup();
  app.responses.fleet = [{ Plate: 'ABC 123', 'Total KM': 50 }];
  await app.run('fetchFleet()');
  app.responses.fleet.push({ Plate: 'BULK 456', 'Total KM': 75 });
  await app.element('export-fleet-excel-btn').listeners.click({ currentTarget: app.element('export-fleet-excel-btn') });
  assert.equal(app.exported().length, 2);
  const failed = setup();
  failed.responses.fleet = [{ Plate: 'ABC 123', 'Total KM': 50 }];
  await failed.run('fetchFleet()');
  failed.responses.fleet = new Error('Offline');
  await failed.element('export-fleet-excel-btn').listeners.click({ currentTarget: failed.element('export-fleet-excel-btn') });
  assert.equal(failed.exported(), null);
  assert.equal(failed.element('export-fleet-excel-btn').disabled, false);
});

test('Fleet sync verification compares the actual Sheet cell with the latest Post-Trip, including older edits', async () => {
  const app = setup();
  app.responses.fleet = [{ Plate: 'ABC-123', 'Total KM': 50 }];
  app.responses.post = [record('2026-11-05', '10:00', 100), record('2026-11-04', '12:00', 500)];
  await app.run('fetchFleet()');
  assert.equal(app.run('getFleetOdometer(fleetDatabase[0]).value'), 100);
  assert.equal(app.run('isFleetPostTripSynced("abc_123")'), false);
  app.responses.fleet[0]['Total KM'] = 100;
  await app.run('fetchFleet()');
  assert.equal(app.run('isFleetPostTripSynced("ABC 123")'), true);
});

test('Post-Trip failures fall back to Fleet KM with a warning; Fleet failures retain prior data', async () => {
  const app = setup();
  app.responses.fleet = [{ Plate: 'ABC-123', 'Total KM': 50 }];
  app.responses.post = [record('2026-11-05', '10:00', 100)];
  await app.run('fetchFleet()');
  app.responses.post = new Error('Unavailable');
  await app.run('fetchFleet()');
  assert.equal(app.run('getFleetOdometer(fleetDatabase[0]).value'), 50);
  assert.match(app.element('fleet-sync-status').textContent, /Post-Trip unavailable/);
  app.responses.fleet = { status: 'error' };
  await app.run('fetchFleet()');
  assert.equal(app.run('fleetDatabase.length'), 1);
  assert.match(app.element('fleet-sync-status').textContent, /Failed to connect/);
});

test('an older in-flight refresh cannot overwrite a newer refresh', async () => {
  const app = setup();
  let releaseOld;
  const oldFleet = new Promise(resolve => { releaseOld = resolve; });
  let fleetCalls = 0;
  app.context.fetch = async url => {
    if (url === 'fleet' && fleetCalls++ === 0) return oldFleet;
    return { ok: true, json: async () => url === 'fleet'
      ? [{ Plate: 'ABC-123', 'Total KM': 50 }]
      : [record('2026-11-05', '12:00', 200)] };
  };
  const oldRefresh = app.run('fetchFleet()');
  await app.run('fetchFleet()');
  releaseOld({ ok: true, json: async () => [{ Plate: 'ABC-123', 'Total KM': 1 }] });
  await oldRefresh;
  assert.equal(app.run('fleetDatabase[0]["Total KM"]'), 50);
  assert.equal(app.run('getFleetOdometer(fleetDatabase[0]).value'), 200);
});

test('Driver saves whitelist editable fields and reload locked values from the Sheet', async () => {
  const app = setup({ drivers: true });
  app.responses.drivers = [{ 'Iqama Number': '100', 'Full Name': 'Original', Nationality: 'Original', 'Phone Number': 'old' }];
  await app.run('fetchDrivers();');
  app.run('renderDriverProfile(driversDatabase[0]); enableEditMode();');
  app.element('edit-phone').value = 'new';
  app.element('edit-arrangement').value = 'Salary';
  app.element('edit-shift').value = 'Day Shift';
  app.element('edit-car-plate').value = 'ABC 123';
  app.element('edit-status').value = 'Available';
  // A bulk Sheet update made while the web form was open must survive the save.
  app.responses.drivers[0]['Full Name'] = 'Changed directly in Sheet';
  app.responses.drivers[0].Nationality = 'Changed directly in Sheet';
  let saved;
  app.context.postAuthorizedSheetUpdate = async (url, payload) => {
    saved = { url, payload };
    Object.assign(app.responses.drivers[0], payload);
    return { json: async () => ({ status: 'success' }) };
  };
  await app.run('saveEditedDriver();');
  assert.equal(saved.url, 'drivers');
  assert.deepEqual(Object.keys(saved.payload).sort(), ['Arrangement', 'Car Plate', 'Iqama Number', 'Phone Number', 'Shift', 'Status']);
  assert.equal(app.run('currentActiveDriver["Full Name"]'), 'Changed directly in Sheet');
  assert.equal(app.run('currentActiveDriver.Nationality'), 'Changed directly in Sheet');
  assert.equal(app.run('currentActiveDriver["Phone Number"]'), 'new');
});

test('a slow Driver read cannot replace a newer saved Sheet snapshot', async () => {
  const app = setup({ drivers: true });
  let releaseOld;
  const old = new Promise(resolve => { releaseOld = resolve; });
  let calls = 0;
  app.context.fetch = async () => {
    if (calls++ === 0) return old;
    return { ok: true, json: async () => [{ 'Iqama Number': '100', 'Phone Number': 'new' }] };
  };
  const first = app.run('fetchDrivers()');
  await app.run('fetchDrivers()');
  releaseOld({ ok: true, json: async () => [{ 'Iqama Number': '100', 'Phone Number': 'old' }] });
  assert.equal(await first, false);
  assert.equal(app.run('driversDatabase[0]["Phone Number"]'), 'new');
});
