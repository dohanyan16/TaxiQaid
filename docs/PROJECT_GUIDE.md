# Taxi Qaid ERP — Project Guide

## 1. Architecture

This project is intentionally **plain HTML, CSS and JavaScript**, with no build system. `index.html` contains page markup, modal forms, IDs and external library scripts. `css/styles.css` contains all existing visual rules. `js/` contains classic JavaScript files, loaded sequentially at the bottom of the page.

Important: the JavaScript files use top-level shared `const`, `let`, and function declarations. They are **not ES modules**, and script order is intentional. When adding files, load dependencies first.

## 2. Folder map

| Location | Responsibility | When to edit |
| --- | --- | --- |
| `index.html` | Page layout, navigation entries, modal HTML and IDs | Add/change visible fields, buttons, menus or sections |
| `css/styles.css` | Colors, spacing, components, responsive rules | Change appearance |
| `assets/` | Logo and future images | Replace images |
| `js/config.js` | Public Supabase configuration and Google Apps Script endpoint URLs | Update public URLs / project settings |
| `js/state.js` | Runtime arrays and current wizard state | Add shared state when necessary |
| `js/auth.js` | Login, role check, logout | Change authentication behavior after reviewing security |
| `js/write-guard.js` | Active-user / role check before browser-side data updates | Extend write checks; **never** assume this secures the backend |
| `js/navigation.js` | Menu changes and lazy data refresh | Add a new view |
| `js/utils.js` | Saudi local date/time conversion helpers | Adjust date/time formatting |
| `js/data.js` | Read Drivers, Fleet, Accidents and Trip Checks from Apps Script | Add/modify data fetching |
| `js/modules/drivers.js` | Driver search/profile/edit workflow | Modify driver fields or driver editing |
| `js/modules/fleet.js` | Vehicle search/profile, assignment, availability, save | Modify fleet behavior |
| `js/modules/tripcheck.js` | 27-step wizard and trip-check records | Modify inspection workflow |
| `js/modules/accidents.js` | Accident modal, CRUD flow and record table | Modify accident reporting |
| `js/modules/breakdowns.js` | Documentation-only placeholder for future implementation | Develop breakdown tracking |
| `js/modules/maintenance.js` | Documentation-only placeholder for future implementation | Develop maintenance tracking |
| `js/exports.js` | Excel exports for drivers/fleet | Change export formats |
| `js/filters.js` | Search/date filtering and additional exports | Change filtered results |

## 3. Key functions

- `fetchDrivers()`, `fetchFleet()`, `fetchAccidents()`, `fetchTripChecks()` — load Google Sheets data into the corresponding arrays.
- `getAssignedDrivers(plate)` and `normalizePlate(plate)` — link vehicles to drivers.
- `renderDriverProfile(driver)` / `renderVehicleProfile(vehicle)` — show record details.
- `saveEditedDriver()` / `saveEditedVehicle()` — update existing records.
- `showWizardStep(step)` — move the inspection wizard.
- `setupTripCheckSelects()` — populate searchable inspection fields.
- `renderTripChecksTable(items)` / `renderAccidentsTable(items)` — display record tables.
- `applyTripCheckFilters()` / `applyAccidentFilters()` — apply search/date criteria.
- `requireAuthorizedUser()` — check the current Supabase user + role before a browser-side write.
- `postAuthorizedSheetUpdate(url, payload)` — submit an existing JSON payload as `text/plain` to Apps Script after the browser check.

## 4. How to change an existing field

1. Identify the view/form in `index.html` using its `id` attribute.
2. Find the matching `document.getElementById("...")` expression in the relevant `js/modules/*.js` file.
3. Confirm that the Apps Script / Google Sheet already supports the target column. Frontend changes alone cannot create server-side fields.
4. Preserve existing property names used by the Google Sheet, including spaces and capitalization.
5. Test read, edit, save, reload, and export with **test data**, not production records.

## 5. How to add a module

1. Add a navigation item to `.sidebar-menu` with a unique `data-view` value.
2. Add a corresponding `<section id="view-YOURVIEW" class="view-section">` to `index.html`.
3. Create a feature file in `js/modules/` and reference it near the end of `index.html`, after shared dependencies.
4. Add data read operations in `js/data.js` only when needed.
5. Add secure server-side API endpoints for writes; see `SECURITY.md`.
6. Check interaction in a browser before publishing.

The original Breakdowns and Maintenance views remain placeholders. Their `.js` files contain future-development notes only and do not have `<script>` references until there is code to run.

## 6. How to change colors

Look at the `:root` custom properties near the start of `css/styles.css`. Change a color variable once to update many components. New mobile-specific rules can also be added to this stylesheet in an `@media` block; there is no separate responsive stylesheet in this release.

## 7. How to publish with GitHub Pages

Keep `index.html` at the published root and upload the **entire folder tree**, not just `index.html`. GitHub Pages can serve all files as static assets. Use relative URLs so the site works at a repository subpath. GitHub Free Pages publishing is normally for public repositories; do not commit private data or service-role credentials.

## 8. Local development

Run `python3 -m http.server 8000` in the project folder and open `http://localhost:8000`. Avoid relying on direct `file://` access because some browser behaviors differ under a local server. External Supabase and Google integrations still require network access.

## 9. Maintenance checklist

- Create a backup or Git commit before editing.
- Change one module at a time.
- Keep JavaScript script order intact.
- Never put a Supabase service-role key or other server secret in frontend files.
- Verify Google Apps Script authorization independently of UI login.
- Test the login, role rejection, driver edit, fleet edit, accident CRUD, Trip Check flow and exports after each change.
