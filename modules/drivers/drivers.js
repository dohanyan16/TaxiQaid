/**
 * TaxiQaid | drivers.js
 * Purpose: Driver lookup, profile rendering, edit form, and save.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

        // --- DRIVERS MANAGEMENT LOGIC ---
    let currentActiveDriver = null;
    let isEditMode = false;
    let driverRefreshSequence = 0;
    const profileContainer = document.getElementById("driver-profile-container");
    const editDriverBtn = document.getElementById("edit-driver-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const driverSearchInput = document.getElementById("driver-search-input");
    const toggleDriverBtn = document.getElementById("toggle-driver-btn");
    const driverDropdown = document.getElementById("driver-dropdown");

    function driverLabel(d) {
      return `${d["Iqama Number"] || d["iqama"] || ""} - ${d["Full Name"] || d["name"] || ""}`;
    }

    function clearDriverSelection() {
      driverSearchInput.value = '';
      profileContainer.style.display = 'none';
      currentActiveDriver = null;
    }
    const driverSearch = setupSearchDropdown({
      input:'driver-search-input', btn:'toggle-driver-btn', dd:'driver-dropdown', config:'drivers',
      getData:()=>driversDatabase, apply:()=>{profileContainer.style.display='none';currentActiveDriver=null;},
      onSelect:renderDriverProfile
    });

    function renderDriverProfile(driver) {
      currentActiveDriver = driver;
      isEditMode = false;
      editDriverBtn.textContent = "Edit Driver Details";
      editDriverBtn.style.background = "var(--primary)";
      cancelEditBtn.style.display = "none";

      const fullName = driver["Full Name"] || driver["name"] || "Driver";
      document.getElementById("profile-driver-name").textContent = fullName + " - Profile";
      document.getElementById("val-iqama").innerHTML = driver["Iqama Number"] || driver["iqama"] || "-";
      document.getElementById("val-name").innerHTML = fullName;
      document.getElementById("val-nationality").innerHTML = driver["Nationality"] || driver["nationality"] || "-";
      document.getElementById("val-passport").innerHTML = driver["Passport Number"] || driver["passport number"] || "-";
      document.getElementById("val-tid").innerHTML = driver["TID"] || driver["tid"] || "-";
      document.getElementById("val-passport-exp").innerHTML = formatDateForDisplay(driver["Passport Expiry Date"] || driver["passport expiry date"]);
      document.getElementById("val-iqama-issue").innerHTML = formatDateForDisplay(driver["Iqama Issue Date"] || driver["iqama issue date"]);
      document.getElementById("val-dob").innerHTML = formatDateForDisplay(driver["Date of Birth"] || driver["date of birth"]);
      document.getElementById("val-iqama-exp").innerHTML = formatDateForDisplay(driver["Iqama Expiry Date"] || driver["iqama expiry date"]);
      document.getElementById("val-work-start").innerHTML = formatDateForDisplay(driver["Employment Start Date"] || driver["employment start date"]);
      document.getElementById("val-phone").innerHTML = driver["Phone Number"] || driver["phone number"] || "-";
      document.getElementById("val-driver-id").innerHTML = driver["Driver ID"] || driver["driver id"] || "-";
      document.getElementById("val-arrangement").innerHTML = driver["Arrangement"] || driver["arrangement"] || "-";

      const licenseVal = driver["KSA Driving License Date"] || driver["ksa driving license date"];
      document.getElementById("val-license-date").innerHTML = (licenseVal && licenseVal !== "Not Yet") ? formatDateForDisplay(licenseVal) : "Not Yet";

      document.getElementById("val-shift").innerHTML = driver["Shift"] || driver["shift"] || "-";
      document.getElementById("val-car-plate").innerHTML = driver["Car Plate"] || driver["car plate"] || "-";
      document.getElementById("val-status").innerHTML = driver["Status"] || driver["status"] || "-";

      profileContainer.style.display = "block";
    }

    function enableEditMode() {
      if (!currentActiveDriver) return;
      isEditMode = true;
      editDriverBtn.textContent = "Save Changes";
      editDriverBtn.style.background = "var(--primary)";
      cancelEditBtn.style.display = "inline-block";

      const d = currentActiveDriver;
      document.getElementById("val-phone").innerHTML = `<input type="text" id="edit-phone" value="${d["Phone Number"] || d["phone number"] || ''}">`;

      const arrVal = d["Arrangement"] || d["arrangement"] || "";
      document.getElementById("val-arrangement").innerHTML = `<select id="edit-arrangement"><option value="Salary" ${arrVal==="Salary"?"selected":""}>Salary</option><option value="270 SAR per day" ${arrVal==="270 SAR per day"?"selected":""}>270 SAR per day</option></select>`;

      const shiftVal = d["Shift"] || d["shift"] || "";
      document.getElementById("val-shift").innerHTML = `<select id="edit-shift"><option value="Night Shift" ${shiftVal==="Night Shift"?"selected":""}>Night Shift</option><option value="Day Shift" ${shiftVal==="Day Shift"?"selected":""}>Day Shift</option></select>`;

      let plateOptions = `<option value="">-- Unassigned --</option>`;
      fleetDatabase.forEach(v => {
        const vPlate = v["Plate"] || v["plate"];
        const sel = (normalizePlate(d["Car Plate"] || d["car plate"]) === normalizePlate(vPlate)) ? "selected" : "";
        plateOptions += `<option value="${vPlate}" ${sel}>${vPlate} (${v["Model"] || v["model"]})</option>`;
      });
      document.getElementById("val-car-plate").innerHTML = `<select id="edit-car-plate">${plateOptions}</select>`;

      const statusVal = d["Status"] || d["status"] || "";
      document.getElementById("val-status").innerHTML = `<select id="edit-status"><option value="Available" ${statusVal==="Available"?"selected":""}>Available</option><option value="Not Available" ${statusVal==="Not Available"?"selected":""}>Not Available</option><option value="No Longer in the Project" ${statusVal==="No Longer in the Project"?"selected":""}>No Longer in the Project</option></select>`;
    }

    async function saveEditedDriver() {
  showIntegrationPending();
}

    editDriverBtn.addEventListener("click", () => {
      if (!isEditMode) enableEditMode();
      else saveEditedDriver();
    });

    cancelEditBtn.addEventListener("click", () => {
      if (currentActiveDriver) renderDriverProfile(currentActiveDriver);
    });

// Load records and update the synchronization badge for this module.
    async function fetchDrivers() {
  driversDatabase = [];
  document.getElementById("sync-status").textContent = "No records available — database not connected";

  return false;
}


// Refresh the records when the user clicks this module's refresh button.
    document.getElementById("refresh-db-btn").addEventListener("click", fetchDrivers);

// Export the currently loaded drivers data.
    document.getElementById("export-excel-btn").addEventListener("click", event => exportLatestSheetData(event.currentTarget, fetchDrivers, () => {
      if (driversDatabase.length === 0) { alert("No driver data available to export."); return; }
      const worksheet = XLSX.utils.json_to_sheet(driversDatabase);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Drivers Database");
      XLSX.writeFile(workbook, "Drivers_Database.xlsx");
    }));
