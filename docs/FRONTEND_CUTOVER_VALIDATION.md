# Frontend cutover validation — repository only

Base: `4b24630809ec5cbd833640ae36e556c420ea2b61`, branch `feat/dedicated-supabase-auth`. Validation date: 2026-11-16 (Europe/Madrid).

The approved candidate keeps `shared/auth-dedicated-config.js` at **enabled:true**, with the fixed signed Worker endpoint, official SDK 2.119.0 and memory-only sessions. This validation does not change that configuration, deploy it, merge it into main or open any hosted admission gate. User Management remains a separately gated backend; Driver authentication remains blocked.

## Corrections

- Two Node assertions still expected the previous disabled candidate. They now check the approved enabled configuration, immutable settings and unchanged configuration after packaging. Explicit disabled/absent/non-boolean settings retain full legacy-path regression coverage.
- The local frontend context now serves the repository configuration unchanged by default. Only an explicit boolean test override selects the legacy/dedicated fixture mode; this avoids masking the release candidate's real setting.
- The auth-migration suite now explicitly sets its legacy-only page to `enabled:false`, alongside the existing business-suite overrides. Enabled failures still cannot fall back to the legacy project or direct Supabase broker.
- The browser preload serves the pinned SDK and XLSX from reviewed local copies and blocks all other unmocked external requests. The dormant HTML-export CDN script is replaced with an unavailable-export marker, not an operational export implementation. Tests of the authentication cutover and disconnected application UI do not validate that third-party export CDN delivery.
- Added real-frontend assertions for a disabled administrative service: Refresh and Create receive simulated 503 responses, display no confirmed success, populate no user record and disclose no password; the Master session remains authorized. A Deno test checks missing/false/invalid administrative gates return 503 before any online Auth, SQL or Auth Admin key access.

## Observed local results

- **175 Node tests**, including enabled cutover, legacy compatibility, signed-only transport, fail-closed configuration, session cleanup and packaging.
- **50 Deno tests** and strict source/generated-artifact type checking, with mocked transport and no hosted permission.
- **Ten browser suites**: workflow, UI, people, Roster, support, portal, auth migration, main auth gate, Master pilot and User Management (the last has a separately simulated enabled service to preserve CRUD regression coverage).
- Master: **101 management permissions**, **six Driver-only denials**, **18 administrative views** on desktop/mobile, refresh, expiry, logout, failed cleanup and in-flight races.
- Driver sign-in is rejected without a broker request. Legacy login is tested only with the dedicated setting explicitly disabled, absent or non-boolean. The default candidate uses dedicated Auth through the Worker.
- SQL/Dashboard generators, unchanged 107-definition permission catalog, JavaScript syntax and whitespace checks pass. No PostgreSQL integration was repeated for this frontend/test-only change.

These are local results using the real frontend and official SDK with simulated Auth/service responses. They are not new B2/B3 or hosted login, configuration, version-parity, deployment or publication evidence. No credentials, Secrets, Cloudflare/Supabase settings, live SQL, accounts, permissions, Cron, main or branches are changed by validation. No Pages publication is performed.

## Changed files

- `docs/FRONTEND_CUTOVER_VALIDATION.md`
- `scripts/auth-pilot-local.cjs`
- `tests/auth-entry.test.cjs`
- `tests/auth-migration.browser.cjs`
- `tests/deny-live-auth.cjs`
- `tests/master-pilot.browser.cjs`
- `tests/signed-broker-packaging.test.cjs`
- `tests/user-admin.deno.ts`

Rollback of these validation changes is a normal feature-branch revert; it does not alter the approved candidate setting or any hosted service. Production publication and hosted verification require separate owner authorization.
