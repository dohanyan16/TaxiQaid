# Protected admission checks — executable cases

Repository-only implementation. All new hosted cases are **PENDING APPROVAL / NOT RUN**. No deployment, configuration, hosted SQL/Auth request, activation or resource creation was performed. Both public admission gates must remain exactly `false` during this device's use. No Drivers.

**Accepted owner evidence, 2026-11-15 22:23:59 CET:** one credential-free POST; Cloudflare `UPSTREAM_RESPONSE` 503, Supabase `PROOF_VERIFIED` 200 then `BROKER_DISABLED` 503, matching trace. **PASS: signed communication and disabled-broker rejection only.** Worker restored false; broker stayed false. No provenance, replay, SQL, rate or real-login PASS follows. The earlier 17:37:35 timing-only record is unchanged. Do not repeat either transport test.

## Concrete operations — require separate grouped hosted approval

1. Publish this reviewed feature commit's `supabase/dashboard/login-with-identifier.ts` into the **existing** Supabase `login-with-identifier`, then `gateway/dashboard-worker.mjs` into the **existing** `taxiqaid-auth-gateway`. Preserve JWT mode, existing secrets/settings, false public flags, SQL/roles/permissions/accounts, native Auth quotas, Cron and get-my-access. No new Worker, function, binding, route or signing key. Record visible references and reviewed source privately; a deployment count is not a version identifier.
2. Add temporary secret **`TAXIQAID_VALIDATION_GRANT`**, same JSON in these two services. Only fields: `id` (new random UUID), `ownerUid` (approved existing Master UID, privately obtained), `issuedAt` and `expiresAt` (integer UTC epoch seconds). Lifetime **at most 900 seconds**, ending at least ten seconds before the end of its issuance UTC/DB 15-minute window. The broker checks the DB clock/window before consuming a case. Server rejects expired/future/extra-field grants; the client cannot choose its identity/grant/deadline. This is a temporary server authorization window, not a permanent privileged key. Never share its real value.
3. Execute **one** helper run. Approval includes its private native-password administrator bootstrap, twelve online Auth identity checks, up to two local-session logout requests, and counter/nonce writes through unchanged restricted SQL APIs. No public flag opens. Controls never verify a password or issue a session.
4. Delete the temporary secret from **both** services, confirm both public flags false, close/delete the Snippet/tab and record sanitized evidence. Preapprove these closing actions with opening actions. Grant absence/expiry closes the device even while inert code remains. If code restoration is needed, publish only the previous validated signed baseline, never the obsolete header/unsigned broker. No counter reset, SQL/Cron change or branch deletion.

Do not perform these operations under repository-only authorization. Stop before bootstrap if source parity, existing Worker origin in the broker's allowed origins, healthy existing Cron, approved Master UID or sufficient grant time is unavailable. Issue the grant within the first five minutes of a UTC quarter-hour (minutes 00–04, 15–19, 30–34 or 45–49), start within three minutes of issuance and allow up to five minutes for the four scheduled batches. If this cannot fit before the displayed expiry, stop before bootstrap; do not lengthen the grant. Keep this window free of other login/test traffic.

## Browser-only procedure after approval

Supabase Dashboard → Authentication → Users → existing owner: privately obtain the UID, without editing the account. On the existing Worker's `/login-with-identifier` document, this metadata-only console expression creates a configuration template:

```js
(()=>{const issuedAt=Math.floor(Date.now()/1000);return JSON.stringify({id:crypto.randomUUID(),ownerUid:'REPLACE_PRIVATELY_WITH_EXISTING_MASTER_UID',issuedAt,expiresAt:(Math.floor(issuedAt/900)+1)*900-10});})()
```

Replace the UID placeholder only inside private Dashboard editors. Supabase → Edge Functions → Secrets, and Cloudflare → Workers & Pages → `taxiqaid-auth-gateway` → Settings → Variables and Secrets: save the same JSON as `TAXIQAID_VALIDATION_GRANT`. Do not alter existing values. These writes/publications require the approval above.

Use the same `https://taxiqaid-auth-gateway.dohanyan.workers.dev/login-with-identifier` tab opened for setup (one GET 405 total; do not reload). DevTools → Sources → Snippets → New Snippet: paste `scripts/_auth_validation/dashboard-snippet.js` from the approved commit. Replace **both** `REPLACE_WITH_REVIEWED_WORKER_ORIGIN` occurrences with that exact existing origin. Run once. The owner privately enters the existing technical Auth email and password into the two masked fields for administrator bootstrap only. Fields clear immediately; final public login remains username/password. No key/token is entered or copied.

The pinned official SDK keeps this bootstrap session in memory, with persistence and refresh disabled, then signs out automatically. Each control verifies its JWT online at both services. The broker checks the approved UID, existing mapping revision, active Master management account and exact 101 management / six Driver denials using the existing SQL access evaluator. Password/token/UID/email/mapping/IP/nonce/MAC are never returned or summarized. Do not export HAR, raw headers/bodies or sensitive logs. Keep the tab open until cleanup completes.

The helper schedules four fresh DB-minute batches, within one DB 15-minute identifier window. Waiting is local, without polling. Genuine egress changes may fail source continuity; stop rather than invent a source.

## Runnable cases and maxima, including internal calls

Each control: **browser → Worker 1 + Worker → Auth `/user` 1 + Worker → broker 1 + broker → Auth `/user` 1 = 4 HTTP maximum**. No redirect/retry, get-my-access HTTP, native password grant or session issuance inside a control. Failed prerequisites use fewer calls. A committed one-use case ledger atomically fills a private per-case identifier quota with ten signed API calls (one existing Master lookup and nine absent guard identifiers). This quota survives ordinary cleanup of two-minute nonce rows (after the existing five-minute pruning grace) for the entire single-quarter grant and prevents retry. All calls consume isolated atomic limits before lookup; the public Master identifier budget is untouched.

| Scheduled control | Required observation | HTTP max | Signed SQL API calls, including ledger | Access API calls | Client SQL statements max, including transaction commands |
| --- | --- | ---: | ---: | ---: | ---: |
| `ip-base` | Ten distinct absent identifiers admitted on actual source | 4 | 20 | 1 | 34 |
| `ip-spoof`, same DB minute | Fixed forged CF/X-Real-IP/X-Forwarded-For/proof-IP headers do not move source bucket: next attempt denied; same-global/isolated-source canary admitted | 4 | 12 | 1 | 26 |
| `global-db`, next DB minute | Twenty admitted, twenty-first denied; independent health canary admitted | 4 | 32 | 1 | 46 |
| `replay`, next DB minute | Modified body/IP/trace/stale time rejected by shared verifier; exact signed envelope twice sequentially, then second envelope in two real concurrent DB transactions: one admission per pair; three fresh canaries admitted | 4 | 17 | 3 | 47 |
| `identifier-base`, same minute as replay | Three admissions on one absent identifier | 4 | 13 | 1 | 27 |
| `identifier-finish`, next minute, same DB quarter | Seven further admissions, eleventh denied; fresh identifier on same actual source/global admitted | 4 | 19 | 1 | 33 |

**Full run: 24 control HTTP + 1 native-password bootstrap + at most 2 logout + at most 2 document/favicon setup = 29 HTTP maximum.** Same-origin helper needs no speculative cross-origin preflight. Browser hard caps: bootstrap 1 / controls 6 / logout 2, including any SDK retry. No refresh/OTP/recovery or extra post-restore probe is included.

**SQL: 113 signed-attempt calls (60 ledger/guard calls + 53 probes) + eight access reads = 121 existing API invocations.** 185 application query statements in 14 transactions + 28 BEGIN/COMMIT-or-ROLLBACK commands = **213 client SQL statements maximum**. Function-internal SQL/locks/index work and connection/TLS/pooler protocol are separate DB work, not additional HTTP. `fetch_types:false` prevents implicit driver catalog queries. Each statement: timeout 3s, lock timeout 1s. Case work deadline 20s. Pool one, or two for the replay race; existing connection limits/privileges stay unchanged. These ceilings do not guarantee provider capacity.

Ordinary public global/IP counters consume at most 12 attempts in the IP batch, 21 public-global attempts in the SQL-global batch, ten attempts in replay/identifier-base and nine in identifier-finish. Global health canary and case ledgers use isolated diagnostic globals. Only synthetic counters/nonces are added; no records are reset. Existing maintenance handles expiration. Wait for a fresh DB minute before a later approved Master login; never flood its identifier.

## Evidence scope, stopping and restoration

Rate negatives require a later positive canary in the same repeatable-read snapshot and unchanged DB minute. This prevents health/global/source denial from masquerading as the targeted rate boundary. Identifier base/finish must share DB quarter and differ in minute. Sequential replay establishes rejection in one repeatable-read snapshot. Parallel replay uses two read-committed transactions, observes at most one admission and positive canaries; it does not independently identify every possible concurrent rejection cause. Scope: **deployed shared HMAC verifier + existing signed SQL admission**, not replay through the full public HTTP/password handler. No envelope/signing capability reaches the browser. Public factory bytes remain unchanged and its adapter is regression-tested separately.

`global-db` uses 21 isolated diagnostic source slots to avoid the actual source's ten-attempt limit. These are not genuine different IPs: **SQL global boundary only**, not distributed HTTP provenance, native/platform capacity or shift-change load. Direct browser/spoof evidence applies to this configured Worker route sharing the public source guard. Foreign-Worker/binding ingress remains untested without an authorized emitter; no emitter/resource is created here. R1-DENY-CORS remains blocked without a controlled unapproved origin. Do not mark these contexts PASS; their pilot relevance needs an explicit owner risk decision. Passed P1-R1 cases are not repeated.

Stop on FAIL/INCONCLUSIVE, wrong UID/permissions, expired/used grant, changed window, cap/deadline, unexpected traffic, sensitive output, egress change, unhealthy maintenance or unconfirmed cleanup. No automatic retry/new grant/counter reset/quota change. The helper stops dependent cases and attempts bounded logout. Lost bootstrap response or failed remote/local cleanup is unconfirmed, not PASS; close the tab and report only that status.

Restore by deleting the grant from broker and Worker, confirming saved broker `TAXIQAID_LOGIN_ENABLED=false` and Worker `TAXIQAID_GATEWAY_ENABLED=false`, then closing the session/Snippet/tab. If a public flag was unexpectedly open, close broker then Worker as the preapproved emergency restoration and stop. Keep SQL/Cron/native Auth/accounts untouched. Code rollback uses normal approved publication of the signed baseline; main/Pages/branches stay unchanged.

Evidence: helper's sanitized case/result/scope, admit/deny/probe/canary counts, DB minute/quarter/deadline, SQL counts; actual HTTP counts; private source/release-reference attestations; cleanup and final false/secret-removed attestations. No raw private response/log. Every hosted case stays NOT RUN until executed by the owner.

After accepted evidence/limitations, separately authorize the existing `scripts/_public_gateway/dashboard-snippet.js` **real Master username** flow: one login, 101/6, refresh/access and logout; maximum 12 function/Auth calls plus two document requests. Opening/restoring public gates and genuine authentication need that separate approval. Natural expiry, actual frontend/Pages acceptance and monitored activation remain genuine acceptance work; this SQL-only device does not close them. Option A/native Auth bypass acceptance remains limited to existing office accounts, strong unique passwords and individual permissions, preserving native protections.

Local checks: Node, strict Deno, disposable restricted PostgreSQL 16, official Cloudflare types/local workerd, real-SDK browser with virtual clock/intercepted transport, deterministic broker/Worker/helper packaging. Auth/cf are simulated locally; no hosted PASS is asserted.

Local results: **162 Node tests, 42 Deno tests with strict source checking, 10 browser suites (including nine new operator scenarios), official Cloudflare Fetch types/local workerd, 133 JavaScript syntax checks, deterministic artifacts and identical broker aliases**. PostgreSQL 16 passed the original signed-handler pipeline and the new protected device against actual restricted roles, including case retention after eligible nonce pruning. Auth and Cloudflare provenance are synthetic locally; no new hosted result is asserted. Existing 18-page navigation/business regressions passed.

The disposable PostgreSQL catalog fixture now disables its own autovacuum so exact physical-statistics snapshots do not change during rollback assertions; all ownership/ACL/data comparisons remain intact. The PostgreSQL 16 TLS fixture passed verified CA/hostname/roles/rollback/reset and rejected bad CA/hostname; its image selector reuses the cached image and sanitized phase markers make fixture setup failures diagnosable without exposing errors or secrets. Neither setting changes production.

Reviewed public artifact fingerprints: Worker `51ebfe348c72a854f9a54476aa0ffc140fdfa854d2440ede717f7016a8911c4c`; both identical signed broker aliases `ea647c0f0e4949d289e0f01301740c121da379f976c7cab73a03f5c172bb53bd`. These are repository fingerprints, not deployment claims.

## Exact repository manifest

- `docs/MASTER_PILOT_RUNBOOK.md`
- `docs/PROTECTED_AUTH_VALIDATION.md`
- `docs/PUBLIC_AUTHENTICATION_COMPLETION.md`
- `gateway/dashboard-worker.mjs`
- `gateway/validation.mjs`
- `gateway/worker.mjs`
- `scripts/_auth_validation/browser.js`
- `scripts/_auth_validation/.gitattributes`
- `scripts/_auth_validation/dashboard-snippet.js`
- `scripts/build-auth-validation.cjs`
- `scripts/build-public-gateway.cjs`
- `scripts/lib/signed-broker-artifact.cjs`
- `supabase/dashboard/login-with-identifier-gateway.ts`
- `supabase/dashboard/login-with-identifier.ts`
- `supabase/functions/_diagnostics/validation-runtime.ts`
- `supabase/functions/_diagnostics/validation-runtime_test.ts`
- `supabase/functions/_shared/gateway-proof.mjs`
- `supabase/functions/_shared/validation-policy.mjs`
- `supabase/functions/login-with-identifier/index.ts`
- `tests/auth-validation.browser.cjs`
- `tests/auth-validation.test.cjs`
- `tests/broker-postgres.cjs`
- `tests/cloudflare-worker.compat.cjs`
- `tests/pooler-diagnostic-tls.cjs`
- `tests/signed-broker-packaging.test.cjs`
- `tests/signed-postgres.e2e.ts`
