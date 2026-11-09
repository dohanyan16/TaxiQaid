# TaxiQaid frontend review report

This revision adds the approved Fuel tariff and complete NCR frontend/scoring rules, based on `main` at `3654bb8`. The previously completed Accident, Breakdown, Maintenance, Fleet, Drivers and Trip Check interfaces remain preserved. The current phase is frontend-only.

## Fuel pricing

The named configuration constant `TAXIQAID_DEPOT_FUEL_PRICE_SAR_PER_LITER` sets the approved Depot price to **2.18 SAR/L**. Depot pricing is filled automatically and read-only; outside location is cleared/disabled. **50 L calculates SAR 109.00.** Outside Depot clears the previous price, requires a location and positive manual price, and calculates two-decimal SAR totals. Returning to Depot restores exactly 2.18. No fuel records are persisted; future records must retain their original transaction price.

## NCR interfaces and business rules

- Exactly two main views: Driver Scores (default) and NCR Tracker. Each retains its filters. Driver Scores prepares all-driver Iqama/name/phone lookup and exact/min/max points filters, including negative values.
- The 9-column scores overview and 16-column NCR overview are horizontally scrollable and honestly empty while disconnected. Empty driver details prepare separate active/recovered history; empty NCR details support future authorized editing/deletion.
- The report form includes all operational fields, the 23 exact categories with penalties, derived negative NCR Score, date-only event/expiry fields, independent TBT status and disciplinary actions, statements, remarks and read-only future audit fields.
- Every driver starts at 100. The current score subtracts only active penalty magnitudes, with no minimum. Each penalty expires independently after 90 KSA calendar days, beginning on its Expiry Date. Expired NCRs and original metadata remain in history; no reset or record deletion occurs.
- Pure, reusable functions require an explicit current KSA date. Invalid/missing dates and unknown categories throw rather than silently return a misleading score. Future-dated records deduct nothing and return explicit diagnostics, with no Active/Expired status until the occurrence date.
- The unsaved form labels browser-time KSA calculations as previews and automatically updates across a KSA day change without Refresh. Production calculations remain backend-owned and must be correct even without an active browser session.
- Save says “Database integration pending — NCR not saved.” Delete, Refresh and Export never persist, reload operational data or claim success.

## Verification results

| Check | Result |
| --- | --- |
| Application JavaScript syntax and `git diff --check` | Pass |
| NCR scoring/expiry unit regressions | 11 passed |
| Existing compatibility unit regressions | 4 passed |
| Browser workflow test | Pass across all 17 sidebar pages |
| Category configuration | Exactly 23 unique categories; 3 × -50, 8 × -25, 12 × -10 |
| Scores | 100 baseline, positive deduction magnitudes, 0 and negative balances preserved |
| Expiry/recovery | Independent 90-day recovery, retained history, month/year/leap boundaries |
| Timezones | KSA midnight and America/New_York, Pacific/Honolulu, Europe/Madrid, Asia/Tokyo |
| Invalid/future dates | Explicit errors/diagnostics; no early deductions |
| NCR UI | Both tabs, retained filters, category/expiry updates, automatic KSA preview rollover, independent TBT/action, details/edit/delete previews |
| Fuel UI | Depot 2.18, 50 L = SAR 109.00, manual Outside Depot price, validation and mode transitions |
| Mobile | 390px layout and both Fuel/NCR dialogs pass without main-page horizontal overflow |
| Legacy spreadsheet/Apps Script requests | 0 |
| Operational backend writes, fabricated downloads, uncaught errors | 0 |
| Authentication | Existing login, role denial/lookup and logout pass with mocks; configuration/source unchanged |

Run `node --test tests/fleet.test.cjs tests/ncr-policy.test.cjs`. With a local server running, run `node tests/workflow.browser.cjs`; `TAXIQAID_URL` and `TAXIQAID_SCREENSHOTS` override the defaults. Synthetic records are confined to pure tests and never populate production data. Browser tests edit unsaved form previews, use mocked authentication and do not use live account credentials. Live authentication/session verification remains a separate account-based check.

No Supabase credentials, roles, tables, data schemas or migrations were changed. No spreadsheet, Apps Script project, operational localStorage/IndexedDB store or database connection was added. Existing Maintenance Original Source ID relationships remain intact.

## Screenshots

- [Driver Scores](screenshots/ncr-driver-scores.png)
- [NCR Tracker](screenshots/ncr-tracker.png)
- [Approved Fuel tariff and total](screenshots/fuel-form-preview.png)
- [Accident Tracker](screenshots/accident-tracker.png)
- [Breakdown Tracker](screenshots/breakdown-tracker.png)
- [Maintenance Requests](screenshots/maintenance-requests.png)
- [Maintenance Overview](screenshots/maintenance-overview.png)

## Future database boundaries

The [workflow specification](TAXIQAID_WORKFLOW_SPEC.md) documents approved rules and the separate future integration work: all-driver queries, NCR ID allocation/storage, original penalty/history preservation, authoritative KSA scores/expiry, independent TBT/action auditing, authentication/authorization, historical search/export, and Fuel transaction price snapshots. There is no database implementation in this revision. Main/deployment/branch status is reported after validated integration in the task's final response.

## Changed files in this revision

- `AGENTS.md`
- `README.md`
- `docs/FRONTEND_REVIEW_REPORT.md`
- `docs/TAXIQAID_WORKFLOW_SPEC.md`
- `docs/screenshots/fuel-form-preview.png`
- `docs/screenshots/ncr-driver-scores.png`
- `docs/screenshots/ncr-tracker.png`
- `modules/compliance/ncr/ncr-policy.js`
- `modules/compliance/ncr/ncr.css`
- `modules/compliance/ncr/ncr.html`
- `modules/compliance/ncr/ncr.js`
- `modules/operations/fuel/fuel.html`
- `modules/operations/fuel/fuel.js`
- `shared/bootstrap.js`
- `tests/ncr-policy.test.cjs`
- `tests/workflow.browser.cjs`
