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
      return { value: vehicle["Total KM"] ?? vehicle["total km"] ?? "", source: null };
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
      input:'fleet-plate-input', btn:'toggle-fleet-btn', dd:'fleet-dropdown', config:'fleet',
      getData:()=>fleetDatabase, apply:()=>{fleetProfileContainer.style.display='none';currentActiveVehicle=null;},
      onSelect:renderVehicleProfile
    });

    function renderVehicleProfile(vehicle) {
      currentActiveVehicle = vehicle;
      isFleetEditMode = false;
      editFleetBtn.textContent = "Edit Vehicle Details";
      editFleetBtn.style.background = "var(--primary)";
      cancelFleetEditBtn.style.display = "none";

      const plateStr = String(vehicle["Plate"] || vehicle["plate"] || "");
      const assignedDrivers = getAssignedDrivers(plateStr);

      let driversHtml = "";
      if (assignedDrivers.length === 0) {
        driversHtml = `<span style="color: var(--text-muted); font-weight: normal;">No drivers assigned</span>`;
      } else {
        driversHtml = `<div class="driver-tag-box">`;
        assignedDrivers.forEach((d, idx) => {
          const shiftText = d["Shift"] || d["shift"] ? ` (${d["Shift"] || d["shift"]})` : '';
          driversHtml += `
            <div class="driver-tag">
              <strong>Driver ${idx + 1}:</strong> ${d["Full Name"] || d["name"]} | <strong>Iqama:</strong> ${d["Iqama Number"] || d["iqama"]}${shiftText}
            </div>`;
        });
        driversHtml += `</div>`;
      }

      let currentAvailability = vehicle["Availability"] || vehicle["availability"] || "Unassigned";
      if (assignedDrivers.length > 0) currentAvailability = "Assigned";

      document.getElementById("profile-vehicle-name").textContent = plateStr + " - Profile";
      document.getElementById("f-val-plate").innerHTML = plateStr || "-";
      document.getElementById("f-val-brand").innerHTML = vehicle["Brand"] || vehicle["brand"] || "-";
      document.getElementById("f-val-model").innerHTML = vehicle["Model"] || vehicle["model"] || "-";
      document.getElementById("f-val-vin").innerHTML = vehicle["VIN"] || vehicle["vin"] || "-";
      document.getElementById("f-val-fuel").innerHTML = vehicle["Fuel Type"] || vehicle["fuel type"] || "-";
      document.getElementById("f-val-assigned-drivers").innerHTML = driversHtml;
      showFleetOdometer(vehicle);
      document.getElementById("f-val-availability").innerHTML = currentAvailability;
      document.getElementById("f-val-accidents").innerHTML = vehicle["Accidents"] || "0";
      document.getElementById("f-val-mantenimiento").innerHTML = formatDateForDisplay(vehicle["Last Maintenance"] || vehicle["last maintenance"]);
      document.getElementById("f-val-oil").innerHTML = formatDateForDisplay(vehicle["Last Oil Change"] || vehicle["last oil change"]);
      document.getElementById("f-val-ins-start").innerHTML = formatDateForDisplay(vehicle["Insurance Start Date"] || vehicle["insurance start date"]);
      document.getElementById("f-val-ins-exp").innerHTML = formatDateForDisplay(vehicle["Insurance Expiry Date"] || vehicle["insurance expiry date"]);
      document.getElementById("f-val-op-start").innerHTML = formatDateForDisplay(vehicle["Operation Card Start Date"] || vehicle["operation card start date"]);
      document.getElementById("f-val-op-exp").innerHTML = formatDateForDisplay(vehicle["Operation Card Expiry Date"] || vehicle["operation card expiry date"]);

      fleetProfileContainer.style.display = "block";
    }

    function enableFleetEditMode() {
      if (!currentActiveVehicle) return;
      isFleetEditMode = true;
      editFleetBtn.textContent = "Save Vehicle Changes";
      editFleetBtn.style.background = "var(--primary)";
      cancelFleetEditBtn.style.display = "inline-block";

      const v = currentActiveVehicle;
      const assignedDrivers = getAssignedDrivers(v["Plate"] || v["plate"]);
      const hasDriver = assignedDrivers.length > 0;

      // Visual styling for fields that users cannot edit.
      const disabledAttr = 'disabled style="background: var(--readonly-bg); cursor: not-allowed;"';

      // 1. Lock all fields that must not be modified here.
      document.getElementById("f-val-brand").innerHTML = `<input type="text" id="edit-fleet-brand" value="${v["Brand"] || v["brand"] || ''}" ${disabledAttr}>`;
      document.getElementById("f-val-model").innerHTML = `<input type="text" id="edit-fleet-model" value="${v["Model"] || v["model"] || ''}" ${disabledAttr}>`;
      document.getElementById("f-val-vin").innerHTML = `<input type="text" id="edit-fleet-vin" value="${v["VIN"] || v["vin"] || ''}" ${disabledAttr}>`;

      const fuelVal = v["Fuel Type"] || v["fuel type"] || "";
      document.getElementById("f-val-fuel").innerHTML = `<select id="edit-fleet-fuel" ${disabledAttr}><option value="${fuelVal}">${fuelVal}</option></select>`;

      document.getElementById("f-val-km").innerHTML = `<input type="number" id="edit-fleet-km" value="${getFleetOdometer(v).value}" ${disabledAttr}>`;

      // 2. Availability is the only editable vehicle field in this workflow.
      const availVal = v["Availability"] || v["availability"] || "Unassigned";

      if (hasDriver) {
        // Vehicles with assigned drivers must remain in the Assigned status.
        document.getElementById("f-val-availability").innerHTML = `
          <select id="edit-fleet-availability" ${disabledAttr}>
            <option value="Assigned" selected>Assigned</option>
          </select>`;
      } else {
        // Vehicles without drivers may be Unassigned or Under Maintenance.
        const isMaint = availVal === "Under Maintenance" || availVal === "Maintenance";
        document.getElementById("f-val-availability").innerHTML = `
          <select id="edit-fleet-availability">
            <option value="Unassigned" ${!isMaint ? "selected" : ""}>Unassigned</option>
            <option value="Under Maintenance" ${isMaint ? "selected" : ""}>Under Maintenance</option>
          </select>`;
      }

      // 3. Display-only date inputs use the normalized HTML date format.
      document.getElementById("f-val-mantenimiento").innerHTML = `<input type="date" id="edit-fleet-maint" value="${toDateInput(v["Last Maintenance"] || v["last maintenance"])}" ${disabledAttr}>`;
      document.getElementById("f-val-oil").innerHTML = `<input type="date" id="edit-fleet-oil" value="${toDateInput(v["Last Oil Change"] || v["last oil change"])}" ${disabledAttr}>`;
      document.getElementById("f-val-ins-start").innerHTML = `<input type="date" id="edit-fleet-ins-start" value="${toDateInput(v["Insurance Start Date"] || v["insurance start date"])}" ${disabledAttr}>`;
      document.getElementById("f-val-ins-exp").innerHTML = `<input type="date" id="edit-fleet-ins-exp" value="${toDateInput(v["Insurance Expiry Date"] || v["insurance expiry date"])}" ${disabledAttr}>`;
      document.getElementById("f-val-op-start").innerHTML = `<input type="date" id="edit-fleet-op-start" value="${toDateInput(v["Operation Card Start Date"] || v["operation card start date"])}" ${disabledAttr}>`;
      document.getElementById("f-val-op-exp").innerHTML = `<input type="date" id="edit-fleet-op-exp" value="${toDateInput(v["Operation Card Expiry Date"] || v["operation card expiry date"])}" ${disabledAttr}>`;
    }

    async function saveEditedVehicle() {
  showIntegrationPending();
}

    editFleetBtn.addEventListener("click", () => {
      if (!isFleetEditMode) enableFleetEditMode();
      else saveEditedVehicle();
    });

    cancelFleetEditBtn.addEventListener("click", () => {
      if (currentActiveVehicle) renderVehicleProfile(currentActiveVehicle);
    });

// Load records and update the synchronization badge for this module.
    async function fetchFleet() {
  fleetDatabase = [];
  document.getElementById("fleet-sync-status").textContent = "No records available — database not connected";

  return false;
}

    async function refreshFleetData() {
  return fetchFleet();
}

    function isFleetPostTripSynced(plate) {
      const normalized = normalizePlate(plate);
      const vehicle = fleetDatabase.find(v => normalizePlate(v["Plate"] ?? v["plate"]) === normalized);
      const latest = fleetPostTripReadings.get(normalized);
      const sheetKm = vehicle && (vehicle["Total KM"] ?? vehicle["total km"]);
      return Boolean(vehicle && latest && ["number", "string"].includes(typeof sheetKm) &&
        String(sheetKm).trim() !== "" && Number(sheetKm) === latest.km);
    }

// Refresh the records when the user clicks this module's refresh button.
    document.getElementById("refresh-fleet-btn").addEventListener("click", refreshFleetData);

// Export the currently loaded fleet data.
    document.getElementById("export-fleet-excel-btn").addEventListener("click", event => exportLatestSheetData(event.currentTarget, refreshFleetData, () => {
      if (fleetDatabase.length === 0) { alert("No fleet data available to export."); return; }
      // Export the same latest odometer readings displayed in Fleet Management.
      const exportData = fleetDatabase.map(vehicle => {
        const row = { ...vehicle, "Total KM": getFleetOdometer(vehicle).value };
        // Lowercase sheet headers must not leave a second, stale mileage column.
        delete row["total km"];
        delete row["accidents"];
        return row;
      });
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fleet Database");
      XLSX.writeFile(workbook, "Fleet_Database.xlsx");
    }));
