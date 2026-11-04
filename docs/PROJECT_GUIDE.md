# Taxi Qaid ERP — Project Guide (v1.3)

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
| `modules/tripcheck/` | Trip Check table **and modal** | 27-step wizard | Trip Check wizard, score, local prototype storage, filters, edit and export |
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

## 8. Trip Check v1.3

- Edit the 24 inspection questions or the results panel in `modules/tripcheck/tripcheck.html`.
- Edit the green/red score bar, filtering layout and inspection controls in `modules/tripcheck/tripcheck.css`.
- Edit inspection field names, score rules, create/edit behavior, and local storage in `modules/tripcheck/tripcheck.js`.
- Do not change the score or status manually; both are derived from the 24 question answers.
- Avoid real personal or business data while Trip Check uses `localStorage`.
- For the future authenticated Google Sheets connection, use [TRIP_CHECK_BACKEND.md](TRIP_CHECK_BACKEND.md) as the field and security checklist.
