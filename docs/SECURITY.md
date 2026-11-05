# TaxiQaid — Security Requirements

## Critical distinction: Login is not API authorization

The current application signs users in via Supabase Auth and verifies that a row exists for the user's ID in `taxiqaid_roles`. Its UI is hidden until the check passes. That does not guarantee that the linked Google Apps Script endpoints reject unauthenticated requests.

The five existing client-side write requests now run an additional `getUser()` + role lookup via `shared/write-guard.js`. This **only protects the normal UI workflow**. It does **not** prevent someone from bypassing the website and sending a direct HTTP request to the exposed endpoint.

### Required backend work before relying on access control

1. Review the Google Apps Script code for Drivers, Fleet, Accidents, and Trip Check (`doGet` and `doPost`). The archive does **not** contain these scripts, so this release cannot verify their access controls.
2. Do not accept write requests based solely on a username, browser-supplied role, a shared URL, `Origin`, or a frontend-only password.
3. Have a trusted backend validate the user's Supabase access token and required role for **each** read/write request. Alternatively, route operations through a Supabase Edge Function or another authenticated backend. Protect access to the Google Sheets from that backend.
4. Define distinct permissions for users who may view, edit, and delete records. The current role existence check does not implement fine-grained permissions.
5. Protect reads as well as writes: driver names, document identifiers, and related data may be sensitive.
6. Limit access to the underlying Sheets; apply least-privilege access, logging, and backups.
7. Review existing direct `innerHTML` interpolations of remote sheet values before using untrusted input. Some of the original rendering code needs output escaping / safe DOM rendering to avoid cross-site scripting.

## GitHub Free and public hosting

GitHub Pages on the Free plan supports static sites from public repositories. Every HTML, CSS, JS file, URL, and publishable key in a public deployment can be inspected. Moving code back into one HTML file would not make any of those values secret. A public Supabase publishable/anon key is intended to be exposed, **provided Supabase permissions/RLS are correctly configured**. Supabase service-role keys must never be included in client code.

Do not push company credentials, spreadsheet exports, passwords, or personal data into a public GitHub repository. A private repository is useful for source management, but a static site still requires authentication/authorization at the real data endpoints.

## Current known gaps

- Google Apps Script source code was not included with the supplied archive.
- The unused legacy Trip Check constant in `shared/config.js` is a placeholder; the active Pre/Post-Trip endpoints are defined in `modules/tripcheck/tripcheck.js`.
- Fleet/Driver endpoints must preserve omitted columns on partial updates. Their implementations and the Post-Trip server-side Fleet odometer write are externally managed and cannot be verified from frontend source alone.
- The original code is heavily based on `innerHTML` when showing sheet values.
- Authorization is based on having a role, rather than explicit action-level permissions.
- No live backend or browser integration test was possible against company accounts.

## Recommended next milestone

After deployment of this organizational release, implement a secured backend proxy for Google Sheets reads/writes, or use Supabase with correctly configured policies. Test rejected requests from a browser with no active session **and** direct HTTP requests that do not originate from the UI.
