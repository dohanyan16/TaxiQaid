/**
 * TAXI QAID ERP | bootstrap.js
 * Purpose: Insert self-contained feature HTML, then initialize classic scripts.
 *
 * This is a static website compatible with GitHub Pages (no npm/build system).
 * HTML fragments require HTTP(S): use a local web server, not file://.
 * All fragments load before scripts so existing element bindings keep working.
 * Feature content is NOT a security boundary: enforce write permissions on the backend.
 */

const FEATURE_NAMES = [
  "dashboard", "fleet", "drivers", "tripcheck",
  "accidents", "breakdowns", "maintenance"
];

const SCRIPT_ORDER = [
  "shared/config.js",
  "shared/state.js",
  "shared/utils.js",
  "shared/write-guard.js",
  "shared/data.js",
  "shared/search.js",
  "modules/login/login.js",
  "shared/navigation.js",
  "modules/dashboard/dashboard.js",
  "modules/drivers/drivers.js",
  "modules/fleet/fleet.js",
  "modules/tripcheck/tripcheck.js",
  "modules/accidents/accidents.js",
  "modules/breakdowns/breakdowns.js",
  "modules/maintenance/maintenance.js"
];

async function getFragment(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path} (HTTP ${response.status})`);
  const template = document.createElement("template");
  template.innerHTML = await response.text();
  return template.content;
}

function addScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = path;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${path}`));
    document.body.appendChild(script);
  });
}

async function initializeApplication() {
  const workspace = document.getElementById("workspace");
  const bootStatus = document.getElementById("boot-status");

  try {
    // Shared app shell and login form are inserted before feature views.
    const loginMarkup = await getFragment("modules/login/login.html");
    const shellMarkup = await getFragment("shared/shell.html");
    workspace.append(loginMarkup, shellMarkup);

    const views = document.getElementById("module-views");
    const overlays = document.createElement("div");
    overlays.id = "module-overlays";
    workspace.appendChild(overlays);

    // Insert view sections in the original navigation order. Move modal
    // overlays to the root to avoid unintended clipping by the main panel.
    const fragments = await Promise.all(FEATURE_NAMES.map(async (name) => ({
      name, markup: await getFragment(`modules/${name}/${name}.html`)
    })));
    for (const { name, markup } of fragments) {
      const section = markup.querySelector(`#view-${name}`);
      if (!section) throw new Error(`Missing view-${name} in ${name}.html`);
      for (const modal of Array.from(markup.querySelectorAll(".modal-overlay"))) {
        overlays.appendChild(modal);
      }
      views.appendChild(markup);
    }

    // Load classic scripts one by one to preserve cross-file global bindings.
    for (const path of SCRIPT_ORDER) await addScript(path);

    workspace.hidden = false;
    bootStatus.remove();
  } catch (error) {
    console.error("Unable to initialize Taxi Qaid ERP:", error);
    bootStatus.textContent =
      "Unable to load the application. Open it through an HTTP(S) server and reload the page.";
    bootStatus.setAttribute("role", "alert");
  }
}

initializeApplication();
