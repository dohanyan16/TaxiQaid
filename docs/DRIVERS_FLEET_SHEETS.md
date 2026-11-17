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

After approved readonly deployment, sign in normally as Master, open Drivers and Fleet and inspect their status badges. Connected 0 is valid; an access/header/quota error is not a PASS. For an aggregate-only check, run the reviewed `scripts/check-operational-reads.browser.js` in the console of that signed-in Pages tab: two readonly POSTs, stop on an authentication/authorization failure, report only module/status/HTTP/count/ms and sanitized error code/phase/upstream status. Never copy tokens, credential files, Network response bodies, names, Iqamas or email addresses into chat. Without an actual owner JWT request, real Sheet access/counts/latency remain **UNVERIFIED**; deployment success alone does not prove Google access.

Rollback: restore the previous frontend release by a normal revert, and remove only this new readonly function if necessary. No SQL, secret, workbook, account, audit or authentication rollback is needed. No cleanup of operational records is authorized.

## Current deployment status

The **new readonly** `operational-data` function was deployed directly to the existing TaxiQaid Supabase project `mqkflwsvnzcaylxtvsje`, originally as **version 1, ACTIVE**, with `verify_jwt=true`, from the reviewed generated artifact SHA-256 `cd44a236d07defc289ce42054d59e72fdccad94f3cdff38eb2ecfb00e906d34a`. Deployment was confirmed by the Supabase function listing and by fetching the hosted deployed source. The three preexisting functions (get-my-access, login-with-identifier, manage-users) remained active at their previous versions.

**Owner-reported hosted evidence:** Master is signed in, get-my-access returns HTTP 200, and operational-data returns HTTP 503 with GOOGLE_CONFIGURATION_INVALID. Google workbook access, actual row counts, pagination and hosted latency are not yet confirmed. No user's session or token was accessed for verification. Do not claim 0 records or a successful Sheets read until the owner runs the aggregate-only browser check above. The frontend remains unpublished on the review branch pending that check.

No SQL, operational write, CHANGE_LOG append, workbook edit, secret change, credential rotation or Driver activation was performed in this deployment. Future write activation still requires a separate reviewed schema/authorization and durable concurrency/idempotency coordinator.


## HTTP 503 configuration investigation

Baseline `426bb9253c0dea482566be75e905d75261c53561`, `google.mjs:9`, emits the same `GOOGLE_CONFIGURATION_INVALID` for a missing/malformed JSON secret and failed type/email/key-field checks. Those throws occur **before** key import, OAuth, Google API enablement or workbook access. Therefore the owner-observed error does not establish a Google sharing/API failure. The underlying secret subtype cannot be inferred from that one code. Read-only inspection found hosted version **2, ACTIVE, verify_jwt=true**, with its source byte-identical to the generated `cd44a236…` artifact. The deployment generator is not the observed mismatch source. No credential value was retrieved.

The repair preserves the exact `TAXIQAID_GOOGLE_SERVICE_ACCOUNT_JSON` name and official service-account type/email/PKCS8 RSA signing. It accepts harmless outer BOM/whitespace, one JSON-string serialization envelope and escaped PEM line breaks, then independently validates fields/base64/key import. Invalid or non-service-account identities still fail closed. Google token audience, hosts, readonly scope, JWT/account/permission checks and workbook allowlist remain fixed.

`OPERATIONAL_CONFIG` is a **local-only** boot check of environment, parsing and crypto, logged once per isolate with code/phase and optional fixed normalization codes. It makes no network call, displays no secret values, exposes no diagnostic route and grants no unauthenticated access. `GOOGLE_CONFIG_READY` does **not** mean OAuth/Sheets passed. Authenticated `OPERATIONAL_READ` failures include only the safe error code/phase and optional upstream HTTP status. OAuth descriptions, Google error messages, cell data, tokens, email, JSON and key contents never leave those error boundaries.

| Code / phase | Exact next owner check if observed live |
| --- | --- |
| GOOGLE_SECRET_MISSING / secret | In TaxiQaid → Edge Functions → Secrets, verify the exact existing key name above has a nonempty value. Do not copy its value into chat. |
| GOOGLE_SECRET_UNAVAILABLE / secret | Check the deployed function/project/environment binding; this is not evidence of malformed JSON. |
| GOOGLE_JSON_INVALID or GOOGLE_JSON_ROOT_INVALID / json | Privately ensure this Secret is the service-account JSON object from Google Cloud, not a shell assignment, base64 document, array or OAuth client configuration. Do not share it. |
| GOOGLE_TYPE_INVALID / fields | The original Google key document must contain type equal to service_account. Other credential types are not accepted. |
| GOOGLE_CLIENT_EMAIL_INVALID / fields | The original document must contain the service account's client_email ending in .gserviceaccount.com. No username, API key or workbook URL can replace it. |
| GOOGLE_PRIVATE_KEY_MISSING / fields or GOOGLE_PRIVATE_KEY_* / pem/crypto | Use the intact private_key from that same Google key document, with BEGIN PRIVATE KEY/END PRIVATE KEY. Do not manually reconstruct or publish the key. Import failure is separate from OAuth rejection. |
| GOOGLE_OAUTH_INVALID_GRANT / oauth | Inspect Google key/account validity and server clock in the owner's Google project; JSON/key import has already passed. Do not rotate credentials automatically. |
| GOOGLE_SHEETS_API_DISABLED / sheets | In the existing service account's Google project, verify Google Sheets API is enabled. No new project/service is required. |
| GOOGLE_SHEETS_PERMISSION_DENIED or GOOGLE_SHEET_NOT_FOUND_OR_NOT_SHARED / sheets | Privately verify the matching existing Sheet ID and sharing. A 404 cannot distinguish missing from undisclosed private workbooks. The readonly scope cannot prove the exact Editor role; the owner can confirm it in each workbook's Share dialog. |
| SHEET_HEADERS_MISMATCH / headers | Compare the DATA row-one headers with the exact arrays in shared/sheets-model.js. No automatic Sheet edits occur. A truly blank tab is not a valid header-only empty source. |

Verification requires the new deployment's configuration code, actual owner-session reads for **both** books, exact-header validation and actual counts. Preserve the feature branch/PR and do not publish main/Pages while any read fails or remains unverified. Roll back only operational-data to the previously downloaded reviewed artifact if necessary; retain verify_jwt=true and leave all secrets, SQL, accounts and existing functions unchanged.


### Repair deployment blocker

The tested HTTP 503 repair was committed to the existing feature branch/PR. Updating only operational-data with verify_jwt=true was attempted, but automatic approval review rejected replacement of the active function because it does not recognize the authorization in the uploaded request as explicit trusted chat approval. The function remains at the previously inspected version 2 and old source unless independently changed by the owner. No secret was read out, exported, changed or rotated. No SQL or frontend publication was performed. Explicit approval directly in chat is required before retrying this deployment; do not use a different deployment path to evade that rejection.

Until that approved update starts, the existing generic error cannot identify which private environment/JSON field failed. Do not assert the actual Secret was missing, mistyped or pasted incorrectly. The new runtime code/normalization report is required to establish the precise subtype. Do not repeat the same old-version Master request expecting better diagnostics.
