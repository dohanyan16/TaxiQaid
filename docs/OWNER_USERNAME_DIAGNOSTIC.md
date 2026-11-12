# Owner-only username diagnostic — archived successful private test

## Current owner-verified private success and public proposal

The owner reports the genuine private username diagnostic passed every check, including mapping/UID, active Master, official Auth, deployed access compatibility, 101 management permissions, six Driver denials and session cleanup. Its function and three secrets are deleted; only the access function and disabled public broker remain deployed. The [public architecture proposal](PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md) supersedes earlier private-results-pending wording and compares a signed gateway with IP-independent alternatives. It does not establish public readiness or authorize deployment, SQL, secret changes, activation or merge.

Branch: `feat/dedicated-supabase-auth`. No deployment, new secret, activation, SQL change, main merge or branch deletion is authorized by this preparation. The new temporary endpoint candidate is **check-owner-username**. It neither calls nor changes public `login-with-identifier`; `get-my-access` remains unchanged.

## Verified configuration and evidence

The owner has genuinely verified the restricted PostgreSQL pooler, strict Edge-to-pooler TLS, PostgreSQL-side SSL, privileges, private Master mapping and active existing Master. SSL Enforcement is enabled. The previous pooler diagnostic and its three settings are removed. ES256 is the existing signing algorithm. These are owner-supplied live results, not this agent's live tests.

Owner-verified native Auth limits must remain unchanged:

| Scope | Verified setting |
| --- | --- |
| Sign-ups/sign-ins | 30 requests / 5 minutes / IP |
| Token endpoint, password and refresh grants | 150 requests / 5 minutes / IP |
| OTP verifications | 30 requests / 5 minutes / IP |
| Anonymous sign-ins | 30 requests / hour / IP |
| IP Address Forwarding | Disabled |

No rate-limit change, forwarded-IP feature, additional privileged API key, MFA or challenge is proposed. Native token-bucket bursts may differ from these sustained settings. A private diagnostic PASS will not prove native capacity/direct-endpoint abuse protection or public readiness.

## Security architecture

1. A new short-lived **server-side grant** contains the one explicitly approved existing Master UID and a UTC expiry. Missing/disabled/malformed/expired grants or expiry more than fifteen minutes ahead reject the request. All three public-login readiness flags must be exactly false; otherwise this diagnostic refuses to run. The diagnostic's broker database credential is not read before authorization.
2. The owner obtains a **bootstrap project-user session** directly through official Supabase Auth in a private browser. This is the existing technical-email/password diagnostic exception, not an employee email-login change. The helper masks both fields, clears them immediately, disables persistence/automatic refresh and keeps tokens in memory. A genuine JWT, not an API key, authorizes the subsequent request.
3. The endpoint verifies that JWT **online with official Auth getUser(token)**, checks exact configured UID, authenticated audience/Auth role and non-anonymous identity. Editable metadata and client-submitted roles/UIDs grant nothing. It calls the unchanged `get-my-access` with that same bootstrap JWT and requires an active management `super_admin`, exact username `dohanyan`, compatible secure profile, 101 management permissions and six Driver denials. This rechecks current administrator authority; the protected UID grant alone is insufficient.
4. Only then does it accept a bounded POST containing exactly `identifier` and `password`. Identifier normalization reuses the existing parser; only `dohanyan` is accepted. No arbitrary identity, Iqama, email lookup or alternate username is permitted. It opens one restricted TLS SQL client and calls the **existing** protected `begin_login_attempt` through unchanged `createBrokerStore`.
5. That existing SQL function atomically consumes all limits **before** private username/mapping resolution. The global and identifier HMAC keys are identical to the public broker's keys. The legacy first/`p_ip` slot receives a distinct **owner-UID principal bucket**, not an IP: `HMAC(existing rate secret, 'v1:owner-diagnostic:' + approved UID)`. The other keys remain `v1:account:dohanyan` and `v1:global`. The fixed existing limits are owner 20/minute, identifier 10/15 minutes and global 200/minute. No SQL/API signature/schema/permission change is needed; all keys remain distinct 64-character HMACs.
6. The mapping must be active, revisioned and point to the approved UID **before** password Auth. Official `signInWithPassword` verifies the privately resolved technical email/password. Both returned UID and session must be valid; another user's session is never released. The unchanged protected post-Auth access read rechecks UID, active management/Master account, username and the same mapping revision; a suspension/email revision race fails closed.
7. The server privately installs those genuine tokens through SDK `setSession`, verifies identity online through `getUser`, then calls the **currently deployed get-my-access with the new username-derived session JWT**. It uses the exact frontend contract and permission evaluator, including explicit Deny, boolean conversion, dependencies and audience separation. It requires 101 effective management grants and six Driver-only actions both ungranted and denied. Missing metadata is not invented. AAL1/password-only operation is checked; MFA is not introduced.
8. In finally, the server signs out the newly created username session with local scope, requires observed logout 200/204, stops automatic refresh and closes its SQL client. The browser separately signs out its bootstrap session in finally. Only fixed PASS/FAIL fields and integer permission counts leave the endpoint; no test token, UID, email, private snapshot, database error or mapping leaves it. The browser rejects extra fields, invalid counts, contradictory/failed transport results and raw gateway errors.

The new function's proposed `verify_jwt=false` disables only its platform precheck; online Auth verification plus active-Master authorization are mandatory inside the handler on every request. This handles the owner's earlier ES256 diagnostic gateway observation without changing ES256 or the working access function. Current official docs describe asymmetric gateway support; an API-key gateway pass still cannot authorize the handler. Do not toggle verification on any existing function. No global verification bypass is introduced.

The endpoint accepts POST only, no query parameters and only the dedicated project browser origin (or absent Origin for a server client that still must authenticate). OPTIONS does no database work. CORS is an additional browser constraint, not administrator authorization. Body size/read time is bounded by the existing credential parser. Auth/access requests use fixed project URLs, eight-second timeouts, no cache, no redirects and no credential cookies. SQL uses existing five-second connection and transaction-local query timeouts, prepare false and max one connection, with a 75-second client-close deadline. Unauthenticated JWT verification and edge invocations precede database limits; this is not infrastructure DoS protection, and native verification quotas can still affect availability. A per-isolate one-flight guard is supplementary; database counters provide cross-instance limits. Grant validity is checked again between stages and at completion; an expired/changed grant cannot produce overall PASS. No session cache or operational persistence is added.

### Different boundary and precise limitations

This diagnostic replaces the **public unauthenticated/IP trust boundary** with verified current-Master authorization and a short-lived UID grant. It reads no forwarded-IP header and invents no IP. The legacy SQL parameter name does not turn its owner-principal bucket into network protection. It consumes genuine existing shared global/identifier counters and therefore temporarily reduces the Master's remaining attempt budget. Existing counter cleanup/retention remains necessary; no rows are deleted or reset by this test.

A genuine PASS proves private username resolution → official password Auth → UID/status/revision checks → **server-side** SDK session installation/verification → unchanged deployed access function → permissions → confirmed sign-out under this authorization boundary. It does **not** call the deployed public login handler or prove public ingress/IP provenance, CORS, anonymous enumeration resistance, public flags, browser token-response transport/SDK installation in the ERP, production session restoration, hosted concurrency/capacity or production cutover. The reviewed public SQL adapter/parsers/session whitelist/contract/model are reused unchanged; orchestration is separate to keep the public handler disabled. Public broker source parity and a future genuine public/browser flow remain separate requirements.

The bootstrap password is also used for the fixed username test. Thus one form cannot deliberately test a wrong username-path password after a successful bootstrap; those failures are covered by mocks, not live negative-test evidence. No disabled/alternate account is provisioned. Two separate Auth sessions are created on a successful run: browser bootstrap and server username session. The helper's fixed network allowlists do not replace a platform log/retention review. No HAR, account response or token should be shared. JWTs can remain valid until normal expiry after refresh-session sign-out.

## Temporary settings — names, no private values

| Setting | Use |
| --- | --- |
| `TAXIQAID_USERNAME_DIAGNOSTIC_ENABLED` | New temporary gate; false/unset by default |
| `TAXIQAID_USERNAME_DIAGNOSTIC_ADMIN_UID` | Privately selected, explicitly approved existing Master Auth UID |
| `TAXIQAID_USERNAME_DIAGNOSTIC_EXPIRES_AT` | New absolute UTC ISO timestamp ending Z, future at most 15 minutes; use a 10-minute window |
| `TAXIQAID_BROKER_DB_URL` | Reuse existing verified restricted credential; do not reveal or change it |
| `TAXIQAID_BROKER_DB_CA` | Reuse existing optional CA; certificate verification remains mandatory |
| `TAXIQAID_RATE_SECRET` | Reuse existing stable HMAC secret so global/identifier keys remain shared; do not reveal or rotate it |

The existing `TAXIQAID_LOGIN_ENABLED`, `TAXIQAID_SESSION_TRANSPORT_REVIEWED` and `TAXIQAID_TRUSTED_IP_HEADER_VERIFIED` must remain false. No existing origin setting, Auth quota, IP forwarding, public broker source or access function needs modification for this diagnostic.

## Browser-only Dashboard plan — only after separate approval

These are future manual steps, not permission to execute them now. No local server, executable, CLI or software installation is required.

1. Open dedicated Supabase project **mqkflwsvnzcaylxtvsje**. In **Edge Functions → Secrets**, confirm the three existing public flags remain false. Privately confirm existing DB URL/optional CA and HMAC setting are present without revealing/copying values. Leave all existing settings unchanged. Confirm the owner's verified Auth rate limits and IP forwarding remain as listed above.
2. In **Authentication → Users**, privately select the existing verified Master Auth identity and copy its UID. Do not create/reset/change an account or password. The owner explicitly approves this UID for the temporary grant. The runtime also checks current active Master authority through the existing access function, so no SQL or private mapping export is needed.
3. **After approval for temporary deployment only**, add the three new diagnostic settings with enablement false and the UID entered privately. Generate a public UTC timestamp ten minutes ahead with browser Developer Tools Console using only `new Date(Date.now()+600000).toISOString()`; this contains no credentials. Copy that timestamp into the new expiry setting. Do not paste passwords, tokens, DB URLs or UID into Console/Snippet source. Expiry will be refreshed immediately before the separately approved live window if needed.
4. In **Edge Functions → Deploy a new function → Via Editor**, name it **check-owner-username**. Open the reviewed [single-file candidate](../supabase/dashboard/check-owner-username.ts) on this exact GitHub commit, click Raw, copy its complete public source into the editor. Review the new function's platform **Verify JWT** setting as off, matching the reviewed candidate's explicit online Auth checks. Deploy **only this new function** after separate deployment approval. Never replace `get-my-access`, deploy all functions, recreate the old diagnostic or deploy/activate the broker. Disabled deployment performs no username test.
5. Only after **separate approval for the private live test window**, update the new diagnostic expiry to ten minutes ahead and set **only** `TAXIQAID_USERNAME_DIAGNOSTIC_ENABLED=true`. All three public flags remain false. A future expiry more than fifteen minutes away is rejected. Default-deny applies when the gate/UID/expiry is absent or malformed. Do not introduce a shared test password/API key or enable native IP forwarding.
6. Open the reviewed [self-contained browser Snippet](../scripts/_owner_username/dashboard-snippet.js) in GitHub → **Raw**, copy public code only. It contains the checksum-pinned official SDK and license; it has no secret values or third-party runtime download.
7. Open a new private Chrome/Edge window at `https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/check-owner-username`. An initial GET error is expected. Check the exact host/path. Open **Developer Tools → Sources → Snippets → New snippet**, paste public code and run once (Ctrl+Enter). Stop if corporate policy blocks Snippets; do not disable protections, install software, use a third-party playground or run on the production ERP/Dashboard account page.
8. In the temporary form privately enter the existing Master's **technical Auth email** and existing password; both inputs are masked and clear immediately. The fixed username under test is **dohanyan**. Click **Run Once and Sign Out**. Direct Auth obtains the bootstrap JWT; the diagnostic verifies it before any lookup and independently authenticates the fixed username. The technical email is only for bootstrap and is not accepted in the diagnostic POST or exposed as a directory. No MFA/additional challenge is introduced.
9. Keep the tab open until completion (the diagnostic request has a 95-second browser deadline). The server signs out its test session and closes SQL; the browser signs out bootstrap. Click **Copy PASS/FAIL Summary** only. Do not export/view/copy private request bodies, HAR files, account snapshots, emails, UIDs or session tokens. Never enter private credentials in the Dashboard saved function tester, URL, Console or Snippet source. A Dashboard account session or API key alone does not authorize the diagnostic.
10. Immediately return **only the diagnostic enable flag** to false, then follow teardown below. Do not enable the public broker or frontend based on a private PASS. A FAIL is a stop condition; it does not authorize changing roles, quotas, mappings, MFA, profile defaults or function verification settings.

## Exact expected result and failure reporting

All `OWNER_CHECKS` fields below must be **PASS**, along with `management_count:101` and `driver_denied_count:6`:

- `configuration`, `administrator_jwt`, `administrator_authorization`
- `attempt_limits`, `private_mapping`, `password_authentication`, `mapping_revision`
- `sdk_session`, `verified_uid`, `active_master`, `access_compatibility`
- `management_permissions`, `driver_denials`, `password_only`
- `server_signout`, `database_closed`, `grant_valid`, `overall`

The browser additionally requires `bootstrap_authentication`, `diagnostic_response` and `browser_signout` PASS and recomputes overall. These names and the two counts are the complete report; no diagnostic text, email, UID, token or HTTP body is included. HTTP statuses are transport metadata but are not copied into the report. The endpoint returns 200 only for full PASS; a handler/gateway/network failure remains overall FAIL.

FAIL includes checks that did not run. Counts begin at zero and are populated only after the username-derived access response passes contract checks. `administrator_authorization` FAIL can mean active-Master/profile/grant checks could not be confirmed; do not loosen the adapter to get past it. `attempt_limits` FAIL can mean a shared bucket denial or database failure. `private_mapping` FAIL never identifies another account. `mapping_revision` FAIL can indicate changed/suspended mapping or denied current account. Permission counts below 101/6, failed AAL1, session/identity/access errors or expired grant block success. SQL/auth error strings are intentionally unavailable. Stop and report the summary, then privately review only status-level provider evidence with the owner; do not add raw-error logging.

## Cleanup and rollback

1. In **Edge Functions → Secrets**, set `TAXIQAID_USERNAME_DIAGNOSTIC_ENABLED=false` immediately; new requests fail closed. Expiry independently ends authorization within fifteen minutes. In-flight work still performs finally cleanup; disabling a setting is not proof of immediate cancellation of a running request.
2. Wait for both `server_signout` and `browser_signout`. If either is FAIL, or the browser timed out/closed early, cleanup is **unverified**. Close the private window and privately review/revoke the diagnostic-created sessions through existing Auth session controls/support. Do not reset the Master's password, revoke unrelated sessions or edit its identity for convenience. Lack of a completion response cannot prove the server's finally ran; test failure is not silently treated as revocation.
3. In **Edge Functions → check-owner-username → function menu → Delete**, delete only this temporary function and confirm its name. Confirm it disappears and its URL is unavailable. Do not delete the two existing functions or redeploy archived candidates.
4. In **Edge Functions → Secrets**, remove only `TAXIQAID_USERNAME_DIAGNOSTIC_ENABLED`, `TAXIQAID_USERNAME_DIAGNOSTIC_ADMIN_UID`, `TAXIQAID_USERNAME_DIAGNOSTIC_EXPIRES_AT`. Keep all existing credentials, public flags, rate limits, IP forwarding and TLS settings unchanged. Close the private window, delete the local public Snippet if desired and clear the clipboard. No test page is published.
5. Keep the consumed attempt counters for the existing expiry/approved bounded cleanup process; never reset/delete buckets to bypass limiting. This preparation adds no table, grant, scheduler or SQL migration. If anything fails before deployment approval, rollback is simply no deployment; the feature branch retains the review artifacts.

## Public activation remains separate

A private PASS does not resolve trusted client-IP provenance, native/direct Auth capacity and abuse coverage, recurring counter cleanup/monitoring, public deployed-source parity, enumeration/load/outage behavior, browser token transport and production session lifecycle. Those controls, the genuine public/browser flow and explicit owner cutover approval remain required before main/Pages activation. Existing app/permission/department behavior and the old Supabase project are preserved. Driver login stays disabled until secure Driver Record/UID/Iqama provisioning. No merge or branch deletion occurs here.

## Exact changed files

- `docs/OWNER_USERNAME_DIAGNOSTIC.md`
- `docs/SUPABASE_AUTH_MIGRATION.md`
- `docs/USERNAME_AUTH_FINAL_SECURITY_REVIEW.md`
- `scripts/_owner_username/.gitattributes`
- `scripts/_owner_username/browser.js`
- `scripts/_owner_username/dashboard-snippet.js`
- `scripts/build-owner-username-diagnostic.cjs`
- `supabase/config.toml`
- `supabase/dashboard/check-owner-username.ts`
- `supabase/deno.json`
- `supabase/functions/_diagnostics/master-access.ts`
- `supabase/functions/_diagnostics/master-access_test.ts`
- `supabase/functions/_diagnostics/owner-runtime.ts`
- `supabase/functions/_diagnostics/owner-runtime_test.ts`
- `supabase/functions/_diagnostics/owner-username-core.mjs`
- `supabase/functions/check-owner-username/index.ts`
- `tests/owner-username-diagnostic.browser.cjs`
- `tests/owner-username-diagnostic.test.cjs`

## Preparation validation and live status

- **122 Node tests passed**, including ten new owner-boundary tests. The affected ten were rerun after final grant-stage checks.
- **26 Deno tests passed**, including six new contract/real-SDK-runtime tests with mocked transport; the affected six were rerun after final changes. Deno type checking passed for original modules and the generated candidate. A startup test boots the single-file candidate without reading secrets or starting a real server.
- All **eleven browser suites passed**: workflow, UI, people, roster, support, portal, auth migration, existing username helper, existing local Master helper, archived pooler helper and new owner helper. Navigation covers 18 administrative pages. The new owner helper passed eleven scenarios, including malformed/private responses, wrong counts, contradictory HTTP failure, failed server/browser cleanup and unauthorized/network/gateway/Auth failures. Browser bootstrap/session responses are mocked; these tests cannot establish a genuine user identity.
- **95 JavaScript files** passed syntax checks; Python syntax passed. Existing catalog integrity (107 identifiers/six Driver actions), all three generated-artifact checks, SDK checksum, local documentation links and whitespace checks passed.
- The disposable PostgreSQL security/privilege/mapping/concurrency suite passed; 30 concurrent same-identifier attempts permitted exactly ten. This uses synthetic local tables/roles, not live Supabase. Roster verification passed 815 synthetic PDFs and 4,974 map annotations; private artifacts remain outside the repository.
- Existing public broker/access/shared SQL adapter/parser sources, SQL proposals, frontend application, catalog and older test helpers were compared with starting commit `d90e5e8` and remain unchanged. New config entries/type-check targets concern only this candidate; existing function settings are preserved.

No live Supabase request, database/secret change, function deployment, login activation, main merge or branch deletion was performed. The actual private username test remains pending separate deployment/window approval and owner execution. A future private PASS establishes the limited functionality described above, not the real public/browser flow or production readiness.
