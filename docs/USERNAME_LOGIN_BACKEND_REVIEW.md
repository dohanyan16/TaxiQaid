# Username login backend: review and manual staging runbook

## Status and scope

Work stays on `feat/dedicated-supabase-auth`. Nothing in this change applies SQL to Supabase, changes live database grants/accounts, deploys a function, enables the broker, changes `main` or publishes GitHub Pages. **Do not perform the deployment steps below until the owner separately approves the reviewed staging changes.** The production login and old external Supabase project remain untouched.

The owner reports a **genuine PASS** for the existing deployed `get-my-access`: password authentication, verified UID, HTTP 200, active Master, 101 management grants, six driver-only denials, AAL1 without an MFA challenge, and sign-out. The owner also verified seven existing private/security tables, RLS/no browser grants, 107 active permission definitions, 101 Master grants, zero overrides, nine active departments and one active Auth-linked Master. These are owner-supplied live results, not new agent-run tests. **Username → broker → official Auth → access has not yet been genuinely tested.**

The existing `login_attempt_counters` table and `taxiqaid_auth_backend` role are reused. No table, Master, password, permission identifier, grant row or driver linkage is recreated. The former table-creation proposal now performs inspection only. Iqama authentication remains disabled, including direct broker attempts; no driver/Iqama columns or identities are invented.

## Chosen privilege boundary

A separate PostgreSQL connection identity, `taxiqaid_auth_login`, is proposed. It starts **NOLOGIN**, with NOINHERIT, NOBYPASSRLS, NOSUPERUSER, no database/role creation or replication and an initial connection limit of four. It can connect only after reviewed credential provisioning. It is a non-admin member of the existing **NOLOGIN** `taxiqaid_auth_backend`. The runtime must connect as the new login identity and use **SET LOCAL ROLE** inside each transaction. It rejects a `postgres`, existing backend-role, old-project or unrecognized connection before querying private data, and checks the actual database session identity. It never uses a service-role key.

The backend role receives schema USAGE and EXECUTE on exactly two API functions. Neither runtime role gets SELECT/INSERT/UPDATE/DELETE on any identity, Auth or counter table. No owner role is granted to a runtime role. NOINHERIT does not remove PUBLIC privileges: the preflight inventories accessible existing SECURITY DEFINER functions for separate review, and verification rejects direct Vault decrypted-secret reads. Stop if any pre-existing PUBLIC capability defeats this boundary; do not issue broad revokes that affect the proven application. The private API schema is not exposed in the Data API.

| Function | Non-login, non-bypass owner | Minimum owner privileges | Runtime exposure |
| --- | --- | --- | --- |
| `begin_login_attempt(text,text,text,text)` | `taxiqaid_auth_lookup_owner` | SELECT on account UID/username/type/status and Auth UID/email; EXECUTE counter helper | Backend only; consumes rate buckets before the one exact username lookup |
| `consume_login_counters(text,text,text)` | `taxiqaid_auth_rate_owner` | SELECT/INSERT/UPDATE on existing counters, under role-specific RLS | Lookup owner only; backend cannot call it separately |
| `get_management_access(uuid)` | `taxiqaid_auth_access_owner` | SELECT on only the required columns of the six identity tables, under role-specific RLS | Backend only, after the broker binds the official Auth UID |
| `prune_login_counters(integer)` | `taxiqaid_auth_rate_owner` | Existing counter DELETE limited by RLS to rows expired for over five minutes | Dashboard administrator/approved maintenance only; no runtime cleanup/reset API |

The SQL files contain exact column grants. No function-owner role owns the data tables, can log in, bypass RLS, create users or reset passwords. New RLS policies target these roles only; existing browser and deployed-function policies are preserved. Functions fix `search_path = pg_catalog,pg_temp`, qualify all data relations, set `row_security = on`, accept bound values, reject incomplete identity metadata and revoke default PUBLIC execution in the same transaction. Temporary administrator memberships/schema CREATE used for ownership transfer are removed before commit.

A compromised runtime credential can invoke these limited functions; it is still sensitive. It cannot dump `auth.users`, read password hashes, mutate accounts, rewrite permissions or reset counters. The exact-identifier resolver necessarily knows an internal email **inside the trusted backend**; it is never exposed as a browser resolver. The private UID access function relies on the backend binding the verified Auth UID, rather than treating a caller-supplied UID as proof.

### Mapping alternatives

An Auth Admin `getUserById` lookup would require a secret/service-role credential with substantially wider user-administration capabilities and would return more Auth data than the broker needs. Listing Auth users to find an email is especially inappropriate. The chosen SECURITY DEFINER approach isolates the two required Auth columns behind a throttled, exact-identifier function without placing those administrative credentials in a public handler. No custom password verification, stored application passwords, fabricated frontend email addresses or custom JWTs are introduced.

This choice requires the project's Dashboard administrator to have provider-supported authority to grant those specific Auth columns and transfer new function ownership. **If Supabase rejects those grants, or Auth-table RLS blocks the owner, stop for a supported narrow design review. Do not fall back to `postgres`, broaden grants or disable RLS.** No such live privilege/ownership check has been performed here.

## Attempt limiting and failure behavior

The Edge Function validates the method, exact two-field JSON shape, 4 KiB body limit, two-second body-read deadline and normalized ASCII username before any identity lookup. It derives separate **HMAC-SHA-256** IP, identifier and global bucket keys using a protected server secret. Raw IPs/usernames/passwords are not stored in counters.

`begin_login_attempt` invokes the protected counter helper first, then resolves the active management account. The entire database transaction must **commit before official password verification starts**. There is no separately executable unthrottled lookup for the runtime role. Password Auth calls occur outside the transaction, so locks/connections are not held across an external Auth request. A later Auth failure does not roll back an already consumed attempt.

Proposed fixed-window limits remain **200 global/minute, 20 IP/minute, 10 identifier/15 minutes**. SQL controls the limits and window boundaries using the database clock. Global → IP → identifier lock order and atomic INSERT/ON CONFLICT updates prevent concurrent lost increments and cross-bucket deadlocks. Saturation avoids bigint overflow. A denial commits the counters consumed so far; global/IP denials stop early without adding attacker-controlled identifier buckets. Denied attempts do not query Auth identity tables. Fixed windows can allow bursts around boundaries; these values require capacity/abuse review, including shared corporate NATs and the stricter native Auth budget. They are not a sliding-window guarantee.

A bounded periodic cleanup deletes at most 1,000 rows expired for over five minutes, using the existing expiry index and SKIP LOCKED. Active windows are never reset or deleted. Stopping cleanup does not permit login bypass but can accumulate rows; monitor expiry backlog and database latency. Rotate the HMAC secret only with the broker disabled across all instances, since rotation changes bucket identity. Review at least one full longest window before reopening and never truncate counters as a fix.

The pool is bounded to two connections per isolate with a five-second connection timeout, ten-second idle timeout and five-minute connection lifetime. The initial role-wide limit of four bounds aggregate database usage but may cause temporary login rejection with more isolates; size it deliberately for the project. Readiness flags are evaluated per request. Connection credentials/pools are cached per isolate: rotate only with the broker disabled, then recycle/redeploy the same reviewed broker and end its old restricted database sessions before a new approved test window. Each transaction checks the connection identity, switches role locally, sets three-second statement/one-second lock timeouts and commits/rolls back before returning. Session state is not relied upon across pool transactions; prepared statements are disabled. The post-Auth account/permission read uses a read-only repeatable-read transaction. Database, counter, TLS, pool or lock failures return sanitized HTTP 503 and never fall back to memory-only limiting or the Data API.

Only the dedicated direct hostname or Supabase shared pooler with this project-specific restricted username is accepted. Use the exact region/host from the project's **Connect** panel, port 6543 for transaction mode (5432 session mode or the reviewed direct endpoint). PostgreSQL.js receives explicit parsed options and `ssl.rejectUnauthorized = true`; arbitrary URL options cannot weaken TLS. Add the Dashboard-provided database CA only if required. Verify the actual pooler, custom-role authentication and certificate chain in staging; local PostgreSQL tests do not prove Supavisor/TLS behavior.

Unknown, disabled and unlinked accounts return the same generic credential error. A reserved `.invalid` server-only Auth input equalizes the unknown-account password-call path without provisioning an identity. Response padding is not a constant-time proof. Official Auth checks the password and returns its own session. The broker binds its UID to the resolved active account and rechecks management status/access after verification. Any created session rejected before response is signed out locally. Failed revocation or a disconnected client still needs private session review; normal JWT expiry remains separate from refresh-session revocation.

Public errors contain only a fixed message: HTTP 401 credential rejection, 429 broker/native Auth limiting, 503 backend/unready/upstream outage, or 403 unapproved origin. No SQL error, email mapping, private profile or complete Auth response is returned. Success contains only official `access_token`, `refresh_token`, optional `expires_in` and `token_type` for the supported SDK `setSession` flow. The owner's acceptance of their own technical email inside standard session claims remains in effect.

### Trusted IP is an activation blocker

There is **no trusted IP source established by this change**. An `Origin`, publishable key, header name or `TAXIQAID_TRUSTED_IP_HEADER_VERIFIED=true` is not proof. Before setting that flag, obtain a platform guarantee and test that the exact single-IP header is stripped/overwritten at **every reachable gateway path**, including the default project domain and any alternate/custom domain. A browser can forge `cf-connecting-ip`, `x-real-ip` or other headers unless trusted ingress prevents it. The code rejects arbitrary forwarded lists, `Forwarded`/`X-Forwarded-For` fallbacks, missing/invalid addresses, and unreviewed configuration. IPv6/mapped IPv4 values are canonicalized.

Do not choose `cf-connecting-ip` merely because an example uses it. If a trustworthy overwrite cannot be established, keep the broker disabled; a separately reviewed, authenticated/signed ingress design would be needed. No IP limiter is silently omitted, no proxy/ingress is deployed and no mandatory challenge/MFA is added here. CORS provides browser-origin control, not authentication or spoofing protection. Upstream request-size, slow-connection and invocation-volume controls also need review, since in-function counters cannot prevent Edge invocation charges or all ingress denial of service.

### Native Supabase Auth remains independently reachable

The custom broker is not the exclusive route to `/auth/v1/token`. Someone who knows an internal Auth email can call native password Auth directly; the publishable key is public. The broker's custom counters do not cover those requests. Review **Authentication → Rate Limits** and the actual token endpoint settings with the owner, including password/refresh traffic and shared backend egress IPs. Native HTTP 429 is preserved, not retried or bypassed. Official documentation currently describes token-endpoint IP limits; do not copy a default as evidence of this project's settings.

The candidate uses the publishable key and **does not send `Sb-Forwarded-For`**. Supabase's supported forwarded-IP feature requires a secret API key and explicit project configuration, so the broker cannot assume that arbitrary forwarding works. Adding that broad secret is not part of this least-privilege proposal. Native Auth capacity and direct-Auth abuse protection must be verified separately; do not weaken them to make the broker pass. App account disablement must still be enforced on every private data request even if Auth issues a genuine session. No mandatory MFA or new challenge is introduced.

## Preserve the deployed access function

**Do not deploy `supabase/functions/get-my-access/index.ts`.** It is an older review candidate, not the deployed source that passed the owner's test. This change does not edit it, replace it or change its secrets/JWT settings. Keep its private source/rollback copy through Dashboard **Edge Functions → get-my-access → Download**; never include embedded secrets or private responses in a repository dump.

`shared/auth-contract.js` now accepts both the version-1 nested contract and the existing top-level `uid`, `accountType`, `role`, `roleDefaults`, `overrides`, `departments` format. Boolean overrides convert true → allow and false → deny, with absent keys inheriting. Explicit denial, action/module dependencies, account audience, expiry and department/record scope remain enforced; role names and membership alone grant no capability. The 107-key catalog and 101 Master grants remain unchanged.

The frontend still requires **explicit active status, an approved full name and username** from the authenticated backend. Supported flat aliases are `status`/`accountStatus` and `fullName`/`full_name`; it never uses an entered username, email or Auth user-editable metadata as an approved name. Missing scope grants nothing. A fresh authenticated legacy response without `validUntil` receives at most a 60-second client lease bounded by JWT expiry; this is not a database status assertion.

The owner's supplied top-level key list is not the complete deployed contract. **Presence/meaning of status, approved name and username must still be checked privately against its source.** If absent, the new browser diagnostic reports only field-presence booleans and `ACCESS_CONTRACT_NOT_VERIFIED`; it does not invent an active profile or silently replace the function. Any minimal metadata change to that proven function requires its own reviewed diff, backup, owner approval and genuine regression test. Existing genuine Auth/101-grant evidence remains valid even if richer UI-profile compatibility is pending.

Driver login is rejected in the dedicated client and by the backend even if a mock response supplies invented linkage. The future portal and its four sections remain available as frontend previews. A late broker response after logout is discarded and signed out rather than restoring authority.

## Dashboard steps after separate staging approval

No software installation or CLI is required on the owner's computer. Review/download source files in GitHub's web UI on the feature branch. These are review steps now, not permission to activate.

1. Select dedicated project **`mqkflwsvnzcaylxtvsje`** in Supabase Dashboard. Confirm production `main`/Pages and the old project are outside this work. Privately download the existing deployed access source/settings as a rollback copy. Do not export users, sessions or secret values.
2. Open **SQL Editor → New query** and run only [00_inspect.sql](../supabase/review/username-broker/00_inspect.sql). Verify the owner-reported aggregate inventory, counter columns/PK/expiry index, role attributes, RLS, existing policies, username uniqueness/indexing and administrator's narrow grant/ownership authority. Do not change the Master or add a table to repair a mismatch.
3. After the SQL privilege review is approved, run [01_roles_and_policies.sql](../supabase/review/username-broker/01_roles_and_policies.sql), then [02_functions.sql](../supabase/review/username-broker/02_functions.sql), separately. These are one-time, transactional scripts; an existing new-object name intentionally stops execution. Inspect rather than using CREATE OR REPLACE, dropping existing objects or replaying them blindly. Leave the connection role NOLOGIN.
4. Run [03_verify_privileges.sql](../supabase/review/username-broker/03_verify_privileges.sql). Confirm no browser/runtime table access, only the two backend functions, non-login owners, no elevated attributes/memberships, fixed function settings and unchanged browser/deployed-function permissions. Review the exact new policies and column grants. A failure blocks later steps; do not broaden privileges.
5. If the existing Vault/pgcrypto features are available and their logging/redaction is approved, [04_provision_connection.sql](../supabase/review/username-broker/04_provision_connection.sql) privately generates a new connection-role credential and stores it in Vault without a SQL literal/result. It cannot reset an existing credential. Reveal it only in **Database → Vault** as needed to enter the connection URL in **Edge Functions → Secrets**. Percent-encode password characters when assembling a URL; no connection URL/password goes into SQL text, browser Snippets, Git, logs or chat. If the project lacks this supported secret UI or extension functions, stop; do not install tooling or reset the project password. This credential is unrelated to the Master's Supabase Auth password.
6. Enter the secret names below in **Edge Functions → Secrets**. Keep enable/review flags false. Use the exact reviewed host/CA from **Connect**, database `postgres`, direct username `taxiqaid_auth_login`, or shared-pooler username `taxiqaid_auth_login.mqkflwsvnzcaylxtvsje`; never retain the panel’s default `postgres` username. The broker uses distinct `TAXIQAID_BROKER_DB_*` names so existing `get-my-access` connection settings need not change. Supabase project secrets are accessible to project functions; review trusted function source/administrator access accordingly.
7. After approval to deploy this still-disabled candidate, use **Edge Functions → Deploy a new function → Via Editor**. Name it **`login-with-identifier`**. Paste the complete generated [Dashboard candidate](../supabase/dashboard/login-with-identifier.ts), which includes the reviewed local modules and pinned external npm imports. Do not paste a GitHub raw URL into an import or overwrite `get-my-access`. Compare the candidate commit/checksum and review any editor errors. Its public pre-auth invocation requires **Verify JWT disabled for this broker only**; the handler gates all work. Existing access-function JWT settings stay unchanged. Click **Deploy function** only after that separate approval. A disabled broker must return a generic unavailable response for an approved origin and perform no lookup/Auth call.
8. Establish trusted ingress, redacted platform request/error logging, strict TLS/custom-role pooler access, bounded cleanup and native Auth protection. Use **Integrations/Cron** only if already available and approved: schedule `SELECT taxiqaid_auth_api.prune_login_counters(1000);` every five minutes as the reviewed administrator, with no personal results. Otherwise use bounded manual Dashboard cleanup temporarily and leave employee deployment blocked pending reliable retention. Do not install/schedule extensions automatically.
9. A later, explicitly approved isolated test window may set the three readiness flags true **only after their evidence exists**. Restrict `TAXIQAID_AUTH_ORIGINS` to the dedicated project HTTPS origin for the browser plan below. Do not add production, wildcards, `null` or broad Dashboard domains. Keep frontend `enabled:false`; the isolated Snippet does not use that production readiness flag. This task does not authorize setting these flags now.
10. Run the isolated browser plan; afterward set `TAXIQAID_LOGIN_ENABLED=false` again. Retain sanitized results only. Production cutover, main integration, employee rollout and any access-function metadata amendment remain separately approved work.

### Edge Function secret names

| Name | Purpose/review |
| --- | --- |
| `TAXIQAID_BROKER_DB_URL` | Only the new restricted LOGIN identity for the dedicated direct endpoint or project-specific shared pooler |
| `TAXIQAID_BROKER_DB_CA` | Optional reviewed database CA; strict certificate verification always remains enabled |
| `TAXIQAID_RATE_SECRET` | At least 32 cryptographically random characters, identical across broker instances; no user password |
| `TAXIQAID_AUTH_ORIGINS` | Exact approved origins; dedicated project origin only during the isolated browser test |
| `TAXIQAID_TRUSTED_IP_HEADER` | Exact single-IP header only after independently established gateway overwrite guarantees |
| `TAXIQAID_TRUSTED_IP_HEADER_VERIFIED` | False/unset until spoofing/default/alternate-ingress verification passes |
| `TAXIQAID_SESSION_TRANSPORT_REVIEWED` | False/unset until approved standard-session transport/lifecycle/logging review |
| `TAXIQAID_LOGIN_ENABLED` | False/unset now; explicit owner approval required for a controlled test window |
| `TAXIQAID_ALLOW_LOOPBACK_ORIGIN` | Optional developer-only exception, false/unset for this browser-only owner plan |

No `SUPABASE_SERVICE_ROLE_KEY`, new secret API key, schema-mapping secret, test password or internal email mapping is required by this broker. Never paste any secret values into a report. Existing get-my-access settings are not a broker configuration template.

## Isolated browser-only genuine test

This plan requires only a normal browser with company-permitted Developer Tools. It does not use the production website, a local server, a downloaded executable or an external code playground. If company policy disallows Snippets, stop and report that constraint; do not disable browser protections or install tools.

1. Complete the approved isolated test-window prerequisites above. Privately review [the browser source](../scripts/_broker_smoke/browser.js). In GitHub on this feature branch, open the generated [self-contained Snippet](../scripts/_broker_smoke/dashboard-snippet.js), click **Raw**, and copy its public code. It bundles the official pinned SDK, catalog/model and contract; it contains **no credential or token** and downloads no runtime code from another host. A developer verifies its embedded SDK checksum/source consistency before handoff.
2. Open a **new private browser window**, then navigate directly to `https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/login-with-identifier`. A JSON error on that initial GET is expected. Confirm the exact HTTPS host/path. Do not run the Snippet on the production ERP, Supabase account Dashboard, a general website or a third-party playground.
3. Open browser Developer Tools → **Sources → Snippets → New snippet**, paste the reviewed public code, and run it once (Chrome/Edge: Ctrl+Enter). It replaces that diagnostic document with a temporary **TaxiQaid Private Username Login Test** form. Do not type credentials into a Console command, saved Snippet, URL or Dashboard test-request body. No weakening of CSP/self-XSS/company controls is required or authorized; stop if the browser blocks this workflow.
4. Enter **`dohanyan`** and the existing password privately in the form. Click **Run Once and Sign Out**. The password clears immediately. The browser sends identifier/password only to the same dedicated broker, installs its official tokens through SDK `setSession`, verifies the Auth user, calls the unchanged deployed `get-my-access`, checks UID/active management/Master/101 capabilities/six driver denials/AAL1, and signs out locally in `finally`.
5. Keep the tab open until cleanup finishes. Report **Copy Sanitized Summary** only. It includes fixed statuses, observable HTTP codes, counts and profile-field-presence booleans; it never displays/copies/logs the username, email, password, UID, session or raw access response. Do not open/export request bodies, HAR files, session objects or private account responses. Browser storage/persistence and automatic refresh are blocked for the diagnostic. Closing early permits only best-effort cleanup; a failed sign-out requires private session review/revocation through Dashboard.
6. A separate fresh private tab/Snippet run can check one wrong password and one nonexistent username; both must fail generically. Do not repeatedly test the live Master to trigger throttles. Disabled/driver cases require separately authorized existing test accounts; never edit/disable the Master or create identities for convenience. Spoofing, controlled concurrent load and outage tests need an approved isolated test context; local results alone cannot validate hosted ingress.
7. Return `TAXIQAID_LOGIN_ENABLED` to false, close the private window, and clear the clipboard. Keep corporate computer installation-free. No test page is published. A failed compatibility/HTTP/MFA/cleanup check is **not** a successful username login.

Expected complete result: broker 200, verified identity, access 200, matching active management Master, 101 management actions, six driver actions denied, AAL1 accepted, confirmed sign-out, overall PASS. HTTP 429 means limiting, 503 means unavailable/unreviewed/backend failure, and 401/403 means rejected credentials/JWT/origin. Network/CORS diagnostics report HTTP unavailable rather than inventing a status. `ACCESS_CONTRACT_NOT_VERIFIED` with false field-presence values means the preserved deployed response needs private contract review, not guessed profile defaults.

## Validation and remaining blockers

Automated verification uses synthetic data and the real pinned browser SDK with mocked network responses. A separate **disposable, network-isolated PostgreSQL 15** harness executes the proposed roles/policies/functions against synthetic versions of the existing tables, checks runtime/browser privilege denials, active definitions/departments, boolean overrides and 101-grant compatibility, and runs thirty concurrent transactions against one identifier (at most ten permits). It does not connect to Supabase, validate hosted grant/ownership authority, exercise real Vault, verify native Auth credentials, or prove hosted TLS/pooler/ingress behavior. The harness temporarily raises only its disposable role's connection limit for concurrency, then restores it; no real role is changed.

Developer checks: JavaScript syntax; all Node unit/regression suites; the existing seven application browser suites; new username Snippet and prior local smoke mocked suites; catalog drift check; Deno type/tests; generated-artifact consistency; disposable PostgreSQL privilege/concurrency suite; Roster PDF verification outside the repository. The developer-only commands are not owner prerequisites.

Remaining activation/cutover blockers: actual Dashboard privilege/ownership and Auth-RLS support; strict TLS/custom-role pooler connection; Vault provisioning/log redaction; independently proven trusted ingress and spoof rejection; native/direct Auth rate-limit coverage and capacity; cleanup monitoring; explicit deployed profile-field compatibility; genuine username-browser-to-broker session/permission/sign-out results; authorized disabled-account and hosted concurrency/outage checks. No mandatory MFA or driver provisioning is used to bypass any blocker.

## Rollback

1. Set `TAXIQAID_LOGIN_ENABLED=false` immediately, then stop any isolated test window. Keep frontend disabled and production `main`/Pages unchanged.
2. Through Dashboard, restore/remove only this new broker deployment using the retained reviewed source. Dashboard does not provide automatic source-version rollback; keep the source backup. Never redeploy the older access candidate over the proven `get-my-access`.
3. Disable the new connection role with `ALTER ROLE taxiqaid_auth_login NOLOGIN;` through the approved administrator. Existing pooled sessions need private review/termination for this exact new identity if immediate closure is required; do not terminate the Master or unrelated sessions. Remove its broker secret after the function is disabled. Credential rotation/reprovisioning is a separate reviewed operation, not a replay of step 04.
4. If necessary, revoke only backend EXECUTE on the two new API functions after all users of them are stopped. Keep the counter table and existing rows, all six identity tables, original grants/policies and Master untouched. Retain new objects until dependency review; do not drop schemas/tables, reset permissions broadly or revoke a pre-existing deployed-function role.
5. Disable only the newly approved cleanup job if the new schema is retired; keep a reviewed retention plan for existing counters. Retain the development branch and sanitized evidence while work remains unmerged. A future frontend cutover uses its own separately reviewed rollback commit.

## Primary references

- [Supabase Dashboard function deployment, testing and manual source backup](https://supabase.com/docs/guides/functions/quickstart-dashboard)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase PostgreSQL roles](https://supabase.com/docs/guides/database/postgres/roles)
- [PostgreSQL SECURITY DEFINER and safe function settings](https://www.postgresql.org/docs/15/sql-createfunction.html)
- [Supabase database connections and transaction pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Auth rate limits and supported IP forwarding](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)

## Validated result for this review

- JavaScript syntax and Deno checks passed; generated Dashboard/Snippet artifacts match reviewed source and the pinned public SDK checksum.
- **97 Node unit tests** and **17 Deno backend tests** passed.
- All **nine browser suites** passed: the seven existing application/auth regression suites, the earlier developer-only local smoke suite (ten mocked scenarios), and the new owner Snippet suite (nine mocked scenarios).
- Disposable PostgreSQL 15 privilege/RLS/SQL/transaction/cleanup checks passed; **30 concurrent sessions, ten identifier permits** in the tested window. Credential-procedure control flow used simulated Vault without retaining/revealing a test credential; real Supabase Vault remains unverified.
- Roster verification passed for **815 synthetic PDFs** and **4,974 map annotations**, with artifacts outside the repository.
- No private credentials, genuine broker sessions, live database connection, function deployment, main integration or production publication was used to obtain these results.

## Exact changed files

```text
docs/LOCAL_MASTER_SMOKE_TEST.md
docs/SUPABASE_AUTH_MIGRATION.md
docs/TAXIQAID_WORKFLOW_SPEC.md
docs/USERNAME_LOGIN_BACKEND_REVIEW.md
scripts/_broker_smoke/.gitattributes
scripts/_broker_smoke/THIRD_PARTY_LICENSES.txt
scripts/_broker_smoke/browser.js
scripts/_broker_smoke/dashboard-snippet.js
scripts/build-auth-dashboard.cjs
shared/auth-client.js
shared/auth-contract.js
supabase/baseline/PROPOSED_login_rate_limits.sql
supabase/baseline/README.md
supabase/dashboard/login-with-identifier.ts
supabase/deno.json
supabase/functions/_shared/broker-store.ts
supabase/functions/_shared/broker-store_test.ts
supabase/functions/_shared/handlers.mjs
supabase/functions/_shared/security.mjs
supabase/functions/_shared/store.ts
supabase/functions/_shared/store_test.ts
supabase/functions/login-with-identifier/index.ts
supabase/review/username-broker/00_inspect.sql
supabase/review/username-broker/01_roles_and_policies.sql
supabase/review/username-broker/02_functions.sql
supabase/review/username-broker/03_verify_privileges.sql
supabase/review/username-broker/04_provision_connection.sql
tests/auth-migration.browser.cjs
tests/auth-migration.test.cjs
tests/broker-postgres.cjs
tests/username-broker.browser.cjs
tests/username-broker.test.cjs
```
