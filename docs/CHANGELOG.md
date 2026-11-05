# TaxiQaid — Change History

## Current — Sheet-backed workflows

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
