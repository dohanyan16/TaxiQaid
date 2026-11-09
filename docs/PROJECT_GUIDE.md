# TaxiQaid — Project Guide (v1.2)

> Current phase: operational spreadsheet integrations are retired and disconnected. The historical integration notes below are retained for context and do not authorize reconnection. See [TAXIQAID_WORKFLOW_SPEC.md](TAXIQAID_WORKFLOW_SPEC.md) for the current frontend-only boundaries.

## 1. Architecture

The application is pure HTML, CSS, and JavaScript. It uses a **feature-folder architecture** rather than a build tool or a frontend framework.

`index.html` loads CSS and external browser libraries, then `shared/bootstrap.js`. Bootstrap retrieves the HTML fragments over HTTP(S), inserts all screen sections and their modals into the DOM, and only then loads the JavaScript files in order. This preserves the existing classic-script global functions and event listeners. Do not add independent `<script>` tags to feature HTML; put feature logic into its `.js` file.

## 2. Feature folders

| Folder | HTML | CSS | JavaScript |
| --- | --- | --- | --- |
| `modules/login/` | Login form | Login-only design | Supabase login/logout and access-role lookup |
| `modules/dashboard/` | Welcome screen | Welcome text | Future dashboard features |
| `modules/fleet/` | Vehicle details and controls | Fleet tags and buttons | Fleet fetch, lookup, update, export |
| `modules/drivers/` | Driver details and controls | Driver buttons | Driver fetch, lookup, update, export |
| `modules/tripcheck/` | Trip Check table **and modal** | 27-step wizard | Trip Check fetch, wizard, filter, export, save |
| `modules/accidents/` | Accident table **and modal** | Accident buttons | Accident fetch, filters, export, record operations |
| `modules/breakdowns/` | Existing placeholder | Future styles | Future features |
| `modules/maintenance/` | Existing placeholder | Future styles | Future features |

The HTML for every module contains its own `view-<name>` section. Modal HTML for Trip Check and Accidents is also inside the corresponding module's HTML; bootstrap moves modal elements to the page-level overlay container.

## 3. Shared files

| File | Responsibility |
| --- | --- |
| `shared/bootstrap.js` | Load view fragments, move modals, initialize feature scripts in order |
| `shared/shell.html` | Navigation sidebar and page header |
| `shared/common.css` | Colors, layout, shared cards, tables, forms, modal base |
| `shared/config.js` | Public Supabase project settings and Google Apps Script URLs |
| `shared/state.js` | Shared arrays and the inspection wizard step |
| `shared/navigation.js` | Sidebar screen changes and conditional refresh |
| `shared/utils.js` | Date/time formatting utilities |
| `shared/data.js` | Vehicle-driver relationships and accident counts |
| `shared/search.js` | General searchable dropdown helpers |
| `shared/write-guard.js` | **Browser-side only** user/role verification before writes |

## 4. Where to make common changes

- **Change a page title, button, input or column:** edit `modules/<name>/<name>.html`.
- **Change one page's colors, spacing, or layout:** edit `modules/<name>/<name>.css`.
- **Change one page's behavior or data request:** edit `modules/<name>/<name>.js`.
- **Change global styles:** edit CSS variables at the top of `shared/common.css`.
- **Change sidebar items or header:** edit `shared/shell.html` and update `shared/navigation.js` if you need custom page-load behavior.
- **Change an Apps Script URL:** edit `shared/config.js`; check the backend contract before modifying data formats.
- **Change login behavior:** edit `modules/login/login.js` carefully; backend authorization must be verified separately.

Some legacy inline styles remain in the HTML to preserve exact appearance. You can gradually migrate them into the relevant module CSS, checking the screen after each change.

## 5. Adding a new module

1. Create `modules/example/example.html`, `modules/example/example.css`, and `modules/example/example.js`.
2. Place `<section id="view-example" class="view-section">...</section>` in the HTML fragment.
3. Add an item in `shared/shell.html` with `data-view="example"`.
4. Add `example` to `FEATURE_NAMES` in `shared/bootstrap.js`.
5. Add the CSS `<link>` to `index.html`.
6. Add `modules/example/example.js` to `SCRIPT_ORDER` in `shared/bootstrap.js`.
7. Add any required data read or refresh logic to the new JavaScript file.
8. Enforce authorization for any backend write; test the feature without a session and with the appropriate role.

## 6. Safe editing workflow

1. Create a Git commit or copy the current version.
2. Change only the relevant module's files and any necessary shared files.
3. Run `python3 -m http.server 8000` in the project root; do not use `file://`.
4. Test login, sidebar navigation, data loads, edits, Trip Check wizard, accidents, and exports with test records.
5. Inspect browser developer tools for 404 errors and JavaScript console errors.
6. Only then publish the new version to GitHub Pages.

## 7. Compatibility and security

No build system is required. The scripts remain classic scripts, so their **load order matters**. GitHub Pages can host these static files and subdirectories.

The frontend login and `shared/write-guard.js` cannot protect Google Apps Script endpoints from direct calls. The original ZIP did not include backend Apps Script source files. See [SECURITY.md](SECURITY.md) before production use.

## 8. Permanent data and update contracts

Use the existing Sheet endpoints for Fleet, Drivers, Accidents, Pre-Trip and Post-Trip. `shared/data.js` provides uncached, validated Sheet reads and the Excel export refresh guard. A successful POST is followed by a read of saved data; a later read failure must be reported as a reload/synchronization warning, not a failed save.

Fleet update requests contain `action: "update"`, `Plate` and `Availability`. Driver updates retain their existing identifier/transport and contain `Iqama Number`, `Phone Number`, `Arrangement`, `Shift`, `Car Plate` and `Status`. Apps Script handlers must update only supplied editable fields, preserve omitted columns, and never create a new Fleet/Driver row through these edit flows. Bulk creation and locked field changes remain manual Sheet operations. This repository contains no Apps Script implementation; these are the contracts required of the externally managed endpoints.

Accident counts are derived in browser memory from all current Accident Tracker records and are omitted from Fleet writes. Post-Trip owns the server-side Fleet `Total KM` update. After an inspection save, the frontend reloads both inspection Sheets and, for Post-Trip, reloads Fleet and checks its persisted `Total KM` against the latest Post-Trip for the normalized plate. An older inspection edit is compared against the latest inspection, not its own older reading. No credentials or second Fleet write are introduced.

Keep the KSA clock, Check ID rules, signed flag and PDF layout intact. Trip Check Refresh updates data and reapplies the current filters. Placeholder modules must remain without Sheet creation until separately approved.
