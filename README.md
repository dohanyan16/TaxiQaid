# TaxiQaid

Version **1.2** — each screen has its own HTML, CSS, and JavaScript files.

## Start the application locally

1. Extract the ZIP file and keep the directory tree intact.
2. From the `TaxiQaid` folder, run `python3 -m http.server 8000`.
3. Open `http://localhost:8000` in your browser.
4. Sign in with your existing authorized account.

**Important:** Do not double-click `index.html` to open it using `file://`. The app loads HTML fragments with `fetch()`, which requires HTTP(S). A regular local web server or GitHub Pages works.

## Folder structure

- `index.html`: very small boot page; no feature markup.
- `modules/login/`: login form and client-side authentication.
- `modules/dashboard/`: landing dashboard.
- `modules/fleet/`: vehicle lookup and editing.
- `modules/drivers/`: driver lookup and editing.
- `modules/tripcheck/`: inspections and 27-step form.
- `modules/accidents/`: accident reporting and management.
- `modules/breakdowns/`: future breakdown tracking (placeholder).
- `modules/maintenance/`: future maintenance tracking (placeholder).
- `shared/`: navigation, layout, common CSS, Supabase configuration, general utilities, and data helpers.
- `assets/`: images.
- `docs/`: project guide, security instructions, and change history.

Every `modules/<name>/` folder contains `<name>.html`, `<name>.css`, and `<name>.js`.

## Deployment on GitHub Pages (GitHub Free)

Upload the **contents** of this folder, including the `modules/`, `shared/`, and `assets/` directories. Keep `index.html` in the publish root. This is a static app with no npm, bundling, or paid GitHub features. URLs are relative and support a repository subpath.

GitHub Pages access is not private just because the application displays a login. Public visitors can download static HTML, CSS, and JS. Protect private data and **all writes** in Supabase and Google Apps Script as described in [docs/SECURITY.md](docs/SECURITY.md).

## Further reading

- [Project guide](docs/PROJECT_GUIDE.md)
- [Security notes](docs/SECURITY.md)
- [Change history](docs/CHANGELOG.md)

## Google Sheets data workflow

Fleet, Drivers, Accident Tracker, Pre-Trip and Post-Trip each use their existing Google Sheet as the permanent database. Browser arrays are temporary snapshots. Web edits save through the corresponding existing Apps Script endpoint and then reload saved rows. Excel exports reload Sheets before exporting; a failed reload cancels the export instead of exporting an old snapshot.

Create Fleet vehicles and Drivers in bulk directly in their Sheets, then click Refresh. Fleet web edits submit only the plate and availability; Driver edits submit only the Iqama identifier, phone, arrangement, shift, car plate and status. Locked/static fields are omitted. The endpoints must implement partial updates that preserve omitted columns; their source is not in this repository.

Fleet accident counts are calculated from Accident Tracker, including zero after the last accident is deleted. They are never submitted to the Fleet Sheet. Fleet displays/exports the latest Post-Trip mileage using normalized plates and inspection date/time in Asia/Riyadh. The Post-Trip Apps Script owns the server-side update of the matching Fleet Sheet `Total KM` cell. The frontend does not duplicate that write. After a Post-Trip save it reads Fleet back and warns if the cell cannot be verified against the latest inspection; a saved inspection must not be resubmitted to retry synchronization.

Trip Check Refresh reloads both inspection Sheets without changing the type, date or search filters. Custom PDF exports continue to use the visible filtered records.

Breakdowns, Maintenance and the other planned modules remain placeholders; no Sheets are provisioned for them. Apps Script projects are externally managed and are not modified or deployed by this frontend.

## Validation

Run dependency-free regression tests with `node --test tests/fleet.test.cjs`. The optional browser workflow test requires Playwright and Chromium, a local server in the repository root, and runs with `node tests/workflow.browser.cjs`. It intercepts backend requests with fixture Sheets, tests persistence and failure states, and reads actual Excel/PDF downloads; it never writes live organizational data.
