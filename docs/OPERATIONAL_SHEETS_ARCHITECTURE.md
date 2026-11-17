# Operational Sheets adapters — approved readonly exception

Drivers/Fleet readonly connection is now explicitly authorized. See [the exact service, schema, permission and write blockers](DRIVERS_FLEET_SHEETS.md). Only those two DATA sources are prepared for connection (deployment is currently approval-blocked); the future write/other-domain design below remains inactive.

Authentication, accounts, permissions, departments and administrative audit remain authoritative in the dedicated Supabase project. Management uses the existing signed Worker/Supabase broker and online access response. Driver provisioning and other operational data services remain disabled. No new spreadsheets, Google Cloud projects, credentials, secrets, databases or endpoints are created by this preparation.

## Module lifecycle and reads

`TaxiQaidModules` initializes each authorized page once, coalesces resource loads, cancels obsolete entry reads and rechecks the current permission lease before showing a page. `onEnter` refreshes; `onLeave` cancels reads, while writes retain their idempotency receipts rather than being assumed rolled back. `onReset` clears private state on identity/permission changes. User Management retains its existing authenticated Supabase service. All `TaxiQaidSources` adapters except approved Drivers/Fleet reads return an explicit disconnected result; no legacy URL is called. There is no operational polling or localStorage/IndexedDB database. Existing authentication lease renewal remains a security control.

The pure `TaxiQaidOperationalContract` prepares bounded pages (maximum 100 records), opaque bounded cursors, unique stable record IDs, positive versions, operation IDs and bounded quota retries. It does not authorize an operation or supply an active transport. Future per-module adapters must use owner-approved typed schemas; browser requests are untrusted proposals. Cancellation cannot prove a write was rolled back.

## One private workbook per approved module/domain

Each approved workbook will have `DATA` and `CHANGE_LOG`. A protected server allowlist maps module keys to workbook IDs, schema versions and approved columns; the browser cannot choose arbitrary IDs, tabs, ranges, credential scopes or actor identities. Private Google credentials stay server-side. Never copy passwords, tokens, administrative grants or complete identity mappings into Sheets.

A server authenticates the real Supabase JWT online, checks active account/type, effective capability/dependencies and record/department scope for **every data operation**, and derives the actor UID itself. Management and Driver services must enforce separate account types and driver UID linkage; a page path or client-supplied type is never authority. No Driver operational endpoint can activate before secure provisioning.

Reads use stable-ID/cursor pagination, explicit field allowlists and bounded filters. Row position is not a record identifier. Responses contain an authoritative version and UTC timestamps; the UI converts instants through the shared Asia/Riyadh display boundary. Caches are memory-only, scoped to verified UID/permission generation, cleared on revocation/logout, and never extend an access lease.

## Writes, audit and concurrency prerequisites

Each request carries an operation UUID, stable record ID, expected version, action and approved field changes. The server validates types, ownership, state transitions and permission scope; it controls record IDs and UTC timestamps. `CHANGE_LOG` records the operation, actor UID, action, affected ID, before/after version and outcome. Minimize changed-field metadata; never duplicate complete sensitive payloads in logs.

A single Sheets `spreadsheets.batchUpdate` can validate/apply data and audit updates together **within one workbook**, but Sheets supplies no general conditional row-version compare-and-swap or cross-service transaction. Batch atomicity alone does not prevent concurrent writers from reading the same version. Operational writes stay blocked until an approved server-side serialization/lease and idempotency ledger is designed. Reuse the existing Supabase architecture where suitable; proposing any new coordination objects requires separate approval. Do not hold database transactions open across unbounded Google calls.

After ambiguous network/provider timeouts, consult the authoritative operation receipt before retrying. Never duplicate an audit append or report success from an unconfirmed response. Preserve pending/reconciliation states. Do not automatically retry validation, permission, version-conflict or credential failures. Honor bounded Retry-After on 429 and cap transient retries/backoff; expose sanitized status, counts and latency only. Global/per-identifier authentication protections remain unchanged.

Delete semantics, retention, record schemas, read scopes and conflict resolution are owner decisions still required per module. Keep tombstones/history where required; historical references must survive current-record removal. No approved schema or distributed-write coordinator exists yet, so no operational write is presented as active.

## Free-tier operation and approval boundary

Use existing Supabase Free, GitHub Pages Free and Cloudflare Free infrastructure. Do not promise measured traffic or provider capacity. Track bounded request/error/429/reconciliation counts without payloads, tokens, passwords or identifiable IP logs; define pilot limits after workload measurements. Cancel/coalesce obsolete reads, reuse initialized static assets and refresh on navigation rather than polling.

Connection approval must specify workbook schemas/IDs, sharing/credential scope, source ownership, authorization and row-scope contracts, concurrency/idempotency storage, retention, quota budgets, rollback and a disposable synthetic test dataset. Authentication/administrative sources must not be duplicated into a second authentication system or into operational Sheets. Legacy Apps Script integrations remain disconnected.
