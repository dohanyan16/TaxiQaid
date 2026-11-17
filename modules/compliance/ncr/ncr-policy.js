/** Approved NCR rules. Pure functions take an explicit authoritative KSA date. */
const TaxiQaidNcrPolicy = (() => {
  'use strict';
  const STARTING_POINTS = 100;
  const ACTIVE_CALENDAR_DAYS = 180;
  const CATEGORIES = Object.freeze([
  {
    "severity": "Severe",
    "label": "Tampering with any CCTV Cameras",
    "points": 25,
    "key": "cctv-tampering",
    "penalty": -25
  },
  {
    "severity": "Severe",
    "label": "Money corruption, fraud disloyalty",
    "points": 25,
    "key": "money-corruption",
    "penalty": -25
  },
  {
    "severity": "Severe",
    "label": "Transporting passengers without money or carrying unauthorized goods in car",
    "points": 25,
    "key": "unauthorized-transport",
    "penalty": -25
  },
  {
    "severity": "Medium",
    "label": "Damaging TaxiQaid asset such as car body, office building, etc…",
    "points": 15,
    "key": "asset-damage",
    "penalty": -15
  },
  {
    "severity": "Medium",
    "label": "Smoking inside the car, office, accommodation, or any prohibited area",
    "points": 15,
    "key": "smoking",
    "penalty": -15
  },
  {
    "severity": "Medium",
    "label": "Reckless driving, including drifting the vehicle, without causing damage",
    "points": 15,
    "key": "reckless-driving",
    "penalty": -15
  },
  {
    "severity": "Medium",
    "label": "Not wearing full uniform / not maintaining good hygiene",
    "points": 15,
    "key": "uniform-hygiene",
    "penalty": -15
  },
  {
    "severity": "Medium",
    "label": "Using car for personal use",
    "points": 15,
    "key": "personal-vehicle-use",
    "penalty": -15
  },
  {
    "severity": "Medium",
    "label": "Station Depot violations (speeding, littering, parking wrong)",
    "points": 15,
    "key": "depot-violations",
    "penalty": -15
  },
  {
    "severity": "Minor",
    "label": "Engaging in fights/arguments with anyone e.g. TaxiQaid employees or passengers",
    "points": 5,
    "key": "fights-arguments",
    "penalty": -5
  },
  {
    "severity": "Medium",
    "label": "Using phone while driving and not fastening the seat belt while driving",
    "points": 15,
    "key": "phone-seat-belt",
    "penalty": -15
  },
  {
    "severity": "Minor",
    "label": "Failure to log-in to the MDT device",
    "points": 5,
    "key": "mdt-login",
    "penalty": -5
  },
  {
    "severity": "Minor",
    "label": "Failing to report incidents to OCC",
    "points": 5,
    "key": "occ-reporting",
    "penalty": -5
  },
  {
    "severity": "Minor",
    "label": "Presenting unprofessional or rude behavior toward anyone",
    "points": 5,
    "key": "unprofessional-behavior",
    "penalty": -5
  },
  {
    "severity": "Minor",
    "label": "Placing blankets or luggage, or sleeping in car.",
    "points": 5,
    "key": "vehicle-sleeping-luggage",
    "penalty": -5
  },
  {
    "severity": "Minor",
    "label": "Non-compliance with the scope and description of alerts issued by TaxiQaid",
    "points": 5,
    "key": "alerts-instructions",
    "penalty": -5
  },
  {
    "severity": "Minor",
    "label": "Any action or behavior that harms TaxiQaid business and not listed in above",
    "points": 5,
    "key": "harmful-conduct",
    "penalty": -5
  },
  {
    "severity": "Minor",
    "label": "Non-compliance with rules at third-party sites where TaxiQaid operates",
    "points": 5,
    "key": "third-party-site-rules",
    "penalty": -5
  },
  {
    "severity": "Minor",
    "label": "Staying for long time on one location",
    "points": 5,
    "key": "excessive-stay",
    "penalty": -5
  },
  {
    "severity": "Medium",
    "label": "If driver is absent without permeation",
    "points": 15,
    "key": "unauthorized-absence",
    "penalty": -15
  },
  {
    "severity": "Minor",
    "label": "Eating while driving",
    "points": 5,
    "key": "eating-while-driving",
    "penalty": -5
  },
  {
    "severity": "Minor",
    "label": "MDT Black Shift",
    "points": 10,
    "key": "mdt-black-shift",
    "penalty": -10
  },
  {
    "severity": "Medium",
    "label": "Not complying with PASSENGER PICKUP & DROP-OFF RULES",
    "points": 15,
    "key": "pickup-dropoff-rules",
    "penalty": -15
  }
].map(Object.freeze));
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
    return currentKsaDate >= expiryDate ? 'Expiry' : 'Active';
  }

  function getTbtStatus(conductedDate) {
    if (conductedDate === '' || conductedDate === null || conductedDate === undefined) return 'No';
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
      const original=record.points??record.penalty;
      if(original!==undefined&&(!Number.isFinite(original)||original===0))throw new RangeError('Invalid historical NCR points.');
      const magnitude = original===undefined?Math.abs(getCategoryPenalty(record.categoryKey)):Math.abs(original);
      // Invalid/missing dates throw: never present a misleading resolved score.
      const status = getNcrStatus(record.ncrDate, currentKsaDate);
      summary.totalHistoricalDeductions += magnitude;
      if (status === 'Active') { summary.activeNcrs++; summary.activePointsDeducted += magnitude; }
      else if (status === 'Expiry') summary.expiredNcrs++;
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


  // Only a new record receives a new frequency; stored historical values are never rewritten.
  function nextFrequency(records, iqama, ncrDate) {
    parseIsoDate(ncrDate);
    const dates=records.filter(r=>r.iqama===iqama).map(r=>r.ncrDate).sort();dates.forEach(parseIsoDate);
    if(dates.some(d=>d>ncrDate))throw new RangeError('Backdated frequency requires administrative review.');
    let count=0,previous=null;
    for(const day of [...dates,ncrDate]){if(previous===null||parseIsoDate(day)-parseIsoDate(previous)>=180*86400000)count=1;else count++;previous=day;}
    const suffix=count%100>=11&&count%100<=13?'th':({1:'st',2:'nd',3:'rd'}[count%10]||'th');
    return count+suffix+' NCR Initiated';
  }
  function driverDocument(record){return Object.freeze({category:record.category,description:record.description,individualStatement:record.individualStatement});}

  return Object.freeze({nextFrequency,driverDocument,STARTING_POINTS, ACTIVE_CALENDAR_DAYS, CATEGORIES, getCategoryPenalty,
    parseIsoDate, getExpiryDate, getKsaDate, getNcrStatus, getTbtStatus, summarizeNcrs,
    countActiveNcrs, countExpiredNcrs, countHistoricalNcrs, getActivePointsDeducted,
    getCurrentDriverScore, filterDriversByPoints});
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TaxiQaidNcrPolicy;
