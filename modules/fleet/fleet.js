/**
 * TaxiQaid | fleet.js
 * Purpose: Fleet lookup, assigned drivers, availability rules, and save.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    // --- FLEET MANAGEMENT LOGIC ---

    // Read-only odometer values derived from the latest Post-Trip for each plate.
    // The Fleet sheet remains the fallback and is never overwritten with these values.
    let fleetPostTripReadings = new Map();
    let fleetRefreshSequence = 0;

    function isFleetInspectionDate(date) {
      const value = new Date(`${date}T00:00:00Z`);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(value.getTime()) &&
        value.toISOString().slice(0, 10) === date;
    }

    function normalizeFleetInspectionDateTime(dateValue, timeValue) {
      // Sheets may return formatted cells or serialized Date objects. Convert
      // zoned timestamps explicitly to Riyadh, never the browser's timezone.
      function ksaParts(value) {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
            !isFleetInspectionDate(value.slice(0, 10))) return null;
        const timestamp = new Date(value);
        if (!Number.isFinite(timestamp.getTime())) return null;
        return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
        }).formatToParts(timestamp).map(part => [part.type, part.value]));
      }

      let date = String(dateValue ?? "").trim();
      let time = String(timeValue ?? "").trim();
      if (date.includes("T")) {
        const parts = ksaParts(date);
        if (!parts) return null;
        date = `${parts.year}-${parts.month}-${parts.day}`;
      } else {
        // Match the day/month/year convention used by Trip Check's legacy records.
        const legacy = date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (legacy) date = `${legacy[3]}-${legacy[2].padStart(2, "0")}-${legacy[1].padStart(2, "0")}`;
      }
      if (time.includes("T")) {
        const parts = ksaParts(time);
        if (!parts) return null;
        time = `${parts.hour}:${parts.minute}:${parts.second}`;
      }
      const clock = time.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM)?$/i);
      if (!isFleetInspectionDate(date) || !clock) return null;
      let hour = Number(clock[1]);
      if (clock[4]) {
        if (hour < 1 || hour > 12) return null;
        hour = hour % 12 + (clock[4].toUpperCase() === "PM" ? 12 : 0);
      } else if (hour > 23) return null;
      time = `${String(hour).padStart(2, "0")}:${clock[2]}:${clock[3] || "00"}`;
      return { date, time, sortKey: `${date}T${time}` };
    }

    function buildLatestPostTripReadings(records) {
      const latest = new Map();
      for (const record of records) {
        const plate = normalizePlate(record["Car Plate"] ?? record["car plate"]);
        const inspection = normalizeFleetInspectionDateTime(
          record["Date"] ?? record["date"], record["Time"] ?? record["time"]);
        const kmRaw = record["Odometer (KM)"] ?? record["odometer (km)"];
        const km = Number(kmRaw);
        if (!plate || !inspection || !["number", "string"].includes(typeof kmRaw) ||
            String(kmRaw).trim() === "" || !Number.isFinite(km) || km < 0) continue;

        // Date and time are stored as KSA local values by the Trip Check server.
        // A corrected older inspection must not supersede a newer inspection.
        const previous = latest.get(plate);
        if (!previous || inspection.sortKey >= previous.sortKey) {
          latest.set(plate, { km, ...inspection });
        }
      }
      return latest;
    }

    function getFleetOdometer(vehicle) {
      const plate = normalizePlate(vehicle["Plate"] ?? vehicle["plate"]);
      const latest = fleetPostTripReadings.get(plate);
      if (latest) return { value: latest.km, source: latest };
      return { value: vehicle["Total Km"] ?? vehicle["Total KM"] ?? vehicle["total km"] ?? "", source: null };
    }

    function showFleetOdometer(vehicle) {
      const reading = getFleetOdometer(vehicle);
      const cell = document.getElementById("f-val-km");
      cell.replaceChildren();
      const value = document.createElement("span");
      value.textContent = reading.value === "" ? "-" : String(reading.value);
      cell.appendChild(value);
      if (reading.source) {
        const source = document.createElement("small");
        source.textContent = `Latest Post-Trip: ${formatDateForDisplay(reading.source.date)} ${reading.source.time.slice(0, 5)} (KSA)`;
        source.style.display = "block";
        source.style.marginTop = "4px";
        source.style.fontWeight = "normal";
        source.style.color = "var(--text-muted)";
        cell.appendChild(source);
      }
    }
    let currentActiveVehicle = null;
    let isFleetEditMode = false;
    const fleetPlateInput = document.getElementById("fleet-plate-input");
    const toggleFleetBtn = document.getElementById("toggle-fleet-btn");
    const fleetDropdown = document.getElementById("fleet-dropdown");
    const fleetProfileContainer = document.getElementById("fleet-profile-container");
    const editFleetBtn = document.getElementById("edit-fleet-btn");
    const cancelFleetEditBtn = document.getElementById("cancel-fleet-edit-btn");

    function clearFleetSelection() {
      fleetPlateInput.value = '';
      fleetProfileContainer.style.display = 'none';
      currentActiveVehicle = null;
    }
    const fleetSearch = setupSearchDropdown({
      input:'fleet-plate-input', btn:'toggle-fleet-btn', dd:'fleet-dropdown', config:'fleet', paginate:true,
      getData:()=>fleetDatabase, apply:()=>{fleetProfileContainer.style.display='none';currentActiveVehicle=null;fleetOverviewPage=0;renderFleetOverview();},
      onSelect:renderVehicleProfile
    });


    let fleetOverviewPage=0,fleetSourceConnected=false;
    function renderFleetOverview(){
      const columns=TaxiQaidSheetsModel.fleet,filtered=fleetDatabase.filter(r=>fleetSearch.matches(r)),pages=Math.max(1,Math.ceil(filtered.length/25));fleetOverviewPage=Math.min(fleetOverviewPage,pages-1);
      const head=document.querySelector('#fleet-overview thead');head.replaceChildren();const tr=document.createElement('tr');for(const label of columns){const th=document.createElement('th');th.textContent=label;tr.append(th);}head.append(tr);
      const records=filtered.slice(fleetOverviewPage*25,(fleetOverviewPage+1)*25);TaxiQaidPeopleUI.table('fleet-overview',records,columns,renderVehicleProfile);
      [...document.querySelectorAll('#fleet-overview tbody tr')].forEach((row,i)=>{if(records[i])row.addEventListener('click',()=>renderVehicleProfile(records[i]));});
      if(!filtered.length&&fleetSourceConnected)document.querySelector('#fleet-overview .table-empty').textContent='0 authorized records.';
      document.getElementById('fleet-previous').disabled=fleetOverviewPage===0;document.getElementById('fleet-next').disabled=fleetOverviewPage+1>=pages;document.getElementById('fleet-page').textContent='Page '+(fleetOverviewPage+1)+' of '+pages+' — '+filtered.length+' records';
    }
    document.getElementById('fleet-previous').addEventListener('click',()=>{fleetOverviewPage--;renderFleetOverview();});document.getElementById('fleet-next').addEventListener('click',()=>{fleetOverviewPage++;renderFleetOverview();});
    renderFleetOverview();
    function renderVehicleProfile(vehicle) {
      currentActiveVehicle = vehicle;
      isFleetEditMode = false;
      editFleetBtn.textContent = "Edit Vehicle Details";
      editFleetBtn.style.background = "var(--primary)";
      cancelFleetEditBtn.style.display = "none";

      const plateStr = String(vehicle["Plate"] || vehicle["plate"] || "");
      const assignedDrivers=vehicle._relationships==='verified'?vehicle._assignedDrivers.map(d=>({"Full Name":d.name,"Iqama Number":d.iqama})):getAssignedDrivers(plateStr);

      const driverTags=document.createElement('div');driverTags.className='driver-tag-box';
      if(!assignedDrivers.length){const empty=document.createElement('span');empty.className='no-assigned-drivers';empty.textContent=vehicle._relationships==='verified'?'No drivers assigned':String(vehicle['Assigned Driver']||'Assignment source unavailable');driverTags.append(empty);}
      assignedDrivers.forEach((d,index)=>{const tag=document.createElement('div');tag.className='driver-tag';const label=document.createElement('strong');label.textContent='Driver '+(index+1)+': ';tag.append(label,document.createTextNode(String(d['Full Name']||d.name||'')+' | Iqama: '+String(d['Iqama Number']||d.iqama||'')+(d.Shift||d.shift?' ('+(d.Shift||d.shift)+')':'')));driverTags.append(tag);});
      let currentAvailability = vehicle["Availability"] || vehicle["availability"] || "Unavailable";
      if(vehicle._relationships==='verified')currentAvailability=assignedDrivers.length?"Assigned":"Unassigned";else if(assignedDrivers.length>0)currentAvailability="Assigned";

      document.getElementById("profile-vehicle-name").textContent = plateStr + " - Profile";
      document.getElementById("f-val-plate").textContent = plateStr || "-";
      document.getElementById("f-val-brand").textContent = vehicle["Brand"] || vehicle["brand"] || "-";
      document.getElementById("f-val-model").textContent = vehicle["Model"] || vehicle["model"] || "-";
      document.getElementById("f-val-vin").textContent = vehicle["VIN"] || vehicle["vin"] || "-";
      document.getElementById("f-val-fuel").textContent = vehicle["Fuel Type"] || vehicle["fuel type"] || "-";
      document.getElementById("f-val-assigned-drivers").replaceChildren(driverTags);
      showFleetOdometer(vehicle);
      document.getElementById("f-val-availability").textContent = currentAvailability;
      document.getElementById("f-val-accidents").textContent = String(vehicle["Accidents"] ?? "") || "-";
      document.getElementById("f-val-mantenimiento").textContent = formatDateForDisplay(vehicle["Last Maintenance"] || vehicle["last maintenance"]);
      document.getElementById("f-val-oil").textContent = formatDateForDisplay(vehicle["Last Oil Change"] || vehicle["last oil change"]);
      document.getElementById("f-val-ins-start").textContent = formatDateForDisplay(vehicle["Insurance Start Date"] || vehicle["insurance start date"]);
      document.getElementById("f-val-ins-exp").textContent = formatDateForDisplay(vehicle["Insurance Expiry Date"] || vehicle["insurance expiry date"]);
      document.getElementById("f-val-op-start").textContent = formatDateForDisplay(vehicle["Operation Card Start Date"] || vehicle["operation card start date"]);
      document.getElementById("f-val-op-exp").textContent = formatDateForDisplay(vehicle["Operation Card Expiry Date"] || vehicle["operation card expiry date"]);

      fleetProfileContainer.style.display = "block";
    }

    let fleetReadSignal=null;
    async function refreshFleetPreview({signal=fleetReadSignal}={}) {
      const sequence=++fleetRefreshSequence,status=document.getElementById('fleet-sync-status');status.textContent='Loading authorized vehicles…';
      try{const result=await TaxiQaidSources.read('fleet',{signal});if(sequence!==fleetRefreshSequence||signal?.aborted)return result;
        fleetSourceConnected=result.connected;fleetDatabase=result.connected?result.records.map(r=>TaxiQaidSheetsModel.frontend('fleet',r)):[];fleetSearch.clear();currentActiveVehicle=null;fleetProfileContainer.style.display='none';status.textContent=result.message+(result.connected&&result.records.some(r=>r.relationships!=='verified')?' Driver assignment source unavailable; source values preserved.':'');TaxiQaidModules.fresh('fleet');return result;
      }catch(error){if(error.name!=='AbortError'){status.textContent=error.message+' Previously loaded data may be out of date.';return {connected:false,message:status.textContent};}throw error;}
    }
    async function refreshFleetData(){return fetchFleet();}
    function isFleetPostTripSynced(plate) {
      const normalized = normalizePlate(plate);
      const vehicle = fleetDatabase.find(v => normalizePlate(v["Plate"] ?? v["plate"]) === normalized);
      const latest = fleetPostTripReadings.get(normalized);
      const sheetKm = vehicle && (vehicle["Total Km"] ?? vehicle["Total KM"] ?? vehicle["total km"]);
      return Boolean(vehicle && latest && ["number", "string"].includes(typeof sheetKm) &&
        String(sheetKm).trim() !== "" && Number(sheetKm) === latest.km);
    }

document.getElementById('refresh-fleet-btn').addEventListener('click',()=>{void refreshFleetData().catch(()=>{});});
document.getElementById('export-fleet-excel-btn').addEventListener('click',event=>{void TaxiQaidSources.exportExcel('fleet',event.currentTarget).catch(error=>document.getElementById('fleet-sync-status').textContent=error.message);});
TaxiQaidModules.register('fleet',{onEnter:options=>{fleetReadSignal=options.signal;return refreshFleetPreview(options);},onReset:()=>{fleetRefreshSequence++;fleetDatabase=[];fleetSearch.clear();currentActiveVehicle=null;fleetPostTripReadings.clear();fleetProfileContainer.style.display='none';document.querySelectorAll('#fleet-profile-container [id^=f-val-]').forEach(e=>e.replaceChildren());}});
