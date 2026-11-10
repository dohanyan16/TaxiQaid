# TaxiQaid — Change History

## Current — People operations frontend previews

- Completed Driver Appeals with inclusive date/search filters, approved independent status/department controls and read-only source/audit details.
- Completed Training Overview, Sessions and Attendance, including a 25-row picker with cross-page selection and explicit complete-dataset safeguards for 800+ drivers.
- Completed Drivers Deduction balances, source-linked expense forms, history and exact partial-deduction previews in SAR; no NCR points or fuel quantities become automatic debts.
- Documented future Driver Portal appeals/training, secure source relationships, financial permissions and reviewed/versioned Roster publication and personal PDFs. Roster stays a placeholder.
- Kept all operational sources disconnected and existing Supabase authentication unchanged. Added people-policy and browser regressions alongside all 16-page navigation/UI checks.

## Historical — Sheet-backed workflows (disconnected)

- Renamed application titles, login branding, metadata and documentation to TaxiQaid.
- Preserved the previous Fleet/Post-Trip date/time normalization, edit-mode refresh and Excel fixes.
- Limited Fleet/Driver updates to editable fields and reloaded saved Sheet data; Excel exports refresh before downloading.
- Kept Fleet accident counts derived from Accident Tracker, including deletion of the last accident.
- Added Trip Check Refresh with filter preservation and a saved-inspection warning when the server-owned Fleet mileage synchronization cannot be verified.
- Preserved KSA timestamps, Check IDs, signatures and custom PDF layout; no placeholder Sheets or Apps Script deployments were created.

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
