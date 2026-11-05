/**
 * Shared database relationships.
 * Feature-specific fetch functions live inside modules/<name>/<name>.js.
 * Changes submitted to Google Apps Script require server-side authorization.
 */

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

    // Sheets are the permanent database; these arrays are only browser snapshots.
    async function readSheetRecords(url) {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}.`);
      const records = await response.json();
      if (!Array.isArray(records)) throw new Error("Invalid Google Sheets response.");
      return records;
    }

    async function exportLatestSheetData(button, refresh, writeExport) {
      button.disabled = true;
      try {
        if (!await refresh()) {
          alert("Export cancelled: the latest saved Google Sheets data could not be loaded. Refresh and try again.");
          return;
        }
        await writeExport();
      } catch (error) {
        console.error("Unable to export Google Sheets data:", error);
        alert("Export failed. Refresh the module and try again.");
      } finally {
        button.disabled = false;
      }
    }
