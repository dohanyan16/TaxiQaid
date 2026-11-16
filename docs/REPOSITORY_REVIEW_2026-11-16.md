# Repository correction and validation — 2026-11-16

Baseline: `b23572f3e104db2a4132d51df2f402f280d1627d` (latest remote main before this work). All three temporary branch tips were already included in that baseline, unprotected, with no open PRs. Their removal is conditional on verified publication of the corrected main.

## Shipped frontend and reviewed backend scope

- User Management Actions stay inside their cell at 320/375/768/1280/1920px; desktop table overflow is explicitly checked at 1280/1920px. UID/role/status/time columns are compact, with readable wrapping and table-only scrolling on small screens.
- UTC instants render through shared `Asia/Riyadh` helpers. User Management and request/audit times, common preview tables, Customer Care/Helpdesk details/history, existing Fleet/Drivers/Accident/Trip Check consumers and the retained Trip Check PDF follow this boundary. Date-only schedules/expiry dates remain calendar dates; birthdays explicitly retain their source calendar date. NCR/Roster already use explicit KSA or pure calendar arithmetic and are preserved. Operational exports remain disconnected; no live export integration was activated.
- Bootstrap downloads classic scripts concurrently while preserving declaration execution order and waiting for all modules. Login/shell fragments load concurrently. The unused HTML-to-PDF bundle is removed; the existing pinned local SheetJS parser replaces its duplicate CDN load. Directory lookup/display rows and permission controls are reused; caches clear on session changes. Authentication, authorization, loading/error gates and session cleanup remain mandatory.
- Permanent deletion replaces the archive-only UI contract. The server uses the official Admin hard-delete API only after a private transactional revocation receipt, exact identity/CAS/typed confirmation and protected target checks. It confirms Auth absence before private cleanup, preserves audit, and supports same-operation recovery. SQL 06 and the archive compatibility path remain historical; **SQL 07 and the new Edge artifact have not been deployed**. Existing services without the readiness capability cause Delete User to be disabled, rather than silently archiving an identity.

## Local evidence

- Node: **186 passed**, zero failures.
- Deno: **53 passed**, plus strict source/type checks and **three** actual handler/signed-pipeline tests against isolated PostgreSQL 16 (official Auth responses mocked).
- PostgreSQL 16: exact/missing/modified/additional role constraints; SQL 05/06/07; transactional rollback/repeated-install rejection; managed memberships and temporary-grant cleanup; RLS; required/duplicate/immutable email; Master protection; 107 definitions, 101 Management grants and six Driver denials; 20/10/10, nonce/replay; hard-delete partial failure, recovery, private cleanup, retained audit and username/email reuse all passed. Restricted administrative owner has no auth schema/table read access.
- **11 browser suites passed**: workflow, UI, people, Roster, support, portal, dedicated migration, main disabled gate, Master lifecycle, User Management and KSA/PDF. Real frontend and pinned official SDK, synthetic transport only. Driver admission remains disabled. Reset Password requests recovery without opening Edit User; password-policy checks remain unchanged. No real passwords were changed and no real accounts were deleted.
- PDF artifact verification: **815 synthetic PDFs**, 4,974 map annotations, English labels, landscape bounds and rest styling passed. Private artifacts remain outside the repository.
- **149 JavaScript syntax checks**; deterministic administrative SQL/Dashboard, signed broker/gateway/validation artifacts and permission-catalog checks passed.
- Two browser fixtures were corrected to inject mocks at script **execution** time rather than download time. The SQL prototype's catalog privilege/name-resolution defects and the Auth mock's missing API-version header were corrected before final validation; no security check was relaxed.

## Controlled performance comparison

Three cold loopback browser contexts per version, 1280px viewport, artificial 10ms script-response delay, 100 synthetic directory accounts, no hosted Auth/SQL. Baseline and final measurements ran consecutively after other suites finished. The local preview filters external libraries; these figures are not production latency or provider capacity guarantees.

| Median | Baseline | Corrected |
| --- | ---: | ---: |
| App ready | 1695 ms | 983 ms |
| Refresh/render 100 users | 213 ms | 173 ms |

The baseline Actions buttons escaped their cell; corrected buttons are contained. Reproduce using `node --require ./tests/deny-live-auth.cjs scripts/benchmark-frontend.cjs /tmp/taxiqaid-performance.json`. The generated measurements are not committed.

## Remaining hosted prerequisite

Automatic approval review rejected the attempted read-only hosted SQL inspection because private metadata/hosted SQL needs additional explicit approval. No alternate access path was used. See [the exact owner-controlled schema inspection, SQL 07 / Edge rollout, feature gate and rollback procedure](SAFE_USER_ARCHIVE.md). Custom triggers, unknown dependencies and deployed schema/source compatibility must be reviewed before rollout. Existing archived accounts are never automatically deleted. A genuine hosted deletion test needs a separately approved disposable office account. New live Master authentication was not attempted; existing owner evidence is preserved and local lifecycle checks passed.

## Exact changed-file manifest

- `assets/vendor/roster/README.md`
- `docs/PROJECT_GUIDE.md`
- `docs/REPOSITORY_REVIEW_2026-11-16.md`
- `docs/SAFE_USER_ARCHIVE.md`
- `docs/USER_MANAGEMENT.md`
- `index.html`
- `modules/administration/user-management/user-management.css`
- `modules/administration/user-management/user-management.html`
- `modules/administration/user-management/user-management.js`
- `modules/customer/customer-care/customer-care.js`
- `modules/customer/helpdesk/helpdesk.js`
- `modules/drivers/drivers.js`
- `modules/tripcheck/tripcheck.js`
- `scripts/benchmark-frontend.cjs`
- `shared/bootstrap.js`
- `shared/people-preview.js`
- `shared/utils.js`
- `supabase/dashboard/manage-users.ts`
- `supabase/functions/manage-users/runtime.ts`
- `supabase/review/user-management/07_hard_delete_inspect.sql`
- `supabase/review/user-management/07_hard_delete_users.sql`
- `tests/_user-admin-fixture.cjs`
- `tests/auth-migration.browser.cjs`
- `tests/ksa-time.browser.cjs`
- `tests/ksa-time.test.cjs`
- `tests/support.browser.cjs`
- `tests/user-admin-postgres.e2e.ts`
- `tests/user-admin.browser.cjs`
- `tests/user-admin.deno.ts`
- `tests/user-archive.test.cjs`
