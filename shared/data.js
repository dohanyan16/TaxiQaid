/** TaxiQaid: legacy transport is disabled; existing authorization is preserved. */

    function updateAllFleetAccidentCounts() {
      fleetDatabase.forEach(v => {
        const plate = normalizePlate(v["Plate"] ?? v["plate"]);
        const count = plate ? accidentsDatabase.filter(acc => normalizePlate(acc["Car Plate"] ?? acc["car plate"]) === plate).length : 0;
        v["Accidents"] = count;
      });
    }

    // --- VEHICLE PLATE HELPERS (FLEET AND DRIVER RELATIONSHIP) ---
    function normalizePlate(p) {
      return String(p || "").replace(/[\s\-_.]/g, "").toLowerCase();
    }

    function getAssignedDrivers(plate) {
      const target = normalizePlate(plate);
      if (!target) return [];
      return driversDatabase.filter(d => normalizePlate(d["Car Plate"] || d["car plate"]) === target);
    }

    // Operational records remain empty until the new database is integrated.
    async function readSheetRecords(url) {
      throw new Error("Database integration pending");
}

    async function exportLatestSheetData(button, refresh, writeExport) {
      showIntegrationPending();
}

// Only authorized reference reads can populate cross-module dropdowns.
// This never reactivates legacy Google / Apps Script transports or writes.
let driverReferenceRead=0,fleetReferenceRead=0;
async function fetchDrivers({signal}={}){
 if(typeof TaxiQaidModules!=='undefined'&&TaxiQaidModules.current?.()==='drivers')
  return typeof refreshDriverPreview==='function'?refreshDriverPreview():false;
 const sequence=++driverReferenceRead,uid=TaxiQaidAccess.getUid(),page=TaxiQaidModules.current();
 if(!TaxiQaidAccess.can('drivers.view')){driversDatabase=[];return false;}
 try{
  const result=await TaxiQaidSources.read('drivers',{signal});
  if(sequence!==driverReferenceRead||!result.connected||signal?.aborted||page!==TaxiQaidModules.current()||uid!==TaxiQaidAccess.getUid()||!TaxiQaidAccess.can('drivers.view'))return false;
  driversDatabase=result.records.map(row=>TaxiQaidSheetsModel.frontend('drivers',row));
  return true;
 }catch{
  if(sequence===driverReferenceRead&&!signal?.aborted&&page===TaxiQaidModules.current()&&uid===TaxiQaidAccess.getUid())driversDatabase=[];
  return false;
 }
}
async function fetchFleet({signal}={}){
 if(typeof TaxiQaidModules!=='undefined'&&TaxiQaidModules.current?.()==='fleet')
  return typeof refreshFleetPreview==='function'?refreshFleetPreview():false;
 const sequence=++fleetReferenceRead,uid=TaxiQaidAccess.getUid(),page=TaxiQaidModules.current();
 if(!TaxiQaidAccess.can('fleet.view')){fleetDatabase=[];return false;}
 try{
  const result=await TaxiQaidSources.read('fleet',{signal});
  if(sequence!==fleetReferenceRead||!result.connected||signal?.aborted||page!==TaxiQaidModules.current()||uid!==TaxiQaidAccess.getUid()||!TaxiQaidAccess.can('fleet.view'))return false;
  fleetDatabase=result.records.map(row=>TaxiQaidSheetsModel.frontend('fleet',row));
  return true;
 }catch{
  if(sequence===fleetReferenceRead&&!signal?.aborted&&page===TaxiQaidModules.current()&&uid===TaxiQaidAccess.getUid())fleetDatabase=[];
  return false;
 }
}
async function fetchTripChecks(){return typeof refreshTripCheckPreview==='function'?refreshTripCheckPreview():false;}
