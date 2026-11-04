/**
 * TAXI QAID ERP | tripcheck.js
 * Purpose: Trip check wizard, validation, persistence, and table.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    // --- WIZARD TRIP CHECK LOGIC ---
    const tripCheckModal = document.getElementById("add-tripcheck-modal");
    const openAddTripCheckBtn = document.getElementById("open-add-tripcheck-modal");
    const closeAddTripCheckBtn = document.getElementById("close-add-tripcheck-modal");
    const addTripCheckForm = document.getElementById("add-tripcheck-form");
    const wizardPrevBtn = document.getElementById("wizard-prev-btn");
    const wizardNextBtn = document.getElementById("wizard-next-btn");
    const saveTripCheckBtn = document.getElementById("save-tripcheck-btn");
    const progressIndicator = document.getElementById("wizard-progress-indicator");

    window.selectWizardChoice = function(inputId, value, element) {
      document.getElementById(inputId).value = value;
      const parent = element.parentElement;
      parent.querySelectorAll(".choice-box").forEach(box => box.classList.remove("selected"));
      element.classList.add("selected");
    };

    function showWizardStep(step) {
      currentWizardStep = step;
      document.querySelectorAll(".wizard-step").forEach(el => el.classList.remove("active-step"));
      document.querySelector(`.wizard-step[data-step="${step}"]`).classList.add("active-step");
      progressIndicator.textContent = `Step ${step} of ${totalWizardSteps}`;

      wizardPrevBtn.style.display = step === 1 ? "none" : "inline-block";
      if (step === totalWizardSteps) {
        wizardNextBtn.style.display = "none";
        saveTripCheckBtn.style.display = "inline-block";
      } else {
        wizardNextBtn.style.display = "inline-block";
        saveTripCheckBtn.style.display = "none";
      }
    }

    openAddTripCheckBtn.addEventListener("click", async () => {
      await Promise.all([fetchFleet(), fetchDrivers()]);
      setupTripCheckSelects();
      addTripCheckForm.reset();
      document.getElementById("tc-id").value = "";
      
      document.querySelectorAll(".choice-box").forEach(box => box.classList.remove("selected"));
      document.querySelectorAll(".wizard-step").forEach(stepEl => {
        const firstBox = stepEl.querySelector(".choice-box");
        if (firstBox) firstBox.classList.add("selected");
      });

      showWizardStep(1);
      tripCheckModal.style.display = "flex";
    });

    closeAddTripCheckBtn.addEventListener("click", () => {
      tripCheckModal.style.display = "none";
    });

    wizardNextBtn.addEventListener("click", () => {
      if (currentWizardStep === 2) {
        if (!document.getElementById("tc-plate").value) { alert("Please select a valid Car Plate."); return; }
        if (!document.getElementById("tc-iqama").value) { alert("Please select a valid Driver."); return; }
        if (!document.getElementById("tc-odometer").value) { alert("Please enter odometer KM."); return; }
      }
      if (currentWizardStep < totalWizardSteps) {
        showWizardStep(currentWizardStep + 1);
      }
    });

    wizardPrevBtn.addEventListener("click", () => {
      if (currentWizardStep > 1) {
        showWizardStep(currentWizardStep - 1);
      }
    });

    function setupTripCheckSelects() {
      const plateSearch = document.getElementById("tc-plate-search");
      const plateDropdown = document.getElementById("tc-plate-dropdown");
      const plateInput = document.getElementById("tc-plate");
      const togglePlateBtn = document.getElementById("toggle-tc-plate-btn");

      const iqamaSearch = document.getElementById("tc-iqama-search");
      const iqamaDropdown = document.getElementById("tc-iqama-dropdown");
      const iqamaInput = document.getElementById("tc-iqama");
      const toggleIqamaBtn = document.getElementById("toggle-tc-iqama-btn");

      function renderPlateDropdown(items) {
        plateDropdown.innerHTML = "";
        if (items.length === 0) { plateDropdown.style.display = "none"; return; }
        items.forEach(v => {
          const plate = v["Plate"] || v["plate"];
          const div = document.createElement("div");
          div.className = "custom-dropdown-item";
          div.textContent = `${plate} (${v["Model"] || v["model"] || ""})`;
          div.addEventListener("click", () => {
            plateSearch.value = plate;
            plateInput.value = plate;
            plateDropdown.style.display = "none";
            if (v["Total KM"] || v["total km"]) {
              document.getElementById("tc-odometer").value = v["Total KM"] || v["total km"];
            }
          });
          plateDropdown.appendChild(div);
        });
        plateDropdown.style.display = "block";
      }

      plateSearch.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        plateInput.value = "";
        const matches = fleetDatabase.filter(v => String(v["Plate"] || v["plate"] || "").toLowerCase().includes(val));
        renderPlateDropdown(matches);
      };
      togglePlateBtn.onclick = (e) => {
        e.stopPropagation();
        renderPlateDropdown(fleetDatabase);
      };

      function renderIqamaDropdown(items) {
        iqamaDropdown.innerHTML = "";
        if (items.length === 0) { iqamaDropdown.style.display = "none"; return; }
        items.forEach(d => {
          const iqama = d["Iqama Number"] || d["iqama"] || "";
          const name = d["Full Name"] || d["name"] || "";
          const div = document.createElement("div");
          div.className = "custom-dropdown-item";
          div.textContent = `${iqama} - ${name}`;
          div.addEventListener("click", () => {
            iqamaSearch.value = `${iqama} - ${name}`;
            iqamaInput.value = iqama;
            document.getElementById("tc-driver-name").value = name;
            iqamaDropdown.style.display = "none";
          });
          iqamaDropdown.appendChild(div);
        });
        iqamaDropdown.style.display = "block";
      }

      iqamaSearch.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        iqamaInput.value = "";
        document.getElementById("tc-driver-name").value = "";
        const matches = driversDatabase.filter(d => 
          String(d["Iqama Number"] || d["iqama"] || "").toLowerCase().includes(val) ||
          String(d["Full Name"] || d["name"] || "").toLowerCase().includes(val)
        );
        renderIqamaDropdown(matches);
      };
      toggleIqamaBtn.onclick = (e) => {
        e.stopPropagation();
        renderIqamaDropdown(driversDatabase);
      };
    }

    addTripCheckForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      saveTripCheckBtn.disabled = true;
      saveTripCheckBtn.textContent = "Saving inspection...";

      const ksaNow = getKSACurrentDateTime();
      const checkData = {
        action: "create",
        "Check Type": document.getElementById("tc-type").value,
        "Date": ksaNow.date,
        "Time": ksaNow.time,
        "Car Plate": document.getElementById("tc-plate").value,
        "Driver Iqama": document.getElementById("tc-iqama").value,
        "Driver Name": document.getElementById("tc-driver-name").value,
        "Odometer (KM)": parseInt(document.getElementById("tc-odometer").value, 10) || 0,
        "Valid Documents": document.getElementById("tc_documents").value,
        "Required Uniform": document.getElementById("tc_uniform").value,
        "Doors Working": document.getElementById("tc_doors").value,
        "Trunk Condition": document.getElementById("tc_trunk").value,
        "Bonnet Condition": document.getElementById("tc_bonnet").value,
        "Dashboard Condition": document.getElementById("tc_dashboard").value,
        "Mirrors Condition": document.getElementById("tc_mirrors").value,
        "Horn Working": document.getElementById("tc_horn").value,
        "Seats & Belts": document.getElementById("tc_seats").value,
        "A/C Working": document.getElementById("tc_ac").value,
        "Steering & Odometer": document.getElementById("tc_steering").value,
        "MDT & Screen": document.getElementById("tc_mdt").value,
        "Charging Port": document.getElementById("tc_charging").value,
        "CCTV Cameras": document.getElementById("tc_cctv").value,
        "Lights Working": document.getElementById("tc_lights").value,
        "Housekeeping": document.getElementById("tc_housekeeping").value,
        "Wipers Working": document.getElementById("tc_wipers").value,
        "Oil Leakage": document.getElementById("tc_oil_leak").value,
        "Other Leakage": document.getElementById("tc_other_leak").value,
        "Tyres & Spare": document.getElementById("tc_tyres").value,
        "Brakes & ABS": document.getElementById("tc_brakes").value,
        "Safety Equipment": document.getElementById("tc_safety").value,
        "Number Plates": document.getElementById("tc_plates").value,
        "Toolkit Bag": document.getElementById("tc_toolkit").value,
        "Overall Status": document.getElementById("tc-status").value,
        "Checked By": loggedInUserName,
        "Remarks": document.getElementById("tc-remarks").value.trim()
      };

      try {
        const res = await postAuthorizedSheetUpdate(GOOGLE_SHEET_TRIPCHECK_URL, checkData);
        const resData = await res.json();
        if (resData.status === "success") {
          await fetchTripChecks();
          tripCheckModal.style.display = "none";
          alert("Trip check successfully logged!");
        } else {
          alert("Error: " + resData.message);
        }
      } catch (err) {
        alert("Failed to communicate with Google Sheets.");
      } finally {
        saveTripCheckBtn.disabled = false;
        saveTripCheckBtn.textContent = "💾 Save Inspection";
      }
    });

    function renderTripChecksTable(items) {
      const tbody = document.getElementById("tripchecks-table-body");
      tbody.innerHTML = "";
      document.getElementById("tripcheck-count-badge").textContent = `${items.length} records found`;

      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 20px;">No trip check records found.</td></tr>`;
        return;
      }

      items.forEach(tc => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${tc["Check ID"] || tc["check id"] || "-"}</td>
          <td><strong>${tc["Check Type"] || tc["check type"] || "-"}</strong></td>
          <td>${formatDateForDisplay(tc["Date"] || tc["date"])}</td>
          <td>${formatTimeForDisplay(tc["Time"] || tc["time"])}</td>
          <td>${tc["Car Plate"] || tc["car plate"] || "-"}</td>
          <td>${tc["Driver Iqama"] || tc["driver iqama"] || "-"}</td>
          <td>${tc["Driver Name"] || tc["driver name"] || "-"}</td>
          <td>${tc["Odometer (KM)"] || tc["odometer (km)"] || "-"}</td>
          <td><span style="font-weight: bold; color: ${ (tc["Overall Status"] || tc["overall status"]) === 'Passed' ? 'var(--success)' : 'var(--danger)' }">${tc["Overall Status"] || tc["overall status"] || "-"}</span></td>
          <td>${tc["Checked By"] || tc["checked by"] || "-"}</td>
          <td>${tc["Remarks"] || tc["remarks"] || "-"}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById("export-tripchecks-btn").addEventListener("click", () => {
      if (tripChecksDatabase.length === 0) { alert("No trip check data available to export."); return; }
      const worksheet = XLSX.utils.json_to_sheet(tripChecksDatabase);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Trip Check Database");
      XLSX.writeFile(workbook, "Trip_Check_Database.xlsx");
    });
