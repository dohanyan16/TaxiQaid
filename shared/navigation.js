/**
 * TaxiQaid | Shared sidebar navigation.
 * One shared sidebar is used across all modules, including planned pages.
 */
const menuItems = document.querySelectorAll(".sidebar-menu li[data-view]");
const viewSections = document.querySelectorAll(".view-section");
const pageTitle = document.getElementById("page-title");

function activateModule(item) {
  const targetView = item.dataset.view;
  const section = document.getElementById(`view-${targetView}`);
  if (!section) {
    console.warn(`View not found: ${targetView}`);
    return;
  }
  menuItems.forEach(li => {
    li.classList.toggle("active", li === item);
    const link = li.querySelector("a");
    if (link) {
      if (li === item) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  });
  viewSections.forEach(view => view.classList.toggle("active", view === section));
  pageTitle.textContent = item.querySelector(".nav-text").textContent.trim();
  const group = item.closest("details.sidebar-group");
  if (group) group.open = true;
  if (targetView === "drivers" && driversDatabase.length === 0) fetchDrivers();
  // Always refresh Fleet when opened so recent Post-Trip mileage is reflected.
  if (targetView === "fleet") refreshFleetData();
  if (targetView === "accidents" && accidentsDatabase.length === 0) fetchAccidents();
  if (targetView === "tripcheck" && tripChecksDatabase.length === 0) fetchTripChecks();
}

menuItems.forEach(item => item.querySelector("a")?.addEventListener("click", event => {
  event.preventDefault();
  activateModule(item);
}));
const firstActive = document.querySelector(".sidebar-menu li.active[data-view]");
if (firstActive) firstActive.querySelector("a")?.setAttribute("aria-current", "page");
