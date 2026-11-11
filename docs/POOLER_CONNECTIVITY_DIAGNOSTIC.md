# Restricted pooler diagnostic — prepare for review only

**No deployment, enablement, main merge or live database change is authorized by this preparation.** Work remains on `feat/dedicated-supabase-auth`. The owner reports `login-with-identifier` is manually deployed with its three activation flags false, `TAXIQAID_BROKER_DB_URL` configured, and existing SQL privilege checks passed. Those facts do not establish a successful pooler connection.

The new, separate temporary candidate is **`check-broker-pooler`**. It does not call, replace or modify `get-my-access` or `login-with-identifier`. It never reads identities, mappings, permissions, departments, counters or business records. There is no new database role, grant, RLS policy, table or migration. It uses only metadata SELECTs and an authorized transaction-local role switch, followed by explicit ROLLBACK and client closure.

## Authorization policy

A genuine project-user JWT must be verified online with official Supabase Auth `getUser(token)` using the current publishable key. The verified UID must exactly match **one owner-configured administrator UID** in a protected function setting. Anonymous accounts, another UID, editable metadata, a submitted role/UID, a Dashboard session, an anon key or a publishable key alone grant no access. No token payload is merely decoded and trusted. The connection URL/CA is read only after authorization succeeds.

The allowlist is an explicit, short-lived **diagnostic authorization grant**, established by the project owner after privately verifying the existing active Master account through Dashboard. It does not derive authority from a client role label or depend on a full application access-response contract. It is independent of the public login handler and existing access function. It is not automatically synchronized with later app-role/status changes: disable it immediately if that administrator changes, and never leave it as a permanent application permission. Runtime access expires automatically and cannot be configured more than fifteen minutes ahead.

`verify_jwt = true` is proposed for this function only. Keep platform JWT verification enabled in Dashboard; the handler independently verifies Auth and the protected UID grant. Do not disable verification to clear a gateway 401. The existing two functions retain their settings.

## Checks and limits

The endpoint accepts only an empty POST (no inputs or `{}`), rejects query parameters and unapproved browser origins, and returns fixed keys whose values are exclusively **PASS** or **FAIL**. Failure includes checks not run after an earlier failure. HTTP status remains standard transport metadata; the browser summary does not show it or raw errors.

| Check | PASS means |
| --- | --- |
| `configuration` | A separately enabled diagnostic has a valid administrator UID and a future UTC expiry within fifteen minutes |
| `administrator_authorization` | Auth verified the caller and its exact UID matched the owner-issued temporary grant before any database work |
| `pooler_configuration` | The existing connection uses the dedicated project/restricted pooler username, a shared Supabase pooler endpoint and supported port; no direct or elevated identity fallback |
| `connection` | The configured client completed a SQL round trip; connection timeout is five seconds |
| `tls_to_pooler` | That round trip used explicit TLS with certificate/hostname verification enabled; no plaintext/insecure fallback |
| `login_role` | PostgreSQL reports the expected login/session actor and database, LOGIN + NOINHERIT and no superuser/bypass/role-creation/database-creation/replication attributes |
| `role_membership` | The actual session is a member of the existing backend role |
| `postgres_backend_tls` | This backend's own `pg_stat_ssl` row reports SSL; no other sessions are inspected |
| `set_local_role` | The actual `SET LOCAL ROLE taxiqaid_auth_backend` succeeded using existing authority |
| `backend_role` | The resulting actor is the expected backend, while the original session stays the restricted login; the backend is non-login and non-privileged |
| `transaction_rollback` | Explicit ROLLBACK completed, removing the local role/timeouts |
| `role_reset` | The next observed query begins as the restricted login again |
| `connection_closed` | The diagnostic's own one-client pool was closed |
| `overall` | Every required check passed |

**TLS has two hops.** Strict certificate validation proves the Edge Function → pooler connection. `pg_stat_ssl` describes the PostgreSQL backend connection, typically pooler → PostgreSQL, not the client → pooler socket. A backend TLS FAIL can mean false/unavailable metadata even when `tls_to_pooler` is PASS; overall stays FAIL. It does not authorize lowering TLS validation or altering grants. Backend SSL observation does not independently prove the pooler's certificate-validation policy.

The pool uses one client, `prepare:false`, sequential queries, a read-only transaction, transaction-local three-second statement/one-second lock timeouts and a fifteen-second client-close deadline. It never keeps a cached client. A per-isolate guard allows one approved probe at a time; it is not a distributed rate limiter. Existing connection limits remain untouched. A pooler may assign a different PostgreSQL backend between transactions: `role_reset` proves the next observed transaction's state, not a global audit of every provider backend. Closing the client does not dismantle Supavisor's shared pool.

The metadata is limited to boolean comparisons against fixed expected roles, `pg_roles`, `pg_has_role`, the current database and this backend's SSL flag. No private SQL function is called, no attempt bucket is consumed, and no application row or mapping is returned. SQL errors, URL/password/CA, hostname, PID, actual role names, UID, email, claims and complete Auth responses are not displayed/logged/copied. There are no console/request-body logs. Review platform log redaction separately before any approved live window.

## Exact Dashboard procedure after separate approval

The following is a **future manual plan**, not an instruction to deploy or enable during this review. Only a normal browser and the existing project Dashboard are needed. Do not install Python, Node, Git, PowerShell or CLI tools.

1. Open the dedicated Supabase project **`mqkflwsvnzcaylxtvsje`**. In **Edge Functions → Secrets**, privately verify that `TAXIQAID_LOGIN_ENABLED`, `TAXIQAID_SESSION_TRANSPORT_REVIEWED` and `TAXIQAID_TRUSTED_IP_HEADER_VERIFIED` remain **false**. Do not modify them. Confirm the existing `TAXIQAID_BROKER_DB_URL` is present; do not reveal/copy it into a test, saved query, browser code, chat or report. The diagnostic reuses it and optional `TAXIQAID_BROKER_DB_CA` without requesting another connection credential.
2. In **Authentication → Users**, privately select the existing Master Auth account and copy its UID. Do not create/edit/reset an account. In **SQL Editor → New query**, privately substitute that same UID into this **read-only, status-only authorization check**:

   ```sql
   SELECT CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END AS administrator_selection
   FROM taxiqaid_private.user_accounts
   WHERE user_id='<Auth UID copied privately>'::uuid
     AND username='dohanyan'
     AND account_type='management'
     AND role_key='super_admin'
     AND status='active';
   ```

   Proceed only after the owner confirms PASS and the correct existing Auth identity. Never send the UID or private query contents in a report. This Dashboard read uses administrator authority only to approve the temporary grant; **it is not a test of the restricted pooler connection**.
3. After approval for temporary deployment, add the diagnostic settings below with its enable flag **false**. Enter the verified UID privately in the protected UID setting. Do not enter an email, password, role label, access token or connection URL there.
4. In **Edge Functions → Deploy a new function → Via Editor**, create **`check-broker-pooler`**. Copy the complete generated [single-file candidate](../supabase/dashboard/check-broker-pooler.ts) from this reviewed commit into the editor. Keep **Verify JWT enabled** for this function. Review the exact source, then click **Deploy function** only after that separate deployment approval. Do not deploy a folder/all functions, edit `get-my-access`, replace the login broker, or change database roles/grants. An approved disabled deployment performs no connection test.
5. Only after approval for a live diagnostic window, obtain a public UTC timestamp ten minutes ahead with this read-only Dashboard query:

   ```sql
   SELECT to_char((now() AT TIME ZONE 'UTC') + interval '10 minutes',
                  'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS temporary_utc_expiry;
   ```

   Enter it in the diagnostic expiry setting, then set **only** `TAXIQAID_POOLER_DIAGNOSTIC_ENABLED=true`. A missing, expired, malformed or more-than-fifteen-minute expiry blocks all database access. Keep the three login activation flags false.
6. In GitHub on the reviewed feature commit, open the [self-contained public browser Snippet](../scripts/_pooler_diagnostic/dashboard-snippet.js), click **Raw**, and copy its public code. It bundles the checksum-pinned official SDK; it contains no secret value and fetches no runtime code from a third-party site.
7. Open a **new private browser window** at `https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/check-broker-pooler`. A JSON 401/405 on this initial unauthenticated GET is expected. Confirm the exact host/path. Open **Developer Tools → Sources → Snippets → New snippet**, paste the reviewed public code and run once (Chrome/Edge: Ctrl+Enter). It creates a temporary form in that diagnostic document. If company/browser policy blocks Snippets, stop; do not disable protections or install software. Do not run it on the production ERP, a third-party playground or the Supabase account Dashboard.
8. Privately enter the existing administrator's **technical Auth email and password** into the form; both fields are masked. This is a temporary technical direct-Auth exception, not an employee email-login change. Click **Run Once and Sign Out**. Inputs clear immediately. The SDK signs in directly with official Auth and sends the resulting user JWT to this diagnostic alone. It never calls the username broker, `get-my-access`, a private table or the Data API. The server verifies Auth/administrator authorization before reading the connection secret or opening PostgreSQL.
9. Keep the tab open until automatic **local-scope sign-out** finishes, including on FAIL. Report only **Copy PASS/FAIL Summary**. Never copy a token, SDK object, raw response, HAR/network capture, input screenshot, email/UID or secret. Browser storage, automatic session refresh and URL-session detection are disabled. If sign-out fails, close the private window and privately review/revoke that test session through existing Auth controls; normal access-token expiry is separate from refresh-session revocation.
10. Immediately set **only the diagnostic enable flag** back to false, close the private window, clear the clipboard and delete the temporary `check-broker-pooler` function when finished. Remove only its three new settings. Keep the existing broker DB URL/CA, users, roles, grants and login flags unchanged. A removed endpoint should be unavailable. No test page is published and no main/Pages change is part of this procedure.

The Dashboard's built-in function tester defaults/API keys are **not administrator authorization**. Do not paste private credentials or tokens into its saved request body, and do not use a service-role key as a shortcut. The Snippet performs the genuine project-user authentication in memory; a Supabase platform/Dashboard login alone is not that project user's JWT.

### Settings — names only

| Name | Scope |
| --- | --- |
| `TAXIQAID_POOLER_DIAGNOSTIC_ENABLED` | New temporary diagnostic gate; false/unset by default |
| `TAXIQAID_POOLER_DIAGNOSTIC_ADMIN_UID` | New protected, owner-verified existing Master UID; no value belongs in source or reports |
| `TAXIQAID_POOLER_DIAGNOSTIC_EXPIRES_AT` | New UTC expiration, at most fifteen minutes ahead |
| `TAXIQAID_BROKER_DB_URL` | Existing configured restricted pooler connection; reuse privately, do not replace during this preparation |
| `TAXIQAID_BROKER_DB_CA` | Existing optional trusted CA; strict validation remains mandatory even if unset |

No new database permission, secret/service-role API key, identity mapping, Auth password storage or public-login activation is needed. Keep this authorization capability separate from permanent application permissions and disable it if the selected administrator's authority changes.

## Interpreting failures without exposing details

- `configuration` FAIL: the temporary gate/UID/expiry is not valid. No database access occurs.
- `administrator_authorization` FAIL: no verified allowlisted administrator, or an earlier gate/input failure. No connection is opened. A gateway 401 may occur before handler output; the Snippet still prints only FAIL. Do not weaken JWT verification.
- `pooler_configuration` FAIL: the existing URL is not the approved restricted pooler form. Review it privately; do not share it or substitute `postgres`/a privileged role.
- `connection` / `tls_to_pooler` FAIL: connection/certificate/authentication/timeout could not be confirmed. Keep strict TLS. A URL format/SQL privilege check alone is not connectivity evidence.
- `login_role` / `role_membership` / `set_local_role` / `backend_role` FAIL: actual server identity or existing membership/SET authority did not match. Report statuses, not identities/errors, and review with the owner. This diagnostic applies no fixes.
- `postgres_backend_tls` FAIL: the PostgreSQL-side SSL observation was false/unavailable. It is distinct from verified TLS to the pooler; keep overall FAIL pending provider review.
- `transaction_rollback` / `role_reset` / `connection_closed` FAIL: cleanup/state restoration was not confirmed. The client-close deadline still runs; do not claim success.

A FAIL does not authorize an automatic role/grant change, TLS downgrade, retry with a broad credential, function replacement or username-login activation. All preceding checks must PASS before later checks are meaningful.

## Verification scope and remaining genuine test

Developer tests cover invalid/expired/public-key/anonymous/metadata-spoof/non-allowlisted requests without opening a connection; authorization-before-probe ordering; status-only failures; strict options and metadata SQL; wrong identities/membership/SET/rollback/reset/closure failures; and the private browser's masking, clearing, storage blocking and sign-out.

A **disposable local PostgreSQL/TLS fixture** tests the actual pinned driver, certificate/hostname rejection, read-only metadata queries, both restricted roles, explicit rollback, subsequent actor reset and client closure. Its roles and certificates are synthetic, isolated from Supabase and removed afterward. It is a direct local PostgreSQL server, **not Supavisor**. It cannot prove the configured hosted pooler, live secret, gateway/authorization setup, provider backend TLS or production role identity. Browser and Auth responses remain mocked in automated tests.

The actual Supabase connection test remains pending review, separate deployment/window approval and the owner-run browser procedure. No real connection, deployment or new login success is claimed in this preparation. A future full diagnostic PASS validates connectivity/metadata for this probe, not password broker correctness, identity mappings, role grants for business operations, public-login readiness or production cutover.

## Primary references

- [Supabase Edge Function user JWT verification](https://supabase.com/docs/guides/functions/auth)
- [Supabase Dashboard function editor](https://supabase.com/docs/guides/functions/quickstart-dashboard)
- [Supabase secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase poolers, TLS and transaction/session behavior](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PostgreSQL SSL observations](https://www.postgresql.org/docs/15/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW)

## Changed-file manifest

All changes belong to the existing development branch. Existing application modules, both existing function implementations, the broker connection parser, generated login candidate, SQL proposals and permission catalog are unchanged.

| File | Purpose |
| --- | --- |
| `supabase/functions/check-broker-pooler/index.ts` | Independent entry point; official Auth verification before database access |
| `supabase/functions/_diagnostics/pooler-core.mjs` | Temporary administrator grant, request guards and fixed status-only contract |
| `supabase/functions/_diagnostics/pooler-db.ts` | Strict pooler/TLS options, read-only metadata, local role switch and cleanup |
| `supabase/functions/_diagnostics/pooler-db_test.ts` | Mocked transport and database failure coverage |
| `supabase/dashboard/check-broker-pooler.ts` | Generated single-file Dashboard candidate for review |
| `supabase/config.toml` | JWT verification setting for this new candidate only |
| `supabase/deno.json` | Add diagnostic modules/artifact to type checking |
| `scripts/_pooler_diagnostic/browser.js` | Masked one-run form, status filtering and automatic sign-out |
| `scripts/_pooler_diagnostic/dashboard-snippet.js` | Self-contained browser artifact with the pinned official SDK and its license |
| `scripts/_pooler_diagnostic/.gitattributes` | Preserve upstream SDK whitespace in that generated artifact |
| `scripts/build-pooler-diagnostic.cjs` | Reproducible packaging and SDK-integrity/drift checks |
| `tests/pooler-diagnostic.test.cjs` | Authorization, timing, concurrency and output-boundary tests |
| `tests/pooler-diagnostic.browser.cjs` | Nine mocked browser/Auth/diagnostic failure and cleanup scenarios |
| `tests/pooler-diagnostic-tls.cjs` | Disposable local PostgreSQL/TLS fixture; developer-only, optional `DENO_BINARY` override |
| `docs/POOLER_CONNECTIVITY_DIAGNOSTIC.md` | This review, exact future Dashboard procedure and limitations |
| `docs/SUPABASE_AUTH_MIGRATION.md` | Owner-reported deployment state and diagnostic reference |
| `docs/USERNAME_LOGIN_BACKEND_REVIEW.md` | Link the separate diagnostic without altering broker deployment instructions |

## Preparation validation

- Node unit/security suites: **112 passed, 0 failed**.
- Deno security/store/diagnostic suites: **20 passed, 0 failed**; the Deno type-check task passed.
- JavaScript syntax: **all 89 repository files passed**; Python test syntax passed.
- All **ten browser suites passed**: workflow, UI, people, roster, support, portal, authentication migration, existing local Master smoke helper, existing username smoke helper and the new pooler diagnostic. Navigation covered all **18 current administrative pages**. These Auth/network scenarios use mocks, not genuine hosted authentication.
- The new diagnostic browser suite passed **nine scenarios**, including unauthorized access, failed backend TLS, unsafe/extra response fields, gateway/network errors and failed sign-out. It observed no username-broker or access-function calls and no storage writes or private values in output.
- The disposable PostgreSQL fixture passed strict TLS, actual restricted-role metadata, role switching, rollback/reset and closure; untrusted certificates and incorrect hostnames were rejected. This is local PostgreSQL evidence, not hosted pooler evidence.
- Roster artifact verification passed **815 synthetic PDFs** and **4,974 map annotations**; private artifacts stayed outside this repository.
- Both generated Dashboard artifact checks, pinned SDK-integrity check, the **107-definition** permission catalog check and whitespace checks passed. Existing broker/access/application/SQL proposal sources were compared with the starting feature commit and remain unchanged.

No live Supabase request, deployment, enablement, role/grant edit, database migration, production merge or Pages publication was performed. Genuine hosted connectivity remains pending the separately approved owner-run procedure above.
