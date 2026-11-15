# Public authentication completion — bounded owner-controlled plan

Scope: finish public authentication, its final frontend integration and safe production cutover on `feat/dedicated-supabase-auth`, repository reconciliation approved from `c0a5e7d` after Step 141. Account management, database redesign, Drivers Management, department modules and unrelated ERP work are deferred to a separate conversation **after this phase closes**. This document authorizes no deployment, live test, SQL, setting/secret change, activation, merge or branch deletion.

## Accepted live evidence — do not restart completed work

These are **owner-verified hosted results**, not new agent-run tests:

| Evidence | Accepted result and limit |
| --- | --- |
| PostgreSQL security and function verification | PASS; preserve current roles, ACLs, RLS, mappings, counters and records |
| SQL 04 maintenance repair | Applied successfully; do not rerun 00, 01 or 04 |
| SQL 06 rollback-only probe | Four PASS results; do not repeat without a relevant change |
| Existing Cron maintenance | Enabled, healthy, two consecutive successful runs; preserve this one job and its schedule |
| Revised login-with-identifier | Step 141: downloaded source reviewed against the pinned signed Dashboard artifact, matching functional content; Supabase deployment version remains UNVERIFIED |
| Worker source/version review | Step 141: active reference `9452cefc`, reviewed against `gateway/dashboard-worker.mjs` at `c0a5e7d`, with no functional discrepancies identified; no new deployment performed |
| Unsigned direct Supabase POST | HTTP 403; baseline direct-origin denial accepted |
| Dummy Worker POST and matching Supabase POST log | HTTP 503 at both; supports signed transport to the disabled broker, not password, SQL admission, IP fidelity, replay or browser-session readiness |
| Current controls | Worker returned to enabled=false; public login disabled; approved browser origins configured |
| Earlier private Master diagnostic | Existing evidence for password/UID/mapping/active Master/access/101 management grants/six Driver denials/cleanup; do not recreate it or substitute it for a public-flow test |

The latest evidence supersedes older documents saying repair is pending, Cron is disabled/missing, the revised handler is undeployed or the disabled handshake is wholly untested. Preserve their historical test reports, not those outdated current-state statements. No live PASS is inferred for the remaining gates below.

## Completion checklist and exact blockers

| Priority / gate | Current status | Acceptance criterion |
| --- | --- | --- |
| P0 — Source/config parity and scope decision | OPEN; repository reconciliation implemented | Canonical signed source/identical artifacts replace the stale entry; retain Step 141 functional-review evidence, obtain the missing Supabase deployment reference and finish configuration/native-boundary decisions |
| P1 — Disabled-login ingress/proof checks | OPEN beyond the accepted 403/503 baseline | Genuine hosted allowed/denied origin/path/provenance and signature/timestamp/body-context checks, with no broker password admission; bound missing test-harness work |
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

## Exact next owner action — read-only deployment-reference follow-up

The Step 141 functional code comparisons are accepted; do not repeat the 403/503, repair/probe/Cron or full source reviews without a material change. The next owner case is **P0-DEPLOYMENT-REF**, a browser-only, zero-login-request metadata check. Review/approve that bounded read-only case before running it; the implementation approval does not authorize a hosted security test or write.

1. In the dedicated Supabase Dashboard open Edge Functions → `login-with-identifier` → Overview and any available Deployments/Details/history view. Read the existing deployment/version identifier and its available timestamp only. Do not press Deploy, Save, Invoke/Test or change secrets, JWT mode or flags. Do not redeploy to manufacture a new identifier.
2. Record the identifier as owner-verified metadata if the UI exposes it. If absent, return UNVERIFIED; do not extract Management API credentials or expose account/source/log dumps. A later narrowly reviewed read-only metadata procedure may be required. Keep the already reported Cloudflare reference `9452cefc` and Step 141 functional comparison evidence; no Worker request is needed.
3. Return only case ID, reviewed repository commit, public-code deployment reference or UNVERIFIED, existing disabled-state attestation, and sanitized outcome. Do not copy complete source, private responses, usernames/UIDs, email mappings, tokens, keys, DB URLs, certificates or raw logs.
4. Keep Worker/public login disabled and the healthy Cron job unchanged. Before any enabled test window, explicitly decide the broker-only/native-Auth boundary below and finish the outstanding origin/topology/configuration evidence. There is no request to repeat a successful baseline test now.

The prior P0-PARITY inventory remains the source/configuration checklist: exact public approved origins must agree on Worker and broker, the fixed destination/manual redirect rejection must remain, and secret presence never proves equal secret values. GitHub Pages origin is `https://dohanyan16.github.io`, without `/TaxiQaid/`; Origin is not non-browser authorization. Signed readiness requires four flags (`TAXIQAID_LOGIN_ENABLED`, `TAXIQAID_SESSION_TRANSPORT_REVIEWED`, `TAXIQAID_GATEWAY_ENABLED`, `TAXIQAID_GATEWAY_REVIEWED`) explicitly true and `TAXIQAID_TRUSTED_IP_HEADER_VERIFIED=false`; missing/disabled configuration remains fail-closed. Hidden settings stay UNVERIFIED rather than being unmasked or re-entered. Preserve broker `verify_jwt=false` with mandatory HMAC and get-my-access JWT protection. A partial excerpt/functional review does not silently become exact deployment-version parity.

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

Keep the existing unsigned-403 and signed-disabled-503 as accepted baselines. Retest them only after a material source/configuration change or once admission is enabled, to prove the control did not become conditional on disabled flags. Each case below uses dummy, non-account input, no real session, and at most one request per named variant unless explicitly stated.

- **P1-ORIGIN-ROUTE:** verify the approved browser origin and rejection of an owner-controlled unapproved browser origin, unexpected query/path/method and configured alternate ingress. In the disabled-broker window, a valid path/proof can produce the already-known generic 503; blocked variants must not reach password/SQL work. Check actual browser CORS separately: browsers control Origin, so attempting to set Origin in fetch is not a genuine cross-origin test. A Dashboard request simulator is not browser-CORS evidence.
- **P1-PROVENANCE:** verify real direct Cloudflare ingress and rejection of same-account/cross-Worker/service-binding/preview paths under the actual topology. `request.cf` alone and local mocked metadata are insufficient. A fresh Worker subrequest client or binding test requires separately reviewed temporary artifacts and explicit deployment/config approval; none is deployed by this plan. Where no test caller exists, mark the case BLOCKED, not “not applicable” solely because no binding is currently listed.
- **P1-PROOF:** verify missing/forged proof, modified body/Origin/IP/context, stale issuance and beyond-future-skew proof cannot reach SQL/Auth. Most mutations can run with broker admission disabled. Valid stale/tampered controls require an owner-authorized server-side synthetic harness; browser DevTools must never receive the gateway key or raw signed envelope. Preserve the 60-second/five-second proof bounds and fixed destination. No redirect following or alternate upstream is acceptable.
- **P1-ALIASES:** inventory all actually deployed broker names, default project URLs and custom-domain paths. Every reachable username broker path must enforce the same signed gate; no old handler or temporary public diagnostic remains as a bypass. Repeat direct unsigned denial after the later enablement transition for that explicit reason. Native Auth is a separately acknowledged boundary below.

Bound the missing tooling to **one reviewed synthetic-only hosted test-harness proposal**, covering required proof mutations, server-side replay and sanitized source/bucket attribution. It must use fixed destinations/fixtures, no arbitrary username/password resolver, no real credentials, online administrator authentication plus explicit owner UID/short-lived authorization where exposed, no API-key-only authorization, no new broad DB/service key or private-table grants, no secret/proof reflection/logging, bounded calls and complete teardown. Proposed temporary callers and any deployment are later approval items. Existing SQL-role and gateway checks remain in place. Do not implement a public debug route or reuse the deleted private diagnostic as an unrestricted login alternative.

## P2 — Hosted IP fidelity, replay and unchanged 20/10/10 policy

Run only after source/provenance prerequisites, test-harness review and the native-boundary decision. For IP/global/identifier cases, obtain server-side sanitized attribution proving which existing bucket denied admission and that spoofed client headers did not change the effective trusted source. Do not broaden browser/runtime table privileges or publish raw IPs/bucket hashes. If that evidence mechanism is not approved, mark these cases BLOCKED; HTTP 429 alone is insufficient.

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

## Native Auth endpoint risk decision — required before enabled testing/production

The gateway seals the **custom username broker**. Supabase native password/refresh/recovery endpoints remain independently accessible. A caller knowing a technical email can attempt native password Auth without Worker IP/global/identifier controls. The user's own email claim is accepted; email secrecy and CORS are not prevention. Native rate limits are additional controls, not equivalent to gateway enforcement. Preserve the last owner-verified native settings: sign-up/sign-in operations 30/5 minutes/IP, token/password/refresh grants 150/5 minutes/IP, OTP verification 30/5 minutes/IP, anonymous sign-in 30/hour/IP and IP forwarding disabled. These are different endpoint buckets, not cumulative guaranteed capacity. Keep those settings unchanged; do not add privileged public keys or claim a Free hook seals all password grants.

Owner decision must explicitly select one boundary:

- Accept broker-only gateway enforcement for a defined controlled pilot, plus native endpoint protections, generic account/active/permission checks and monitoring. Document residual native bypass, shared-egress/burst limits, NAT denial risk, credential-provider boundary and recovery/provisioning surface ownership. This decision is still pending; prior private/transport PASS does not imply acceptance.
- Require every password grant to share gateway controls. Current Free architecture does not demonstrate that requirement; keep login disabled and approve a separately supported provider-level design. Do not wait indefinitely for Support or silently weaken the requirement. A paid product/hook is not proof without a reviewed model and real tests.

Preserve no-mandatory-MFA policy; strong unique passwords and controlled recovery remain necessary. Do not expose private mappings, change native quotas or launch real-credential abuse tests to investigate this boundary. Native endpoint inventory/config review can be read-only; any active native request needs its own explicit case approval.

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
  "case": "P0-DEPLOYMENT-REF",
  "ownerApprovalRef": "APPROVED_CASE_REFERENCE",
  "reviewedCommit": "PINNED_COMMIT",
  "startedAt": "ISO_8601_WITH_TIMEZONE",
  "finishedAt": "ISO_8601_WITH_TIMEZONE",
  "requestCount": 0,
  "state": {"workerEnabled": false, "publicLoginEnabled": false, "cron": "HEALTHY_OWNER_VERIFIED"},
  "source": {"worker": "OWNER_FUNCTIONALLY_REVIEWED", "signedBroker": "OWNER_FUNCTIONALLY_REVIEWED", "canonicalRepoEntry": "RECONCILED_REPOSITORY_ONLY"},
  "deployment": {"cloudflareOwnerReported": "9452cefc", "supabase": "UNVERIFIED"},
  "configuration": {"approvedOrigins": "UNVERIFIED", "fixedTarget": "UNVERIFIED", "secretPresenceOnly": "UNVERIFIED"},
  "nativeBoundaryDecision": "PENDING",
  "result": "PLANNED",
  "sanitizedDiagnostic": "NONE",
  "ownerPrivateEvidenceRef": "NONE",
  "cleanup": "NO_CHANGES"
}
```

For later cases add only HTTP statuses, aggregate request/concurrency/latency results, permission counts, source-group labels, attribution booleans, session-stage statuses and cleanup status. No actual UID, username, email, Iqama, IP, password, access/refresh token, signature, nonce, connection URL or private account response. Stamp evidence as owner-verified hosted, local mocked, or not yet run. Unknown/missing evidence is never PASS.

## Approved repository reconciliation manifest and validation

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
