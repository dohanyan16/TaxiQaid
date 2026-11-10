/** Pure roster validation and location rules. No requests or operational storage. */
const TaxiQaidRosterModel = (() => {
  const DAYS = Object.freeze(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
  const SHIFTS = Object.freeze(['Day Shift','Night Shift']);
  const clean = value => String(value ?? '').trim();
  const rest = value => clean(value).toUpperCase() === 'REST DAY';
  function normalize(value) {
    return clean(value).normalize('NFKC').toLowerCase().replace(/[\u2010-\u2015\u2212]/g,'-')
      .replace(/[\u2018\u2019]/g,"'").replace(/\s*-\s*/g,'-').replace(/\s+/g,' ');
  }
  const plateKey = value => normalize(value).replace(/[\s_.-]/g,'');
  function isoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use an unambiguous YYYY-MM-DD calendar date.');
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) throw new Error('Invalid calendar date.');
    return value;
  }
  function addDays(value, days) {
    const date = new Date(isoDate(value) + 'T00:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);
  }
  function excelDate(value, date1904=false) {
    if (value instanceof Date) return isoDate(value.toISOString().slice(0,10));
    if (typeof value === 'string') return isoDate(value.trim());
    if (!Number.isInteger(value) || value < (date1904 ? 0 : 1) || (!date1904 && value === 60)) throw new Error('Row 2 must contain valid whole Excel dates.');
    const epoch = date1904 ? '1904-01-01' : '1899-12-31';
    return addDays(epoch, value - (!date1904 && value > 60 ? 1 : 0));
  }
  function time(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(clean(value));
    if (!match || +match[1] > 23 || +match[2] > 59) throw new Error('Working times must use valid 24-hour HH:MM values.');
    return match[1].padStart(2,'0') + ':' + match[2];
  }
  const minutes = value => Number(value.slice(0,2))*60+Number(value.slice(3));
  function parseAssignment(value, plate, date, shift) {
    if (rest(value)) {
      if (!rest(plate)) throw new Error('A Rest Day must appear in both assignment and vehicle rows.');
      return {date,shift,duty:'Rest Day',start:'',end:'',plate:'',zone:'',stop:'',endDate:'',crossMidnight:false};
    }
    const match = /^\s*\((\d{1,2}:\d{2})\)\s*-\s*\((\d{1,2}:\d{2})\)\s*-\s*Zone:\s*(.*?)\s*-\s*Stop:\s*(.*?)\s*$/i.exec(clean(value));
    if (!match || !match[3] || !match[4]) throw new Error('Expected (HH:MM)-(HH:MM)-Zone: name - Stop: name. Missing assignments are not Rest Days.');
    const start = time(match[1]), end = time(match[2]);
    if (start === end) throw new Error('Identical starting and ending times require clarification.');
    if (!clean(plate) || rest(plate)) throw new Error('A working assignment requires its corresponding vehicle row.');
    const crossMidnight = minutes(end) < minutes(start);
    return {date,shift,duty:'Working',start,end,plate:clean(plate),zone:clean(match[3]),stop:clean(match[4]),
      endDate:crossMidnight?addDays(date,1):date,crossMidnight};
  }
  function parseRows(rows, shift, {date1904=false}={}) {
    const issues=[],drivers=[];
    const issue = (row,column,message) => issues.push({severity:'Error',source:shift,row,column,message});
    if (!SHIFTS.includes(shift)) throw new Error('Unknown shift type.');
    if (!Array.isArray(rows) || rows.length > 20002) return {ok:false,drivers,week:[],issues:[{severity:'Error',source:shift,message:'A source supports at most 10,000 paired driver rows.'}]};
    const cell = (row,column) => {
      const entry=rows[row]?.[column];
      if (entry && typeof entry === 'object' && !(entry instanceof Date)) {
        if (entry.f) throw new Error('Formula cells are not supported; provide reviewed values.');
        return entry.v ?? '';
      }
      return entry ?? '';
    };
    let week=[];
    try {
      week=DAYS.map((_,index)=>excelDate(cell(1,index+3),date1904));
      if (new Date(week[0]+'T00:00:00Z').getUTCDay() !== 0 || week.some((date,index)=>date!==addDays(week[0],index))) throw new Error('The seven dates must run consecutively from Sunday through Saturday.');
    } catch (error) {issue(2,'D–J',error.message);return {ok:false,week:[],drivers,issues};}
    const used = new Set();
    for (let row=2;row<rows.length;row+=2) {
      try {
        const values=[0,1].flatMap(offset=>Array.from({length:9},(_,index)=>cell(row+offset,index+1)));
        if (values.every(value=>!clean(value))) continue;
        if (values.some(value=>clean(value).length>4096)) throw new Error('A cell exceeds the supported 4,096-character limit.');
        const name=clean(cell(row,1)),iqama=clean(cell(row,2));
        if (!name || !/^\d{10}$/.test(iqama)) throw new Error('Each driver pair needs a Driver Name in column B and a ten-digit Driver Iqama in column C.');
        if (clean(cell(row+1,1)) || clean(cell(row+1,2))) throw new Error('The second row must contain vehicle assignments, not another driver identity.');
        if (used.has(iqama)) issue(row+1,'C','Duplicate Driver Iqama within this shift.');
        used.add(iqama);
        const assignments=[];
        for (let day=0;day<7;day++) {
          try {assignments.push(parseAssignment(cell(row,day+3),cell(row+1,day+3),week[day],shift));}
          catch(error){issue(row+1,DAYS[day],error.message);}
        }
        drivers.push({iqama,name,shift,assignments,sourceRow:row+1});
      } catch(error){issue(row+1,'B–J',error.message);}
    }
    return {ok:!issues.length,week,drivers,issues};
  }
  function interval(assignment) {
    // Explicit KSA offsets avoid browser locale, daylight-saving and host-timezone differences.
    return [Date.parse(assignment.date+'T'+assignment.start+':00+03:00'),Date.parse(assignment.endDate+'T'+assignment.end+':00+03:00')];
  }
  function combine(day, night) {
    const issues=[...day.issues,...night.issues];
    if (!day.ok || !night.ok) return {ok:false,issues};
    if (day.week.join()!==night.week.join()) return {ok:false,issues:[{severity:'Error',source:'Combined',message:'Day Shift and Night Shift files must refer to the same week.'}]};
    const drivers=[...day.drivers,...night.drivers],seen=new Set(),vehicles=new Map();
    const problem = (driver,message) => issues.push({severity:'Error',source:driver.shift,row:driver.sourceRow,message});
    drivers.forEach(driver=>{
      if (seen.has(driver.iqama)) problem(driver,'Duplicate Driver Iqama across the uploaded sources.');
      seen.add(driver.iqama);
      const work=driver.assignments.filter(a=>a.duty==='Working').map(a=>({assignment:a,span:interval(a)})).sort((a,b)=>a.span[0]-b.span[0]);
      work.forEach((item,index)=>{
        if (index && work[index-1].span[1]>item.span[0]) problem(driver,'Overlapping working assignments for this driver.');
        const key=plateKey(item.assignment.plate);
        if(!vehicles.has(key))vehicles.set(key,[]);
        vehicles.get(key).push({...item,driver});
      });
    });
    // Report every affected assignment once, without allocating one issue per conflicting pair.
    const reported=new Set();
    function vehicleConflict(entry) {
      const key=entry.driver.iqama+'|'+entry.assignment.date;
      if(!reported.has(key)){reported.add(key);problem(entry.driver,'Conflicting vehicle assignment on '+entry.assignment.date+'.');}
    }
    vehicles.forEach(entries=>{
      entries.sort((a,b)=>a.span[0]-b.span[0]);let furthest=[];
      entries.forEach(entry=>{
        // Two distinct owners are enough to find the latest end excluding the current driver,
        // even when another validation issue already flags that driver's own overlapping shifts.
        const other=furthest.find(previous=>previous.driver.iqama!==entry.driver.iqama);
        if(other&&other.span[1]>entry.span[0]){vehicleConflict(other);vehicleConflict(entry);}
        const same=furthest.find(previous=>previous.driver.iqama===entry.driver.iqama);
        const latest=same&&same.span[1]>entry.span[1]?same:entry;
        furthest=[...furthest.filter(previous=>previous.driver.iqama!==entry.driver.iqama),latest]
          .sort((a,b)=>b.span[1]-a.span[1]).slice(0,2);
      });
    });
    if(issues.length)return {ok:false,issues};
    return {ok:true,issues:[],week:day.week,drivers,counts:{day:day.drivers.length,night:night.drivers.length,total:seen.size}};
  }
  function mapUrl(location) {
    if (!location || typeof location.latitude!=='number' || typeof location.longitude!=='number' || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || Math.abs(location.latitude)>90 || Math.abs(location.longitude)>180) throw new Error('Valid latitude (−90 to 90) and longitude (−180 to 180) are required.');
    return 'https://www.google.com/maps/search/?api=1&query='+location.latitude+','+location.longitude;
  }
  function validateLocations(input) {
    if (!input || input.schemaVersion!==1 || input.coordinateOrder!=='latitude,longitude' || !Array.isArray(input.locations) || input.locations.length>10000) throw new Error('Use a version 1 latitude,longitude location catalog with at most 10,000 stops.');
    function group(records) {
      if(!Array.isArray(records))throw new Error('Location groups must be arrays.');
      const identifiers=new Set();
      return records.map(record=>{
        const name=clean(record.name);
        if (!name || name.length>256)throw new Error('Stop Name is required and must be at most 256 characters.');
        mapUrl(record);
        if(record.aliases!==undefined&&!Array.isArray(record.aliases))throw new Error('Aliases must be an array of names.');
        const aliases=(record.aliases||[]).map(clean);
        [name,...aliases].forEach(value=>{
          const key=normalize(value);if(!key || value.length>256 || identifiers.has(key))throw new Error('Duplicate or empty location name/alias: '+value);
          identifiers.add(key);
        });
        return {name,latitude:record.latitude,longitude:record.longitude,aliases,remarks:clean(record.remarks).slice(0,4096)};
      });
    }
    // Zone mappings are explicit and separate: stop coordinates never imply a zone destination.
    return {schemaVersion:1,description:'TaxiQaid named locations; local configuration only.',coordinateOrder:'latitude,longitude',locations:group(input.locations),zones:group(input.zones||[])};
  }
  function findLocation(catalog, name, kind='stop') {
    const key=normalize(name);if(!key)return null;
    return (kind==='zone'?catalog.zones:catalog.locations)?.find(item=>[item.name,...(item.aliases||[])].some(value=>normalize(value)===key))||null;
  }
  function updateLocation(catalog,entry,index=-1) {
    const locations=catalog.locations.map(item=>({...item,aliases:[...item.aliases]}));
    if(index<0)locations.push(entry);else {
      if(!locations[index])throw new Error('The selected stop no longer exists.');
      locations[index]=entry;
    }
    return validateLocations({...catalog,locations});
  }
  function similarNames(catalog,name,index=-1) {
    const tokens=value=>new Set(normalize(value).split(/[\s-]+/).filter(Boolean));
    const desired=tokens(name);
    return catalog.locations.filter((item,i)=>{
      if(i===index)return false;const other=tokens(item.name),common=[...desired].filter(token=>other.has(token)).length;
      return common && common/Math.max(desired.size,other.size)>=0.6;
    }).map(item=>item.name);
  }
  function mappings(roster,catalog) {
    const used=[...new Set((roster?.drivers||[]).flatMap(driver=>driver.assignments.filter(a=>a.duty==='Working').map(a=>a.stop)))];
    const unmatched=used.filter(name=>!findLocation(catalog,name));
    return {used:used.length,matched:used.length-unmatched.length,unmatched,missingCoordinates:unmatched.length,aliasConflicts:0};
  }
  function daily(roster) {
    return (roster?.drivers||[]).flatMap(driver=>driver.assignments.map(a=>({'Driver Name':driver.name,'Driver Iqama':driver.iqama,'Car Plate':a.plate,...a})));
  }
  function filename(driver) {
    const safe=value=>clean(value).normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'Driver';
    return safe(driver.iqama)+'_'+safe(driver.name)+'.pdf';
  }
  return Object.freeze({DAYS,SHIFTS,normalize,plateKey,isoDate,addDays,excelDate,time,parseAssignment,parseRows,combine,interval,mapUrl,validateLocations,findLocation,updateLocation,similarNames,mappings,daily,filename});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidRosterModel;
