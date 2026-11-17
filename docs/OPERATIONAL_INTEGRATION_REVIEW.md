# Operational integration review — 17 November 2026

Branch: `feat/drivers-fleet-sheets-writes`. Production baseline: `4c3b0f5ba22c718e3475e19f55cd75924e3d20ef`.

This is a development release, not an activation certificate. No hosted SQL, provider deployment, Secret, account, permission, Cron or production branch changes have been made in this work. The existing owner-verified Drivers/Fleet readonly service remains the production boundary. Legacy Apps Script stays disconnected.

## Completed repository corrections

The duplicate `encode` failure is fixed by module isolation, export collision validation and syntax checking the entire generated deployment before replacing it. Commit `d4de246e794cdeb899b206f139b4cde761fab701` passed the real [GitHub Actions run 44003686093](https://github.com/dohanyan16/TaxiQaid/actions/runs/44003686093). Later changes require their own successful run.

The exact 14-template mapping is in `schemas/operational-template-contract.json`, generated as `shared/operational-schemas.js`. Overview, detail and editable flags are independent. Hidden overview fields remain in the storage/detail contract. The owner's approved User Directory correction removes the first, business `Updated At UTC`; the technical suffix is exactly `Record ID`, `Row Version`, `Updated At UTC`. Corrected downloadable templates are private task outputs, never committed personnel workbooks. All other thirteen XLSX members are unchanged bytes.

Drivers editing retains eight authorized fields, searchable vehicle selection and clear/unassigned behavior. Date transitions use Asia/Riyadh. Fleet remains readonly in its page. Save is unavailable unless the server advertises the separately gated, current-permission-checked coordinator. An unresolved submission retains its operation ID; Check Save Status does not invent a new operation. Session changes suppress late confirmations. Confirmed saves and failed subsequent refreshes have different messages.

The staged write engine seals a durable plan before mutations. A stable record UUID, expected version, actor and canonical request fingerprint bind each operation. A single outstanding receipt covers both workbooks. Each Google batch includes DATA and its redacted CHANGE_LOG atomically in one workbook. Audit event IDs are deterministic. Readback checks exact cells, versions, timestamps and one exact event, not just an operation count. Fleet assignment recalculation supports multiple drivers and runs only when Car Plate changes. A timeout never triggers another ambiguous batch. Exact evidence can reconcile an operation without another write. Partial or missing evidence retains the global gate and requires reviewed administrative recovery; there is no automatic expiry, unsafe retry or counter reset.

NCR uses the exact approved 23 labels, severities and category-specific points. MDT Black Shift remains Minor/10; phone/seatbelt remains Medium/15. Individual expiry and quiet-period frequency reset use 180 KSA calendar days. Stored historical points/frequencies are not rewritten. Score overview has only Iqama, Name and Total Points, with no Current Points filter. TBT options are No, Conducted and In Progres; transition dates use KSA time. The pure workflow plan defaults financial review to Pending and projects only category, description and individual statement to a driver's document.

Pure, locally tested workflow rules prepare Maintenance source/status relationships, manual versus sourced Fleet maintenance dates, Depot tariff 2.18 SAR/L, fuel expense linkage for 270 SAR per day, stable Traffic expense keys, nondecreasing Post-Trip odometers and ownership-bound training confirmations without signature images. These plans are not active persistence or authorization.

Both Roster entries retain their existing navigation permissions but show Coming Soon. Active Roster controller, stylesheet, worker and PDF generator are removed. Portal snapshots exclude schedule data. The pure historical roster parser, non-personal location catalog and shared Excel/PDF/ZIP libraries remain for compatibility and unrelated modules. No schedule workbook or personal history is deleted. Trip Check retains its questionnaire, signatures and PDF source; the redundant Selected Driver Name display is removed while its internal reference remains. Traffic Violations is the visible tracker name; internal `penalties` permission keys remain unchanged. Appeals no longer exposes Type/Department; deduction overview no longer exposes Related Expense/Method. Historical source fields remain available in stored records.

## Exact SQL approval boundary

Review **only** `supabase/review/operational-data/02_write_receipts_rpc_review.sql`. Do not run the earlier `01_write_receipts_proposal.sql`, a previously staged SQL 02, or both proposals. The new SQL refuses existing receipt/role/public-RPC collisions; an installed older proposal needs a separate source-reviewed migration.

The transaction creates restricted `taxiqaid_operational_login` (LOGIN/NOINHERIT/NOBYPASSRLS), `taxiqaid_operational_backend` (NOLOGIN) and `taxiqaid_operational_owner` (NOLOGIN). Login may SET the backend role; backend may execute only `taxiqaid_auth_api.operational_dispatch(uuid,text,jsonb)`. Neither browser roles, service_role nor login has dispatcher EXECUTE or receipt table access. The owner alone has its forced-RLS receipt policy. It calls the existing source-fingerprinted `admin_require(actor,'drivers.edit',false)` for current active Management/mapping/capability/dependency/override checks; no authentication table policy/data/schema is changed. Only a narrowly scoped EXECUTE grant on this existing helper is proposed.

Temporary SET/CREATE grants are removed before COMMIT. Supabase-managed postgres memberships from supabase_admin with ADMIN=true/INHERIT=false/SET=false are preserved exactly; unexpected memberships abort. The transaction rejects missing/changed authorization definitions, invalid/null inputs, reused operations, invalid transitions and unsafe result IDs/versions. No existing account, permission, counter or operational record is deleted/reset.

### Owner procedure after review, not authorization to execute

1. In the TaxiQaid project `mqkflwsvnzcaylxtvsje`, inspect whether any operational receipt proposal has already been applied. Stop on any preexisting receipt table/role/public RPC; do not drop it.
2. Review this complete SQL 02 and restricted connection provisioning/security implications. Approve the exact commit separately before execution.
3. After approval only, use Dashboard SQL Editor as ordinary postgres. Execute the whole transaction once. A failed preflight/statement rolls everything back; never execute isolated pieces to bypass a failure.
4. Verify restricted role attributes, exact memberships, forced RLS, no CREATE remaining and no browser/service-role EXECUTE. No new login password is present in SQL. Provision a new restricted role credential privately only under separate approval. Do not replace existing broker or administrative credentials.
5. Review exclusive Google writer controls. Sheets has no general compare-and-swap: these application locks cannot protect against independent spreadsheet/API editors. Sheet structural changes/direct writers must be excluded or writes must remain off. A flag is not evidence of that operational restriction.
6. Only after all checks and separate activation approval: configure the new server-only `TAXIQAID_OPERATIONAL_DB_URL` (exact restricted username, dedicated project, verified TLS), optional `TAXIQAID_OPERATIONAL_DB_CA`, `TAXIQAID_OPERATIONAL_WRITES_ENABLED=true` and `TAXIQAID_GOOGLE_WRITERS_CONTROLLED=true`. Their absence keeps writing off. The code never derives write authority from SUPABASE_SERVICE_ROLE_KEY.
7. Deploy only operational-data with verify_jwt=true under separate approval. Use an explicitly approved existing non-Master operational record/test dataset for genuine save, audit and cross-workbook recovery verification. No hosted write is PASS from mock/SQL tests. Do not publish a functioning Save claim until evidence is recorded.

Rollback: turn the new operational write gate off, retain readonly reads and all receipts/audit/records, and redeploy the last approved readonly function if necessary. Revert frontend commits normally including asset versions. Never drop the ledger or undo account/authentication SQL to roll back UI. Uncertain operations require source/evidence review; never manually delete their rows or change state solely to free the gate.

## Additional domain connection inventory

Each connection requires its real workbook ID, existing service-account sharing and exact tab/header verification. No new workbook ID has been supplied or invented. The existing Google service-account credential is reused server-side. No credential value belongs in a browser or this document.

| Domain | Required Secret | Additional approved tabs |
| --- | --- | --- |
| Accidents | TAXIQAID_ACCIDENTS_SHEET_ID | — |
| Breakdowns | TAXIQAID_BREAKDOWNS_SHEET_ID | — |
| Maintenance | TAXIQAID_MAINTENANCE_SHEET_ID | REQUESTS |
| Fuel | TAXIQAID_FUEL_SHEET_ID | — |
| Trip Check | TAXIQAID_TRIPCHECK_SHEET_ID | ANSWERS |
| NCR | TAXIQAID_NCR_SHEET_ID | DRIVER_SCORE, FINANCIAL_APPROVAL, CATEGORIES |
| Traffic Violations | TAXIQAID_TRAFFIC_VIOLATIONS_SHEET_ID | — |
| Training | TAXIQAID_TRAINING_SHEET_ID | SIGNOFFS |
| Driver Deductions | TAXIQAID_DEDUCTIONS_SHEET_ID | EXPENSES |
| Driver Appeals | TAXIQAID_APPEALS_SHEET_ID | — |
| Customer Care | TAXIQAID_CUSTOMER_CARE_SHEET_ID | — |
| Driver Profile Requests | TAXIQAID_DRIVER_PROFILE_REQUESTS_SHEET_ID | — |
| User Directory | TAXIQAID_USER_DIRECTORY_SHEET_ID | — |
| Driver Reset Requests | TAXIQAID_DRIVER_RESET_REQUESTS_SHEET_ID | — |

The server's proposed DATA readers use fixed module/Secret mappings and exact headers. New domains require explicit `TAXIQAID_OPERATIONAL_READ_DOMAINS` allowlisting and their ID; default is empty. Current subview permissions are checked as well as dependencies (e.g. ncr.records.view, maintenance.overview.view). Administrative mirrors are Master-only; Driver accounts cannot reach this Management endpoint. Extra tabs are specified, not automatically exposed as browser-selectable ranges. General CRUD/filtered export/form bindings and durable cross-domain jobs for these fourteen modules are **not implemented as active integrations**. Their frontend sources remain disconnected until reviewed persistence, IDs and testing exist.

## Unresolved integration work — not a completion claim

- Approve/install the coordinator and verify source-writer exclusion and genuine Drivers/Fleet writes. SQL remains a proposal. Manual reconciliation of partially applied ambiguous batches needs an owner-controlled, evidence-reviewed recovery procedure before broad production use.
- Supply/verify fourteen workbook IDs and implement the remaining per-domain CRUD, server-generated permanent IDs, linked job receipts and frontend form/data bindings. Permanent visible IDs must use an approved durable allocator seeded from authoritative history; never compute max+1 in the browser, renumber deletions or reuse IDs. Fuel/financial visible IDs additionally require collision detection plus internal UUIDs.
- Review Driver provisioning/recovery migration and endpoint contracts separately. Existing broker/access handlers intentionally reject Driver/Iqama login. The owner selected Iqama as initial username/password with no mandatory first-change; this is predictable credential material and remains an activation risk requiring explicit security review. No Driver is provisioned here. Master-approved recovery must use a short-lived single-use grant and official Auth, bound to the verified linked UID, stored outside Sheets; requests/resolutions may be mirrored with masked phone only. No reusable link/token/password/hash may enter DATA or CHANGE_LOG.
- Optional contact email must be separated from the existing immutable Auth/recovery identity in a separately reviewed administrative change. The current working Create/Edit/Reset/Delete functions and real-email requirement are preserved; removing frontend validation alone would break secure provisioning.
- Frontend permission migration proposals remain proposals. Preserve all 107 definitions, 101 Master grants and six Driver denials. No proposed Finance/reset/sync capability is backend authority yet.
- Apply only independently authorized hosted changes and verify them before merge/Pages publication. Main and Pages are unchanged while these blockers remain.

## Validation reproducibility

Use simulated data only. `node --require ./tests/deny-live-auth.cjs --test tests/*.test.cjs`; `deno task --config supabase/deno.json check`; `deno test --allow-read supabase/functions/_shared/*_test.ts supabase/functions/_diagnostics/*_test.ts tests/*.deno.ts`; `TAXIQAID_TEST_PUBLIC_GATEWAY=true TAXIQAID_TEST_USER_ADMIN=true TAXIQAID_TEST_OPERATIONAL_WRITES=true node tests/broker-postgres.cjs` (disposable PostgreSQL 16 Docker only). Run schema/deployment/static generators with `--check`. Run all fourteen browser suites configured in the review workflow against loopback, with the deny-live-auth preload. Workbooks, PDFs, screenshots and raw logs stay outside Git. CI runs no cloud SQL, operational writes, hosted Auth or deployments.

The exact frontend-only retirement/addition map is `schemas/operational-permission-proposal.json`. Twelve obsolete controls are omitted from Access & Permissions; full draft snapshots still preserve inherited/backend values for those keys. Newly proposed Finance, traffic-sync and recovery actions have no active permission toggles and no backend grants. The immutable backend catalog remains 107/101/6. Six Overviews (Accidents, Breakdowns, Maintenance, Fuel, NCR and Customer Care) are reproduced by `scripts/build-operational-overviews.cjs --check` from the approved visibility flags; corresponding full forms/details remain intact. These presentation changes do not implement missing hosted CRUD.

Read-only deployed function inventory: get-my-access v63 (verify_jwt=true), login-with-identifier v64 (verify_jwt=false because its handler authenticates the signed gateway flow), manage-users v10 (verify_jwt=true), operational-data v4 (verify_jwt=true). Listing deployment metadata does not verify flags, source parity or genuine new writes. No deployed version changed in this task.

## Local performance comparison

Three cold loopback contexts per viewport, same pinned SDK/synthetic Auth, 10 ms script delay and 100 synthetic users. These are observations with sampling variance, not hosted latency/capacity guarantees. No eager module, polling or library load was added.

| Metric (ms) | 375 px main → branch | 1280 px main → branch |
| --- | --- | --- |
| Login visible | 478 → 400 | 410 → 398 |
| Navigation to usable Dashboard | 669 → 566 | 652 → 552 |
| First Fleet opening | 151 → 193 | 230 → 246 |
| Fleet reopening | 60 → 69 | 67 → 62 |
| 100-user refresh/render | 71 → 128 | 75 → 62 |

Both entries loaded 17 initial scripts and two stylesheets. Login medians improved in this sample; first Fleet opening and the mobile 100-user sample were slower. No uniform speedup is claimed. The inspection/scheduling flow and shared modules remain lazy. CHANGE_LOG verification is bounded to 10,000 events/8 MB; reaching that bound fails closed. Evidence paging/retention must be reviewed before growth; never delete historical audit to free a write gate.

## Recorded local validation and publication state

219 Node tests and 56 Deno tests passed, including the actual generated deployment with synthetic official-SDK/OAuth transport. Strict Deno checks passed. All fourteen configured browser suites passed against the real local frontend; the last Driver change was additionally checked for same-operation reconciliation and preservation of Not Yet license data. All 18 views, responsive layouts, current authentication/session regression coverage and 107/101/6 were retained. The disposable PostgreSQL 16 suite passed the exact source-fingerprinted authorization preflight, migration rollback/install/collision paths, managed membership cleanup, narrow grants, invalid/null payloads, operation reuse, sealed transitions, unresolved lock retention and live-in-fixture account revocation. A null-boolean authorization defect found during development was corrected and its negative test now passes. This is local database evidence, not hosted SQL or Google save evidence.

The existing production Pages deployment for baseline `4c3b0f5ba22c718e3475e19f55cd75924e3d20ef` is successful (Actions run 43996952813; Pages source main `/`, status built). This development work has not been published or merged. Retain the write branch and any other unfinished branches. The complete change inventory is [the manifest](OPERATIONAL_CHANGE_MANIFEST.md). No new migration, identity/reset activation or real operational Save/CHANGE_LOG result is reported as applied/PASS.

The expanded Actions run at 58b3e45 stopped before complete Node tests because its offline safety preload imports Playwright before the browser step had installed it. The workflow correction installs that pinned test dependency before the preload, sets its module path for the entire job, uses supported Ubuntu 24.04 and coalesces push/PR runs. Application protections and test assertions are unchanged; a failed run is not reported as PASS.

A subsequent Actions run passed Node, Deno, PostgreSQL and the first twelve browser suites, then Chrome for Testing 151 reported `Resulting promise was garbage collected` while the Sheets harness awaited an internal navigation Promise immediately after login. The harness now waits for the admitted Dashboard, navigates through the actual sidebar and requires the target view's ready state before checking records. No production security rule, pagination assertion or failure check is removed. Local Chromium is v155; downloading the CI v151 binary into this environment was blocked by its CDN policy, so compatibility must be confirmed by the real Actions run, not claimed from local reproduction.
