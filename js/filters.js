/**
 * TAXI QAID ERP | filters.js
 * Purpose: Search filters, date filters, and contextual exports.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    // --- SEARCH, FILTERING, AND EXPORT FOR TRIP CHECKS AND ACCIDENTS ---
    function getField(o, k) { return o[k] || o[k.toLowerCase()] || ""; }
    function matchText(o, keys, q) { return keys.some(k => String(getField(o, k)).toLowerCase().includes(q)); }

    const TC_KEYS = ["Check ID", "Car Plate", "Driver Iqama", "Driver Name"];
    const ACC_KEYS = ["Accident ID", "Car Plate", "Driver Iqama", "Driver Name"];

    function getFilteredTripChecks() {
      const q = document.getElementById("tripcheck-search-input").value.trim().toLowerCase();
      return tripChecksDatabase.filter(o => !q || matchText(o, TC_KEYS, q));
    }
    function applyTripCheckFilters() { renderTripChecksTable(getFilteredTripChecks()); }

    function getFilteredAccidents() {
      const q = document.getElementById("accident-search-input").value.trim().toLowerCase();
      const sd = document.getElementById("filter-start-date").value;
      const st = document.getElementById("filter-start-time").value || "00:00";
      const ed = document.getElementById("filter-end-date").value;
      const et = document.getElementById("filter-end-time").value || "23:59";
      const start = sd ? `${sd}T${st}` : "";
      const end = ed ? `${ed}T${et}` : "";
      return accidentsDatabase.filter(o => {
        if (q && !matchText(o, ACC_KEYS, q)) return false;
        if (start || end) {
          const dt = `${toDateInput(getField(o, "Date"))}T${toTimeInput(getField(o, "Time")) || "00:00"}`;
          if (start && dt < start) return false;
          if (end && dt > end) return false;
        }
        return true;
      });
    }
    function applyAccidentFilters() { renderAccidentsTable(getFilteredAccidents()); }

    function setupSearchDropdown({ input, btn, dd, getData, keys, label, apply }) {
      const inp = document.getElementById(input);
      const b = document.getElementById(btn);
      const d = document.getElementById(dd);
      function show() {
        const q = inp.value.trim().toLowerCase();
        const items = getData().filter(o => !q || matchText(o, keys, q));
        d.innerHTML = "";
        if (items.length === 0) { d.style.display = "none"; return; }
        items.slice(0, 100).forEach(o => {
          const div = document.createElement("div");
          div.className = "custom-dropdown-item";
          div.textContent = label(o);
          div.addEventListener("click", () => {
            inp.value = getField(o, keys[0]);
            d.style.display = "none";
            apply();
          });
          d.appendChild(div);
        });
        d.style.display = "block";
      }
      inp.addEventListener("input", () => { apply(); show(); });
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (d.style.display === "block") d.style.display = "none"; else show();
      });
    }

    setupSearchDropdown({
      input: "tripcheck-search-input", btn: "toggle-tripcheck-btn", dd: "tripcheck-dropdown",
      getData: () => tripChecksDatabase, keys: TC_KEYS, apply: applyTripCheckFilters,
      label: o => `${getField(o, "Check ID")} - ${getField(o, "Car Plate")} - ${getField(o, "Driver Name")}`
    });
    setupSearchDropdown({
      input: "accident-search-input", btn: "toggle-accident-btn", dd: "accident-dropdown",
      getData: () => accidentsDatabase, keys: ACC_KEYS, apply: applyAccidentFilters,
      label: o => `${getField(o, "Accident ID")} - ${getField(o, "Car Plate")} - ${getField(o, "Driver Name")}`
    });

    ["filter-start-date", "filter-start-time", "filter-end-date", "filter-end-time"].forEach(id => {
      document.getElementById(id).addEventListener("change", applyAccidentFilters);
    });

    document.getElementById("export-accidents-date-btn").addEventListener("click", () => {
      const data = getFilteredAccidents();
      if (data.length === 0) { alert("No accident data available for the selected period."); return; }
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Accidents");
      XLSX.writeFile(workbook, "Accidents_Period.xlsx");
    });

    // Close dropdowns when the user clicks outside their search container.
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-wrapper")) {
        document.querySelectorAll(".custom-dropdown").forEach(d => d.style.display = "none");
      }
    });
