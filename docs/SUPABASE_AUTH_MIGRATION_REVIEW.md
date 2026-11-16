# Dedicated authentication migration implementation report

**Status: prepared and tested locally; not activated, not merged to production.**

| Required report item | Result |
| --- | --- |
| Files created | Staging entry; dedicated login/client/config/wire contract; broker/access server candidates and shared security/store/authorization helpers; baseline inspection/mapping/permission inventory/proposed rate storage; pinned Deno config/lock; catalog/live-test scripts; focused Node/Deno/browser tests; migration documentation |
| Files modified | Shared client configuration/bootstrap/runtime/permission evaluator/write guard; Driver Portal, User Management and Helpdesk compatibility; workflow spec, README, AGENTS and secret/tooling ignores. Original production login and Trip Check/PDF implementations remain intact |
| Authentication architecture | Private identifier resolution → official Supabase password verification → supported SDK session establishment → verified Auth UID → uncached own-account access. The owner accepts technical email in the authenticated user's own standard claims; arbitrary mappings stay private and no email login field is introduced |
| New public configuration | Dedicated `mqkflwsvnzcaylxtvsje` project and owner-approved publishable key in `shared/auth-dedicated-config.js`; staging login is disabled. Ordinary production entry retains the existing client |
| Username/Iqama broker | Implemented disabled candidate, exact request validation, private resolution, generic failures, CORS, distributed HMAC counter buckets, trusted-ingress guard and supported Auth; no custom JWT, password storage or administrative password shortcut |
| get-my-access | Client contract and candidate `withSupabase({auth:'user'})` implementation tested with fixtures. Existing deployed source and authenticated response remain unverified |
| Database validation | Strict TLS/target/mapping guards type-checked and tested offline. The owner verified the six tables' exact columns. Keyed queries, active-entry filters and boolean overrides are tested through offline SQL fixtures; real PostgreSQL/TLS/RLS results and counter concurrency remain pending |
| Master verification | No Master account recreated, queried, overwritten or hardcoded. Genuine authenticated Master verification remains blocked |
| Permissions | Exactly 107 unchanged catalog keys. Boolean `is_allowed` overrides convert true to allow, false to deny and no row to inherit. Mocked Master has 101 capability decisions with all six driver-only actions excluded. No real grants, roles or overrides are changed; actual database inventory is unverified |
| Driver Portal | Exactly four sections retained; future-contract Iqama fixtures route only verified linked Driver context. The real schema has no Iqama/linkage columns; backend driver resolution and access stay unavailable pending provisioning. Management preview retains manager UID and cannot impersonate/sign. No operational integration |
| User Management | Three sections retained, nine canonical identity departments in staging, unsaved drafts/no-op privileged actions; no public Auth directory or privileged mutation connected |
| Security controls | Server JWT/user verification, active-status/UID checks, deny-by-default model/dependencies/scope, generic no-cache errors, strict TLS, isolated staging sessions, bounded parsing, CORS, proposed atomic abuse counters and no secret logging. AAL1 accepted; no mandatory MFA |
| Test results | 80 Node unit tests, 12 offline Deno security/adapter tests, seven browser suites, JavaScript syntax and Deno type checks pass. Roster verifier checks 815 synthetic PDFs including 812 batch PDFs and 4,974 map annotations; Trip Check PDF source hash unchanged. New authentication tests are mocked, not genuine end-to-end tests |
| Manual Supabase work | Secure project connection and network allowance; review deployed source, RLS and constraints against the owner-verified columns; configure the exact checked-in mapping; verify Master/grants/departments; approve server-only RLS/counter roles, trusted ingress and abuse limits; complete normal hosting/session-restoration checks under the accepted own-claim policy; manually deploy through approved workflow; run genuine tests |
| Outstanding risks | New hostname is blocked by workspace proxy HTTP 403; no admin/database/test credentials configured; existing function/private queries/Master are unverified; own-session email claims are explicitly accepted; production restoration and hosting controls still need validation; distributed abuse controls need real concurrency/outage/spoofing tests |
| GitHub branch | `feat/dedicated-supabase-auth`, based on main `42ab3a504d76e5119733791c2262f24565336576`; retain while live validation and explicit cutover approval are pending |
| Production status | No authentication cutover, database/function deployment or production merge. Main remains `42ab3a5`; its earlier frontend Pages deployment was verified successful. Migration code is not published to Pages |

See [architecture, manual steps and rollback](SUPABASE_AUTH_MIGRATION.md) and [the explicit schema baseline](../supabase/baseline/README.md). The workspace has no configured Supabase secrets, and the new host is absent from its enforced allowlist. Do not claim a successful genuine login, database query or Master-grant verification from the mock suite.

The owner's request requires **explicit production cutover approval after successful testing** and prohibits merging incomplete authentication work. Passing these offline/mocked checks does not satisfy that gate. No approval to activate is requested before genuine validation can be completed.


## Verified-schema alignment corrections

This follow-up stays on the existing development branch and does not merge, activate or deploy anything. Exact files changed:

- `supabase/functions/_shared/store.ts`
- `supabase/functions/_shared/security_test.ts`
- `supabase/functions/_shared/store_test.ts` (new offline adapter tests)
- `supabase/baseline/schema-mapping.example.json`
- `supabase/baseline/README.md`
- `supabase/baseline/inspect.sql` (read-only aggregate checks only)
- `docs/SUPABASE_AUTH_MIGRATION.md`
- `docs/SUPABASE_AUTH_MIGRATION_REVIEW.md`
- `docs/TAXIQAID_WORKFLOW_SPEC.md`

The exact 29-column mapping and types are documented in the [baseline inventory](../supabase/baseline/README.md). Joins now use the real `department_key` / `permission_key`; account identity uses `user_id`, `full_name`, `account_type` and `role_key`. Both grant tables use boolean `is_allowed`. Timestamp/name/description metadata is mapped without adding it to the access response. No nonexistent Iqama/driver columns are queried or added.

The 12 backend tests include boolean allow/deny conversion and absent-row inheritance, explicit-deny precedence over role inheritance, dependent-action denial, inactive permissions/departments, UID-scoped membership/overrides, exact 101-grant Master compatibility with the frontend contract, no automatic grants to other roles, private username resolution and blocked unprovisioned drivers. These are mocked/offline tests. No credentials are requested or stored, and genuine end-to-end authentication remains pending owner-authorized testing.
