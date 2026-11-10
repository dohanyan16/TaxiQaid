# People operations frontend review

Base reviewed: `main` at `613da6219c61241bb3addea5babede400f73de1e`. The application still has 16 administrative modules. This change completes three frontend modules and documents future integrations; it does not connect operational sources.

## Implemented interfaces

- **Driver Appeals:** inclusive submission-date filters, shared Appeal ID/Iqama/name search, approved department/status filters, exact eight-column overview and source/audit details. Only status and department are editable in an unsaved preview. Assigning a department never resolves an appeal. No administrative Add Appeal action exists.
- **Training Tracker:** Overview, Sessions and Attendance tabs; session form; 25-row driver picker and selected-driver summary with separate pagination. Selection survives searches/pages, deduplicates stable identities and supports individual removal. Select All requires a complete eligible dataset and covers the entire filtered set. Enrollment, confirmation, verification and completion remain separate concepts.
- **Drivers Deduction:** Balances, Expenses and Applied Deductions tabs, source-linked history, positive SAR validation and live partial-deduction preview using integer halalas. Incomplete histories show unavailable. Only explicit authorized posted financial values affect a future numeric balance; NCR points and fuel quantities are never money. No records are saved or deductions applied.
- **Roster and Driver Portal:** Roster navigation and placeholder files remain unchanged. The workflow specification documents reviewed source/PDF dependencies, versioned approval/publication, personal weekly schedules/PDFs, portal ownership, My Appeals and My Training. No portal, upload or PDF implementation was added.

## Changed files

| Area | Files |
| --- | --- |
| Appeals | `modules/people/driver-appeals/driver-appeals.html`, `.css`, `.js`; `appeals-policy.js` |
| Training | `modules/people/training/training.html`, `.css`, `.js`; `training-model.js` |
| Finance | `modules/people/driver-deductions/driver-deductions.html`, `.css`, `.js`; `deductions-policy.js` |
| Shared | `shared/people-preview.js`, `shared/search.js`, `shared/bootstrap.js` |
| Tests | `tests/people-models.test.cjs`, `tests/people.browser.cjs`, `tests/ui.browser.cjs` |
| Documentation | `AGENTS.md`, `README.md`, `docs/CHANGELOG.md`, `docs/DESIGN_SYSTEM.md`, `docs/TAXIQAID_WORKFLOW_SPEC.md`, this report |
| Visual evidence | Eight PNGs in `docs/screenshots/people/`, linked below |

Existing login/authentication/configuration, navigation, operational data helpers, Trip Check, NCR, Fuel, Maintenance and Roster sources are unchanged. The bootstrap only adds shared/pure preview scripts in dependency order; it retains the same module configuration. No database, migration, spreadsheet, Apps Script project or Drive structure was created.

## Validation results

| Check | Result |
| --- | --- |
| `node --check` for all JavaScript under `shared/` and `modules/` | PASS |
| `node --test tests/*.test.cjs` | PASS — 37 tests, including 13 new people-policy tests |
| `tests/workflow.browser.cjs` | PASS — all 16 pages, login/role denial/logout mocks and retained business workflows |
| `tests/ui.browser.cjs` | PASS — all 16 pages at 320, 375, 768, 1024 and 1440px; 200% text at 768px; exact Trip Check PDF function hash unchanged |
| `tests/people.browser.cjs` | PASS — all new tabs/dialogs, appeals filters/independent assignment, selection across 900 synthetic drivers with at most 25 result checkboxes, selected summary/removal/cancellation, linked financial history and exact partial balances |
| Interface safety observations | No uncaught errors, legacy requests, operational writes, downloads or operational browser-storage writes |
| `git diff --check` | PASS |

Browser tests use mocked Supabase responses and isolated synthetic fixtures. All fixtures are cleared before screenshots and are absent from deployed modules. The unchanged Supabase SDK briefly tests storage availability during startup; the probe is not operational persistence. Module actions produce no storage writes. Live authentication with a real account was not tested because no credentials were supplied.

## Screenshots

| Interface | Desktop | Mobile |
| --- | --- | --- |
| Driver Appeals | [Desktop](screenshots/people/desktop-driver-appeals.png) | [Mobile](screenshots/people/mobile-driver-appeals.png) |
| Training Overview | [Desktop](screenshots/people/desktop-training.png) | [Mobile](screenshots/people/mobile-training.png) |
| Driver selection | [Desktop](screenshots/people/desktop-training-drivers.png) | [Mobile](screenshots/people/mobile-training-drivers.png) |
| Driver Balances | [Desktop](screenshots/people/desktop-driver-deductions.png) | [Mobile](screenshots/people/mobile-driver-deductions.png) |

All captures show disconnected empty interfaces. Long forms scroll internally; tables scroll inside their own regions. Narrow layouts, long native-select descriptions, minimum control sizes, keyboard dialog dismissal/return focus and increased text size were reviewed.

## Decisions still required for future integration

Appeal Type catalog; training definitions/applicability/validity/retraining, session ID/lifecycle vocabulary, verification/confirmation method and export contracts; financial liability/fine approval, posting/status/reference conventions, deduction methods and reversal/adjustment policy; Roster source spreadsheet and required PDF format, scheduling conflict rules and version/publication contracts. Backend module permissions, ownership and authoritative Asia/Riyadh auditing must be approved before connecting data. The proposed Sheets/Drive architecture is documentation only. The [workflow specification](TAXIQAID_WORKFLOW_SPEC.md) contains the full rules and future relationships.

Publication is verified separately against the exact integrated remote `main` commit. A successful GitHub Pages workflow and direct production accessibility are separate checks; neither is inferred from local test results.
