/**
 * Shared database relationships.
 * Feature-specific fetch functions live inside modules/<name>/<name>.js.
 * Changes submitted to Google Apps Script require server-side authorization.
 */

    function updateAllFleetAccidentCounts() {
      if (fleetDatabase.length === 0 || accidentsDatabase.length === 0) return;
      fleetDatabase.forEach(v => {
        const plate = String(v["Plate"] || v["plate"] || "").trim().toLowerCase();
        const count = accidentsDatabase.filter(acc => String(acc["Car Plate"] || acc["car plate"] || "").trim().toLowerCase() === plate).length;
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
