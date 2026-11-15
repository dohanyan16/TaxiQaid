# Step 154 — minimum Master pilot validation proposal

Baseline: `bdfa391`, branch `feat/dedicated-supabase-auth`. **Assessment and documentation only.** No implementation, deployment, hosted test, activation, SQL, secret, account, permission, Cron or production configuration change is authorized. Keep the Cloudflare Worker and public username-broker admission disabled. Preserve main, the existing website/old project and native Auth settings. No merge or branch deletion. Documentation remains in English; the owner-facing phase summary may be in Spanish.

## Closed evidence review and unchanged scope

The owner completed the authorized historical review:

| Reported field | Owner-confirmed result |
| --- | --- |
| HISTORICAL_RECORD | AVAILABLE |
| WORKER_OUTBOUND_LINK | ABSENT_IN_VISIBLE_TRACE |
| UPSTREAM_TARGET_METHOD_STATUS | MATCH |
| SHARED_NONSECRET_ID | UNVERIFIED |
| CROSS_PLATFORM_LINK | OWNER_ATTESTED |
| LIMITATION | TIMING_ONLY |

Cloudflare and Supabase show POST 503 at **2026-11-15 17:37:35 CET** (`2026-11-15T17:37:35+01:00`, equivalent to `2026-11-15T16:37:35Z`). No visible outbound spans or verifiable shared identifier were found. **P1-R2-EVIDENCE-REVIEW is CLOSED with a timing-only result; it is not a hosted HMAC, provenance or replay PASS.** Stop searching the same records or generating another standalone 403/503 for this purpose. Supabase deployment version stays UNVERIFIED; 27 was a deployment count. Existing source functional reviews remain evidence with their original limits.

Keep the six successful owner R1 cases, genuine private Master/access/101-management/six-Driver-denial evidence, SQL repair/security/probe and healthy Cron results. Do not rerun them without source/configuration drift or an incident. Only a newly changed control gets a specifically justified regression case.

Option A is already approved for a limited internal office pilot: native Supabase password/refresh/recovery endpoints are independently reachable and bypass broker limits. Own-session technical email claims are accepted. Preserve the reported native limits and disabled IP forwarding; CORS/email secrecy do not seal native Auth. This accepted residual risk does not authorize public activation or waive gateway/IP/replay validation. Initial scope is the existing Master account, then only separately approved existing office accounts with strong unique passwords and individual permissions. No Drivers/Iqama, provisioning, MFA requirement or permission changes.

The last owner-verified native limits remain 30 sign-up/sign-in requests per five minutes/IP, 150 password/refresh token requests per five minutes/IP, 30 OTP verifications per five minutes/IP and 30 anonymous sign-ins per hour/IP. Different native endpoint buckets, shared server egress and gateway fixed windows do not imply guaranteed combined capacity. Monitor both providers; native abuse can have no Worker event. No new direct native-password test or settings change is needed merely to reconfirm Option A.

Owner operations must remain browser-only: reviewed Dashboard artifacts and approved browser context/DevTools only where corporate policy permits, no software installation, CLI, third-party playground or security-policy bypass. Before any future live case, approve its complete request graph/cap, timestamps, operator, stop conditions and exact restore actions. Approving this phase plan is not approving implementation, deployment or a live test. Current execution/write budget remains zero; later flags have manual restoration, not an invented automatic TTL.

## Mandatory controls versus currently unavailable tests

| Requirement / case | Status now | Consequence for the Master pilot |
| --- | --- | --- |
| Fixed signed broker, strict origins, genuine gateway IP source, spoof resistance, no unsigned-origin fallback | Mandatory; local evidence exists, remaining hosted evidence incomplete | A time match/503 cannot satisfy it; demonstrate the real relevant path before pilot admission |
| HMAC body/origin/IP/context/time binding, one-use nonce and replay rejection, atomic prelookup 20/10/10 | Mandatory; remaining hosted checks incomplete | Disabled admission cannot exercise SQL nonce/rate effects; do not infer PASS |
| Existing public Master UID/active/super_admin, 101 effective management permissions/six Driver denials, secure SDK/session/frontend handling | Mandatory; private test is accepted, public/controller evidence incomplete | Genuine public-flow acceptance and cleanup required |
| R2-CROSS and IP spoofing | BLOCKED without a genuine approved runtime caller and sanitized attribution | Other accounts can originate attacks; the one-Worker inventory does not close this blocker |
| R2-SAME | BLOCKED: no established same-zone caller | Do not create a dedicated same-zone deployment solely for a label; propose the limited topology and require explicit owner scope acceptance for this untested context |
| R2-BINDING / R2-PREVIEW | BLOCKED: no approved binding caller; preview URLs disabled | Keep them unconfigured. Inventory is not rejection PASS. Empty gateway bindings are not a global inventory of incoming references; externally constructible invocation remains in adversarial review |
| R1-DENY-CORS | BLOCKED: no owner-controlled unapproved HTTPS source | Do not repeat passed/null-origin cases or build a separate site just for this. Reuse a justified later caller's origin if available, otherwise retain an explicit unresolved scope item |
| Definitive historical cross-platform trace | CLOSED: TIMING_ONLY | No more historical chase. Future evidence must be sufficient for the tested branch; do not relabel the past event |
| Exact Supabase deployment identifier | UNVERIFIED | Resolve from available future deployment metadata or a separately approved frozen-source attestation; never label count 27 a version or redeploy only to obtain an ID |

Owner acceptance of an unconfigured-context limitation is a documented scope decision, not a new PASS and not a waiver of an attack path that remains actually reachable. No such additional scope decision has been granted by Step 154. If a mandatory property cannot be demonstrated with acceptable evidence, stop before Master admission and return the specific blocker.

## Phase 1 — prepare sufficient evidence with the minimum tooling

**Do:** first specify a single consolidated validation design using the existing gateway/broker and existing protected server context wherever safe. The current code has no explicit proof-verification outcome/cross-hop event sufficient to turn the historical 503 into definitive evidence. Propose only the missing sanitized evidence: server outcome enums for proof acceptance/rejection, broker-disabled-before-SQL, limiter versus native Auth denial, and source/bucket consistency comparisons. If correlation is necessary, a random non-secret reference is telemetry only, never authorization, a proof nonce, IP/bucket hash or credential. Do not assume vendor span propagation. Define how the controlled test isolates each rate bucket; if existing authority cannot establish it, identify a narrowly scoped evidence proposal instead of broadening privileges.

One temporary request-only caller may be justified for the genuinely needed Worker-subrequest context and reused as an unapproved browser origin; it must not receive HMAC/DB secrets. Do not create extra bindings, preview endpoints, a second website or one diagnostic per case. One caller does not automatically prove both same-zone and cross-account behavior: record its actual runtime context and leave unsupported contexts untested. Any required signing/replay comparison remains private server-side, fixed-target and synthetic-only, with online official administrator JWT verification, the approved existing owner UID/active account and a server authorization grant expiring within 15 minutes. No API-key-only authorization, editable metadata, public signer, arbitrary URL/resolver or alternative login. An indispensable bootstrap administrator session needs its own private browser-only approval, request budget and automatic sign-out; do not recreate a private login test merely for another PASS.

**Expected:** an exact implementation file manifest/diff proposal, local security-test matrix, no-sensitive-data telemetry design, full request graph including Auth/preflights/internal hops, expiration and removal plan. No runtime implementation is included in Step 154. Also select a practical approved browser context for the actual frontend controller; its setup is needed before real credentials, not improvised later.

**Owner / separate approvals:** owner chooses the limited topology/evidence boundary and separately approves any repository implementation. After local validation/review, deployment, observability settings, temporary callers/grants/secrets and cleanup each need named live approval. A plan approval alone authorizes none of those writes.

**Revert / blocker:** abandon or revert unapproved repository candidates; no live rollback now. Any later deployed evidence-only change must have a validated signed baseline to restore, never the old header broker. **Actual blocker:** no trustworthy hosted source/proof/rate attribution yet, and no genuine adversarial caller. This is a tooling/evidence gap, not a reason to redo R1 or wait for an absent historical span.

## Phase 2 — hosted provenance and signed-proof checks, broker admission disabled

**Do:** only after Phase 1 acceptance, use one bounded Worker-enabled/broker-disabled window. Exercise the actual necessary hostile Worker context and direct-header spoof cases; browser fetch cannot impersonate real Worker metadata. Verify approved origins/fixed destination and no alternate unguarded broker. Reuse the completed R1 cases. Run the remaining HMAC mutations from the approved private fixture: MAC/body/origin/IP/nonce/context changes, stale/future issuance, query/method mismatch, plus one fresh valid proof control. A new control is justified by the new evidence/caller deployment, not to repeat the old 503.

**Expected:** distinguish a gateway rejection from upstream rejection and an actual accepted proof followed by the disabled guard. Invalid proof never reaches SQL/Auth; the valid disabled control produces the intended branch evidence, not merely a status match. Raw proofs/IPs/MACs/keys never reach browser output or logs. These tests do **not** establish SQL nonce consumption: replay can still return disabled 503 without a nonce claim.

**Owner / separate approvals:** approve the exact cases/caller/source labels and all control/Auth/setup hops first. Existing candidate caps are one request per runnable R2 variant and at most eleven R3 broker targets; do not run missing variants or assume those targets are the total graph. Separately approve Worker flag false→true and true→false, including publication references. Supabase admission stays false; no SQL changes.

**Revert / blocker:** restore Worker=false immediately after the approved subset or any unexpected result, within a supervised maximum 15-minute window. No automatic expiry is assumed. Keep Supabase=false, Cron and counters intact. **Actual blocker:** any provenance bypass, source selection by attacker headers, unbound/accepted invalid proof, exposure or inconclusive mandatory attribution stops progression.

## Phase 3 — actual 20/10/10, one-use replay and pilot capacity

**Do:** after Phase 2 acceptance, separately approve short real-handler admission windows. Use privately approved absent synthetic identifiers/fixed non-account passwords; never flood the Master, create an identity or clear counters. Reuse the existing test matrix: IP 11 attempts with distinct identifiers/one genuine source; global 21 with at least three genuinely distinct sources; identifier 11 split across at least two genuine sources. Show other buckets/native quotas are not the denial cause. Test one identical signed envelope twice, then a new identical pair concurrently: four replay submissions in total, held only server-side. A new browser fetch creates a fresh nonce and is not a replay test.

The 43 rate-case target requests and four replay submissions are **separate candidate batches**, not one authorized run or a complete hop count. Review every internal/control hop before execution. The handler deliberately calls official password Auth with a reserved dummy address even for an absent account: admitted synthetic attempts still consume native Auth resources/limits. Native 429 must be distinguished from SQL denial. Separate batches by real relevant window/native recovery with both login gates closed during waits; no automatic retries, counter reset or invented capacity guarantees. All attempts/successes consume budgets; replay can also consume attempt budgets before nonce denial.

**Expected:** exact 20 global/minute, 10 genuine-source/minute and 10 identifier/15-minute behavior without over-admission, stable source classification under spoofed client headers, and at most one usable permit/Auth attempt for each envelope. An independent-owner-defined small office demand/burst/refresh mix must fit measured capacity and the fixed policy; define latency/denial/connection stop thresholds before that batch. One Master login is not a capacity test and does not prove multi-user NAT suitability.

**Owner / separate approvals:** exact batches/source availability/windows, all SQL counter/nonce writes inherent in normal handler execution, dummy native Auth calls, temporary enable/restore writes and optional bounded read-only evidence query, if required. This does not approve SQL DDL, grant changes, account writes or new quotas. A publicly enabled broker is reachable by others; CORS and a Master-only testing intention do not make it owner-only. Unexpected external traffic makes isolation/attribution inconclusive and stops the batch.

**Revert / blocker:** preapproved deny broker admissions, then Worker=false; wait for natural recovery, preserve records/Cron. **Actual blocker:** wrong/unattributable threshold, replay over-admission, fake source isolation, native throttling masking the result or measured legitimate pilot demand exceeding unchanged limits. Reduce the cohort/workload or review another design; do not raise limits silently.

## Phase 4 — one genuine public Master login and access

**Do:** use the reviewed actual SDK/controller in the approved browser context, aiming to carry the same in-memory session into Phases 5–6. The owner alone enters the existing username/password privately. One approved login attempt, no automatic credential retry. Verify official SDK setSession and online getUser followed by unchanged authenticated get-my-access.

**Expected:** matching UID (boolean only), active management account, `super_admin`, 101 effective management permissions, six Driver-only denials, official session filtering and no secret/private-response logging. No Driver admission, MFA requirement or account/permission mutation. Private diagnostic success is not this public-flow test.

**Owner / separate approvals:** real credentials/official Auth/session requests, the one attempt and complete SDK/access calls, temporary public gate changes and cleanup. Approve the short window's public reachability explicitly. Prepare the combined controller/lifecycle context first. The existing one-shot helper immediately signs out: do not remove its finally cleanup ad hoc to save a login. If it is used separately, a second login for lifecycle/frontend needs its own approval/cap.

**Revert / blocker:** restore broker=false then Worker=false immediately after creating the approved session, or on failure. Clear UI and perform approved specific-session cleanup on failure; never broad revocation. **Actual blocker:** no genuine public session, wrong UID/status/role/permission counts, mapping revision/session-security failure or unconfirmed cleanup.

## Phase 5 — session renewal, expiry and logout with admission closed

**Do:** with both admission gates closed again, use the existing official session for one real refresh/rotation and access revalidation, then the approved natural-expiry and logout cases. This works through independently reachable native Auth/get-my-access and is part of the accepted Option A boundary; it does not require keeping public username admission open. Review memory-only/reload/multi-tab policy. Use actual JWT/access-lease lifetimes, no clock spoofing, TTL changes or account disabling. Auto-refresh and the actual 30-second frontend access polling must be included in the request/time budget. Distinguish access-lease expiry from JWT expiry: a transparent SDK refresh cannot be counted as expired-token rejection. A reviewed client-only no-auto-refresh expiry branch may be needed; do not alter the production Auth lifetime or expose the old token to test it.

**Expected:** same UID/permissions after refresh, expired/failed access clears protected UI, no late response restores a logged-out context, local SDK/UI clear and confirmed server sign-out/refresh revocation within provider semantics. A previously issued access JWT can remain valid until exp: record/accept that boundary rather than claiming immediate JWT revocation. The current discard path ignores returned signOut errors; local UI clear alone is not proof of remote cleanup. Phase 1 must include an explicit returned-error handling/review proposal and regression coverage before claiming that contract is satisfied. Any correction needs its own file manifest/approval; none is implemented here.

**Owner / separate approvals:** native refresh/user/access/sign-out calls and an explicit supervised duration/cap derived from actual lifetimes. Natural expiry may exceed 15 minutes; agree the continuation with the login gates already closed. Stop polling while paused; additional login/session branches or network failure tests need their own caps. Local mocked expiry/race/failure tests can supplement, not masquerade as real expiry evidence.

**Revert / blocker:** keep admissions closed, stop timers, clear memory and revoke only the approved test session if sign-out remains uncertain. No secret or account changes. **Actual blocker:** broken renewal/access revalidation, expired authority surviving in the UI, logout race or unconfirmed refresh revocation. Native refresh while broker-disabled is expected under Option A, not proof that the gateway controls native endpoints.

## Phase 6 — authentication-only website integration

**Do:** verify exact static Worker broker URL, dedicated project/key, approved origin/CSP, official SDK, error handling, memory policy and the actual login/controller wiring. The repository currently has `enabled:false`, `brokerUrl:null`; existence of auth-migration-preview.html is not evidence of a hosted feature preview. Use the Phase 4 session in the actual branch build where possible. Cover authorized navigation, six Driver denials, logged-out protection, mobile/errors and no old-project/legacy operational calls in dedicated mode; preserve all modules/data.

**Expected:** real frontend behavior agrees with access/session evidence and existing local regressions. A one-shot SDK helper is not full-site validation. No URL/storage switch or direct Supabase broker fallback. No native email login field in the final UI.

**Owner / separate approvals:** repository-only integration diff/local tests first, then any nonproduction hosting/origin change and hosted UI session calls. Prefer an existing approved context; if none serves the actual branch, propose one justified temporary static preview or another explicitly reviewed browser context. Do not claim file://, a null Origin, a Dashboard simulator or current main is a feature-branch staging PASS. Do not repoint production Pages or create extra authentication Workers just for staging.

**Revert / blocker:** restore the disabled candidate static configuration/remove only separately approved preview resources; keep backend gates closed. **Actual blocker:** no practical approved real-controller context, auth/CSP/session/authorization regression, or incomplete branch-build evidence. This context must be prepared before Phase 4 if one login is to serve Phases 4–6.

## Phase 7 — explicit controlled cutover, monitoring and rollback

**Do:** only after accepted prior evidence/limitations, obtain a named Master-pilot release approval. Pin remote feature/candidate commit, deployed source/config evidence (or explicitly accepted frozen-source alternative), cohort and monitoring/rollback operator. Approve main integration/Pages publication and each final flag/configuration write independently. Then verify exact remote main, Pages build for that SHA, actual production login/session under its own capped smoke case and preserved permissions. Retain the old Supabase project. Branch deletion is not included.

**Expected:** functioning final username/password website for the approved scope, no Driver login, unchanged native controls and 20/10/10, healthy Cron, monitored broker/native 401/403/429/503 and provider connections/resources/session cleanup. Option A risk stays visible; set measured stop thresholds and the supervised pilot review cadence. A successful Pages job alone is not authentication success.

**Owner / separate approvals:** explicit activation, merge/publication, production smoke, operator/escalation policy and preapproved rollback writes. No current phase approval silently grants later phases. Never request private credentials in chat.

**Revert / blocker:** deny new broker admission first, then Worker=false; specifically sign out/revoke test sessions, remembering flags do not revoke existing sessions. Restore only the approved prior frontend release through normal commits/Pages publication, no force push or unsigned-handler fallback. Preserve SQL, accounts, mappings, grants, normal Cron and counters. Any failed mandatory gate, unresolved relevant attack path or missing release/rollback approval blocks the pilot. No account/database/ERP phase begins until authentication closes with real evidence.

## Next approval and exact Step 154 manifest

**Next owner decision:** approve or revise this phase plan and the proposed limited topology. If approved, the next work is the exact repository-only Phase 1 implementation/evidence design and local-test/file manifest for review, not a live operation. Do not repeat R2-EVIDENCE-REVIEW or R1. No hosted request is authorized by Step 154; its request/write/resource budget is zero.

Step 154 changes only these four documentation files: this new proposal, [P1_R2_READINESS_ASSESSMENT.md](P1_R2_READINESS_ASSESSMENT.md), [P1_HOSTED_SECURITY_TEST_PLAN.md](P1_HOSTED_SECURITY_TEST_PLAN.md), and [PUBLIC_AUTHENTICATION_COMPLETION.md](PUBLIC_AUTHENTICATION_COMPLETION.md). Future code/tooling scopes are not approved by this manifest. Local documentation/artifact validation is reported separately from hosted security results; no unperformed case becomes PASS.
