/**
 * TaxiQaid | accidents.js
 * Purpose: Accident recording, updating, deletion, and table.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    // --- ACCIDENT TRACKER LOGIC ---
    const addAccidentModal = document.getElementById("add-accident-modal");
    const openAddAccidentModalBtn = document.getElementById("open-add-accident-modal");
    const closeAddAccidentModalBtn = document.getElementById("close-add-accident-modal");
    const addAccidentForm = document.getElementById("add-accident-form");
    const saveAccidentBtn = document.getElementById("save-accident-btn");
    const deleteAccidentBtn = document.getElementById("delete-accident-btn");
    let accidentRefreshSequence = 0;

    function setupAccidentModalSelects() {
      const plateSelect = document.getElementById("add-acc-plate");
      plateSelect.innerHTML = '<option value="">-- Select Plate --</option>';
      fleetDatabase.forEach(v => {
        const plate = v["Plate"] || v["plate"];
        const opt = document.createElement("option");
        opt.value = plate;
        opt.textContent = `${plate} (${v["Model"] || v["model"] || ""})`;
        plateSelect.appendChild(opt);
      });

      const iqamaSelect = document.getElementById("add-acc-iqama");
      iqamaSelect.innerHTML = '<option value="">-- Select Iqama --</option>';
      driversDatabase.forEach(d => {
        const iqama = d["Iqama Number"] || d["iqama"];
        const opt = document.createElement("option");
        opt.value = iqama;
        opt.textContent = `${iqama} - ${d["Full Name"] || d["name"] || ""}`;
        iqamaSelect.appendChild(opt);
      });
    }

    document.getElementById("add-acc-plate").addEventListener("change", (e) => {
      const plate = e.target.value;
      const vehicle = fleetDatabase.find(v => String(v["Plate"] || v["plate"]) === plate);
      document.getElementById("add-acc-model").value = vehicle ? (vehicle["Model"] || vehicle["model"] || "") : "";
    });

    document.getElementById("add-acc-iqama").addEventListener("change", (e) => {
      const iqama = e.target.value;
      const driver = driversDatabase.find(d => String(d["Iqama Number"] || d["iqama"]) === iqama);
      document.getElementById("add-acc-driver-name").value = driver ? (driver["Full Name"] || driver["name"] || "") : "";
    });

    const najmSelect = document.getElementById("add-acc-najm");
    const najmStatusSelect = document.getElementById("add-acc-najm-status");
    najmSelect.addEventListener("change", (e) => {
      if (e.target.value === "Yes") {
        najmStatusSelect.disabled = false;
        najmStatusSelect.style.background = "#ffffff";
        najmStatusSelect.innerHTML = '<option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>';
      } else {
        najmStatusSelect.disabled = true;
        najmStatusSelect.style.background = "#e9ecef";
        najmStatusSelect.innerHTML = '<option value="N/A">N/A</option>';
      }
    });

    const invSelect = document.getElementById("add-acc-investigation");
    const invStatusSelect = document.getElementById("add-acc-inv-status");
    invSelect.addEventListener("change", (e) => {
      if (e.target.value === "Yes") {
        invStatusSelect.disabled = false;
        invStatusSelect.style.background = "#ffffff";
        invStatusSelect.innerHTML = '<option value="Under Investigation">Under Investigation</option><option value="Closed">Closed</option>';
      } else {
        invStatusSelect.disabled = true;
        invStatusSelect.style.background = "#e9ecef";
        invStatusSelect.innerHTML = '<option value="N/A">N/A</option>';
      }
    });

    TAXIQAID_LOCATIONS.forEach(location => document.getElementById("add-acc-location").add(new Option(location, location)));
    openAddAccidentModalBtn.addEventListener("click", () => {
      addAccidentForm.reset();
      setupAccidentModalSelects();
      najmSelect.dispatchEvent(new Event("change"));
      invSelect.dispatchEvent(new Event("change"));
      openPreviewModal(addAccidentModal);
    });
    closeAddAccidentModalBtn.addEventListener("click", () => closePreviewModal(addAccidentModal));
    addAccidentForm.addEventListener("submit", event => { event.preventDefault(); showIntegrationPending(); });
    saveAccidentBtn.type = "button";
    saveAccidentBtn.addEventListener("click", showIntegrationPending);
    deleteAccidentBtn.addEventListener("click", showIntegrationPending);

    function renderAccidentsTable(items) {
      const tbody = document.getElementById("accidents-table-body");
      tbody.innerHTML = "";
      document.getElementById("accident-count-badge").textContent = `${items.length} records found`;

      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="24" style="text-align: center; color: var(--text-muted); padding: 20px;"><span class="table-empty">No records available — database not connected</span></td></tr>`;
        return;
      }

      items.forEach(acc => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${acc["Accident ID"] || acc["accident id"] || "-"}</td>
          <td>${formatDateForDisplay(acc["Date"] || acc["date"])}</td>
          <td>${formatTimeForDisplay(acc["Time"] || acc["time"])}</td>
          <td>${formatDateForDisplay(acc["Reporting Date"] || acc["reporting date"])}</td>
          <td>${formatTimeForDisplay(acc["Reporting Time"] || acc["reporting time"])}</td>
          <td>${acc["Reported By"] || acc["reported by"] || "-"}</td>
          <td><strong>${acc["Car Plate"] || acc["car plate"] || "-"}</strong></td>
          <td>${acc["Car Model"] || acc["car model"] || "-"}</td>
          <td>${acc["Driver Iqama"] || acc["driver iqama"] || "-"}</td>
          <td>${acc["Driver Name"] || acc["driver name"] || "-"}</td>
          <td>${acc["Accident Location"] || acc["accident location"] || "-"}</td>
          <td>${acc["Severity"] || acc["severity"] || "-"}</td>
          <td>${String(acc["Send to Maintenance"] || acc["send to maintenance"] || "").trim() === "Yes" ? "Yes" : String(acc["Send to Maintenance"] || acc["send to maintenance"] || "").trim() === "No" ? "No" : "-"}</td>
          <td>${acc["Maintenance Status"] || "Not Requested"}</td>
          <td>${acc["Injured"] || acc["injured"] || "-"}</td>
          <td>${acc["Najm"] || acc["najm"] || "-"}</td>
          <td>${acc["Najm Report Status"] || acc["najm report status"] || "-"}</td>
          <td>${acc["Mistake Percentage"] !== undefined ? acc["Mistake Percentage"] + "%" : "-"}</td>
          <td>${acc["Investigation Conducted"] || acc["investigation conducted"] || "-"}</td>
          <td>${acc["Investigation Status"] || acc["investigation status"] || "-"}</td>
          <td>${acc["Accident Type"] || acc["accident type"] || "-"}</td>
          <td>${acc["Accident Description"] || acc["accident description"] || "-"}</td>
          <td>${acc["Root Causes"] || acc["root causes"] || "-"}</td>
          <td>${acc["Damage Description"] || acc["damage description"] || "-"}</td>
        `;

        tr.addEventListener("click", async () => {
          await Promise.all([fetchFleet(), fetchDrivers()]);
          setupAccidentModalSelects();
          document.getElementById("modal-accident-title").textContent = "Edit Accident Record";
          document.getElementById("add-acc-id").value = acc["Accident ID"] || acc["accident id"] || "";
          document.getElementById("add-acc-date").value = toDateInput(acc["Date"] || acc["date"]);
          document.getElementById("add-acc-time").value = toTimeInput(acc["Time"] || acc["time"]);
          document.getElementById("add-acc-plate").value = acc["Car Plate"] || acc["car plate"] || "";
          document.getElementById("add-acc-model").value = acc["Car Model"] || acc["car model"] || "";
          document.getElementById("add-acc-iqama").value = acc["Driver Iqama"] || acc["driver iqama"] || "";
          document.getElementById("add-acc-driver-name").value = acc["Driver Name"] || acc["driver name"] || "";
          document.getElementById("add-acc-location").value = acc["Accident Location"] || acc["accident location"] || "";
          document.getElementById("add-acc-severity").value = acc["Severity"] || acc["severity"] || "Very Minor";
          document.getElementById("add-acc-injured").value = acc["Injured"] || acc["injured"] || "No";
          document.getElementById("add-acc-maintenance").value = acc["Send to Maintenance"] || acc["send to maintenance"] || "No";
          
          const najmVal = acc["Najm"] || acc["najm"] || "No";
          document.getElementById("add-acc-najm").value = najmVal;
          if (najmVal === "Yes") {
            najmStatusSelect.disabled = false;
            najmStatusSelect.style.background = "#ffffff";
            najmStatusSelect.innerHTML = '<option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>';
            najmStatusSelect.value = acc["Najm Report Status"] || acc["najm report status"] || "Pending";
          } else {
            najmStatusSelect.disabled = true;
            najmStatusSelect.style.background = "#e9ecef";
            najmStatusSelect.innerHTML = '<option value="N/A">N/A</option>';
          }

          document.getElementById("add-acc-mistake").value = acc["Mistake Percentage"] !== undefined ? acc["Mistake Percentage"] : 0;
          
          const invVal = acc["Investigation Conducted"] || acc["investigation conducted"] || "No";
          document.getElementById("add-acc-investigation").value = invVal;
          if (invVal === "Yes") {
            invStatusSelect.disabled = false;
            invStatusSelect.style.background = "#ffffff";
            invStatusSelect.innerHTML = '<option value="Under Investigation">Under Investigation</option><option value="Closed">Closed</option>';
            invStatusSelect.value = acc["Investigation Status"] || acc["investigation status"] || "Under Investigation";
          } else {
            invStatusSelect.disabled = true;
            invStatusSelect.style.background = "#e9ecef";
            invStatusSelect.innerHTML = '<option value="N/A">N/A</option>';
          }

          document.getElementById("add-acc-type").value = acc["Accident Type"] || acc["accident type"] || "";
          document.getElementById("add-acc-root-causes").value = acc["Root Causes"] || acc["root causes"] || "";
          document.getElementById("add-acc-description").value = acc["Accident Description"] || acc["accident description"] || "";
          document.getElementById("add-acc-damage").value = acc["Damage Description"] || acc["damage description"] || "";

          deleteAccidentBtn.style.display = "inline-block";
          addAccidentModal.style.display = "flex";
        });

        tbody.appendChild(tr);
      });
    }

    async function fetchAccidents() {
      accidentsDatabase = [];
      applyAccidentFilters();
      return false;
    }

// Refresh the records when the user clicks this module's refresh button.
    document.getElementById("refresh-accidents-btn").addEventListener("click", fetchAccidents);

// Accident search, date filtering, and filtered export.
    const ACC_KEYS = ["Accident ID", "Car Plate", "Driver Iqama", "Driver Name"];

    function getFilteredAccidents() {
      const q = document.getElementById("accident-search-input").value.trim().toLowerCase();
      const sd = document.getElementById("filter-start-date").value;
      const ed = document.getElementById("filter-end-date").value;
      const start = sd ? sd : "";
      const end = ed ? ed : "";
      return accidentsDatabase.filter(o => {
        if (q && !matchText(o, ACC_KEYS, q)) return false;
        if (start || end) {
          const dt = toDateInput(getField(o, "Date"));
          if (start && dt < start) return false;
          if (end && dt > end) return false;
        }
        return true;
      });
    }
    function applyAccidentFilters() { renderAccidentsTable(getFilteredAccidents()); }

    setupSearchDropdown({
      input: "accident-search-input", btn: "toggle-accident-btn", dd: "accident-dropdown",
      getData: () => accidentsDatabase, keys: ACC_KEYS, apply: applyAccidentFilters,
      label: o => `${getField(o, "Accident ID")} - ${getField(o, "Car Plate")} - ${getField(o, "Driver Name")}`
    });

    ["filter-start-date", "filter-end-date"].forEach(id => {
      document.getElementById(id).addEventListener("change", applyAccidentFilters);
    });

    document.getElementById("export-accidents-date-btn").addEventListener("click", event => exportLatestSheetData(event.currentTarget, fetchAccidents, () => {
      const data = getFilteredAccidents();
      if (data.length === 0) { alert("No accident data available for the selected period."); return; }
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Accidents");
      XLSX.writeFile(workbook, "Accidents_Period.xlsx");
    }));


applyAccidentFilters();
