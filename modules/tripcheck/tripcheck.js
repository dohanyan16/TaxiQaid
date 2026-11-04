/**
 * TAXI QAID ERP | Trip Check
 *
 * Module responsibilities:
 * - Manage the 27-step Pre-Trip / Post-Trip inspection wizard.
 * - Calculate an automatic score from the 24 inspection questions (steps 3–26).
 * - Derive immutable Pass / Pending review status from the answers.
 * - Search, filter, edit and export inspection records.
 * - Persist prototype records in localStorage until a secured backend exists.
 *
 * IMPORTANT: localStorage is NOT a secure, shared or backed-up database.
 * Use test data only until the server-side Apps Script/Supabase integration
 * validates session tokens and permissions for every read and write.
 * See docs/TRIP_CHECK_BACKEND.md before connecting real company data.
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
const TRIPCHECK_LOCAL_STORAGE_PREFIX = "taxiqaid_tripchecks_proto_v1_";
const tripCheckModal = document.getElementById("add-tripcheck-modal");
const openAddTripCheckBtn = document.getElementById("open-add-tripcheck-modal");
const closeAddTripCheckBtn = document.getElementById("close-add-tripcheck-modal");
const addTripCheckForm = document.getElementById("add-tripcheck-form");
const wizardPrevBtn = document.getElementById("wizard-prev-btn");
const wizardNextBtn = document.getElementById("wizard-next-btn");
const saveTripCheckBtn = document.getElementById("save-tripcheck-btn");
const progressIndicator = document.getElementById("wizard-progress-indicator");
let tripCheckSigned = false;
let tripCheckSignatureInk = false;
const tripCheckSignatureModal = document.getElementById("tripcheck-signature-modal");
const tripCheckSignatureCanvas = document.getElementById("tc-signature-canvas");
const tripCheckSignatureContext = tripCheckSignatureCanvas.getContext("2d");


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
  const input = document.getElementById(inputId);
  // An edited inspection stays in its original Pre-Trip or Post-Trip group.
  if (inputId === "tc-type" && document.getElementById("tc-id").value && input.value !== value) {
    alert("Inspection type cannot be changed after creation. Create a new inspection instead.");
    return;
  }
  if (input.value !== value) invalidateTripCheckSignature();
  input.value = value;
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
  if (step === totalWizardSteps) {
    updateTripCheckScore();
    if (!tripCheckSigned) requestAnimationFrame(() => {
      if (tripCheckModal.style.display === "flex" && currentWizardStep === totalWizardSteps && !tripCheckSigned) {
        openTripCheckSignatureDialog();
      }
    });
  }
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
  tripCheckSigned = false;
  updateTripCheckSignatureStatus();
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
            if (plateInput.value !== plate) invalidateTripCheckSignature();
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
            if (iqamaInput.value !== iqama) invalidateTripCheckSignature();
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
 * DEMO STORAGE ADAPTER
 * --------------------
 * Change only this adapter when connecting a secure Trip Check backend.
 * localStorage entries are scoped by the signed-in Supabase user's ID, but
 * browser storage itself is inspectable and MUST NOT contain production data.
 */
async function getTripCheckStorageKey() {
  const user = await requireAuthorizedUser();
  return TRIPCHECK_LOCAL_STORAGE_PREFIX + user.id;
}

function readTripCheckRecords(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const items = JSON.parse(raw);
  if (!Array.isArray(items)) throw new Error("Invalid locally saved Trip Check data.");
  return items;
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
    "Signed": tripCheckSigned ? "Yes" : "No",
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
  if (!tripCheckSigned) {
    showWizardStep(totalWizardSteps);
    openTripCheckSignatureDialog();
    alert("The driver must confirm their signature before this inspection can be saved.");
    return;
  }
  saveTripCheckBtn.disabled = true;
  saveTripCheckBtn.textContent = "Saving inspection...";
  try {
    const key = await getTripCheckStorageKey();
    const records = readTripCheckRecords(key);
    const id = document.getElementById("tc-id").value;
    const index = id ? records.findIndex(row => String(getTripCheckField(row, "Check ID")) === id) : -1;
    if (id && index < 0) throw new Error("The inspection to edit could not be found.");
    const data = collectTripCheckForm(index >= 0 ? records[index] : null);
    if (index >= 0) records[index] = data;
    else records.unshift(data);
    localStorage.setItem(key, JSON.stringify(records));
    await fetchTripChecks();
    tripCheckModal.style.display = "none";
    alert("Trip check saved locally. Google Sheets synchronization is not configured yet.");
  } catch (error) {
    console.error("Could not save the Trip Check prototype:", error);
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
  tripCheckSigned = String(getTripCheckField(record, "Signed")).trim().toLowerCase() === "yes";
  updateTripCheckSignatureStatus();
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
    cell.colSpan = 14;
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
    addCell(String(getTripCheckField(record, "Signed")).toLowerCase() === "yes" ? "Yes" : "No");
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

/** Only local prototype records are loaded until the secure backend is built. */
async function fetchTripChecks() {
  const badge = document.getElementById("tripcheck-sync-status");
  try {
    const key = await getTripCheckStorageKey();
    tripChecksDatabase = readTripCheckRecords(key);
    applyTripCheckFilters();
    badge.textContent = `Local prototype — ${tripChecksDatabase.length} inspection(s) in this browser. Not synchronized with Google Sheets.`;
  } catch (error) {
    console.error("Unable to load local trip checks:", error);
    tripChecksDatabase = [];
    applyTripCheckFilters();
    badge.textContent = "Trip Check data unavailable. Sign in or check browser storage permissions.";
  }
}

const TC_KEYS = ["Check ID", "Car Plate", "Driver Iqama", "Driver Name"];
function getFilteredTripChecks() {
  const query = document.getElementById("tripcheck-search-input").value.trim().toLowerCase();
  const type = document.getElementById("tripcheck-type-filter").value;
  const date = document.getElementById("tripcheck-date-filter").value;
  return tripChecksDatabase.filter(record => {
    const matchesType = type === "all" || getTripCheckField(record, "Check Type") === type;
    const rawDate = String(getTripCheckField(record, "Date"));
    const normalizedDate = normalizeTripCheckDate(rawDate);
    const matchesDate = !date || normalizedDate === date;
    return matchesType && matchesDate && (!query || matchText(record, TC_KEYS, query));
  });
}
function applyTripCheckFilters() { renderTripChecksTable(getFilteredTripChecks()); }

document.getElementById("tripcheck-type-filter").addEventListener("change", applyTripCheckFilters);
document.getElementById("tripcheck-date-filter").addEventListener("change", applyTripCheckFilters);
document.getElementById("tripcheck-clear-date-btn").addEventListener("click", () => {
  document.getElementById("tripcheck-date-filter").value = "";
  applyTripCheckFilters();
});
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
  XLSX.writeFile(book, "Trip_Check_Prototype.xlsx");
});


/** Accept ISO, dd/mm/yyyy, mm/dd/yyyy and dates previously stored locally. */
function normalizeTripCheckDate(value) {
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return "";
  const [, first, second, year] = match;
  // Taxi Qaid uses day/month/year formatting for displayed records.
  return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
}

/** Driver signature: the canvas bitmap never enters the saved record. */
function updateTripCheckSignatureStatus() {
  const label = document.getElementById("tc-signature-status");
  label.textContent = tripCheckSigned ? "Signed: Yes - driver confirmation recorded." : "Signed: No - signature required to save.";
  label.classList.toggle("is-signed", tripCheckSigned);
  document.getElementById("open-tripcheck-signature-btn").textContent =
    tripCheckSigned ? "Sign again" : "Sign inspection";
}
function invalidateTripCheckSignature() {
  if (!tripCheckSigned) return;
  tripCheckSigned = false;
  updateTripCheckSignatureStatus();
}
function clearTripCheckSignatureCanvas() {
  tripCheckSignatureContext.clearRect(0, 0, tripCheckSignatureCanvas.width, tripCheckSignatureCanvas.height);
  tripCheckSignatureInk = false;
}
function openTripCheckSignatureDialog() {
  clearTripCheckSignatureCanvas();
  tripCheckSignatureModal.style.display = "flex";
  tripCheckSignatureModal.setAttribute("aria-hidden", "false");
  document.getElementById("tc-clear-signature-btn").focus();
}
function closeTripCheckSignatureDialog() {
  tripCheckSignatureModal.style.display = "none";
  tripCheckSignatureModal.setAttribute("aria-hidden", "true");
  clearTripCheckSignatureCanvas();
  document.getElementById("open-tripcheck-signature-btn").focus();
}
let tripCheckSignatureDrawing = false;
let tripCheckSignatureLast = {x: 0, y: 0};
function getTripCheckSignatureCoordinates(event) {
  const rect = tripCheckSignatureCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * tripCheckSignatureCanvas.width / rect.width,
    y: (event.clientY - rect.top) * tripCheckSignatureCanvas.height / rect.height
  };
}
tripCheckSignatureCanvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  tripCheckSignatureCanvas.setPointerCapture(event.pointerId);
  tripCheckSignatureDrawing = true;
  tripCheckSignatureLast = getTripCheckSignatureCoordinates(event);
  tripCheckSignatureContext.strokeStyle = "#172b4d";
  tripCheckSignatureContext.lineWidth = 3.5;
  tripCheckSignatureContext.lineCap = "round";
  tripCheckSignatureContext.lineJoin = "round";
  tripCheckSignatureContext.beginPath();
  tripCheckSignatureContext.moveTo(tripCheckSignatureLast.x, tripCheckSignatureLast.y);
  tripCheckSignatureContext.lineTo(tripCheckSignatureLast.x + 0.1, tripCheckSignatureLast.y + 0.1);
  tripCheckSignatureContext.stroke();
  tripCheckSignatureInk = true;
});
tripCheckSignatureCanvas.addEventListener("pointermove", event => {
  if (!tripCheckSignatureDrawing) return;
  const next = getTripCheckSignatureCoordinates(event);
  tripCheckSignatureContext.beginPath();
  tripCheckSignatureContext.moveTo(tripCheckSignatureLast.x, tripCheckSignatureLast.y);
  tripCheckSignatureContext.lineTo(next.x, next.y);
  tripCheckSignatureContext.stroke();
  tripCheckSignatureLast = next;
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  tripCheckSignatureCanvas.addEventListener(type, () => { tripCheckSignatureDrawing = false; });
}
document.getElementById("open-tripcheck-signature-btn").addEventListener("click", openTripCheckSignatureDialog);
document.getElementById("tc-clear-signature-btn").addEventListener("click", clearTripCheckSignatureCanvas);
document.getElementById("tc-cancel-signature-btn").addEventListener("click", closeTripCheckSignatureDialog);
document.getElementById("tc-confirm-signature-btn").addEventListener("click", () => {
  if (!tripCheckSignatureInk) { alert("Please draw the driver's signature before confirming."); return; }
  tripCheckSigned = true;
  updateTripCheckSignatureStatus();
  closeTripCheckSignatureDialog();
});
// Any edits to an already-signed inspection require the driver's confirmation again.
for (const id of ["tc-plate-search", "tc-iqama-search", "tc-odometer", "tc-remarks"]) {
  document.getElementById(id).addEventListener("input", invalidateTripCheckSignature);
}

/** Load third-party PDF/ZIP libraries only when the export button is used. */
const TRIPCHECK_EXPORT_LIBRARIES = Object.freeze([
  ["jspdf", "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"],
  ["JSZip", "https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js"]
]);

const tripCheckLibraryLoads = new Map();
function loadTripCheckExportLibrary(name, url) {
  if (name === "jspdf" && window.jspdf?.jsPDF) return Promise.resolve();
  if (name === "JSZip" && window.JSZip) return Promise.resolve();
  if (tripCheckLibraryLoads.has(name)) return tripCheckLibraryLoads.get(name);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${name}. Check your internet connection.`));
    document.head.appendChild(script);
  });
  tripCheckLibraryLoads.set(name, promise);
  return promise;
}
function tripCheckPdfSafe(value) {
  return String(value == null ? "" : value).replace(/[\r\n]+/g, " ").trim();
}
let tripCheckPdfLogoCache = null;
async function getTripCheckPdfLogo() {
  if (tripCheckPdfLogoCache !== null) return tripCheckPdfLogoCache;
  try {
    const response = await fetch("assets/TaxiQaidLogo.jpg");
    if (!response.ok) throw new Error("Logo unavailable");
    const blob = await response.blob();
    tripCheckPdfLogoCache = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("PDF logo could not be loaded:", error);
    tripCheckPdfLogoCache = "";
  }
  return tripCheckPdfLogoCache;
}

/** Build a compact, printable A4 checklist inspired by the company's paper form. */
function createTripCheckPdf(record, logo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ink = [30, 54, 75];
  const accent = [34, 103, 144];
  const border = [204, 215, 224];
  doc.setTextColor(...ink);
  if (logo) {
    try { doc.addImage(logo, "JPEG", 12, 10, 31, 22); } catch (error) { console.warn("Logo omitted:", error); }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TAXI QAID", 49, 17);
  doc.setFontSize(12);
  doc.text("PRE / POST TRIP CHECKLIST", 49, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Vehicle Inspection Report - Check 360", 49, 30);
  doc.setDrawColor(...accent);
  doc.setLineWidth(.65);
  doc.line(12, 36, 198, 36);

  const score = calculateTripCheckScore(TRIPCHECK_QUESTIONS.map(([, label]) => getTripCheckField(record, label)));
  const reportType = tripCheckPdfSafe(getTripCheckField(record, "Check Type"));
  const info = [
    ["Check ID", getTripCheckField(record, "Check ID")],
    ["Type", reportType],
    ["Date / Time", `${getTripCheckField(record, "Date")}  ${getTripCheckField(record, "Time")}`],
    ["Car Plate", getTripCheckField(record, "Car Plate")],
    ["Driver Name", getTripCheckField(record, "Driver Name")],
    ["Driver Iqama", getTripCheckField(record, "Driver Iqama")],
    ["Odometer (KM)", getTripCheckField(record, "Odometer (KM)")],
    ["Checked By", getTripCheckField(record, "Checked By")]
  ];
  doc.setLineWidth(.25);
  info.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col ? 107 : 12;
    const y = 40 + row * 11;
    doc.setDrawColor(...border);
    doc.roundedRect(x, y, 91, 9.2, 1, 1);
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.8);
    doc.setTextColor(94, 108, 121); doc.text(label.toUpperCase(), x + 2.5, y + 3.2);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.4);
    doc.setTextColor(...ink);
    const text = tripCheckPdfSafe(value) || "-";
    doc.text(text.length > 37 ? `${text.slice(0, 34)}...` : text, x + 2.5, y + 7.1);
  });
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text("INSPECTION ITEMS", 12, 88);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.text("X = selected answer", 198, 88, {align: "right"});
  const startY = 91;
  const rowH = 16.2;
  const colW = 60.6;
  const gaps = 2.1;
  const columns = 3;
  TRIPCHECK_QUESTIONS.forEach(([, label], i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = 12 + col * (colW + gaps);
    const y = startY + row * rowH;
    doc.setDrawColor(...border);
    doc.roundedRect(x, y, colW, rowH - .9, 1.1, 1.1);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.7);
    const answer = normalizeTripCheckAnswer(getTripCheckField(record, label));
    const labelLines = doc.splitTextToSize(label, colW - 5.5).slice(0, 2);
    doc.text(labelLines, x + 2.4, y + 4.0);
    doc.setFontSize(7.2);
    doc.setTextColor(...(answer === "Defect" ? [155, 45, 36] : [40, 107, 64]));
    doc.text(`[${answer === "OK" ? "X" : " "}] OK`, x + 2.4, y + 13.0);
    doc.text(`[${answer === "Defect" ? "X" : " "}] Defect`, x + 21.5, y + 13.0);
  });
  const bottom = startY + 8 * rowH + 2;
  doc.setDrawColor(...accent);
  doc.line(12, bottom, 198, bottom);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.setTextColor(...ink); doc.text(`SCORE: ${score.percentage}%`, 12, bottom + 6);
  doc.setTextColor(...(score.status === "Pass" ? [35, 122, 59] : [166, 81, 24]));
  doc.text(score.status.toUpperCase(), 198, bottom + 6, {align: "right"});
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(...ink);
  doc.text(`${score.ok} OK / ${score.defect} Defect / ${score.answered} of ${score.total} answered`, 12, bottom + 11);
  doc.setDrawColor(...border);
  doc.roundedRect(12, bottom + 15, 186, 18, 1, 1);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.2);
  doc.text("REMARKS", 14, bottom + 19);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  const remarks = tripCheckPdfSafe(getTripCheckField(record, "Remarks")) || "None";
  doc.text(doc.splitTextToSize(remarks, 180).slice(0, 2), 14, bottom + 24);
  const signed = String(getTripCheckField(record, "Signed")).toLowerCase() === "yes";
  doc.setDrawColor(...border);
  doc.roundedRect(12, bottom + 37, 186, 16, 1, 1);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("DRIVER SIGNATURE CONFIRMATION", 14, bottom + 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(signed ? "Signed: Yes" : "Signed: No", 14, bottom + 48);
  doc.text("Signature drawing is not retained", 198 - 2, bottom + 48, {align: "right"});
  doc.setDrawColor(...accent);
  doc.line(12, 284, 198, 284);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.setTextColor(100, 111, 123);
  doc.text("Taxi Qaid ERP - locally stored inspection report", 12, 289);
  doc.text("Page 1 / 1", 198, 289, {align: "right"});
  return doc;
}

/** Export every locally created inspection, one PDF file per record. */
document.getElementById("export-tripchecks-pdf-zip-btn").addEventListener("click", async () => {
  const records = tripChecksDatabase.slice(); // Export all, not only the filtered rows.
  if (!records.length) { alert("There are no inspections to export."); return; }
  const button = document.getElementById("export-tripchecks-pdf-zip-btn");
  button.disabled = true;
  button.textContent = `Preparing ${records.length} PDF(s)...`;
  try {
    for (const [name, url] of TRIPCHECK_EXPORT_LIBRARIES) await loadTripCheckExportLibrary(name, url);
    const logo = await getTripCheckPdfLogo();
    const zip = new window.JSZip();
    for (const record of records) {
      const type = getTripCheckField(record, "Check Type") === "Post-Trip" ? "Post-Trip" : "Pre-Trip";
      const safeId = String(getTripCheckField(record, "Check ID") || "Unnamed")
        .replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90);
      const pdf = createTripCheckPdf(record, logo);
      zip.file(`${type}/${safeId}.pdf`, pdf.output("arraybuffer"));
    }
    const blob = await zip.generateAsync({type: "blob", compression: "DEFLATE", compressionOptions: {level: 6}});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Taxi_Qaid_Trip_Check_PDFs_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) {
    console.error("Unable to export Trip Check PDFs:", error);
    alert(`PDF export failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "📄 Export PDF ZIP";
  }
});

// Do not retain records in memory when an operator signs out.
document.getElementById("logout-button").addEventListener("click", () => {
  tripChecksDatabase = [];
  applyTripCheckFilters();
  tripCheckModal.style.display = "none";
  tripCheckSignatureModal.style.display = "none";
});

updateTripCheckSignatureStatus();
