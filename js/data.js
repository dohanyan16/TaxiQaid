/**
 * TAXI QAID ERP | data.js
 * Purpose: Google Sheets read operations and driver/vehicle matching.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    // --- GOOGLE SHEETS READ OPERATIONS AND CONNECTION INDICATORS ---
    async function fetchDrivers() {
      try {
        const syncBadge = document.getElementById("sync-status");
        if (syncBadge) syncBadge.textContent = "🔄 Syncing drivers database...";
        
        const res = await fetch(GOOGLE_SHEET_DRIVERS_URL);
        driversDatabase = await res.json();
        
        if (syncBadge) syncBadge.textContent = `✅ Synced ${driversDatabase.length} driver(s) successfully.`;
      } catch (e) {
        console.error("Error fetching drivers", e);
        const syncBadge = document.getElementById("sync-status");
        if (syncBadge) syncBadge.textContent = "❌ Failed to connect to Drivers Google Sheet.";
      }
    }

    async function fetchFleet() {
      try {
        const syncBadge = document.getElementById("fleet-sync-status");
        if (syncBadge) syncBadge.textContent = "🔄 Syncing fleet database...";
        
        const res = await fetch(GOOGLE_SHEET_FLEET_URL);
        fleetDatabase = await res.json();
        updateAllFleetAccidentCounts();
        
        if (syncBadge) syncBadge.textContent = `✅ Synced ${fleetDatabase.length} vehicle(s) successfully.`;
      } catch (e) {
        console.error("Error fetching fleet", e);
        const syncBadge = document.getElementById("fleet-sync-status");
        if (syncBadge) syncBadge.textContent = "❌ Failed to connect to Fleet Google Sheet.";
      }
    }

    async function fetchAccidents() {
      try {
        const syncBadge = document.getElementById("accident-sync-status");
        if (syncBadge) syncBadge.textContent = "🔄 Syncing accident records...";
        
        const res = await fetch(GOOGLE_SHEET_ACCIDENTS_URL);
        accidentsDatabase = await res.json();
        updateAllFleetAccidentCounts();
        applyAccidentFilters();
        
        if (syncBadge) syncBadge.textContent = `✅ Synced ${accidentsDatabase.length} accident record(s).`;
      } catch (e) {
        console.error("Error fetching accidents", e);
        const syncBadge = document.getElementById("accident-sync-status");
        if (syncBadge) syncBadge.textContent = "❌ Failed to connect to Accidents Google Sheet.";
      }
    }

    async function fetchTripChecks() {
      try {
        const syncBadge = document.getElementById("tripcheck-sync-status");
        if (syncBadge) syncBadge.textContent = "🔄 Syncing trip checks...";
        
        const res = await fetch(GOOGLE_SHEET_TRIPCHECK_URL);
        tripChecksDatabase = await res.json();
        applyTripCheckFilters();
        
        if (syncBadge) syncBadge.textContent = `✅ Synced ${tripChecksDatabase.length} check(s).`;
      } catch (e) {
        console.error("Error fetching trip checks", e);
        const syncBadge = document.getElementById("tripcheck-sync-status");
        if (syncBadge) syncBadge.textContent = "❌ Failed to connect to Trip Check Google Sheet.";
      }
    }

    // Manual refresh actions for each database.
    document.getElementById("refresh-db-btn").addEventListener("click", fetchDrivers);
    document.getElementById("refresh-fleet-btn").addEventListener("click", fetchFleet);
    document.getElementById("refresh-accidents-btn").addEventListener("click", fetchAccidents);
    document.getElementById("refresh-tripchecks-btn").addEventListener("click", fetchTripChecks);

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
