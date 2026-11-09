/** Approved NCR rules. Pure functions take an explicit authoritative KSA date. */
const TaxiQaidNcrPolicy = (() => {
  'use strict';
  const STARTING_POINTS = 100;
  const ACTIVE_CALENDAR_DAYS = 90;
  const CATEGORIES = Object.freeze([
    {key: 'cctv-tampering', label: 'Tampering with any CCTV cameras', penalty: -50},
    {key: 'money-corruption', label: 'Money corruption, fraud, or disloyalty', penalty: -50},
    {key: 'unauthorized-transport', label: 'Transporting passengers without payment or carrying unauthorized goods in the vehicle', penalty: -50},
    {key: 'asset-damage', label: 'Damaging TaxiQaid assets, including vehicles or office buildings', penalty: -25},
    {key: 'smoking', label: 'Smoking inside vehicles, offices, accommodation, or prohibited areas', penalty: -25},
    {key: 'reckless-driving', label: 'Reckless driving, including vehicle drifting, without causing damage', penalty: -25},
    {key: 'uniform-hygiene', label: 'Not wearing the full uniform or maintaining poor personal hygiene', penalty: -25},
    {key: 'personal-vehicle-use', label: 'Using a company vehicle for personal purposes', penalty: -25},
    {key: 'depot-violations', label: 'Depot violations, including speeding, littering, or improper parking', penalty: -25},
    {key: 'fights-arguments', label: 'Engaging in fights or arguments with employees, passengers, or others', penalty: -10},
    {key: 'phone-seat-belt', label: 'Using a phone or not fastening a seat belt while driving', penalty: -10},
    {key: 'mdt-login', label: 'Failure to log in to the MDT device', penalty: -10},
    {key: 'occ-reporting', label: 'Failure to report incidents to OCC', penalty: -10},
    {key: 'unprofessional-behavior', label: 'Unprofessional or rude behavior toward others', penalty: -10},
    {key: 'vehicle-sleeping-luggage', label: 'Placing blankets or luggage inappropriately, or sleeping in the vehicle', penalty: -10},
    {key: 'alerts-instructions', label: 'Non-compliance with TaxiQaid alerts or instructions', penalty: -10},
    {key: 'harmful-conduct', label: 'Conduct harmful to TaxiQaid business that is not otherwise listed', penalty: -10},
    {key: 'third-party-site-rules', label: 'Non-compliance with rules at third-party operating sites', penalty: -10},
    {key: 'excessive-stay', label: 'Remaining at one location for an excessive period', penalty: -10},
    {key: 'unauthorized-absence', label: 'Absence from work without permission', penalty: -25},
    {key: 'eating-while-driving', label: 'Eating while driving', penalty: -10},
    {key: 'mdt-black-shift', label: 'MDT Black Shift', penalty: -10},
    {key: 'pickup-dropoff-rules', label: 'Non-compliance with Passenger Pickup & Drop-off Rules', penalty: -25}
  ].map(category => Object.freeze(category)));
  const byKey = new Map(CATEGORIES.map(category => [category.key, category]));

  function getCategoryPenalty(key) {
    if (!byKey.has(key)) throw new RangeError('Unknown NCR category key.');
    return byKey.get(key).penalty;
  }

  function parseIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new RangeError('A valid date-only ISO value (YYYY-MM-DD) is required.');
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new RangeError(`Invalid calendar date: ${value}.`);
    }
    return date;
  }

  function getExpiryDate(ncrDate) {
    const date = parseIsoDate(ncrDate);
    // UTC getters/setters serve only as a Gregorian calendar calculator, never a local clock.
    date.setUTCDate(date.getUTCDate() + ACTIVE_CALENDAR_DAYS);
    if (date.getUTCFullYear() > 9999) throw new RangeError('Expiry date is outside the supported calendar range.');
    return date.toISOString().slice(0, 10);
  }

  function getKsaDate(instant) {
    if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) throw new RangeError('A valid explicit instant is required.');
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(instant);
    const part = type => parts.find(item => item.type === type).value;
    return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
  }

  function getNcrStatus(ncrDate, currentKsaDate) {
    parseIsoDate(currentKsaDate);
    const expiryDate = getExpiryDate(ncrDate);
    // A future occurrence has no Active/Expired status yet and cannot deduct points.
    if (currentKsaDate < ncrDate) return null;
    return currentKsaDate >= expiryDate ? 'Expired' : 'Active';
  }

  function getTbtStatus(conductedDate) {
    if (conductedDate === '' || conductedDate === null || conductedDate === undefined) return 'Pending';
    parseIsoDate(conductedDate);
    return 'Conducted';
  }

  // Records passed here belong to one driver. No record or running balance is mutated.
  function summarizeNcrs(records, currentKsaDate) {
    if (!Array.isArray(records)) throw new TypeError('NCR records must be an array.');
    parseIsoDate(currentKsaDate);
    const summary = {startingPoints: STARTING_POINTS, totalNcrs: records.length, activeNcrs: 0,
      expiredNcrs: 0, futureNcrs: 0, activePointsDeducted: 0, totalHistoricalDeductions: 0,
      currentPoints: STARTING_POINTS, validationIssues: []};
    records.forEach((record, index) => {
      if (!record || typeof record !== 'object') throw new TypeError('Each NCR must be a record.');
      const magnitude = Math.abs(getCategoryPenalty(record.categoryKey));
      // Invalid/missing dates throw: never present a misleading resolved score.
      const status = getNcrStatus(record.ncrDate, currentKsaDate);
      summary.totalHistoricalDeductions += magnitude;
      if (status === 'Active') { summary.activeNcrs++; summary.activePointsDeducted += magnitude; }
      else if (status === 'Expired') summary.expiredNcrs++;
      else {
        summary.futureNcrs++;
        summary.validationIssues.push({index, reason: 'Future NCR Date: not yet active; no points deducted.'});
      }
    });
    summary.currentPoints = STARTING_POINTS - summary.activePointsDeducted;
    return summary;
  }

  function countActiveNcrs(records, asOf) { return summarizeNcrs(records, asOf).activeNcrs; }
  function countExpiredNcrs(records, asOf) { return summarizeNcrs(records, asOf).expiredNcrs; }
  function countHistoricalNcrs(records, asOf) { return summarizeNcrs(records, asOf).totalNcrs; }
  function getActivePointsDeducted(records, asOf) { return summarizeNcrs(records, asOf).activePointsDeducted; }
  function getCurrentDriverScore(records, asOf) { return summarizeNcrs(records, asOf).currentPoints; }

  function filterDriversByPoints(drivers, {exact, min, max} = {}) {
    const parseBound = value => {
      if (value === undefined || value === null || value === '') return null;
      if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value))) {
        throw new RangeError('Points filters must contain finite numbers.');
      }
      return Number(value);
    };
    const exactValue = parseBound(exact), minValue = parseBound(min), maxValue = parseBound(max);
    if (minValue !== null && maxValue !== null && minValue > maxValue) throw new RangeError('Minimum points must not exceed maximum points.');
    return drivers.filter(driver => {
      const points = driver.currentPoints;
      if (typeof points !== 'number' || !Number.isFinite(points)) throw new RangeError('Driver points are unresolved.');
      return (exactValue === null || points === exactValue) && (minValue === null || points >= minValue) && (maxValue === null || points <= maxValue);
    });
  }

  return Object.freeze({STARTING_POINTS, ACTIVE_CALENDAR_DAYS, CATEGORIES, getCategoryPenalty,
    parseIsoDate, getExpiryDate, getKsaDate, getNcrStatus, getTbtStatus, summarizeNcrs,
    countActiveNcrs, countExpiredNcrs, countHistoricalNcrs, getActivePointsDeducted,
    getCurrentDriverScore, filterDriversByPoints});
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TaxiQaidNcrPolicy;
