# Trip Check — Prototype and Future Backend Integration

## Current state (v1.3)

The Trip Check module works as a **local prototype only**. The original Apps Script deployment URL is a placeholder and no Trip Check requests are sent to Google Sheets. This is intentional: it allows the interface, scoring, filtering and editing to be tested before the server-side contract and access controls exist.

Prototype records are stored in the current browser's `localStorage` under a key ending in the authenticated Supabase user ID. Only the current signed-in user is allowed to invoke the application's save/load functions. This is **not** a security boundary for the stored information. Browser storage can be inspected or erased, is not synchronized between devices, is not backed up, and should not contain real driver identifiers or company records. **Use test data only.**

If you need to preserve prototype records, sign in and use **Export Excel** before clearing the browser's site data. The export follows the currently selected inspection type and search filters; select **All Inspections** and clear search to export everything.

## Inspection rules

- The 27 wizard steps include 1 inspection-type step, 1 vehicle/driver step, 24 inspection questions, and 1 results step.
- Each inspection question is answered explicitly: `OK` or `Defect`. No inspection response is selected automatically.
- `Score (%) = round(100 × OK answers / 24)`.
- The green progress segment shows OK answers; the red segment shows defects; the unfilled portion shows unanswered questions.
- An inspection cannot be saved until all 24 questions, vehicle, driver, and odometer have valid values.
- `Overall Status` is computed by the application and never editable: exactly 24 OK answers results in `Pass`; any other result is `Pending review`.
- Both score and status are recalculated when existing records are displayed or edited. Legacy `Yes/No` and `Pass/Fail` answers are interpreted as `OK/Defect` if importing old data later.
- When editing, the original `Check ID`, `Date`, `Time`, and `Checked By` remain unchanged; the module stores the latest editor/time separately.

## Suggested Google Sheet columns

`Check ID`, `Check Type`, `Date`, `Time`, `Car Plate`, `Driver Iqama`, `Driver Name`, `Odometer (KM)`, `Valid Documents`, `Required Uniform`, `Doors Working`, `Trunk Condition`, `Bonnet Condition`, `Dashboard Condition`, `Mirrors Condition`, `Horn Working`, `Seats & Belts`, `A/C Working`, `Steering & Odometer`, `MDT & Screen`, `Charging Port`, `CCTV Cameras`, `Lights Working`, `Housekeeping`, `Wipers Working`, `Oil Leakage`, `Other Leakage`, `Tyres & Spare`, `Brakes & ABS`, `Safety Equipment`, `Number Plates`, `Toolkit Bag`, `Score (%)`, `Overall Status`, `Checked By`, `Remarks`, `Last Edited By`, `Last Edited At`.

The sheet should use a unique, immutable **Check ID** as the update key. The column names match the objects assembled by `collectTripCheckForm()` in `modules/tripcheck/tripcheck.js`.

## Proposed secure API contract (not implemented)

- `GET /trip-checks` — return authorized inspection records for the logged-in user's permitted scope.
- `POST /trip-checks` — create a record with a server-generated/validated unique ID and immutable creation metadata.
- `PUT /trip-checks/:checkId` — update the record identified by the immutable ID without duplicating it.
- Validate the access token on the trusted backend, not inside the browser alone. Enforce read/write permissions and validate all 24 answers (`OK`/`Defect`), the record ID, fields, types, score, and status **on the server**.
- Recalculate score and status on the backend rather than trusting browser-submitted values.
- Use a protected backend such as a Supabase Edge Function to access Google Sheets (or another appropriately authenticated service). Restrict access to Apps Script and Sheets so anonymous direct writes are not possible.
- Test unauthorized, expired-session, cross-user, duplicate-ID, malformed-payload and concurrent-edit cases before moving to real records.

## Changing the storage layer

`modules/tripcheck/tripcheck.js` contains a clearly marked **DEMO STORAGE ADAPTER** section. Once the secure backend exists, replace the local storage read/save behavior of `fetchTripChecks()` and the form submit handler with authenticated server requests. Keep `TRIPCHECK_QUESTIONS`, `calculateTripCheckScore()`, field names, filtering, rendering and wizard logic. Do not simply point the prototype at the old public Apps Script URL: an unprotected URL is not sufficient for secure updates.

See [SECURITY.md](SECURITY.md) for the project-wide security checklist.
