/** TaxiQaid: legacy transport is disabled; existing authorization is preserved. */

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

    // Operational records remain empty until the new database is integrated.
    async function readSheetRecords(url) {
      throw new Error("Database integration pending");
}

    async function exportLatestSheetData(button, refresh, writeExport) {
      showIntegrationPending();
}
