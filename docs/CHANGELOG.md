# Taxi Qaid ERP — Change History

## v1.3 — Trip Check workflow (prototype)

- Preserved all 27 wizard steps and the vehicle/driver selection flow.
- Changed all 24 inspection questions to explicit `OK` or `Defect` answers with no preselection.
- Added an automatic percentage score and a green/red progress bar on the final step.
- Derived read-only `Pass` for 24/24 OK and `Pending review` otherwise; prevented saving incomplete inspections.
- Removed Trip Check's Refresh button and handler.
- Added an All / Pre-Trip / Post-Trip inspection filter alongside search.
- Enabled editing existing Trip Check records by clicking the table row or Edit button, without duplicating the record.
- Added a score column and safer table rendering using DOM text nodes instead of HTML interpolation.
- Added per-authenticated-user browser-local prototype storage in place of the missing Trip Check Apps Script; other modules keep their existing integrations.
- Added documentation and integration guidance in `docs/TRIP_CHECK_BACKEND.md`.

**Important:** Trip Check records are local test data only until a properly authorized backend is connected. Google Sheets synchronization is **not** active for Trip Check.

## v1.2 — Feature folders

- Moved login, dashboard, fleet, drivers, trip check, accidents, breakdowns and maintenance HTML into dedicated feature folders.
- Gave each feature an independent `.html`, `.css`, and `.js` file.
- Extracted shared application shell and foundational styles.
- Moved feature-specific read functions, filters, and exports into the responsible module scripts.
- Added static fragment loader that initializes scripts only after all feature markup is available.
- Preserved existing navigation, HTML field IDs, Supabase login, Google Apps Script request formats, and record operations.
- Kept the original two placeholder modules and the existing Trip Check Apps Script URL placeholder.
- Updated guides for GitHub Pages and local HTTP development.

## v1.1 — Organization and write guard

- Split classic JavaScript into shared and feature script files.
- Added a browser-side Supabase session and role check before five write requests.
- Added documentation and explicit backend-security warnings.

**Note:** Frontend checks are not server-side authorization. Integration tests against real Supabase and Apps Script deployments are still required.
