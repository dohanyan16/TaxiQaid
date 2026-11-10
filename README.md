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
- `modules/breakdowns/`: complete frontend breakdown report preview.
- `modules/maintenance/`: Maintenance Requests and Maintenance Overview previews.
- `modules/compliance/penalties/`: read-only Penalties overview, inclusive driver/date filters and record details; future external source pending.
- `modules/compliance/ncr/`: Driver Scores, NCR Tracker and independently tested 90-day KSA scoring policy.
- `modules/people/driver-appeals/`: driver-origin appeal queue, inclusive filters and unsaved administrative assignment/status controls.
- `modules/people/training/`: compliance, sessions, attendance and bounded cross-page driver selection previews.
- `modules/people/driver-deductions/`: balances, expenses and partial deduction previews; NCR points remain separate from SAR.
- `modules/people/roster/`: local Day/Night Excel validation, daily/weekly/personal schedules, stop catalog editing and English interactive PDF/ZIP generation; WhatsApp and publication remain disconnected.
- `modules/operations/fuel/`: Fuel overview, empty record details/editing and conditional fueling form previews.
- `shared/`: navigation, layout, common CSS, Supabase configuration, general utilities, and data helpers.
- `assets/`: images.
- `docs/`: project guide, security instructions, and change history.

Every `modules/<name>/` folder contains `<name>.html`, `<name>.css`, and `<name>.js`.

## Deployment on GitHub Pages (GitHub Free)

Upload the **contents** of this folder, including the `modules/`, `shared/`, and `assets/` directories. Keep `index.html` in the publish root. This is a static app with no npm, bundling, or paid GitHub features. URLs are relative and support a repository subpath.

GitHub Pages access is not private just because the application displays a login. Public visitors can download static HTML, CSS, and JS. Protect private data and **all writes** in the future operational backend as described in [docs/SECURITY.md](docs/SECURITY.md).

## Further reading

- [Project guide](docs/PROJECT_GUIDE.md)
- [Security notes](docs/SECURITY.md)
- [Change history](docs/CHANGELOG.md)

## Frontend preparation phase

Operational databases are disconnected. Legacy spreadsheet and Apps Script endpoints are disabled. All operational views start empty, and backend-dependent actions explain that database integration is pending. No operational records are saved locally or remotely. The owner-authorized Roster exception processes selected Excel files in memory and permits real local PDF/ZIP and non-personal location JSON downloads. Fuel Tracker includes Depot/Outside Depot form conditions and live SAR totals with the approved 2.18 SAR/L Depot tariff and manual Outside Depot pricing. Existing Supabase authentication and roles remain on the same project.

See [the workflow specification](docs/TAXIQAID_WORKFLOW_SPEC.md) for all field definitions, status options, future source/request/work-order relationships, identifier formats and KSA timestamp rules. No database schemas or migrations are included. Database integration remains a separate future phase. Validated changes are integrated into main following AGENTS.md and the repository owner’s authorization.

## Future Driver Portal

The administrative app has 16 modules. Driver Weekly Schedule has been retired; published personal driver access belongs to the future Driver Portal → My Schedule. Administrators now have the separately authorized local Roster Management preview. My Profile, My Documents, My Signatures, My NCRs, My Appeals and My Training are also planned. The portal and its account/data connections are not implemented. See [the workflow specification](docs/TAXIQAID_WORKFLOW_SPEC.md#future-driver-portal--planned-only).

## Shared interface standards

[The design system](docs/DESIGN_SYSTEM.md) documents the common orange palette, typography, controls, SVG navigation, responsive layouts and unified record search. Date, status and NCR point filters remain independent. Trip Check retains its dedicated inspection experience and PDF implementation.

## Validation

Run `node --test tests/*.test.cjs` for the retained pure compatibility tests. With Playwright and Chromium available and a local HTTP server running, run `node tests/workflow.browser.cjs`, `node tests/ui.browser.cjs`, `node tests/people.browser.cjs` and `node tests/roster.browser.cjs`. Set `TAXIQAID_URL`, `TAXIQAID_CHROMIUM` or `TAXIQAID_SCREENSHOTS` to override defaults. Browser checks use mocked authentication and never live credentials or operational data. Screenshots are written to `docs/screenshots/` by default.

The former spreadsheet persistence tests were replaced because spreadsheet reads/writes are intentionally retired. Live authentication must be verified separately with an existing authorized account.

## Roster local file workflows

Choose the Day Shift and Night Shift `.xlsx` files, then Validate Roster. A successful same-week validation replaces the current preview; errors preserve the previous week. Imported information stays in memory. Review daily/weekly assignments and unmatched stops, select a driver for a personal PDF, or Generate All PDFs followed by Download ZIP. Phone matching, WhatsApp sending, versioned publication and Driver Portal access require future secure integration.

The supplied location catalog is public non-personal configuration. Add/Edit Stop changes only the current preview; download the updated JSON to retain it. A reviewed full catalog import requires explicit replacement confirmation. No station time is inferred from the sample PDF.

Keep private workbooks, personal PDFs/ZIPs and private screenshots outside this repository. For tests, set `TAXIQAID_ROSTER_OUTPUT` to a private directory. The Roster browser suite generates isolated synthetic artifacts there; run `python tests/verify-roster-pdfs.py <that-directory>` with PyMuPDF installed to inspect all generated synthetic PDFs and their map annotations. Optional `TAXIQAID_DAY_FILE` and `TAXIQAID_NIGHT_FILE` paths exercise the private reference workbooks without committing them. Local browser tests require Playwright/Chromium; XLSX and ZIP helpers are vendored. See [the Roster review](docs/ROSTER_REVIEW.md) for validation evidence and [the full workflow](docs/TAXIQAID_WORKFLOW_SPEC.md#roster-management--implemented-local-frontend).
