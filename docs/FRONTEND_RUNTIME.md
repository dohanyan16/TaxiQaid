# Frontend runtime and release boundary

## Entries and authorization

`index.html` is Management-only; `driver.html` is a separate Driver-only login and contains no ERP or Management link. Both use the existing dedicated public configuration and pinned official SDK, with memory-only sessions. The current broker/access contract still rejects Driver provisioning/Iqama login. The Driver page is explicitly unavailable until that backend is approved; it never falls back to employee credentials or the old project. The Management controller/client rejects a Driver account response before publishing UI authority. Existing server-side account-type, active-status, UID, capability/dependency and scope checks remain mandatory. No hosted SQL, Edge, secret, account or password changes are part of this frontend work.

The 107 permission definitions, 101 Management grants and six Driver-only denials remain unchanged. `TaxiQaidAccess.can` evaluates current effective backend permissions and expiry, not edited drafts. Scope-sensitive capabilities still require their specific resource scope; 101 grants do not imply blanket access to every Driver document. Native hidden/inert state removes denied folders/pages/tabs/actions before display; capture guards reject restricted synthetic clicks/submits. Empty groups disappear. Groups start closed per identity, retaining existing details/summary navigation. Legacy management compatibility is limited to its separately validated legacy role and disconnected previews; it never authorizes dedicated administrative writes or operational sources.

## Lazy lifecycle

The login downloads only its shell, authentication/permission dependencies, shared/login CSS and pinned SDK. No business view, phone/Excel/PDF library or operational source is loaded before admission. Dashboard initializes independently; business helpers load once with the first permitted business module. A view's markup, stylesheet and classic dependencies load only when allowed. Classic scripts retain order; shared promises coalesce rapid navigation and initialize each module once.

`TaxiQaidModules.register(name,{init,onEnter,onLeave,onReset})` supplies lifecycle hooks. `init`/classic initialization happens once; `onEnter` refreshes after permission checks. Entry generations and AbortSignals suppress stale reads. Leaving cancels reads, while writes keep their operation receipts. User Management uses its existing authenticated service and a manual refresh remains available. Disconnected modules explicitly show integration pending. There is no operational polling; the existing authentication lease checks remain intact.

Logout, expiry, account/permission changes hide views/modals first, revoke pending work, clear private state and reset module-specific caches. A failing reset quarantines that module until reload. Resource caching never extends an authorization lease. Local Roster imports remain in memory only and clear on session revocation; they do not become a Google source.

## Integrity and CSP

Run `node scripts/build-asset-versions.cjs` after asset changes and `--check` before publication. Public per-file SHA-256 cache keys version HTML fragments, classic scripts and CSS; dynamic scripts/styles carry matching SRI. The unchanged official `@supabase/supabase-js@2.119.0` browser bytes are pinned locally with SRI, removing external script dependencies. Phone loads only with the personal preview; Excel/PDF/ZIP libraries load in their existing authorized import/export worker flows. No service worker or operational persistent cache is introduced.

Management and Driver CSPs permit self-hosted scripts only, reject inline event handlers/eval, restrict connections to the existing approved auth services, block objects and restrict forms/base URLs. Recovery keeps its stricter dedicated policy and six-character minimum. Inline **styles** remain permitted on app entries for the existing layout/dynamic styles; inline scripts are not. GitHub Pages cannot supply custom response headers, and meta CSP cannot enforce frame-ancestors: no anti-framing header guarantee is claimed. Changing that hosting boundary would require separate approval.

Drivers/Fleet profiles and edit controls use DOM nodes/text/value properties; Accident rows use text nodes. Imported workbook formula rejection, stable identity validation, PDF/document hashes, trusted map URLs and existing readonly behavior remain in place. HTML fragments come from fixed same-origin registry paths and executable attributes/scripts are removed. No arbitrary module URL or backend destination is accepted.

## Validation and future sources

`tests/lazy-security.browser.cjs` exercises the actual production entry/SDK with only loopback synthetic transport: no eager business assets, closed/empty groups, 101 grants, readonly hiding, forbidden module rejection, rapid navigation, stale read suppression, XSS, revocation and separate disabled Driver entry. Compatibility suites may explicitly initialize **authorized** modules using test-only helpers; performance/security suites do not use eager helpers. Fixture instrumentation supplies matching test-source digests, so SRI remains active.

Use `scripts/benchmark-navigation.cjs` for three cold desktop/mobile contexts and login, application readiness, first/reopened page and 100-user render metrics. Results are synthetic local timings, not provider capacity or production latency guarantees.

[Operational Sheets architecture](OPERATIONAL_SHEETS_ARCHITECTURE.md) is preparation only. No Sheets/Apps Script transport is activated and no new database, workbook, Google credential, secret or endpoint is created. Future schemas, row-scope enforcement, a concurrency/idempotency coordinator, retention and quota budgets require owner approval before connection. Existing Supabase administrative sources remain authoritative.

## Local release evidence

Baseline: remote `main` at `8f555f29ef4f9e0079f54ff2fd98b2a43cd234aa`. The same benchmark script ran consecutively against that archived source and this release, with three cold contexts per viewport, a 10 ms script-response delay, synthetic Auth and 100 synthetic administrative records. Mobile means a 375 px browser viewport, not a physical-device or mobile-network measurement. All timings below are medians in milliseconds. The total includes immediate synthetic sign-in, with no human typing delay.

| Metric | Mobile before → after | Desktop (1280 px) before → after |
| --- | --- | --- |
| Login visible | 793 → 308 | 753 → 349 |
| Navigation start to usable Dashboard | 888 → 447 | 901 → 500 |
| Submit to usable Dashboard | 87 → 139 | 136 → 128 |
| First Fleet opening | 90 → 141 | 60 → 137 |
| Fleet reopening | 49 → 52 | 52 → 50 |
| 100-user refresh/render | 76 → 72 | 71 → 84 |
| Initial scripts (including local test fixture) | 50 → 17 | 50 → 17 |
| Initial stylesheets | 20 → 2 | 20 → 2 |

The first Fleet opening now pays for deferred business helpers/markup/CSS; those resources are reused afterward. Reopening and small-table timings show no consistent improvement, and the desktop table measurement is slower in this run. Do not extrapolate these synthetic timings to hosted latency or capacity. The release removes pre-login business downloads and batches shared table DOM insertion; existing Roster pagination stays at 25 visible rows.

Final local checks: **191 Node tests, 53 Deno tests, strict Deno checks, 154 JavaScript syntax checks and 12 browser suites passed**. Browser suites: workflow, UI, people, Roster, support, portal, auth migration, main gate/legacy compatibility, Master lifecycle, User Management, lazy security and KSA time. Coverage includes all 18 views, 320–1440 px layouts/200% text, 107 definitions/101 grants/six Driver denials, explicit Deny/dependencies, unauthorized administrative calls, six-character recovery, Master protection, recoverable deletion with mocked Auth, refresh/expiry/logout, cancelled reads and malicious Driver/Fleet fields. Deterministic auth/SQL/Dashboard generators and 106 static asset digests passed. No hosted SQL, authentication request, account mutation or provider security-setting change was performed.

Commands: `node --require ./tests/deny-live-auth.cjs --test tests/*.test.cjs`, `deno test --allow-read tests/*.deno.ts`, `deno task --config supabase/deno.json check`, and the browser suites with the offline preload. Business suites use `TAXIQAID_URL=http://127.0.0.1:8004/` and private screenshot/PDF output directories. `node scripts/build-asset-versions.cjs --check` and existing generator `--check` commands verify released files. `scripts/benchmark-navigation.cjs` reproduces the bounded loopback performance fixture. Logs, screenshots, workbooks and generated personal PDFs remain outside Git.

A frontend rollback reverts the complete frontend release commit, including its asset manifest and entry cache keys, through a normal follow-up commit. Never reset accounts, roll back hosted SQL or delete audit records to undo this UI release. Driver backend activation and each future Sheets connection require separately approved schemas/security tests; no such readiness is claimed here.
