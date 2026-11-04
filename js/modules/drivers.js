/**
 * TAXI QAID ERP | drivers.js
 * Purpose: Driver lookup, profile rendering, edit form, and save.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

        // --- DRIVERS MANAGEMENT LOGIC ---
    let currentActiveDriver = null;
    let isEditMode = false;
    const profileContainer = document.getElementById("driver-profile-container");
    const editDriverBtn = document.getElementById("edit-driver-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const driverSearchInput = document.getElementById("driver-search-input");
    const toggleDriverBtn = document.getElementById("toggle-driver-btn");
    const driverDropdown = document.getElementById("driver-dropdown");

    function driverLabel(d) {
      return `${d["Iqama Number"] || d["iqama"] || ""} - ${d["Full Name"] || d["name"] || ""}`;
    }

    function filterDrivers(val) {
      return driversDatabase.filter(d => driverLabel(d).toLowerCase().includes(val));
    }

    function populateDriverDropdown(items) {
      driverDropdown.innerHTML = "";
      if (items.length === 0) { driverDropdown.style.display = "none"; return; }
      items.forEach(driver => {
        const div = document.createElement("div");
        div.className = "custom-dropdown-item";
        div.textContent = driverLabel(driver);
        div.addEventListener("click", () => {
          driverSearchInput.value = driverLabel(driver);
          renderDriverProfile(driver);
          driverDropdown.style.display = "none";
        });
        driverDropdown.appendChild(div);
      });
      driverDropdown.style.display = "block";
    }

    function clearDriverSelection() {
      driverSearchInput.value = "";
      profileContainer.style.display = "none";
      currentActiveDriver = null;
    }

    driverSearchInput.addEventListener("input", () => {
      const val = driverSearchInput.value.trim().toLowerCase();
      if (val === "") { profileContainer.style.display = "none"; driverDropdown.style.display = "none"; return; }
      populateDriverDropdown(filterDrivers(val));
      const exact = driversDatabase.find(d =>
        String(d["Iqama Number"] || d["iqama"] || "").toLowerCase() === val ||
        String(d["Full Name"] || d["name"] || "").toLowerCase() === val ||
        driverLabel(d).toLowerCase() === val
      );
      if (exact) { renderDriverProfile(exact); driverDropdown.style.display = "none"; }
      else { profileContainer.style.display = "none"; }
    });

    // Clicking an already selected driver clears the selection and opens the full list.
    driverSearchInput.addEventListener("click", () => {
      if (profileContainer.style.display === "block" && !isEditMode) {
        clearDriverSelection();
        populateDriverDropdown(driversDatabase);
      }
    });

    toggleDriverBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (profileContainer.style.display === "block" && !isEditMode) {
        clearDriverSelection();
        populateDriverDropdown(driversDatabase);
        return;
      }
      if (driverDropdown.style.display === "block") { driverDropdown.style.display = "none"; return; }
      const val = driverSearchInput.value.trim().toLowerCase();
      populateDriverDropdown(val === "" ? driversDatabase : filterDrivers(val));
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
      editDriverBtn.textContent = "💾 Save Changes";
      editDriverBtn.style.background = "var(--success)";
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
      const d = currentActiveDriver;
      const selectedPlate = document.getElementById("edit-car-plate").value;

      const updatedDriver = {
        "Iqama Number": d["Iqama Number"] || d["iqama"],
        "Full Name": d["Full Name"] || d["name"],
        "Nationality": d["Nationality"] || d["nationality"],
        "Passport Number": d["Passport Number"] || d["passport number"],
        "TID": d["TID"] || d["tid"],
        "Passport Expiry Date": d["Passport Expiry Date"] || d["passport expiry date"],
        "Iqama Issue Date": d["Iqama Issue Date"] || d["iqama issue date"],
        "Date of Birth": d["Date of Birth"] || d["date of birth"],
        "Iqama Expiry Date": d["Iqama Expiry Date"] || d["iqama expiry date"],
        "Employment Start Date": d["Employment Start Date"] || d["employment start date"],
        "Phone Number": document.getElementById("edit-phone").value.trim(),
        "Driver ID": d["Driver ID"] || d["driver id"],
        "Arrangement": document.getElementById("edit-arrangement").value,
        "KSA Driving License Date": d["KSA Driving License Date"] || d["ksa driving license date"],
        "Shift": document.getElementById("edit-shift").value,
        "Car Plate": selectedPlate,
        "Status": document.getElementById("edit-status").value
      };

      editDriverBtn.disabled = true;
      editDriverBtn.textContent = "Saving...";

      try {
        const response = await postAuthorizedSheetUpdate(GOOGLE_SHEET_DRIVERS_URL, updatedDriver);
        const resData = await response.json();
        if (resData.status === "success") {
          const index = driversDatabase.findIndex(driver => String(driver["Iqama Number"] || driver["iqama"]).trim() === String(updatedDriver["Iqama Number"]).trim());
          if (index !== -1) driversDatabase[index] = updatedDriver;

          driverSearchInput.value = `${updatedDriver["Iqama Number"]} - ${updatedDriver["Full Name"]}`;
          renderDriverProfile(updatedDriver);
          alert("Driver updated successfully!");
        } else {
          alert("Error: " + (resData.message || "Unknown error"));
          editDriverBtn.textContent = "💾 Save Changes";
        }
      } catch (err) {
        alert("Could not update Google Sheets.");
        editDriverBtn.textContent = "💾 Save Changes";
      } finally {
        editDriverBtn.disabled = false;
      }
    }

    editDriverBtn.addEventListener("click", () => {
      if (!isEditMode) enableEditMode();
      else saveEditedDriver();
    });

    cancelEditBtn.addEventListener("click", () => {
      if (currentActiveDriver) renderDriverProfile(currentActiveDriver);
    });
