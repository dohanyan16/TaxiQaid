# Step 144 — bounded P1 hosted security test plan

Baseline: `b9b7e3c`, branch `feat/dedicated-supabase-auth`. **Documentation only. No case, setting change, deployment, harness implementation, SQL or activation is authorized by this plan.** Public login and the Worker remain disabled. Preserve existing SQL, healthy Cron, account records, permissions, secrets and 20/10/10 controls.

Latest owner evidence: R1 BOOT/QUERY/PATH/METHOD/ALLOW-CORS/NULL-CORS passed; DENY-CORS remains BLOCKED without a separate owner-controlled unapproved HTTPS origin. No credentials or production configuration changes were used. See the [R2 readiness assessment](P1_R2_READINESS_ASSESSMENT.md) for exact results, current blockers and next action. It supplements the R2 budgets below with setup/upstream accounting; no R2 test or enablement is approved or executed by these documents.

Completed R2 inventory: Worker=false, only the gateway in the inspected account, no production bindings, previews disabled and no custom domains/routes visible. Cloudflare shows R1 ingress metadata; Supabase Logs had no results in the inspected R1 window. Step 154 closes the historical review: both platforms show POST 503 at 2026-11-15 17:37:35 CET, with no visible outbound span/shared verified ID; link OWNER_ATTESTED, limitation TIMING_ONLY. This is not definitive signed-communication evidence. Supabase version remains UNVERIFIED. CONTROL stays DEFERRED; SAME/CROSS/BINDING/PREVIEW are BLOCKED. The next action is review of the [Master pilot phase proposal](MASTER_PILOT_VALIDATION_PROPOSAL.md), not another historical search, POST or caller creation.

## Approved decision and evidence boundary

**Option A is owner-approved for a limited internal office pilot:** the signed gateway protects the custom username broker; independently reachable native Supabase Auth password/refresh/recovery endpoints retain their own controls and can bypass Worker limits. This residual risk is accepted for that limited scope, not eliminated. It is not activation, testing, account creation or settings-change approval.

Only existing authorized office management accounts are eligible for the eventual pilot, with strong unique passwords and individual least-privilege permissions. No shared office credential, new account provisioning, Driver account or Iqama login is included. Keep all existing grants/denials and Master protections. Revisit the decision before broadening the cohort, adding Drivers or changing architecture; Option A is not a permanent workforce-wide waiver.

Keep the last owner-verified native settings unchanged: sign-up/sign-in operations 30/5 minutes/IP; password/refresh token endpoint 150/5 minutes/IP; OTP verification 30/5 minutes/IP; anonymous sign-in 30/hour/IP; IP forwarding disabled. These are different endpoint budgets, not combined guaranteed capacity. Keep the broker's atomic database-backed global/IP/identifier admission at 20/minute, 10/minute and 10/15 minutes. Do not forward a guessed client IP or add a privileged API key to work around native limits.

The Supabase Dashboard showed **27 deployments** but no exact identifier. Record deployment version **UNVERIFIED**: 27 is a count, not version 27, a deployment ID, hash or proof of deployed-byte parity. Do not redeploy or repeat the same Dashboard search to manufacture an identifier. Existing owner functional source review and Cloudflare reference `9452cefc` remain accepted with their stated limits. The unknown Supabase reference remains a release-traceability gap; any later metadata retrieval or alternative attestation needs a separately reviewed read-only procedure. This does not prevent preparing P1 or its read-only inventory, but does not silently close P0 or waive release traceability.

## Current status and next owner action

Six R1 cases now have owner-reported hosted PASS with the limits above; DENY-CORS remains BLOCKED. R2/R3 remain **PLANNED or BLOCKED**, with no new hosted PASS. Retain the existing unsigned-direct 403, signed-disabled 503/matching Supabase POST, SQL/function verification, repair/probe and healthy two-run Cron evidence. Do not rerun those baselines or successful R1 cases without a stated material reason.

**Next action: approve or revise the Step 154 Master pilot phase proposal. R2-EVIDENCE-REVIEW is CLOSED/TIMING_ONLY.** Do not repeat the review, completed inventory or passed R1 tests. The phased proposal separates mandatory hosted controls from unavailable contexts, owner approvals and rollback. No new control POST, enablement or caller is authorized. The original R0 checklist below is retained as a reference for genuinely missing facts or future topology drift, not another broad inventory task:

1. In Cloudflare Dashboard open **Workers & Pages → taxiqaid-auth-gateway → Settings** and view the existing public URL, Domains & Routes, configured non-secret origin variables, previews and bindings (menu labels may vary). Record public target/source labels and PRESENT / ABSENT / UNVERIFIED; do not add a route, caller or binding, press Save/Deploy or unmask secrets. If Pseudo IPv4 or another transform is relevant, record its current mode privately and flag unreviewed provenance semantics; do not change it.
2. In the dedicated Supabase project open **Edge Functions** to view the existing function-name inventory, and the existing project custom-domain view if available. Retain version UNVERIFIED and deployment count 27 as separately labelled owner evidence. Do not Invoke/Test, download private logs, change JWT mode/secrets or rerun SQL. Keep get-my-access's authenticated access protection intact.
3. Identify actual owner-controlled approved and unapproved HTTPS browser source origins for CORS tests, plus available same-account/cross-Worker/binding test callers. Same Cloudflare account does not by itself establish same-zone context. If no caller/source exists, record BLOCKED; do not create one now or claim runtime rejection from inventory alone.
4. Return the sanitized inventory and exact proposed case subset/request caps. Source pages must be owner-controlled; do not use third-party playgrounds or management Dashboard pages as request generators. Keep both gates disabled and Cron unchanged. The next approval is for named cases/writes, not blanket P1 execution.

Public fixed target W is `https://taxiqaid-auth-gateway.dohanyan.workers.dev`; path is `/login-with-identifier`. Fixed broker target S is `https://mqkflwsvnzcaylxtvsje.supabase.co/functions/v1/login-with-identifier`. Confirm W against the already reviewed owner deployment during R0; any discrepancy stops planning. The GitHub Pages browser origin is `https://dohanyan16.github.io` without `/TaxiQaid/`; all same-origin content shares that origin boundary. Exact allowlist membership must come from approved configuration, not this example.

Return R0 as this small inventory, with no account identifiers, secret values or raw Dashboard exports:

| Inventory item | Sanitized response |
| --- | --- |
| W / S / canonical path | MATCH / MISMATCH / UNVERIFIED against the public URLs above |
| Worker and public login | DISABLED_OWNER_ATTESTED / UNVERIFIED; no test POST |
| Exact approved public browser origins | Public origins only, or UNVERIFIED; do not include private/internal origins |
| Additional route, domain, preview or broker alias | ABSENT / PRESENT_REQUIRES_REVIEW / UNVERIFIED, one public route label per discovered item |
| Existing approved/unapproved browser source pages | AVAILABLE / BLOCKED and public origin label; no page creation |
| Real same-zone/cross-zone/binding callers | AVAILABLE / BLOCKED / UNVERIFIED, with context label only |
| Relevant transforms / log redaction and access review | REVIEWED / UNVERIFIED; no settings/log dump |
| Supabase deployment metadata | VERSION_UNVERIFIED; OWNER_OBSERVED_DEPLOYMENT_COUNT=27 |
| Proposed next cases | Named IDs, prerequisites, per-case caps and approval still required |

## Guard-order constraints — avoid false conclusions

| State | Available evidence after a case's explicit approval | Not established |
| --- | --- | --- |
| Worker=false, public login=false | Worker URL/query/path, GET and origin/preflight behavior; read-only inventory | A canonical POST returns 503 before Worker provenance/signing; no IP provenance, signed transport, SQL/nonce/rate or Auth evidence |
| Worker temporarily=true, public login=false | Genuine direct/subrequest ingress and signed-proof rejection/acceptance through disabled admission | Backend configuration guard returns before SQL/Auth; no counter consumption, replay-nonce use, rate-limit capacity or real login PASS |
| Future P2/P3 enabled window | Separately approved actual rate/replay/credential/session cases | Option A or a P1 result alone is not authorization to open this window |

Current Worker behavior is specific: unexpected URL/path/query returns 403; GET at the canonical path returns 405 before origin evaluation; unapproved origin returns 403; approved OPTIONS returns 204 before enabled/IP checks; an approved unsupported method such as PUT returns 503. Do not invent 405/403 expectations for all methods. Preflight acceptance is not POST authorization or IP verification.

The broker checks proof before readiness. Missing/invalid proof must reject even while disabled. A valid proof with public login disabled returns 503 before opening SQL or running password Auth. Platform 404/405/CORS errors are not proof that the handler's intended branch executed. Attribute the tested layer or mark INCONCLUSIVE.

## Case manifest and request caps

Caps include browser-generated preflights where listed. Never auto-retry, loop, fuzz paths or follow redirects. Each row requires its own approval, source/target pin, expected state and stop time. Case approval includes only its listed requests; separate approval is required for each live write. Inventory-only ABSENT is not a hosted rejection PASS. If an alternate route is discovered, list each exact URL and obtain a new case/cap rather than expanding a wildcard test.

### R1 — routes and browser origins; both gates stay false

Use empty JSON `{}` only: no identifier, password, API key, Authorization, cookie or signed envelope. It has no valid credential fields even if a gate unexpectedly drifts. Unexpected 200/401 or evidence of SQL/Auth work stops the case; do not continue against changed state.

| ID | One approved variant | Max target requests | Source-derived expectation |
| --- | --- | ---: | --- |
| P1-R1-BOOT | Navigate once to W/login-with-identifier; keep this private tab for same-origin cases | 2 total: navigation plus at most one browser favicon request | Canonical GET 405; favicon/noncanonical route, if requested, 403. Neither proves provenance |
| P1-R1-QUERY | Same-origin POST to W/login-with-identifier?p1=route | 1 | Worker 403 before upstream work |
| P1-R1-PATH | Same-origin POST to W/p1-unapproved-route | 1 | Worker 403 before upstream work |
| P1-R1-METHOD | Same-origin PUT to W/login-with-identifier | 1 | Worker 503, with no upstream request; not a signed-transport PASS |
| P1-R1-ALLOW-CORS | JSON POST from an actual configured approved HTTPS origin distinct from W | 2 including automatic OPTIONS | OPTIONS 204 then disabled-Worker POST 503, if browser policy permits; zero Supabase broker forwarding |
| P1-R1-DENY-CORS | JSON POST from an inventoried owner-controlled unapproved HTTPS origin | 2 including automatic OPTIONS | Usually OPTIONS 403 and browser blocks POST; inspect status only. No claim that an actual POST executed |
| P1-R1-NULL-CORS | JSON POST from an opaque data-page origin, only if corporate browser policy permits | 2 including automatic OPTIONS | Origin null denied; if browser blocks before service contact, BLOCKED/INCONCLUSIVE, not a service PASS |

R1 ceiling is **11 Worker target requests**, not approval to run them. Source-page static assets and ordinary owner Dashboard metadata reads are outside the test-call count; record any unexpected Worker/broker/Auth request and stop rather than exceeding the cap. Use at most one source-page navigation for each distinct approved/unapproved source; no credentials or existing private session is needed. Do not disable browser protections, install software or edit production CSP to force a test. If a page or policy prevents a request, record the limitation. No other alias is presumed from these two canonical URLs.

P1-R1-METHOD and P1-R2-CONTROL require R0 confirmation that W itself is an approved browser origin. If it is not, mark those same-origin variants BLOCKED rather than changing the allowlist or expecting 503 after an earlier origin denial. QUERY/PATH rejection and canonical GET do not depend on W being allowlisted. Cross-origin PUT cannot substitute for METHOD: current CORS permits POST/OPTIONS, so the browser would block PUT before the intended method branch.

### R2 — genuine provenance; Worker-only temporary enablement needs separate approval

Prerequisites: R0 pins/topology/source review, owner-confirmed public-login-disabled state, a bounded approved case subset and approved writes to temporarily set **only the Worker** enabled=true and restore false. Save/publish of a variable can create a new Worker deployment reference: that setting/version change also needs explicit approval. No such change occurs in Step 144. Do not change Supabase readiness/security settings, secrets or Cron.

Current inventory provides no runnable negative case: CONTROL is DEFERRED, SAME/CROSS lack approved callers, BINDING is absent and preview URLs are disabled. The five-request candidate manifest below is not the next proposed action. Do not manufacture disabled/unconfigured paths merely for a PASS; any proposed pilot topology exception requires explicit owner scope acceptance and does not waive external cross-Worker/IP validation. See the readiness assessment for the zero-request existing-evidence proposal.

| ID | One approved variant | Max target requests | Expected evidence |
| --- | --- | ---: | --- |
| P1-R2-CONTROL | One direct browser same-origin empty-JSON POST | 1 | Worker forwards and broker returns 503; matching private upstream status/time supports the active test path, no SQL/Auth |
| P1-R2-SAME | Real inventoried same-account/zone Worker subrequest to canonical HTTPS W with approved Origin and `{}` | 1 | 403, no forwarded broker request; actual caller context documented |
| P1-R2-CROSS | Real cross-Worker/account/zone subrequest to canonical HTTPS W with approved Origin and `{}` | 1 | 403, no forwarded broker request; do not substitute locally mocked cf metadata |
| P1-R2-BINDING | Real service-binding invocation using canonical HTTPS W URL, approved Origin, POST and `{}` | 1 | Reject missing/ambiguous provenance, no broker forwarding; an earlier route/origin rejection does not exercise the provenance guard |
| P1-R2-PREVIEW | One inventoried preview/noncanonical Worker host | 1 | 403 from origin/route guard; classify as route closure, not proof of the IP guard |

R2 ceiling is **5 target requests** plus separately approved control-plane calls. The control is justified only to establish the actual path after a separately approved Worker state/version transition or new controlled caller; it does not restart the already accepted 503 baseline now. Logs/status absence alone, especially with sampling, cannot prove a branch executed. Use available private correlation plus reviewed source and controlled callers; if attribution is unavailable, INCONCLUSIVE.

R2 subrequest/binding callers do not currently exist as approved runnable test artifacts in this repository. Mark those rows BLOCKED until a separately reviewed harness/caller proposal is approved and hosted. Do not deploy a second Worker, bind a service, add a debug route or claim preview simulators establish real Cloudflare header provenance now. Missing/no-current-bindings inventory does not establish rejection under an actual binding invocation.

Client-written CF-Connecting-IP, x-real-ip or X-Forwarded-For tests cannot establish trusted source/IP-bucket invariance from 403/503 alone. The old eleven-request provenance helper is not a P1 test and must not be run here. Actual IP fidelity/20/10/10 attribution remains a later P2 gate, using protected server-side evidence without disclosing IPs or bucket hashes. Do not spoof an IP and call it genuine provenance.

### R3 — signed-proof validation; public login stays false

These are **BLOCKED pending a separately approved protected server-side synthetic harness**. The browser never receives the HMAC key, MAC, nonce or envelope. Send only to fixed broker S, never a caller-supplied target. Harness controls construct reviewed fixture IP/Origin values solely for proof-verifier testing; those values are not real client-IP/provenance evidence and must never be used for a rate-limit PASS.

| ID | Variant (one request each) | Max broker requests | Required result |
| --- | --- | ---: | --- |
| P1-R3-CONTROL | Valid, fresh synthetic proof, fixed `{}` body and allowed origin | 1 | 503 from disabled broker; verifies this harness's signing path before interpreting its negative cases |
| P1-R3-MAC | Corrupt the MAC | 1 | 403 before SQL/Auth |
| P1-R3-BODY | Change body after signing | 1 | 403 before SQL/Auth |
| P1-R3-ORIGIN | Change Origin after signing | 1 | 403 before SQL/Auth; browser cannot generate this control by setting its forbidden Origin header |
| P1-R3-IP | Change proof IP after signing | 1 | 403 before SQL/Auth |
| P1-R3-NONCE | Change nonce after signing | 1 | 403 before SQL/Auth |
| P1-R3-CONTEXT | Sign under a wrong fixed target-context string but still send only to S | 1 | 403; no alternate destination fetch |
| P1-R3-STALE | Valid MAC with issued time set to server now minus 65 seconds | 1 | 403; do not alter real clocks, SQL or TTL settings |
| P1-R3-FUTURE | Valid MAC with issued time server now plus 30 seconds; delivery within five seconds | 1 | 403; if timing cannot be established, INCONCLUSIVE |
| P1-R3-QUERY | Add the one approved ?p1=proof query to S | 1 | 403 from reviewed path/query protection, if the platform routes to this handler |
| P1-R3-METHOD | GET to S with a proof signed for POST, no request body | 1 | Handler 403; platform rejection alone does not prove the handler check |

R3 ceiling is **11 broker target requests**. The prior unsigned/missing-proof 403 is reused as existing evidence, with zero new baseline requests. The new harness control has a distinct purpose; all negatives could otherwise merely reflect a broken harness key/context. A repeated valid envelope while admission is disabled may return 503 again; this does not demonstrate nonce consumption or replay protection. The reviewed disabled guard precedes SQL. Same-envelope one-use/concurrent replay tests remain P2, not authorized here.

The original listed case-target ceiling is **27 requests** across R1–R3, if every individual case and prerequisite is separately approved; it is not an actual R1 count, a combined execution authorization or a complete internal-hop budget. The [R2 readiness assessment](P1_R2_READINESS_ASSESSMENT.md) separately budgets up to two necessary browser-setup requests and expected/abort upstream traffic before any R2 approval. R2/R3 control-plane caller traffic must be specified separately before implementation/execution. For an R3 per-case authenticated browser invoker, require at most 11 control POSTs, 11 preflights, 11 official online administrator checks and 11 existing own-access authorization checks, without retries: at most 44 additional control/authorization requests for those 11 targets. Any bootstrap administrator session flow, R2 caller control traffic or different implementation needs its own exact budget/approval; no hidden traffic or claimed ready-to-run harness is assumed.

Those 44 calls are a proposed design ceiling, not a measured complete call graph. Before harness execution is approved, pin every internal hop too, including any Auth verification performed inside the already deployed access function and any SQL authorization calls; do not assume the repository access candidate is its deployed implementation. If the verified graph needs additional calls, revise the explicit budget for owner approval. No R2/R3 execution is currently authorized by these provisional control budgets.

## Browser-only operator instructions — future approval required

The following is a **documented one-request manual instruction**, not a deployed tool or an implemented privileged harness. Do not execute it during Step 144. No installation, credential entry or server-side code paste is required for R1. R2/R3 cannot be completed with this console command alone.

1. Approve the exact case, source/target, request cap, expected gate states, stop time and rollback operator. Use a new private Chrome/Edge window. Approve P1-R1-BOOT before navigating to the owner Worker URL; its navigation/favicon requests count. Keep its 405 page open. Do not enter any password or use the Master/eleven-request helpers.
2. If corporate policy permits DevTools Console, inspect the literal request below before running it **once**, for approved P1-R1-QUERY only. It pins the source and target, sends `{}`, omits credentials, refuses redirects, discards the response body and outputs status only. A network/timeout failure is INCONCLUSIVE; do not retry automatically or print the exception/response.

```javascript
if (location.origin !== 'https://taxiqaid-auth-gateway.dohanyan.workers.dev') {
  throw new Error('WRONG_TEST_ORIGIN');
}
void fetch('https://taxiqaid-auth-gateway.dohanyan.workers.dev/login-with-identifier?p1=route', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}',
  credentials: 'omit', cache: 'no-store', redirect: 'error',
  signal: AbortSignal.timeout(10000)
}).then(async response => {
  const http = response.status;
  await response.body?.cancel();
  console.info({case: 'P1-R1-QUERY', http});
}).catch(() => console.info({case: 'P1-R1-QUERY', result: 'INCONCLUSIVE_NETWORK_OR_CORS'}));
```

3. Other R1 rows require their own approval and only the table's exact URL/method and case label substitutions. Keep the safety options and `{}`. For PATH use W/p1-unapproved-route; METHOD uses canonical W with PUT. BOOT uses navigation, not a GET with a body. No loops or arbitrary URL/header variations are approved.
4. For ALLOW-CORS and DENY-CORS use their inventoried source page, change only the origin guard to that approved source origin and POST to canonical W with the same body/options. The browser supplies Origin and any preflight. Do not add/override Origin, Host, Cookie, Authorization, API keys or proof headers. A browser CORS failure hides the status from JavaScript: inspect only method/status/target in Network for the approved case, not bodies or header dumps. Never export HAR or copy raw requests/logs. Observe actual preflight/POST counts; a blocked POST was not executed. For NULL-CORS use a local opaque data-page only if corporate policy permits, with origin guard equal to the string `'null'`; otherwise BLOCKED. Do not use privileged management pages as caller origins.
5. R2 uses the approved real caller artifacts only after separate implementation/deployment/configuration approvals. Select one enum case in its approved browser control UI; never paste a signing key or signed envelope into DevTools. R3 likewise uses the future authenticated harness with server-held proof and the fixed case manifest. A Cloudflare Dashboard preview/request simulator is not evidence of the real deployed ingress or browser Origin behavior. These harness instructions are requirements, not a claim that such a UI currently exists.
6. Record status-only evidence per case, stop on unexpected results and perform the approved cleanup. Reaching the cap or stop time ends the case even if results are inconclusive. Do not run all rows automatically or increase limits to force a desired result.

## Missing harness — identify only, no implementation/deployment

Prepare **one subsequent, narrowly scoped P1 synthetic harness/caller proposal**, not an unrestricted alternate broker. Required design constraints:

- Fixed reviewed case IDs/destinations and `{}` payload; no username/password/UID, arbitrary URL, caller-supplied signing fields or reusable signing capability exposed to the browser. No public sign/debug endpoint or raw proof/IP/bucket reflection.
- Strong administrator authentication: official online project Auth JWT verification, explicit owner UID, active authorized management access and a server-side authorization grant expiring within at most 15 minutes. An anon/publishable key, Dashboard session, editable metadata or client role claim alone is insufficient. Use an existing authorized administrator session only under its own approval; if none is available, mark BLOCKED and obtain separate approval for bootstrap authentication. No new office/Driver identities.
- Refuse operation unless public password admission is confirmed disabled. Never enable login. Synthetic signed-IP controls must not become a path around genuine client-IP enforcement in an enabled system. Unexpected session/200 behavior is a security failure, not a successful diagnostic.
- Reuse existing protected server context/secret access safely where feasible; no new broad service key, BYPASSRLS connection or private-table grants. Any required temporary grant/configuration/secret-location/caller deployment needs its own review and explicit approval. This step supplies none and does not change SQL or get-my-access.
- Server-side proof construction/mutation only; case/request/time limits and status-only results. Do not normalize or weaken production HMAC, nonce, timestamp, origin or route checks. Discard proof and authorization state at completion/expiry. No credentials/tokens/envelopes in logs or storage. Use real Cloudflare subrequest/binding behavior for R2; fabricated cf fields never qualify.
- Reviewed cleanup, denial of expired/unknown grants and bounded control-plane budget before execution. Remove only newly approved temporary callers/routes/grants after the window. Keep SQL, Cron, accounts and established gateway settings intact. Actual P2 bucket attribution/replay/admission and P3 session tooling remain separate approval scopes; do not silently enable them through this P1 harness.

## Cleanup, rollback and monitoring

For R0/R1, close test tabs and discard public console snippets; no project rollback or session revocation is expected because no login occurs and no settings changed. Keep both gates disabled and normal Cron running. Do not rerun SQL 06 or truncate/reset counters.

Before any future R2 enablement, obtain explicit approval for both the one Worker enable write and the restoring false write, including any Dashboard publish/version transition, deadline and operator. Public login remains false throughout; no Supabase setting needs enabling for P1. Maximum supervised window is 15 minutes, with manual restoration at its end; there is no invented automatic expiry on current flags. Never start if restoration cannot be performed. Record resulting deployment references without claiming a new Supabase identifier.

Stop immediately for gate/source drift, unexpected session/200 or password/SQL activity, data disclosure, unexplained upstream behavior, cap/timeout breach or operator loss. Execute only the preapproved deny/restore actions: normally restore Worker=false and stop callers; any emergency Supabase deny-setting change requires its own preapproved contingency. Without that authority, stop requests and escalate to the owner rather than silently changing secrets. Never restore the old header broker, bypass HMAC, alter native limits, reset passwords/accounts/counters or stop healthy Cron. Preserve existing records. If unexpected sessions exist, use an owner-approved narrowly scoped incident cleanup; do not export tokens or perform broad revocation.

At completion verify disabled Worker/public login by approved read-only metadata/owner state record, not repeated positive POSTs. Teardown any separately approved temporary harness and expiring grant; verify no alternative public login route remains. Extra cleanup requests/writes must be budgeted/approved, not hidden in a generic “cleanup” button.

For the eventual office pilot, assign the operator, escalation path and review cadence before activation. Inspect available aggregate broker/native Auth 401/403/429/503 patterns, token/refresh failures, provider resource/SQL-connection errors, session cleanup and Cron health/last success before each approved window and at least daily in a pilot. Direct native abuse may occur without Worker events: monitor both providers, not just gateway status. Keep privacy/redaction/retention/access restrictions and individual-permission review; never request/display passwords or secret hashes. A stale five-minute watermark, bypass, leakage, unexplained legitimate denials or cleanup failure triggers the approved stop/rollback path. Quantitative pilot thresholds must follow hosted capacity evidence; Option A does not invent capacity or waive those gates.

## Evidence, validation and next approval

Use the completion document's sanitized format, plus case ID, approval reference, exact public source/target label, Worker/broker state, cap versus actual target/preflight/control counts, HTTP/status enums, intended layer, private owner evidence reference and cleanup result. No raw IP, bucket hash, proof, nonce, JWT/refresh token, private email/UID/account response or sensitive logs. Mark PLANNED/BLOCKED/INCONCLUSIVE honestly. No hosted case was run by the agent preparing this plan; subsequent owner-reported R1 results are recorded separately above.

Next proposal is [Step 154 — phased Master pilot validation](MASTER_PILOT_VALIDATION_PROPOSAL.md). The historical review is CLOSED/TIMING_ONLY, not pending and not a HMAC/provenance PASS. R2/R3 network-case execution, Worker enable/restore, caller/harness implementation/deployment, pilot topology exceptions and public activation each remain separately unapproved. Version stays UNVERIFIED; 27 deployments is recorded only as a count. P2, real public Master/session tests, final frontend integration and production activation/cutover remain open. No other TaxiQaid development phase starts here.
