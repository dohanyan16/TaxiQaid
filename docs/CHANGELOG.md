# Taxi Qaid ERP — Change History

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
