# Public authentication completion — bounded owner-controlled plan

> Consolidated local implementation: the owner subsequently authorized repository changes/tests/commits as one scope, superseding the earlier per-file/local implementation approval steps below. The signed gateway/broker now include HMAC-bound private trace events; the dedicated frontend pins the Worker while remaining disabled, forbids direct-broker fallback, and handles cleanup/expiry/races. The full local context uses the actual frontend and official SDK with synthetic transport. Use [MASTER_PILOT_RUNBOOK.md](MASTER_PILOT_RUNBOOK.md) for implemented behavior, local commands, remaining hosted evidence and three grouped production approvals. Older plan/source fingerprints and `brokerUrl:null` references below are historical. No deployment, live authentication, activation, hosted SQL/configuration/secret/Cron/account change, main merge, Pages publication or branch deletion is authorized or performed by the consolidated work. The historical evidence review remains CLOSED/TIMING_ONLY.

Scope: finish public authentication, its final frontend integration and safe production cutover on `feat/dedicated-supabase-auth`, repository reconciliation approved from `c0a5e7d` after Step 141. Account management, database redesign, Drivers Management, department modules and unrelated ERP work are deferred to a separate conversation **after this phase closes**. This document authorizes no deployment, live test, SQL, setting/secret change, activation, merge or branch deletion.

Step 154: the historical evidence review is CLOSED with TIMING_ONLY support; the [phased Master pilot proposal](MASTER_PILOT_VALIDATION_PROPOSAL.md) is now the next item for owner approval. It gives work, expected evidence, owner intervention, independent authorizations, rollback and actual blockers for every phase. No implementation or hosted test is approved by this update.

## Accepted live evidence — do not restart completed work

These are **owner-verified hosted results**, not new agent-run tests:

| Evidence | Accepted result and limit |
| --- | --- |
| PostgreSQL security and function verification | PASS; preserve current roles, ACLs, RLS, mappings, counters and records |
| SQL 04 maintenance repair | Applied successfully; do not rerun 00, 01 or 04 |
| SQL 06 rollback-only probe | Four PASS results; do not repeat without a relevant change |
| Existing Cron maintenance | Enabled, healthy, two consecutive successful runs; preserve this one job and its schedule |
| Revised login-with-identifier | Step 141 functional source review accepted; Step 144 Dashboard showed 27 deployments without an exact identifier. Version remains UNVERIFIED; the count is not a version |
| Worker source/version review | Step 141: active reference `9452cefc`, reviewed against `gateway/dashboard-worker.mjs` at `c0a5e7d`, with no functional discrepancies identified; no new deployment performed |
| Unsigned direct Supabase POST | HTTP 403; baseline direct-origin denial accepted |
| Historical Worker/Supabase POST 503 | Step 154: both at 2026-11-15 17:37:35 CET; owner-attested time/target/method/status match only, no visible outbound span or verified shared ID. Not definitive signed-communication/HMAC evidence |
| Current controls | Worker returned to enabled=false; public login disabled; approved browser origins configured |
| Option A security decision | Step 144: owner accepts broker-only enforcement and residual native Auth bypass for a limited internal office pilot; no activation/test/settings approval |
| Hosted R1 owner results | BOOT 405, QUERY 403, PATH 403, disabled PUT 503, GitHub Pages CORS OPTIONS 204/POST 503 with correct allow-origin, null-Origin OPTIONS 403/no allow-origin/POST blocked: six owner-reported PASS; no credentials or production configuration changes |
| R1-DENY-CORS | BLOCKED: no separate owner-controlled unapproved HTTPS origin; null-Origin case does not close it |
| Completed R2 owner inventory | Worker=false; only the gateway in the inspected Cloudflare account; no production bindings, previews disabled, no custom domains/routes visible; Cloudflare R1 timestamps/methods/paths available |
| R2-EVIDENCE-REVIEW | CLOSED: HISTORICAL_RECORD AVAILABLE, OUTBOUND_LINK ABSENT_IN_VISIBLE_TRACE, TARGET_METHOD_STATUS MATCH, SHARED_NONSECRET_ID UNVERIFIED, CROSS_PLATFORM_LINK OWNER_ATTESTED, LIMITATION TIMING_ONLY. Do not repeat this review or relabel it a security PASS |
| Earlier private Master diagnostic | Existing evidence for password/UID/mapping/active Master/access/101 management grants/six Driver denials/cleanup; do not recreate it or substitute it for a public-flow test |

The latest evidence supersedes older documents saying repair is pending, Cron is disabled/missing, the revised handler is undeployed or the disabled handshake is wholly untested. Preserve their historical test reports, not those outdated current-state statements. No live PASS is inferred for the remaining gates below.

## Completion checklist and exact blockers

| Priority / gate | Current status | Acceptance criterion |
| --- | --- | --- |
| P0 — Source/config parity and scope decision | OPEN traceability/configuration; repository aligned and Option A approved | Supabase version UNVERIFIED (27 is only a deployment count); preserve existing functional-review evidence, finish origin/topology/configuration evidence and close release traceability without redeploying for an ID |
| P1 — Disabled-login ingress/proof checks | Six R1 owner-reported PASS; historical review CLOSED/TIMING_ONLY; DENY-CORS and R2 negatives BLOCKED, CONTROL DEFERRED; R3 OPEN | Genuine hosted source/IP and proof checks with sufficient sanitized branch evidence; separately decide unconfigured-context scope, no implicit waiver of reachable attacks |
| P2 — Hosted admission, replay and pilot capacity | OPEN | Genuine trusted-IP attribution, unchanged 20/10/10 limits, one-use signed-proof replay protection, no over-admission and acceptable agreed pilot burst/refresh demand |
| P3 — Genuine public Master and session lifecycle | OPEN | Actual Worker → deployed broker → official SDK → get-my-access flow; UID/active/super_admin/101/six checks; refresh/expiry/logout/failure cleanup and frontend controller verified |
| P4 — Production frontend integration/cutover | OPEN | Reviewed canonical sources, approved staging evidence, configuration/CSP/storage/revocation policy, rollback/monitoring operator, explicit production activation/merge approval and exact-main Pages verification |

Finish P0–P4 in order; perform only the approved cases for each gate. A failed prerequisite stops dependent tests. No repeated exploratory login attempts, new account provisioning or “try enabling everything” step. Existing private tests and maintenance checks remain closed unless changed code/configuration, expiry of relevant evidence or an actual incident provides a specific retest reason.

### Repository findings that must be resolved before release

- The approved repository-only reconciliation makes `supabase/functions/login-with-identifier/index.ts` canonical, preserving the reviewed signed handler factory exactly. `supabase/review/public-login/login-with-identifier.ts` is now a compatibility export, not another implementation or a standalone Dashboard paste candidate. Both `supabase/dashboard/login-with-identifier.ts` and `supabase/dashboard/login-with-identifier-gateway.ts` are identical outputs of `scripts/lib/signed-broker-artifact.cjs`; either builder writes/checks both aliases. No deployment, activation, secret or live setting change accompanies this promotion.
- Worker source and signed broker functional reviews from Step 141 are accepted. Cloudflare reference is `9452cefc`; Supabase deployment version remains UNVERIFIED. Local reconciliation does not establish exact deployed-byte/version parity or replace that missing release record. Regenerated broker headers/source labels differ from `c0a5e7d`, while the reviewed executable implementation remains unchanged. Do not redeploy merely to refresh a source label or obtain a version ID.
- Dedicated frontend configuration remains `enabled:false`, `brokerUrl:null`, memory-only in `shared/auth-dedicated-config.js`. The production site remains on its existing configuration. Final integration needs a reviewed static Worker URL, dedicated project settings, browser-origin/CSP checks and an approved staging context; no query-string/storage override or direct-origin fallback is allowed.
- `scripts/_public_gateway/dashboard-snippet.js` is a one-shot pinned-SDK Master helper that signs out in finally and disables auto-refresh/persistence. It does not test the actual ERP controller's long-lived refresh/expiry/restoration behavior.
- The public API exposes generic 429s. The current eleven-request provenance helper labels only a **status pattern**. Coincident native/global throttling can mimic that pattern. There is no approved hosted server-side bucket-attribution/replay harness in the current artifacts; do not pretend the helper proves IP provenance or signed-proof replay protection.

## Step 144 decision and exact next owner action

**Option A is approved for a limited internal office pilot only.** Existing authorized office management accounts, strong unique individual passwords and individual least-privilege permissions are required. No new/shared account, automatic grant, Driver account or Iqama login is part of the pilot. Preserve native Auth settings, signed gateway, 20/10/10, existing SQL/Cron and all account/permission records. This risk decision is not approval to activate, test, deploy or change a setting.

The owner already checked deployment metadata: the Dashboard showed **27 deployments but no exact Supabase identifier**. Record version UNVERIFIED and count 27 separately. Do not call it version 27, repeat the same search indefinitely, redeploy to generate an ID, request Management API credentials or silently treat functional review as exact version parity. The traceability gap remains a release item. Case preparation/read-only inventory can proceed; any later bounded login-disabled test approval must explicitly retain that evidence limitation, not imply a production waiver.

**Next owner action: approve or revise [Step 154 — Master pilot validation by phases](MASTER_PILOT_VALIDATION_PROPOSAL.md).** R2-EVIDENCE-REVIEW is completed with timing-only evidence; no more historical searches, R1 repeats or standalone 403/503. The proposal first requires a minimal repository-only evidence/tooling design and exact file/local-test manifest before any implementation approval. Later code deployment, caller creation, grant/secret/configuration change, live test, activation and cutover each retain separate approval. Current request/write budget is zero. Keep Worker/public login disabled and healthy Cron unchanged.

The P1 plan retains candidate caps and the R2 assessment records exact completed-review evidence. Step 154 separates mandatory properties from currently unavailable tests, avoids fixtures only to recreate absent bindings/previews, and proposes one consolidated minimum tool/evidence design if indispensable. External cross-Worker/IP attacks remain relevant. No tooling is implemented. Real replay/rate tests require explicitly approved normal counter/nonce writes and native Auth calls even for unknown synthetic identifiers. A genuine Master session can continue approved lifecycle tests after both admission gates are closed again. The frontend's returned-signOut-error gap and a practical real-controller browser context need review before release. Step 154's current manifest is four documentation files; it grants no later code scope.

The prior P0-PARITY inventory remains the source/configuration checklist: exact public approved origins must agree on Worker and broker, the fixed destination/manual redirect rejection must remain, and secret presence never proves equal secret values. GitHub Pages origin is `https://dohanyan16.github.io`, without `/TaxiQaid/`; Origin is not non-browser authorization. Signed readiness requires four flags (`TAXIQAID_LOGIN_ENABLED`, `TAXIQAID_SESSION_TRANSPORT_REVIEWED`, `TAXIQAID_GATEWAY_ENABLED`, `TAXIQAID_GATEWAY_REVIEWED`) explicitly true and `TAXIQAID_TRUSTED_IP_HEADER_VERIFIED=false`; missing/disabled configuration remains fail-closed. These requirements are descriptions, not instructions to enable them. Hidden settings stay UNVERIFIED rather than being unmasked or re-entered. Preserve broker `verify_jwt=false` with mandatory HMAC and get-my-access JWT protection.

## Per-case approvals and disabled testing boundary

Before **each** hosted test case, approve its ID, exact request cap, approved origin/target, fixture/source labels, stop time and cleanup. Before **each** live write, separately approve the named setting/code/staging/activation change and rollback. Approval of this document or one case is not blanket approval for later cases. For enabled test batches, approval must explicitly include their inherent existing counter/nonce writes and Auth/session attempts; configuration/SQL/deployment writes still need their own named approval. Record a test as PLANNED, APPROVED, PASS, FAIL, INCONCLUSIVE or BLOCKED; only actual hosted evidence can produce PASS. Use supervised windows of at most 15 minutes for temporary gate changes, with an operator who explicitly closes them; current flags have no automatic expiry and this plan does not invent one.

| State | Safe scope after that case's approval | What it cannot establish |
| --- | --- | --- |
| Worker=false, broker login=false | Read-only parity/topology/policy review; local/offline preparation | A disabled Worker returns 503 before IP provenance checks/signing, so this state proves no new ingress/IP/SQL behavior |
| Worker temporarily=true, broker login=false | Synthetic hosted Worker route/origin/subrequest filtering and HMAC proof acceptance/rejection; each enabling/restoring write separately approved | Signed disabled requests return before SQL admission/Auth; no live rate, nonce-consumption, private lookup or password-flow PASS |
| Worker=true, broker admission temporarily enabled in an approved isolated window | Approved synthetic rate/replay cases and later owner-entered Master/session cases, after prerequisites | This makes a public handler temporarily reachable; CORS does not make it owner-only. Strong supervision, fixture bounds and risk acceptance are required |
| Full ERP staged/cutover configuration | Actual controller/lifecycle/UI and approved production smoke | A one-shot helper or private diagnostic cannot substitute for this evidence |

Do not rotate secrets, change native limits, forward an unverified IP, clear counters or disable the healthy Cron job to make a test pass.

## P1 — Hosted ingress, provenance and proof closure

Use [P1_HOSTED_SECURITY_TEST_PLAN.md](P1_HOSTED_SECURITY_TEST_PLAN.md) as the candidate case manifest, [P1_R2_READINESS_ASSESSMENT.md](P1_R2_READINESS_ASSESSMENT.md) as completed inventory/history and [the Step 154 proposal](MASTER_PILOT_VALIDATION_PROPOSAL.md) as the current phase plan for approval. Accepted baselines and six successful R1 cases are reused. Historical status matching remains TIMING_ONLY, not HMAC/provenance PASS. DENY-CORS and four R2 negative cases remain BLOCKED; CONTROL is DEFERRED. No case becomes PASS from inventory or review completion. R2/R3 execution, live enable/restore, caller/harness implementation/deployment or a pilot scope exception needs separate explicit approval.

The original case-target ceilings are R1 11, R2 5 and R3 11, not actual R1 counts or combined execution approval. The R2 assessment adds at most two separately approved setup requests and upstream/abort accounting; caller control-plane traffic still requires its own exact reviewed budget before execution. No new agent-run hosted PASS is claimed. No harness, public debug/signing route, privileged key, SQL, code deployment or configuration change is implemented by the documentation update.

## P2 — Hosted IP fidelity, replay and unchanged 20/10/10 policy

Run only after source/provenance prerequisites, test-harness review and the recorded Option A scope/monitoring constraints. For IP/global/identifier cases, obtain server-side sanitized attribution proving which existing bucket denied admission and that spoofed client headers did not change the effective trusted source. Do not broaden browser/runtime table privileges or publish raw IPs/bucket hashes. If that evidence mechanism is not approved, mark these cases BLOCKED; HTTP 429 alone is insufficient.

| Case | One approved batch maximum | Required evidence |
| --- | --- | --- |
| P2-IP | 11 synthetic attempts, distinct absent identifiers, one genuine stable source in one fixed minute | Ten admissions then verified IP denial; differing client-written CF-Connecting-IP/x-real-ip/X-Forwarded-For/gateway headers cannot choose another effective bucket |
| P2-GLOBAL | 21 attempts in one fixed minute, distinct absent identifiers, at least three verified source groups so none exceeds ten | Twenty admissions then verified global denial, no over-admission; three devices are not proof of three egress IPs |
| P2-IDENTIFIER | 11 attempts to one approved absent synthetic identifier, split across at least two verified sources | Ten admissions then identifier denial within its fifteen-minute fixed window; neither IP nor global nor native quota is the explanation |
| P2-REPLAY | One synthetic signed envelope submitted twice, then one approved pair concurrently | At most one usable admission per envelope; duplicate cannot release an identity/session or perform another Auth check; body/timestamp changes invalidate its MAC |
| P2-PILOT | One owner-agreed workload with a documented request/concurrency cap and session/refresh mix | Actual latency/status/provider metrics support the named pilot cohort; no unexpected throttling/outages for that agreed legitimate pattern, and no limiter over-admission |

An “admission” is a counter permit, not a successful login. Unknown/disabled/wrong-password outcomes stay generic. All admitted attempts, including successful ones, count; no reset/refund. Do not use the Master for saturation or change/disable it. Use a privately approved absent synthetic namespace and fixed non-account password; do not create identities or fake company records for these cases.

Use an otherwise idle agreed window per case. Do not run all batches back-to-back or auto-retry: the global key, NAT budgets and native Auth buckets are shared. Wait for the actual relevant rollover/recovery and confirm operator readiness without clearing counters. Clock rollover or another native request can make a result INCONCLUSIVE; stop, inspect sanitized evidence and approve one later rerun rather than looping. The existing eleven-request helper is a candidate request source only; its status-pattern PASS is not the P2 acceptance result.

Replaying a browser fetch through the Worker generates a fresh nonce, so it is not P2-REPLAY. Proof replay with admission disabled tests signature handling only: SQL nonce consumption never happens there. The synthetic server-side harness must hold/replay the same exact signed envelope privately and dispose of it promptly.

Capacity remains unmeasured. Record forecast peak attempts/minute, largest shared-NAT burst, concurrency and refresh demand before P2-PILOT; enrolment count alone is insufficient. Preserve global 20/minute, verified IP 10/minute, identifier 10/15 minutes. Account for adjacent-minute bursts, global-first budget-exhaustion DoS, targeted identifier lockout, restricted connection/lock limits, shared native Auth egress and Free-provider quotas. No threshold promises workforce-wide capacity. If the pilot cannot fit, stop for a separate capacity/design decision, not an unapproved limit increase. See [the capacity review](PUBLIC_LOGIN_RATE_LIMIT_CAPACITY.md).

## Native Auth endpoint risk decision — Option A approved at Step 144

The gateway seals the **custom username broker**. Native Supabase password/refresh/recovery endpoints remain independently accessible. A caller knowing a technical email can attempt native password Auth without Worker IP/global/identifier controls. The owner explicitly accepts this residual bypass for a **limited internal office pilot**, with existing authorized office management accounts, strong unique passwords, individual permissions and monitoring of both native and broker activity. Own-session email claims are accepted; secrecy and CORS are not prevention. Native quotas are additional controls, not equivalent to gateway enforcement.

Keep the last owner-verified native settings unchanged: sign-up/sign-in operations 30/5 minutes/IP, token/password/refresh grants 150/5 minutes/IP, OTP verification 30/5 minutes/IP, anonymous sign-in 30/hour/IP, IP forwarding disabled. Different endpoint buckets are not cumulative guaranteed capacity. Keep 20/10/10 unchanged; no privileged public key or unverified forwarding feature is added.

Option A does not authorize login, a hosted test/window, new account/grant, code deployment or a setting change. Driver accounts are excluded. All other public-authentication gates remain. Expanding beyond this office pilot or requiring every password grant to share gateway controls requires a new explicit decision and supported design review. The current Free architecture does not establish all-native-password enforcement, and no such claim is made.

Assign an operator/escalation path, private cohort/individual-permission checks, monitoring/redaction/retention and evidence-based capacity thresholds before pilot activation. Inspect native as well as broker denials/errors, refresh/session cleanup, provider resource/SQL errors and normal Cron health; direct native abuse may have no Worker event. Strong unique passwords must be attested privately, never collected/displayed or hashed into shared evidence. No mandatory MFA is introduced; controlled recovery remains necessary. A P1 diagnostic or Option A acceptance is not a pilot-readiness PASS.

## P3 — Genuine Master, access and session lifecycle

After P0–P2 acceptance and separate approval for the real-owner test, use the existing pinned helper via the browser-only procedure in [the public architecture](PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md). Pin the exact owner Worker origin, use a new private browser window, and run reviewed code in Sources → Snippets only if corporate policy permits. No installation or third-party playground. The owner alone enters their existing credentials; the agent never receives them. No credential testing is authorized by this document.

**P3-MASTER:** one genuine request through Worker and deployed broker must create the official SDK session; online user verification and unchanged get-my-access must confirm matching UID, active management/super_admin account, verified profile, 101 effective management permissions and six Driver-only denials. Require sanitized 200/status/count evidence and confirmed sign-out. Username remains the visible login; no driver login, mandatory MFA, custom JWT or general username/email lookup is introduced. The previous private Master success and new 503 are not this test.

**P3-LIFECYCLE:** use a separately reviewed, bounded in-memory lifecycle helper/staging controller. The existing one-shot helper's auto-refresh=false/immediate finally sign-out cannot verify this gate; do not remove its cleanup or alter it ad hoc. Test one real refresh/rotation, access revalidation, JWT/access-lease expiry, loss of network/access, logout/failed logout cleanup, late-response-after-logout and the approved reload/multi-tab behavior. Use actual configured lifetimes; do not change project TTLs, disable accounts or spoof clocks to claim hosted expiry. If the natural lifetime exceeds one approved window, agree a supervised continuation and safe session cleanup explicitly. Separate real-expiry evidence from local mocked expiry tests.

Acceptance: refresh retains the same verified UID/permissions; stale/failed access clears protected UI; expiry never restores an expired context; logout clears local SDK/UI and confirms server sign-out, with refresh no longer usable and late responses unable to restore authority. A previously issued JWT may remain valid until exp under stateless validation: define/accept this revocation boundary or separately review stronger server revocation. Do not promise immediate JWT invalidation from a local clear. Review returned SDK signOut errors as well as thrown failures: the current client's discard path clears UI but does not prove remote revocation. The existing sixty-second fallback access lease/thirty-second revalidation and provider request mix require real-controller verification, not a token-count-only PASS. No personal response/JWT/refresh token is displayed or copied into evidence.

## P4 — Final frontend integration, activation, rollback and closure

After verified hosted transport/admission/session gates, separately authorize only authentication integration: verification of the already reconciled canonical signed entry/artifacts, exact static brokerUrl/dedicated configuration, explicit memory/persistence/reload policy, SDK/error/cleanup handling, CSP/connect-src and approved origins. Preserve all modules, old project, permission model and disconnected legacy integrations. No auth-only change may create operational persistence or broaden data rights.

The actual feature-build controller must be tested in an approved nonproduction browser context. An isolated preview host/deployment and any new origin need separate approval; do not repoint production Pages from main to the feature branch. A browser helper PASS is not the full-site staging PASS. Verify normal Master admission, all 18 authorized administrative pages, existing permission/denial bindings, unauthenticated access, session lifecycle, mobile/errors and no old-project/legacy requests in dedicated mode. Keep the dedicated public login disabled pending this evidence; preserve the current production website and old-project authentication until an explicitly approved cutover. Only a narrowly approved test window may temporarily enable required gates.

Production acceptance requires all case evidence/risks signed off, a bounded pilot definition, source/deployed/config parity, actual frontend staging PASS, named monitoring/rollback operator and explicit approval for each final live configuration change and main/Pages cutover. Do not assume branch or document approval authorizes writes. After separately approved merge/cutover, verify exact remote main SHA, the Pages build for that SHA, real production login/session smoke under its own approval, and continued health/permission denials. Preserve the old Supabase project; do not remove the feature branch or prior configuration until separately authorized and safely incorporated.

Rollback: deny new broker admissions first, then disable Worker, using separately approved rollback writes. Clear/sign out test sessions; if cleanup is unconfirmed, an authorized owner must revoke only those sessions through existing controls. Never restore the unguarded old header handler, direct-origin fallback or cleared counters. Preserve healthy Cron, account/mapping/permission records and get-my-access; a rollback does not by itself justify stopping/removing the job or deleting tables/roles. Restore only the approved prior frontend release/configuration, keep the migration off, verify disabled state and investigate sanitized evidence. An urgent rollback policy/operator approval must be agreed before an enabled window, not improvised after failure.

Monitoring criteria: inspect aggregate broker/native HTTP failures/denials, connection/lock errors, Worker resource failures, session cleanup and Cron health/last-success before each approved window and at least daily in a pilot. A stale five-minute watermark, failed cleanup, unknown source drift, bypass/provenance failure, leaked data or unexpected legitimate-load failures stops the test/pilot and triggers the approved disable path. Set quantitative pilot latency/429/503 thresholds from P2 measurements before release; do not invent a provider capacity/SLA. Logs contain no passwords, tokens, raw proofs, full account responses, identifiers or IPs in shared evidence. Confirm log redaction/retention/access in parity review and use approved sanitized attribution rather than public debug errors.

**Phase closed** only when P0–P4 have genuine accepted evidence, production activation/cutover was explicitly approved and verified, rollback/monitoring are assigned, and any accepted limitation is recorded. A test-window PASS followed by disabling the gateway is a validated candidate, not an activated production website. Start the separate account/database/ERP conversation after this closure, with the verified commit and sanitized evidence handover; no next-phase roadmap or implementation is authorized here.

## Sanitized evidence format

Use one record per approved case; no screenshots of secrets/settings, raw logs, response bodies, HAR/Network exports or console dumps. Keep provider deployment references/code hashes public-code-only; do not paste hash values of secret keys, bucket keys or proofs. “Evidence reference” is an owner-private report reference, not an externally accessible log URL.

```json
{
  "case": "STEP154_PHASE_PROPOSAL",
  "ownerApprovalRef": "APPROVED_CASE_REFERENCE",
  "reviewedCommit": "PINNED_COMMIT",
  "startedAt": "ISO_8601_WITH_TIMEZONE",
  "finishedAt": "ISO_8601_WITH_TIMEZONE",
  "requestCount": 0,
  "state": {"workerEnabled": false, "publicLoginEnabled": false, "cron": "HEALTHY_OWNER_VERIFIED"},
  "source": {"worker": "OWNER_FUNCTIONALLY_REVIEWED", "signedBroker": "OWNER_FUNCTIONALLY_REVIEWED", "canonicalRepoEntry": "RECONCILED_REPOSITORY_ONLY"},
  "deployment": {"cloudflareOwnerReported": "9452cefc", "supabaseVersion": "UNVERIFIED", "ownerObservedDeploymentCount": 27},
  "configuration": {"approvedOrigins": "UNVERIFIED", "fixedTarget": "UNVERIFIED", "secretPresenceOnly": "UNVERIFIED"},
  "historicalLink": {"review": "CLOSED", "link": "OWNER_ATTESTED", "limitation": "TIMING_ONLY", "sharedId": "UNVERIFIED"},
  "nativeBoundaryDecision": "APPROVED_OPTION_A_LIMITED_OFFICE_PILOT",
  "result": "PLANNED",
  "sanitizedDiagnostic": "NONE",
  "ownerPrivateEvidenceRef": "NONE",
  "cleanup": "NO_CHANGES"
}
```

For later cases add only HTTP statuses, aggregate request/concurrency/latency results, permission counts, source-group labels, attribution booleans, session-stage statuses and cleanup status. No actual UID, username, email, Iqama, IP, password, access/refresh token, signature, nonce, connection URL or private account response. Stamp evidence as owner-verified hosted, local mocked, or not yet run. Unknown/missing evidence is never PASS.

## Repository reconciliation at `b9b7e3c` — historical manifest and validation

The owner explicitly approved only these 12 files, local tests, commit and feature-branch push. This is not approval to deploy or activate:

- `supabase/functions/login-with-identifier/index.ts`
- `supabase/review/public-login/login-with-identifier.ts`
- `scripts/lib/signed-broker-artifact.cjs`
- `scripts/build-auth-dashboard.cjs`
- `scripts/build-public-gateway.cjs`
- `supabase/dashboard/login-with-identifier.ts`
- `supabase/dashboard/login-with-identifier-gateway.ts`
- `supabase/functions/_shared/public-gateway_test.ts`
- `tests/signed-broker-packaging.test.cjs`
- `docs/PUBLIC_AUTHENTICATION_COMPLETION.md`
- `docs/PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md`
- `docs/SUPABASE_AUTH_MIGRATION.md`

The reviewed handler factory/server-registration source at `c0a5e7d` has SHA-256 `9682fbf8ead4fa8a330bcbf3437620f058c9d6bf951749dc7ff7558e48f33711`; canonical promotion preserves those bytes exactly. The regenerated artifact is identical to the reviewed signed bundle after only header, entry-comment and source-provenance label adjustments. Shared gateway proof, SQL adapter, permissions, rate policy, get-my-access, Worker source, frontend config, dependency versions and session logic remain unchanged.

Both Dashboard artifacts have SHA-256 `1708ffbf59633ad9c41bfe395a6778cd70a3f6ad5c3fad293fd771d8352a7c7a`. These are public-code fingerprints, never secret hashes or a claim of a hosted deployment. Legacy direct-origin smoke helpers are historical/negative-path tools; do not enter real credentials there or present them as the supported public login. The existing Worker-origin helper remains the public-flow test candidate after separate approval.

Local validation passed:

- **144 Node tests**, including five new signed-packaging cases: exact reviewed factory SHA, identical artifacts/dependency closure, both builders checking both aliases, source/artifact-drift rejection in isolated fixtures and unchanged activation/permission inventory.
- **33 Deno tests**, including seven canonical signed-broker cases. Tests import the actual canonical entry, prove compatibility factory identity without a second server, enforce each false/missing readiness gate, reject the old trusted-header-verified=true mode and invalid proof/config before SQL/Auth, and retain signed admission/UID/revision/session cleanup behavior. Strict Deno type checking passed for both entries and generated artifacts using the existing compiler policy.
- **PostgreSQL 15 and 16** network-isolated disposable fixtures passed. The 16 suite retained 36 managed-role and 36 repair rejection/rollback cases, all five historical CRLF fingerprints, exact CHECK constraints, maintenance/nonce/limiter/concurrency tests and preservation of accounts/mappings/counters/permissions. Restricted access remains 101 Master grants and six Driver denials. No live SQL was run.
- **12 local browser suites** passed: workflow, UI, people, roster, support, portal, auth migration, public gateway, pooler diagnostic, local Master smoke, legacy username broker and owner username diagnostic. All 18 administrative pages remain covered; Auth/DB transport is mocked. Roster verification passed **815 synthetic PDFs and 4,974 map annotations** outside the repository.
- **119 JavaScript syntax checks**, Python syntax, all five generated-artifact checks, unchanged 107-definition permission catalog, documentation links/JSON and whitespace checks passed. Official Cloudflare Worker type checking and local Miniflare/workerd compatibility passed; hosted Cloudflare provenance is not claimed.
- An initial ENOSPC storage exhaustion blocked some temporary-directory/browser/container starts. Only re-downloadable public package/image caches were recycled; pinned PostgreSQL images were used and blocked checks rerun successfully. No source fix was used to conceal a failing security assertion. No critical security assertion failed; no commit was made while validation was incomplete.

Only the 12 approved repository files changed. All other source/configuration/SQL/Worker/browser-helper bytes are unchanged, and no account, permission, rate limit or session-security behavior was altered relative to the reviewed signed implementation. No deployment, activation, real credentials, live Supabase/Cloudflare/SQL/Cron/secret change, main merge or branch deletion occurred. Main remains `42ab3a504d76e5119733791c2262f24565336576`; GitHub reports its existing Pages build as built for that SHA. Production remains [https://dohanyan16.github.io/TaxiQaid/](https://dohanyan16.github.io/TaxiQaid/). The feature branch is retained for the remaining hosted authentication gates.

A critical security failure would stop work before commit. Rollback is a normal revert of this repository reconciliation commit, with no force push or branch deletion; it never redeploys the obsolete header handler or changes live flags/services. Reverting would restore the repository release-source blocker, not provide an authentication fallback. No hosted test or production write is performed here.

## Step 144 documentation update

Exact changed-file manifest:

- [PUBLIC_AUTHENTICATION_COMPLETION.md](PUBLIC_AUTHENTICATION_COMPLETION.md): records the approved Option A scope, deployment count/version distinction, current gates and P1-R0 next action; preserves prior results as historical evidence.
- [P1_HOSTED_SECURITY_TEST_PLAN.md](P1_HOSTED_SECURITY_TEST_PLAN.md): new bounded case manifest, guard-state limitations, browser-only instructions, caps, sanitized inventory/evidence, missing-harness requirements, monitoring and cleanup/rollback.
- [PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md](PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md): current-decision notice and pilot-risk acceptance, with links to the active completion/P1 plans.

Step 144 local validation passed: relative documentation links, balanced Markdown fences, JSON parsing, syntax-only checking of the one manual JavaScript example (never executed), exact three-file documentation-only scope and whitespace. Read-only catalog and Dashboard/gateway/role-proposal artifact checks passed; all 107 definitions and six Driver-only actions remain unchanged. Runtime/SQL/browser suites from `b9b7e3c` above were not rerun for this documentation-only update and are not new hosted P1 evidence.

Remote main remains `42ab3a504d76e5119733791c2262f24565336576`; GitHub reports the existing Pages build as built for that SHA. No deployment, live test, production write, harness implementation, activation, merge or branch deletion is performed. The feature branch is retained for open P0–P4 gates. Rollback of these documents is a normal feature-branch revert, with no live action or force push. No other development phase starts.
