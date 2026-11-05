/**
 * TAXI QAID ERP | fleet.js
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

    function buildLatestPostTripReadings(records) {
      const latest = new Map();
      for (const record of records) {
        const plate = normalizePlate(record["Car Plate"] ?? record["car plate"]);
        const date = String(record["Date"] ?? record["date"] ?? "").trim();
        const time = String(record["Time"] ?? record["time"] ?? "").trim();
        const kmRaw = record["Odometer (KM)"] ?? record["odometer (km)"];
        const km = Number(kmRaw);
        const clock = time.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
        if (!plate || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !clock ||
            kmRaw == null || String(kmRaw).trim() === "" || !Number.isFinite(km) || km < 0) continue;
        const dateValue = new Date(`${date}T00:00:00Z`);
        if (Number.isNaN(dateValue.getTime()) || dateValue.toISOString().slice(0, 10) !== date) continue;

        // Date and time are stored as KSA local values by the Trip Check server.
        // A corrected older inspection must not supersede a newer inspection.
        const sortKey = `${date}T${clock[1]}:${clock[2]}:${clock[3] || "00"}`;
        const previous = latest.get(plate);
        if (!previous || sortKey >= previous.sortKey) {
          latest.set(plate, { km, date, time: sortKey.slice(11), sortKey });
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

    function populateFleetDropdown(items) {
      fleetDropdown.innerHTML = "";
      if (items.length === 0) { fleetDropdown.style.display = "none"; return; }
      items.forEach(v => {
        const plate = String(v["Plate"] || v["plate"] || "");
        const mod = String(v["Model"] || v["model"] || "");
        const div = document.createElement("div");
        div.className = "custom-dropdown-item";
        div.textContent = `${plate} - ${mod}`;
        div.addEventListener("click", () => {
          fleetPlateInput.value = plate;
          renderVehicleProfile(v);
          fleetDropdown.style.display = "none";
        });
        fleetDropdown.appendChild(div);
      });
      fleetDropdown.style.display = "block";
    }

    toggleFleetBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (fleetProfileContainer.style.display === "block" && !isFleetEditMode) {  
      clearFleetSelection();                                                     
      populateFleetDropdown(fleetDatabase);                                    
      return;                                                                  
      } 
      if (driversDatabase.length === 0) await fetchDrivers();
      if (fleetDropdown.style.display === "block") { fleetDropdown.style.display = "none"; }
      else {
        const val = fleetPlateInput.value.trim().toLowerCase();
        populateFleetDropdown(val === "" ? fleetDatabase : fleetDatabase.filter(v => String(v["Plate"] || v["plate"] || "").toLowerCase().includes(val)));
      }
    });

    fleetPlateInput.addEventListener("input", async () => {
      if (driversDatabase.length === 0) await fetchDrivers();
      const val = fleetPlateInput.value.trim().toLowerCase();
      if (val === "") { fleetProfileContainer.style.display = "none"; fleetDropdown.style.display = "none"; return; }
      const matches = fleetDatabase.filter(v => String(v["Plate"] || v["plate"] || "").toLowerCase().includes(val));
      populateFleetDropdown(matches);
      const exact = fleetDatabase.find(v => String(v["Plate"] || v["plate"] || "").toLowerCase() === val);
      if (exact) { renderVehicleProfile(exact); fleetDropdown.style.display = "none"; }
      else { fleetProfileContainer.style.display = "none"; }
    });
    function clearFleetSelection() {
  fleetPlateInput.value = "";
  fleetProfileContainer.style.display = "none";
  currentActiveVehicle = null;
}

fleetPlateInput.addEventListener("click", () => {
  if (fleetProfileContainer.style.display === "block" && !isFleetEditMode) {
    clearFleetSelection();
    populateFleetDropdown(fleetDatabase);
  }
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
      editFleetBtn.textContent = "💾 Save Vehicle Changes";
      editFleetBtn.style.background = "var(--success)";
      cancelFleetEditBtn.style.display = "inline-block";

      const v = currentActiveVehicle;
      const assignedDrivers = getAssignedDrivers(v["Plate"] || v["plate"]);
      const hasDriver = assignedDrivers.length > 0;
      
      // Visual styling for fields that users cannot edit.
      const disabledAttr = 'disabled style="background: #e9ecef; cursor: not-allowed;"';

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
      const v = currentActiveVehicle;
      const updatedVehicle = {
        action: "update",
        "Plate": v["Plate"] || v["plate"],
        "Brand": document.getElementById("edit-fleet-brand").value.trim(),
        "Model": document.getElementById("edit-fleet-model").value.trim(),
        "VIN": document.getElementById("edit-fleet-vin").value.trim(),
        "Fuel Type": document.getElementById("edit-fleet-fuel").value,
        // Total KM is derived from Post-Trip, never written to the Fleet sheet.
        "Availability": document.getElementById("edit-fleet-availability").value,
        "Last Maintenance": document.getElementById("edit-fleet-maint").value,
        "Last Oil Change": document.getElementById("edit-fleet-oil").value,
        "Insurance Start Date": document.getElementById("edit-fleet-ins-start").value,
        "Insurance Expiry Date": document.getElementById("edit-fleet-ins-exp").value,
        "Operation Card Start Date": document.getElementById("edit-fleet-op-start").value,
        "Operation Card Expiry Date": document.getElementById("edit-fleet-op-exp").value
      };

      editFleetBtn.disabled = true;
      editFleetBtn.textContent = "Saving...";

      try {
        const response = await postAuthorizedSheetUpdate(GOOGLE_SHEET_FLEET_URL, updatedVehicle);
        const resData = await response.json();
        if (resData.status === "success") {
          const index = fleetDatabase.findIndex(veh => String(veh["Plate"] || veh["plate"]).trim().toLowerCase() === String(updatedVehicle["Plate"]).trim().toLowerCase());
          if (index !== -1) {
            updatedVehicle["Accidents"] = fleetDatabase[index]["Accidents"] || 0;
            fleetDatabase[index] = { ...fleetDatabase[index], ...updatedVehicle };
          }

          updateAllFleetAccidentCounts();

          fleetPlateInput.value = updatedVehicle["Plate"];
          renderVehicleProfile(index !== -1 ? fleetDatabase[index] : updatedVehicle);
          alert("Vehicle updated successfully!");
        } else {
          alert("Error: " + resData.message);
        }
      } catch (err) {
        alert("Could not update Google Sheets.");
      } finally {
        editFleetBtn.disabled = false;
        editFleetBtn.textContent = isFleetEditMode ? "💾 Save Vehicle Changes" : "Edit Vehicle Details";
      }
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
      const requestId = ++fleetRefreshSequence;
      const syncBadge = document.getElementById("fleet-sync-status");
      if (syncBadge) syncBadge.textContent = "Syncing fleet and latest Post-Trip odometers...";
      try {
        const res = await fetch(GOOGLE_SHEET_FLEET_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`Fleet HTTP ${res.status}`);
        const vehicles = await res.json();
        if (!Array.isArray(vehicles)) throw new Error("Invalid Fleet response.");

        let readings = new Map();
        let postTripError = null;
        try {
          const postUrl = TRIPCHECK_SHEET_ENDPOINTS["Post-Trip"];
          const response = await fetch(postUrl, { cache: "no-store" });
          if (!response.ok) throw new Error(`Post-Trip HTTP ${response.status}`);
          const postTrips = await response.json();
          if (!Array.isArray(postTrips)) throw new Error("Invalid Post-Trip response.");
          readings = buildLatestPostTripReadings(postTrips);
        } catch (error) {
          postTripError = error;
          console.warn("Post-Trip odometers could not be refreshed:", error);
        }

        // Ignore outdated responses if another refresh started in the meantime.
        if (requestId !== fleetRefreshSequence) return;
        fleetDatabase = vehicles;
        fleetPostTripReadings = readings;
        updateAllFleetAccidentCounts();

        // Keep the selected vehicle open and update its odometer on refresh.
        if (currentActiveVehicle && !isFleetEditMode) {
          const plate = normalizePlate(currentActiveVehicle["Plate"] ?? currentActiveVehicle["plate"]);
          const selected = fleetDatabase.find(v => normalizePlate(v["Plate"] ?? v["plate"]) === plate);
          if (selected) renderVehicleProfile(selected);
        }
        if (syncBadge) {
          syncBadge.textContent = postTripError
            ? `Fleet synced (${fleetDatabase.length} vehicles). Post-Trip unavailable; displaying Fleet sheet KM.`
            : `Fleet synced (${fleetDatabase.length} vehicles). Latest Post-Trip KM loaded for ${readings.size} plate(s).`;
        }
      } catch (error) {
        if (requestId !== fleetRefreshSequence) return;
        console.error("Error fetching fleet", error);
        if (syncBadge) syncBadge.textContent = "Failed to connect to Fleet Google Sheet.";
      }
    }


// Refresh the records when the user clicks this module's refresh button.
    document.getElementById("refresh-fleet-btn").addEventListener("click", fetchFleet);

// Export the currently loaded fleet data.
    document.getElementById("export-fleet-excel-btn").addEventListener("click", () => {
      if (fleetDatabase.length === 0) { alert("No fleet data available to export."); return; }
      // Export the same latest odometer readings displayed in Fleet Management.
      const exportData = fleetDatabase.map(vehicle => ({
        ...vehicle,
        "Total KM": getFleetOdometer(vehicle).value
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fleet Database");
      XLSX.writeFile(workbook, "Fleet_Database.xlsx");
    });

