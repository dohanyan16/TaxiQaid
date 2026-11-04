/**
 * TAXI QAID ERP | Trip Check
 *
 * Module responsibilities:
 * - Manage the 27-step Pre-Trip / Post-Trip inspection wizard.
 * - Calculate an automatic score from the 24 inspection questions (steps 3–26).
 * - Derive immutable Pass / Pending review status from the answers.
 * - Search, filter, edit and export inspection records.
 * - Read and update the dedicated Google Sheets through a protected Supabase Edge Function.
 *
 * IMPORTANT: All sensitive requests must go through the authenticated Edge Function.
 * Do not add Apps Script shared secrets or sheet IDs to browser code.
 */

// Column names are kept stable for the future Google Sheet integration.
const TRIPCHECK_QUESTIONS = Object.freeze([
  ["tc_documents", "Valid Documents"],
  ["tc_uniform", "Required Uniform"],
  ["tc_doors", "Doors Working"],
  ["tc_trunk", "Trunk Condition"],
  ["tc_bonnet", "Bonnet Condition"],
  ["tc_dashboard", "Dashboard Condition"],
  ["tc_mirrors", "Mirrors Condition"],
  ["tc_horn", "Horn Working"],
  ["tc_seats", "Seats & Belts"],
  ["tc_ac", "A/C Working"],
  ["tc_steering", "Steering & Odometer"],
  ["tc_mdt", "MDT & Screen"],
  ["tc_charging", "Charging Port"],
  ["tc_cctv", "CCTV Cameras"],
  ["tc_lights", "Lights Working"],
  ["tc_housekeeping", "Housekeeping"],
  ["tc_wipers", "Wipers Working"],
  ["tc_oil_leak", "Oil Leakage"],
  ["tc_other_leak", "Other Leakage"],
  ["tc_tyres", "Tyres & Spare"],
  ["tc_brakes", "Brakes & ABS"],
  ["tc_safety", "Safety Equipment"],
  ["tc_plates", "Number Plates"],
  ["tc_toolkit", "Toolkit Bag"]
]);
const tripCheckModal = document.getElementById("add-tripcheck-modal");
const openAddTripCheckBtn = document.getElementById("open-add-tripcheck-modal");
const closeAddTripCheckBtn = document.getElementById("close-add-tripcheck-modal");
const addTripCheckForm = document.getElementById("add-tripcheck-form");
const wizardPrevBtn = document.getElementById("wizard-prev-btn");
const wizardNextBtn = document.getElementById("wizard-next-btn");
const saveTripCheckBtn = document.getElementById("save-tripcheck-btn");
const progressIndicator = document.getElementById("wizard-progress-indicator");

/** Map previously used Yes/No/Pass/Fail answers to the new data format. */
function normalizeTripCheckAnswer(raw) {
  const answer = String(raw ?? "").trim().toLowerCase();
  if (["ok", "pass", "passed", "yes"].includes(answer)) return "OK";
  if (["defect", "fail", "failed", "no"].includes(answer)) return "Defect";
  return "";
}

/** Return the precise number of answers and the percentage of OK answers. */
function calculateTripCheckScore(answers) {
  let ok = 0;
  let defect = 0;
  for (const answer of answers) {
    const value = normalizeTripCheckAnswer(answer);
    if (value === "OK") ok++;
    if (value === "Defect") defect++;
  }
  const total = TRIPCHECK_QUESTIONS.length;
  const answered = ok + defect;
  return {
    ok, defect, answered, total,
    percentage: Math.round(ok * 100 / total),
    status: ok === total ? "Pass" : "Pending review"
  };
}

function scoreCurrentTripCheck() {
  return calculateTripCheckScore(TRIPCHECK_QUESTIONS.map(([id]) => document.getElementById(id).value));
}

/** This is a display-only score/status; neither can be manually changed. */
function updateTripCheckScore() {
  const score = scoreCurrentTripCheck();
  document.getElementById("tc-score-percentage").textContent = `${score.percentage}%`;
  document.getElementById("tc-score-fill").style.width = `${score.ok * 100 / score.total}%`;
  document.getElementById("tc-score-defect-fill").style.width = `${score.defect * 100 / score.total}%`;
  document.getElementById("tc-score-fill").classList.toggle("is-pass", score.status === "Pass");
  document.getElementById("tc-score-progress").setAttribute("aria-valuenow", String(score.percentage));
  document.getElementById("tc-score-breakdown").textContent =
    `${score.ok} OK · ${score.defect} Defect · ${score.answered} of ${score.total} answered`;
  const statusInput = document.getElementById("tc-status");
  statusInput.value = score.status;
  statusInput.classList.toggle("is-pass", score.status === "Pass");
  return score;
}

/** Keep the original two-button choice interaction for every wizard step. */
window.selectWizardChoice = function(inputId, value, element) {
  // An existing inspection must remain in its original spreadsheet.
  if (inputId === "tc-type" && document.getElementById("tc-id").value &&
      document.getElementById("tc-type").value !== value) {
    alert("Inspection type cannot be changed after creation. Please create a new inspection instead.");
    return;
  }
  document.getElementById(inputId).value = value;
  const parent = element.parentElement;
  parent.querySelectorAll(".choice-box").forEach(box => {
    box.classList.remove("selected");
    box.setAttribute("aria-pressed", "false");
  });
  element.classList.add("selected");
  element.setAttribute("aria-pressed", "true");
  updateTripCheckScore();
};

/** Make existing choice cards keyboard-accessible without changing layout. */
document.querySelectorAll("#add-tripcheck-modal .choice-box").forEach(box => {
  box.setAttribute("role", "button");
  box.setAttribute("tabindex", "0");
  box.setAttribute("aria-pressed", box.classList.contains("selected") ? "true" : "false");
  if (box.closest('.wizard-step')?.dataset.step >= 3 && box.closest('.wizard-step')?.dataset.step <= 26) {
    box.dataset.choice = box.textContent.trim();
  }
  box.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      box.click();
    }
  });
});

function setWizardChoice(inputId, value) {
  const input = document.getElementById(inputId);
  input.value = value;
  const choices = input.closest(".wizard-step").querySelectorAll(".choice-box");
  choices.forEach(box => {
    const selected = box.getAttribute("onclick")?.includes(`'${value}'`) || false;
    box.classList.toggle("selected", selected);
    box.setAttribute("aria-pressed", String(selected));
  });
}

function showWizardStep(step) {
  currentWizardStep = step;
  document.querySelectorAll("#add-tripcheck-modal .wizard-step").forEach(el => el.classList.remove("active-step"));
  document.querySelector(`#add-tripcheck-modal .wizard-step[data-step="${step}"]`).classList.add("active-step");
  progressIndicator.textContent = `Step ${step} of ${totalWizardSteps}`;
  wizardPrevBtn.style.display = step === 1 ? "none" : "inline-block";
  wizardNextBtn.style.display = step === totalWizardSteps ? "none" : "inline-block";
  saveTripCheckBtn.style.display = step === totalWizardSteps ? "inline-block" : "none";
  if (step === totalWizardSteps) updateTripCheckScore();
  tripCheckModal.querySelector(".modal-content").scrollTop = 0;
}

async function populateTripCheckDropdowns() {
  // These two existing data sources are still used for plate and driver lookup.
  await Promise.all([fetchFleet(), fetchDrivers()]);
  setupTripCheckSelects();
}

/** Create a new blank inspection; no question is pre-answered. */
openAddTripCheckBtn.addEventListener("click", async () => {
  await populateTripCheckDropdowns();
  addTripCheckForm.reset();
  document.getElementById("tc-id").value = "";
  document.getElementById("tripcheck-modal-title").textContent = "New Trip Check";
  document.getElementById("tc-plate-search").value = "";
  document.getElementById("tc-iqama-search").value = "";
  setWizardChoice("tc-type", "Pre-Trip");
  TRIPCHECK_QUESTIONS.forEach(([id]) => setWizardChoice(id, ""));
  updateTripCheckScore();
  showWizardStep(1);
  tripCheckModal.style.display = "flex";
});

closeAddTripCheckBtn.addEventListener("click", () => { tripCheckModal.style.display = "none"; });

wizardNextBtn.addEventListener("click", () => {
  if (currentWizardStep === 2) {
    if (!document.getElementById("tc-plate").value) { alert("Please select a valid Car Plate."); return; }
    if (!document.getElementById("tc-iqama").value) { alert("Please select a valid Driver."); return; }
    const km = document.getElementById("tc-odometer").value;
    if (km === "" || !Number.isFinite(Number(km)) || Number(km) < 0) {
      alert("Please enter a valid odometer reading."); return;
    }
  }
  if (currentWizardStep < totalWizardSteps) showWizardStep(currentWizardStep + 1);
});

wizardPrevBtn.addEventListener("click", () => {
  if (currentWizardStep > 1) showWizardStep(currentWizardStep - 1);
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


/**
 * AUTHENTICATED BACKEND ADAPTER
 * Keep all requests through the Supabase Edge Function, never direct to Apps Script.
 */
async function callTripCheckBackend(payload) {
  await requireAuthorizedUser();
  const { data, error } = await supabaseClient.functions.invoke("trip-checks", { body: payload });
  if (error) {
    let message = error.message || "Trip Check service unavailable.";
    if (error.context && typeof error.context.json === "function") {
      try {
        const details = await error.context.json();
        message = details.message || message;
      } catch (ignored) { /* A non-JSON error response is allowed. */ }
    }
    throw new Error(message);
  }
  if (!data || data.status !== "success") {
    throw new Error(data?.message || "Trip Check request failed.");
  }
  return data;
}

function createTripCheckId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `TC-${stamp}-${random.toUpperCase()}`;
}

function getTripCheckField(record, name) {
  if (Object.prototype.hasOwnProperty.call(record, name)) return record[name];
  return record[name.toLowerCase()] ?? "";
}

/** Use the same data structure for new records and edited ones. */
function collectTripCheckForm(existingRecord = null) {
  const now = getKSACurrentDateTime();
  const data = {
    "Check ID": existingRecord ? getTripCheckField(existingRecord, "Check ID") : createTripCheckId(),
    "Check Type": document.getElementById("tc-type").value,
    "Date": existingRecord ? getTripCheckField(existingRecord, "Date") : now.date,
    "Time": existingRecord ? getTripCheckField(existingRecord, "Time") : now.time,
    "Car Plate": document.getElementById("tc-plate").value,
    "Driver Iqama": document.getElementById("tc-iqama").value,
    "Driver Name": document.getElementById("tc-driver-name").value,
    "Odometer (KM)": Number(document.getElementById("tc-odometer").value),
    "Checked By": existingRecord ? getTripCheckField(existingRecord, "Checked By") : loggedInUserName,
    "Remarks": document.getElementById("tc-remarks").value.trim(),
    "Last Edited By": loggedInUserName,
    "Last Edited At": `${now.date} ${now.time}`
  };
  for (const [id, field] of TRIPCHECK_QUESTIONS) {
    data[field] = normalizeTripCheckAnswer(document.getElementById(id).value);
  }
  const score = scoreCurrentTripCheck();
  data["Score (%)"] = score.percentage;
  data["Overall Status"] = score.status;
  return data;
}

addTripCheckForm.addEventListener("submit", async event => {
  event.preventDefault();
  const score = updateTripCheckScore();
  if (score.answered !== score.total) {
    const unansweredIndex = TRIPCHECK_QUESTIONS.findIndex(([id]) => !normalizeTripCheckAnswer(document.getElementById(id).value));
    alert(`Please answer every inspection item before saving (${score.answered}/${score.total} answered).`);
    if (unansweredIndex >= 0) showWizardStep(unansweredIndex + 3);
    return;
  }
  const kmText = document.getElementById("tc-odometer").value;
  if (!document.getElementById("tc-plate").value || !document.getElementById("tc-iqama").value ||
      kmText === "" || !Number.isFinite(Number(kmText)) || Number(kmText) < 0) {
    alert("Please complete the vehicle, driver and odometer details.");
    showWizardStep(2);
    return;
  }
  saveTripCheckBtn.disabled = true;
  saveTripCheckBtn.textContent = "Saving inspection...";
  try {
    const id = document.getElementById("tc-id").value;
    const existing = id ? tripChecksDatabase.find(row => String(getTripCheckField(row, "Check ID")) === id) : null;
    if (id && !existing) throw new Error("The inspection to edit could not be found.");
    const record = collectTripCheckForm(existing);
    await callTripCheckBackend({
      action: id ? "update" : "create",
      type: record["Check Type"],
      record
    });
    const reloaded = await fetchTripChecks();
    tripCheckModal.style.display = "none";
    alert(reloaded ? "Trip check saved in Google Sheets." :
      "Inspection saved, but the list could not be reloaded. Check the connection.");
  } catch (error) {
    console.error("Could not save the Trip Check:", error);
    alert(`Unable to save the inspection: ${error.message}`);
  } finally {
    saveTripCheckBtn.disabled = false;
    saveTripCheckBtn.textContent = "💾 Save Inspection";
  }
});

/** Opening a table record follows the same edit interaction as Accident Tracker. */
async function openTripCheckEditor(record) {
  await populateTripCheckDropdowns();
  addTripCheckForm.reset();
  document.getElementById("tripcheck-modal-title").textContent = "Edit Trip Check";
  document.getElementById("tc-id").value = getTripCheckField(record, "Check ID");
  setWizardChoice("tc-type", getTripCheckField(record, "Check Type") === "Post-Trip" ? "Post-Trip" : "Pre-Trip");
  document.getElementById("tc-plate").value = getTripCheckField(record, "Car Plate");
  document.getElementById("tc-plate-search").value = getTripCheckField(record, "Car Plate");
  document.getElementById("tc-iqama").value = getTripCheckField(record, "Driver Iqama");
  document.getElementById("tc-driver-name").value = getTripCheckField(record, "Driver Name");
  const iqama = getTripCheckField(record, "Driver Iqama");
  const name = getTripCheckField(record, "Driver Name");
  document.getElementById("tc-iqama-search").value = [iqama, name].filter(Boolean).join(" - ");
  document.getElementById("tc-odometer").value = getTripCheckField(record, "Odometer (KM)");
  document.getElementById("tc-remarks").value = getTripCheckField(record, "Remarks");
  for (const [id, field] of TRIPCHECK_QUESTIONS) {
    setWizardChoice(id, normalizeTripCheckAnswer(getTripCheckField(record, field)));
  }
  updateTripCheckScore();
  showWizardStep(1);
  tripCheckModal.style.display = "flex";
}

function renderTripChecksTable(items) {
  const tbody = document.getElementById("tripchecks-table-body");
  tbody.replaceChildren();
  document.getElementById("tripcheck-count-badge").textContent = `${items.length} records found`;
  if (items.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 13;
    cell.className = "tripcheck-empty-table";
    cell.textContent = "No trip check records match the selected filters.";
    return;
  }
  for (const record of items) {
    const row = tbody.insertRow();
    row.className = "tripcheck-record-row";
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Edit inspection ${getTripCheckField(record, "Check ID")}`);
    row.addEventListener("click", () => openTripCheckEditor(record));
    row.addEventListener("keydown", event => {
      if (event.target !== row) return;
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTripCheckEditor(record); }
    });
    const addCell = text => { const cell = row.insertCell(); cell.textContent = String(text ?? "-") || "-"; return cell; };
    addCell(getTripCheckField(record, "Check ID"));
    addCell(getTripCheckField(record, "Check Type"));
    addCell(formatDateForDisplay(getTripCheckField(record, "Date")));
    addCell(formatTimeForDisplay(getTripCheckField(record, "Time")));
    addCell(getTripCheckField(record, "Car Plate"));
    addCell(getTripCheckField(record, "Driver Iqama"));
    addCell(getTripCheckField(record, "Driver Name"));
    addCell(getTripCheckField(record, "Odometer (KM)"));
    const derived = calculateTripCheckScore(TRIPCHECK_QUESTIONS.map(([,field]) => getTripCheckField(record, field)));
    addCell(`${derived.percentage}%`);
    const statusCell = row.insertCell();
    const tag = document.createElement("span");
    tag.className = `tripcheck-status-tag ${derived.status === "Pass" ? "is-pass" : ""}`;
    tag.textContent = derived.status;
    statusCell.appendChild(tag);
    addCell(getTripCheckField(record, "Checked By"));
    addCell(getTripCheckField(record, "Remarks"));
    const actionCell = row.insertCell();
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "tripcheck-edit-btn";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit inspection ${getTripCheckField(record, "Check ID")}`);
    editButton.addEventListener("click", event => { event.stopPropagation(); openTripCheckEditor(record); });
    actionCell.appendChild(editButton);
  }
}

/** Load both spreadsheets, then let the existing filter display either type. */
async function fetchTripChecks() {
  const badge = document.getElementById("tripcheck-sync-status");
  try {
    const result = await callTripCheckBackend({ action: "list", type: "all" });
    if (!Array.isArray(result.records)) throw new Error("Invalid server response.");
    tripChecksDatabase = result.records;
    applyTripCheckFilters();
    badge.textContent = `Google Sheets connected — ${tripChecksDatabase.length} inspection(s) available.`;
    return true;
  } catch (error) {
    console.error("Unable to load Trip Checks:", error);
    tripChecksDatabase = [];
    applyTripCheckFilters();
    badge.textContent = `Trip Check unavailable: ${error.message}`;
    return false;
  }
}

const TC_KEYS = ["Check ID", "Car Plate", "Driver Iqama", "Driver Name"];
function getFilteredTripChecks() {
  const query = document.getElementById("tripcheck-search-input").value.trim().toLowerCase();
  const type = document.getElementById("tripcheck-type-filter").value;
  return tripChecksDatabase.filter(record => {
    const matchesType = type === "all" || getTripCheckField(record, "Check Type") === type;
    return matchesType && (!query || matchText(record, TC_KEYS, query));
  });
}
function applyTripCheckFilters() { renderTripChecksTable(getFilteredTripChecks()); }

document.getElementById("tripcheck-type-filter").addEventListener("change", applyTripCheckFilters);
setupSearchDropdown({
  input: "tripcheck-search-input", btn: "toggle-tripcheck-btn", dd: "tripcheck-dropdown",
  getData: () => tripChecksDatabase, keys: TC_KEYS, apply: applyTripCheckFilters,
  label: record => `${getField(record, "Check ID")} - ${getField(record, "Car Plate")} - ${getField(record, "Driver Name")}`
});

document.getElementById("export-tripchecks-btn").addEventListener("click", () => {
  const selected = getFilteredTripChecks();
  if (!selected.length) { alert("No trip check records to export for the selected filters."); return; }
  const sheet = XLSX.utils.json_to_sheet(selected);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Trip Checks");
  XLSX.writeFile(book, "Trip_Checks.xlsx");
});

// Do not retain records in memory when an operator signs out.
document.getElementById("logout-button").addEventListener("click", () => {
  tripChecksDatabase = [];
  applyTripCheckFilters();
  tripCheckModal.style.display = "none";
});
