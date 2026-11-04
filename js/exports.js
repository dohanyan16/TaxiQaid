/**
 * TAXI QAID ERP | exports.js
 * Purpose: Excel exports for fleet and driver records.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    // --- EXPORTS ---
    document.getElementById("export-fleet-excel-btn").addEventListener("click", () => {
      if (fleetDatabase.length === 0) { alert("No fleet data available to export."); return; }
      const worksheet = XLSX.utils.json_to_sheet(fleetDatabase);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fleet Database");
      XLSX.writeFile(workbook, "Fleet_Database.xlsx");
    });

    document.getElementById("export-excel-btn").addEventListener("click", () => {
      if (driversDatabase.length === 0) { alert("No driver data available to export."); return; }
      const worksheet = XLSX.utils.json_to_sheet(driversDatabase);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Drivers Database");
      XLSX.writeFile(workbook, "Drivers_Database.xlsx");
    });
