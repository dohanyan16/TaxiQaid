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
      document.getElementById("val-iqama").textContent = driver["Iqama Number"] || driver["iqama"] || "-";
      document.getElementById("val-name").textContent = fullName;
      document.getElementById("val-nationality").textContent = driver["Nationality"] || driver["nationality"] || "-";
      document.getElementById("val-passport").textContent = driver["Passport Number"] || driver["passport number"] || "-";
      document.getElementById("val-tid").textContent = driver["TID"] || driver["tid"] || "-";
      document.getElementById("val-passport-exp").textContent = formatDateForDisplay(driver["Passport Expiry Date"] || driver["passport expiry date"]);
      document.getElementById("val-iqama-issue").textContent = formatDateForDisplay(driver["Iqama Issue Date"] || driver["iqama issue date"]);
      document.getElementById("val-dob").textContent = formatDateForDisplay(driver["Date of Birth"] || driver["date of birth"],{calendar:true});
      document.getElementById("val-iqama-exp").textContent = formatDateForDisplay(driver["Iqama Expiry Date"] || driver["iqama expiry date"]);
      document.getElementById("val-work-start").textContent = formatDateForDisplay(driver["Employment Start Date"] || driver["employment start date"]);
      document.getElementById("val-phone").textContent = driver["Phone Number"] || driver["phone number"] || "-";
      document.getElementById("val-driver-id").textContent = driver["Driver ID"] || driver["driver id"] || "-";
      document.getElementById("val-arrangement").textContent = driver["Arrangement"] || driver["arrangement"] || "-";

      const licenseVal = driver["KSA Driving License Date"] || driver["ksa driving license date"];
      document.getElementById("val-license-date").textContent = (licenseVal && licenseVal !== "Not Yet") ? formatDateForDisplay(licenseVal) : "Not Yet";

      document.getElementById("val-shift").textContent = driver["Shift"] || driver["shift"] || "-";
      document.getElementById("val-car-plate").textContent = driver["Car Plate"] || driver["car plate"] || "-";
      document.getElementById("val-status").textContent = driver["Status"] || driver["status"] || "-";

      profileContainer.style.display = "block";
    }

    function enableEditMode() {
      if (!currentActiveDriver) return;
      isEditMode = true;
      editDriverBtn.textContent = "Save Changes";
      editDriverBtn.style.background = "var(--primary)";
      cancelEditBtn.style.display = "inline-block";

      const d = currentActiveDriver;
      TaxiQaidDOM.field('val-phone',{id:'edit-phone',value:d['Phone Number']||d['phone number']||''});
      const select=(host,id,value,values)=>TaxiQaidDOM.field(host,{id,value,options:values.map(value=>({value}))});
      select('val-arrangement','edit-arrangement',d.Arrangement||d.arrangement||'', ['Salary','270 SAR per day']);
      select('val-shift','edit-shift',d.Shift||d.shift||'', ['Night Shift','Day Shift']);
      TaxiQaidDOM.field('val-car-plate',{id:'edit-car-plate',value:d['Car Plate']||d['car plate']||'',options:[{value:'',label:'-- Unassigned --'},...fleetDatabase.map(v=>({value:v.Plate||v.plate,label:(v.Plate||v.plate)+' ('+(v.Model||v.model||'')+')'}))]});
      select('val-status','edit-status',d.Status||d.status||'', ['Available','Not Available','No Longer in the Project']);
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
    async function refreshDriverPreview() {
  driversDatabase = [];
  driverSearch.clear();
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

TaxiQaidModules.register('drivers',{onEnter:async()=>{await fetchDrivers();return {connected:false,message:'Database integration pending — no operational source is connected.'};},onReset:()=>{driversDatabase=[];driverSearch.clear();currentActiveDriver=null;profileContainer.style.display='none';document.querySelectorAll('#driver-profile-container [id^=val-]').forEach(e=>e.replaceChildren());}});
