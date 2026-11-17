# Drivers and Fleet — approved readonly Google Sheets integration

## Connected boundary

`operational-data` is a separate JWT-protected Edge Function in the existing TaxiQaid project `mqkflwsvnzcaylxtvsje`. It never replaces login, get-my-access or manage-users. It uses only the three existing secrets: `TAXIQAID_GOOGLE_SERVICE_ACCOUNT_JSON`, `TAXIQAID_DRIVERS_SHEET_ID`, `TAXIQAID_FLEET_SHEET_ID`. No secret value, private JSON credential file, new account, schema or role is needed for reads. OAuth uses the fixed `spreadsheets.readonly` scope, fixed Google token/API hosts and RS256 signing in server memory. Redirects are rejected. There is no Apps Script or browser-to-Google credential path.

Each POST first verifies the genuine user JWT online with the pinned official SDK, then obtains current active-account/effective-permission metadata from the **unchanged deployed get-my-access**. UID/type/expiry, explicit Deny and dependencies are checked using the shared model. Anonymous/Driver accounts are denied. No editable metadata, submitted actor, workbook, range, tab or scope is trusted. Only the existing Pages origin is accepted; CORS is additional protection, not authorization.

Existing `drivers.view` and `fleet.view` are **domain-wide authorized-record grants**: these exact Sheets have no department/owner column or approved row-assignment mapping. Department membership alone grants no access. Nonempty resource-specific scopes that cannot be represented in this schema fail closed. This release does not claim department-row isolation; introducing that requires an approved mapping and server tests. Export requires its own effective capability and its view dependency. Driver vehicle choices require drivers.edit (and its view dependency), returning only Plate/Model; Fleet's authorized Assigned Driver field returns only matching names/Iqamas, never unrelated Driver details.

## Data, pagination and freshness

Exact column arrays live in `shared/sheets-model.js`. Header aliases are applied only at the frontend boundary: Iqama → Iqama Number, Date Of Birth → Date of Birth, Total Km → Total KM. Google headers must exactly match the approved order. Store identifiers as Plain text in Sheets; zeros already lost in a numeric source cell cannot be reconstructed. No header/ID/version is silently repaired or written by reading.

Read pages contain at most 100 records. Each fresh traversal reads the current source. Continuations may reuse a server-memory snapshot for at most 15 seconds, while identity and current permissions are rechecked on **every page**. A digest binds cursor, UID, purpose and returned dataset; source drift rejects continuation with 409, never merges mixed snapshots. Cursor offsets are not authority. Browser traversal loads all authorized pages into memory (review limit: 10,000 records/8 MiB Google response); larger sources fail explicitly. Search can find records beyond page one, suggestion lists offer batches of 100, overview tables show 25 rows, and exports include the complete authorized traversal.

No persistent operational cache or polling is added. Navigation/manual Refresh coalesce active reads, abort stale navigation, and clear records on identity/permission revocation. Empty header-only DATA returns connected/0, distinct from invalid headers or Google failures. Google errors keep a clear stale-data warning. SDK session refresh and existing lease checks stay intact.

Per-isolate bounds: eight concurrent handlers, two Google source reads, one-flight OAuth/read coalescing, and at most three Google GET attempts on transient status/429 with bounded delay/20-second read budget. No retries on 401/403 or arbitrary redirects. These are **not distributed quota enforcement**. The service account shares Google quota across instances; provider 429 remains authoritative. Do not promise Free-tier workload capacity. Page traversals also consume online Auth checks: measure real workload before scaling. Logs contain only fixed module/status/count/elapsed fields, never payloads, tokens, credentials or identifiable IPs.

## Drivers, Fleet and Excel

All 19 Driver and 15 Fleet functional columns remain visible/searchable in their existing record pages and bounded overviews. Driver edit preview exposes only the eight approved fields, fixed arrangement/shift/status options, international prefix/validated national phone and automatic KSA Out of Project date. Vehicle choices work without opening Fleet. Full Name and other locked fields remain text. **Save is not available**: no production write endpoint or Google write scope exists.

Fleet is read-only even with the inherited fleet.edit grant. Assigned Driver/Availability derive from the current Drivers source when complete and reliable; otherwise source values remain with a warning. Total Km, Accidents and maintenance dates are preserved from Sheets until their authoritative modules connect; blanks do not become invented zeroes. Fleet does not write back derived relationships.

Excel loads only on Export, after server export authorization, and exports the approved functional DATA headers/all authorized records. CHANGE_LOG and internal metadata are excluded. Formula-like strings are escaped and cells remain strings, including leading-zero identifiers. No automatic export or private workbook is committed.

## Writes and CHANGE_LOG — deliberately blocked

`write-proposal.mjs` and `supabase/review/operational-data/01_write_receipts_proposal.sql` are **unconnected review proposals**. They are not imported by the readonly entry and no SQL is executed. Local tests cover editable-field validation, versions, KSA dates, canonical phone, duplicate receipt handling, conflict rejection, redacted 12-column audit and ambiguous-outcome recovery. Those tests are not proof of a deployed durable coordinator.

Before Save can activate: review/provision the minimal private durable receipt store and narrowly scoped API role; implement transactional actor/body-bound claims and a workbook-wide unresolved-write lock; initialize permanent opaque UUID record IDs/positive versions through an approved controlled operation; protect the editable source range from concurrent manual/other API writers or bring all writers under the same coordinator. A local lease cannot fence a delayed Google call. Uncertain writes must not auto-expire/retry; recover only exact confirmed event/record/version evidence. Sheets batch atomicity alone is not compare-and-swap. Read-only-row identity fallbacks (`ro-` digest) and null missing versions cannot be used for writes.

A future Google batch must update only approved cells + Row Version/Updated At UTC and append the exact CHANGE_LOG schema within the same workbook. Never log full Iqama/passport/phone values. The proposal does not yet implement the real Google batch or durable SQL functions; both remain approval blockers. Assignment display currently derives from Drivers so no dual-workbook transaction is claimed. If materialized Fleet writes become necessary, require an approved recoverable outbox/saga with independently confirmed steps.

## Owner verification and rollback

After approved readonly deployment, sign in normally as Master, open Drivers and Fleet and inspect their status badges. Connected 0 is valid; an access/header/quota error is not a PASS. For an aggregate-only check, run the reviewed `scripts/check-operational-reads.browser.js` in the console of that signed-in Pages tab: two readonly POSTs, stop at first failure, report only module/status/HTTP/count/ms. Never copy tokens, credential files, Network response bodies, names, Iqamas or email addresses into chat. Without an actual owner JWT request, real Sheet access/counts/latency remain **UNVERIFIED**; deployment success alone does not prove Google access.

Rollback: restore the previous frontend release by a normal revert, and remove only this new readonly function if necessary. No SQL, secret, workbook, account, audit or authentication rollback is needed. No cleanup of operational records is authorized.

## Current review status

Local validation passes with simulated provider transport; this does not establish hosted Sheet access. The attempted creation of the **new** readonly `operational-data` function was rejected by automatic approval review, which requires explicit deployment authorization in chat rather than inferring it from the uploaded request. No function version exists from this work, no hosted Sheet request was performed, and neither 0 records nor an access error can be asserted for either book. The frontend remains unpublished on the review branch until this backend deployment blocker is resolved. Existing get-my-access/login-with-identifier/manage-users and all secrets/SQL/accounts remain untouched.

Required owner approval: explicitly authorize creation of only the new readonly operational-data function in TaxiQaid with verify_jwt=true and the existing Google secrets, followed by authorized owner-session read verification and publication of the validated frontend to main/Pages. Operational SQL/write activation remains excluded. Use the aggregate-only browser check above after deployment; a valid signed-in Master session must stay private to the owner.
