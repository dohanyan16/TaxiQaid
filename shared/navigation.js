/**
 * TAXI QAID ERP | navigation.js
 * Purpose: Sidebar navigation and conditional data refresh.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    const menuItems = document.querySelectorAll(".sidebar-menu li");
    const viewSections = document.querySelectorAll(".view-section");
    const pageTitle = document.getElementById("page-title");

    menuItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const targetView = item.getAttribute("data-view");
        menuItems.forEach(li => li.classList.remove("active"));
        viewSections.forEach(sec => sec.classList.remove("active"));
        item.classList.add("active");
        document.getElementById(`view-${targetView}`).classList.add("active");
        pageTitle.textContent = item.querySelector(".nav-text").textContent.trim();
        if (targetView === "drivers" && driversDatabase.length === 0) fetchDrivers();
        if (targetView === "fleet" && fleetDatabase.length === 0) fetchFleet();
        if (targetView === "accidents" && accidentsDatabase.length === 0) fetchAccidents();
        if (targetView === "tripcheck" && tripChecksDatabase.length === 0) fetchTripChecks();
      });
    });
