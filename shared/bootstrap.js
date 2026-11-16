/**
 * TaxiQaid | bootstrap.js
 * Purpose: Insert self-contained feature HTML, then initialize classic scripts.
 *
 * This is a static website compatible with GitHub Pages (no npm/build system).
 * HTML fragments require HTTP(S): use a local web server, not file://.
 * All fragments load before scripts so existing element bindings keep working.
 * Feature content is NOT a security boundary: enforce write permissions on the backend.
 */

// Existing modules retain their original file paths; planned modules use group folders.
const FEATURE_MODULES = [
  {name: "dashboard", folder: "modules/dashboard"},
  {name: "fleet", folder: "modules/fleet"},
  {name: "drivers", folder: "modules/drivers"},
  {name: "tripcheck", folder: "modules/tripcheck"},
  {name: "accidents", folder: "modules/accidents"},
  {name: "breakdowns", folder: "modules/breakdowns"},
  {name: "maintenance", folder: "modules/maintenance"},
  {name: "fuel", folder: "modules/operations/fuel"},
  {name: "ncr", folder: "modules/compliance/ncr"},
  {name: "penalties", folder: "modules/compliance/penalties"},
  {name: "training", folder: "modules/people/training"},
  {name: "customer-care", folder: "modules/customer/customer-care"},
  {name: "driver-deductions", folder: "modules/people/driver-deductions"},
  {name: "driver-appeals", folder: "modules/people/driver-appeals"},
  {name: "helpdesk", folder: "modules/customer/helpdesk"},
  {name: "roster", folder: "modules/people/roster"},
  {name: "driver-portal-preview", folder: "modules/driver-portal"},
  {name: "user-management", folder: "modules/administration/user-management"}
];

const SCRIPT_ORDER = [
  "shared/config.js",
  "shared/state.js",
  "shared/utils.js",
  "shared/write-guard.js",
  "shared/data.js",
  "shared/search.js",
  "shared/workflow-options.js",
  "shared/frontend-preview.js",
  "shared/people-preview.js",
  "shared/permission-catalog.js",
  "shared/permission-model.js",
  "shared/auth-contract.js",
  "shared/user-admin-model.js",
  "shared/auth-client.js",
  "shared/access-runtime.js",
  "assets/vendor/phone/libphonenumber-max.js",
  "modules/driver-portal/portal-policy.js",
  window.TAXIQAID_DEDICATED_AUTH?.enabled === true ? "modules/login/login-dedicated.js" : "modules/login/login.js",
  "modules/login/request-password-reset.js",
  "shared/navigation.js",
  "modules/dashboard/dashboard.js",
  "modules/drivers/drivers.js",
  "modules/fleet/fleet.js",
  "modules/tripcheck/tripcheck.js",
  "modules/accidents/accidents.js",
  "modules/breakdowns/breakdowns.js",
  "modules/maintenance/maintenance.js",
  // Frontend preview modules do not fetch or persist operational data.
  "modules/operations/fuel/fuel.js",
  "modules/compliance/ncr/ncr-policy.js",
  "modules/compliance/ncr/ncr.js",
  "modules/compliance/penalties/penalties.js",
  "modules/people/training/training-model.js",
  "modules/people/training/training.js",
  "modules/customer/support-policy.js",
  "modules/customer/customer-care/customer-care.js",
  "modules/people/driver-deductions/deductions-policy.js",
  "modules/people/driver-deductions/driver-deductions.js",
  "modules/people/driver-appeals/appeals-policy.js",
  "modules/people/driver-appeals/driver-appeals.js",
  "modules/customer/helpdesk/helpdesk.js",
  "modules/people/roster/roster-model.js",
  "modules/people/roster/roster.js",
  "modules/driver-portal/driver-portal.js",
  "modules/administration/user-management/user-management.js",
  "shared/permission-bindings.js"
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
    script.async = false;
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
    if (typeof window.supabase?.createClient !== "function") {
      throw new Error("The authentication SDK is unavailable.");
    }
    // Reject an incomplete enabled setup before exposing a form without its authentication handler.
    // Disabled settings are deliberately ignored, preserving the existing project's entry path.
    if (window.TAXIQAID_DEDICATED_AUTH?.enabled === true) {
      const settings = window.TAXIQAID_DEDICATED_AUTH;
      if (typeof settings.url !== "string" || typeof settings.brokerUrl !== "string" || typeof settings.publicKey !== "string" || !settings.publicKey.trim()) {
        throw new Error("Dedicated authentication configuration is incomplete.");
      }
      const project = new URL(settings.url), gateway = new URL(settings.brokerUrl);
      if (project.protocol !== "https:" || project.origin !== settings.url || !settings.publicKey ||
          gateway.protocol !== "https:" || !gateway.hostname.endsWith(".workers.dev") ||
          gateway.username || gateway.password || gateway.port || gateway.pathname !== "/login-with-identifier" || gateway.search || gateway.hash) {
        throw new Error("Dedicated authentication configuration is incomplete.");
      }
    }
    // Shared app shell and login form are inserted before feature views.
    const [loginMarkup,shellMarkup] = await Promise.all([getFragment("modules/login/login.html"),getFragment("shared/shell.html")]);
    workspace.append(loginMarkup, shellMarkup);

    const views = document.getElementById("module-views");
    const overlays = document.createElement("div");
    overlays.id = "module-overlays";
    workspace.appendChild(overlays);

    // Insert view sections in the original navigation order. Move modal
    // overlays to the root to avoid unintended clipping by the main panel.
    const fragments = await Promise.all(FEATURE_MODULES.map(async ({name, folder}) => ({
      name, markup: await getFragment(`${folder}/${name}.html`)
    })));
    for (const { name, markup } of fragments) {
      const section = markup.querySelector(`#view-${name}`);
      if (!section) throw new Error(`Missing view-${name} in ${name}.html`);
      for (const modal of Array.from(markup.querySelectorAll(".modal-overlay"))) {
        overlays.appendChild(modal);
      }
      views.appendChild(markup);
    }

    const portalMarkup = await getFragment("modules/driver-portal/driver-portal.html");
    for (const modal of Array.from(portalMarkup.querySelectorAll(".modal-overlay"))) overlays.appendChild(modal);
    workspace.appendChild(portalMarkup);

    // Fetch classic scripts concurrently; async=false preserves their declared execution order.
    await Promise.all(SCRIPT_ORDER.map(addScript));
    if (window.TAXIQAID_DEDICATED_AUTH?.enabled === true && (typeof TaxiQaidDedicatedLogin === "undefined" || !TaxiQaidDedicatedLogin.auth)) {
      throw new Error("The dedicated authentication controller is unavailable.");
    }
    initializeFrontendPreview();
    document.dispatchEvent(new CustomEvent("taxiqaid:app-ready"));

    workspace.hidden = false;
    bootStatus.remove();
  } catch (error) {
    console.error("Unable to initialize TaxiQaid:", error);
    bootStatus.textContent =
      "Unable to load the application. Open it through an HTTP(S) server and reload the page.";
    bootStatus.setAttribute("role", "alert");
  }
}

initializeApplication();
