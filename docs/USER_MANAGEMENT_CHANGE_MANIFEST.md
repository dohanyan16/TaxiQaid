# User Management change manifest

Base: `886c4aa8e9a8c86339564c7f1e012568a958ab85`. Feature branch only: `feat/dedicated-supabase-auth`.

Exact file set for this implementation (42 files). Generated broker/diagnostic/browser bundles change only because they embed the shared department/catalog contract; no hosted artifact is deployed. No existing permission identifiers, Master grants, broker rate-policy SQL, admission flags or production files on main are changed.

- `AGENTS.md`
- `docs/TAXIQAID_WORKFLOW_SPEC.md`
- `docs/USER_MANAGEMENT.md`
- `docs/USER_MANAGEMENT_CHANGE_MANIFEST.md`
- `modules/administration/user-management/user-management.html`
- `modules/administration/user-management/user-management.js`
- `modules/login/login-dedicated.js`
- `scripts/_auth_pilot/fixture.js`
- `scripts/_broker_smoke/dashboard-snippet.js`
- `scripts/_public_gateway/dashboard-snippet.js`
- `scripts/build-user-admin-dashboard.cjs`
- `scripts/build-user-admin-sql.cjs`
- `shared/auth-contract.js`
- `shared/bootstrap.js`
- `shared/permission-bindings.js`
- `shared/permission-catalog.js`
- `shared/user-admin-model.js`
- `supabase/config.toml`
- `supabase/dashboard/check-owner-username.ts`
- `supabase/dashboard/login-with-identifier-gateway.ts`
- `supabase/dashboard/login-with-identifier.ts`
- `supabase/dashboard/manage-users.ts`
- `supabase/deno.json`
- `supabase/functions/_shared/store.ts`
- `supabase/functions/manage-users/index.ts`
- `supabase/functions/manage-users/runtime.ts`
- `supabase/functions/manage-users/sheets.mjs`
- `supabase/review/user-management/00_inspect.sql`
- `supabase/review/user-management/01_admin.sql`
- `supabase/review/user-management/02_departments.sql`
- `supabase/review/user-management/03_access_compatibility.sql`
- `supabase/review/user-management/04_verify.sql`
- `tests/_user-admin-fixture.cjs`
- `tests/auth-migration.browser.cjs`
- `tests/broker-postgres.cjs`
- `tests/main-auth-gate.browser.cjs`
- `tests/master-pilot.browser.cjs`
- `tests/portal.browser.cjs`
- `tests/user-admin-postgres.e2e.ts`
- `tests/user-admin.browser.cjs`
- `tests/user-admin.deno.ts`
- `tests/user-admin.test.cjs`
