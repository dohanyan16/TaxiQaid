# Customer Care and Internal Helpdesk review

Base inspected: `main` at `b59090876ead9de4e85a6776549359b4491205cb`. The two remaining customer-support placeholders are replaced with separate frontend workflows. Their operational data is disconnected; no case/ticket is created, updated, exported or sent. All 16 administrative pages remain accessible through the same navigation/module paths.

## Customer Care Tracker

- Exact 23-column overview, shared Case ID/Car Plate/Customer Name search, independent plate/status filters, safe long-text clipping and complete details.
- Six-section case form with all requested fields, required initial source information, optional customer identity/contact, unconnected Fleet/user-directory selectors and read-only ID/audit/resolution values.
- Approved channel/type/category/priority/department/status choices; New default without automatic assignment, escalation, closure or rating rules.
- Accessible native five-radio/vector-star component, numeric 1–5 output, keyboard arrows and a genuine Unrated/Clear state. Zero is never substituted for an unrated customer.
- Optional refund details and exact two-decimal SAR information, distinguishing blank from an explicit zero. No financial transaction or refund is issued.
- Details/editing, current source assignee and read-only future resolution history. Original Received Date and backend audit fields stay read-only in the editing preview. Save never changes the source snapshot.
- Case ID convention documented as `CS-YYYYMMDD-NNNN`, with future authoritative KSA date, atomic date-local four-digit sequence and permanent identity. No browser ID or timestamp generation exists.

## Internal Helpdesk

- Exactly Create Ticket and Manage Tickets tabs; receiving Department and multiline Description are separate from requester profile information.
- Your Email uses confirmed existing SDK account information when available. Unconfirmed/missing email stays blank; login usernames and user-editable profile metadata are not substituted. Your Department remains pending until an approved profile contract exists.
- Shared Ticket ID/Creator Email/Creator Name search, stable Created By filter, Pending/In Progress/Done status filter and exact eight-column tracker.
- Complete read-only creator/description/audit details and an unsaved status selector. No source row or resolution timestamp changes on Save.
- One future unified registry with backend filtering by current account, department membership, action and ticket assignment. No complete registry download/client-side department hiding, account enumeration, direct Auth Admin API or fabricated cross-department permission is introduced.

All Save/Submit/Refresh/Export controls show integration-pending messages. Clear Form retains the verified identity display while clearing the ticket draft. Navigation/modal closure preserves business filters. Logout/account change clears private drafts, snapshots and search suggestions. Source content uses safe text nodes/textarea values; no customer descriptions/contact fields are inserted as HTML.

## Validation

| Check | Result |
| --- | --- |
| All application JavaScript `node --check`; `git diff --check` | PASS |
| `node --test tests/*.test.cjs` | PASS — **63 tests**, including 10 new support-policy tests |
| `tests/workflow.browser.cjs` | PASS — all 16 pages, mocked login/role denial/role lookup/logout and retained business workflows |
| `tests/ui.browser.cjs` | PASS — all 16 pages, new support forms/search and preserved Trip Check PDF function hash |
| `tests/people.browser.cjs` | PASS — Appeals, Training and financial previews preserved |
| `tests/roster.browser.cjs` | PASS — 812-driver synthetic PDF/ZIP workflow, stop management and existing Roster behavior |
| `tests/verify-roster-pdfs.py` | PASS — 815 synthetic PDF artifacts and 4,974 actual map annotations preserved |
| `tests/support.browser.cjs` | PASS — exact columns/options, required fields, confirmed/unconfirmed identity, native star keyboard controls, blank/zero/refund validation, independent identities/departments, safe long text, unchanged source snapshots, retained filters and pending controls |
| Responsive review | PASS — 320, 375, 768, 1024 and 1440px; 200% text at 768px; labels/control separation, natural button growth and page/modal containment |
| Runtime observations | No uncaught JavaScript errors, legacy/operational requests, operational writes, notifications, support exports or operational browser-storage writes |

Authentication and test records are mocked. Tests explicitly verify confirmed email separately from unconfirmed/email-missing accounts and ignore user-editable department metadata. Live login still needs an existing authorized account; no credentials were supplied. Existing authentication configuration, sessions/roles implementation, business modules, Roster/local dependencies and Maintenance provenance are unchanged.

Synthetic case/ticket fixtures exist only in tests, are cleared before screenshots and are absent from deployed modules. Screenshots show empty trackers or unassigned, explicitly unsaved form controls; the enlarged rating image demonstrates the widget without creating a case. No real customer/account/ticket data is committed.

## Changed files

| Area | Files |
| --- | --- |
| Customer Care | `modules/customer/customer-care/customer-care.html`, `.css`, `.js` |
| Helpdesk | `modules/customer/helpdesk/helpdesk.html`, `.css`, `.js` |
| Shared contracts | `modules/customer/support-policy.js` |
| Loading/search | `shared/bootstrap.js`, `shared/search.js` |
| Tests | `tests/support-policy.test.cjs`, `tests/support.browser.cjs`, updated `tests/ui.browser.cjs` |
| Documentation | `AGENTS.md`, `README.md`, `docs/CHANGELOG.md`, `docs/DESIGN_SYSTEM.md`, `docs/TAXIQAID_WORKFLOW_SPEC.md`, this review |
| Visual evidence | Nine PNGs under `docs/screenshots/support/` |

## Screenshots

| Interface | Desktop | Mobile |
| --- | --- | --- |
| Customer Care | [Desktop](screenshots/support/desktop-customer-care.png) | [Mobile](screenshots/support/mobile-customer-care.png) |
| Case form | [Desktop](screenshots/support/desktop-customer-case-form.png) | [Mobile](screenshots/support/mobile-customer-case-form.png) |
| Create Ticket | [Desktop](screenshots/support/desktop-helpdesk.png) | [Mobile](screenshots/support/mobile-helpdesk.png) |
| Manage Tickets | [Desktop](screenshots/support/desktop-helpdesk-manage.png) | [Mobile](screenshots/support/mobile-helpdesk-manage.png) |

[Rating at 200% text](screenshots/support/text-200-rating.png).

## Future integration decisions

Secure customer-case storage and permissions/contact redaction; atomic case-ID date/sequence allocation and overflow/retry contracts; eligible active-user directory/assignment validation; closure/reopening/refund approval and numeric export representation; one unified Helpdesk registry, approved permanent ticket ID format, authoritative department memberships/action permissions and audit/concurrency rules. Supabase remains the identity source. Secure backend plus separately approved Sheets/Drive architecture is future work only; no operational table, Sheet, migration, API connection or notification service is created.

See the [workflow specification](TAXIQAID_WORKFLOW_SPEC.md#customer-care-tracker--external-customer-cases) for exact vocabularies, all fields and required future backend authorization. Publication must be verified against the integrated remote `main` commit; a local test result does not prove GitHub Pages accessibility.
