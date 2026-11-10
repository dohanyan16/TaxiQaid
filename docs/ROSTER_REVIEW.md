# Roster Management review

Base inspected: `main` at `794d371b081e7841f1ed4f54636978d715eeabfa`. The same administrative Roster module now provides complete local file workflows. All 16 administrative pages remain available. The owner explicitly authorized local imports and PDF/ZIP/location JSON downloads; persistence, publication, WhatsApp sending and Driver Portal accounts remain unimplemented.

## Reference inspection and actual import results

The private supplied Day/Night workbooks were inspected outside the repository. Both contain worksheet Roster, seven dates in row 2, merged identity pairs in B/C, working assignments in the first D–J row and vehicles in the second. Delimited zone/stop names and real hours are preserved. Both sources refer to **November 8–14, 2026**, Sunday–Saturday in Asia/Riyadh.

| Reference result | Count |
| --- | ---: |
| Day Shift drivers | 204 |
| Night Shift drivers | 59 |
| Unique drivers | 263 |
| Working daily assignments | 1,578 |
| Rest Day assignments | 263 |
| Duplicate identities / vehicle overlaps | 0 / 0 |
| Approved reference locations | 76 |
| Distinct source stop names used | 40 |
| Matched / unmatched source stop names | 39 / 1 |

These counts are **inspection results, not production constants**. Future weeks calculate counts from their selected files, including zero-driver shifts. The unmatched geographic source name is **Ajyad St. – Ryi Bakhsh**. It is retained unlinked and listed with Add This Stop; no destination is guessed or permanent alias invented.

The private PDF reference was visually inspected, including its one-page A4 landscape geometry, logo, peach headers, black grid, green Rest Day cells and real hyperlink annotations. New PDFs are fresh vector documents with English-only labels. They never reuse the reference driver's identity or page image. Its `DEPOT - 00:30` is not present in the workbooks and is not inferred.

## Implemented views and workflows

- **Daily Overview:** date, shared Name/Iqama/Plate search, shift/duty/zone/stop filters, accurate filtered counts, highlighted Rest Days, real ending times and mapped stops.
- **Weekly Roster:** one driver per row, active week and shift filters, all seven dated assignments, wrapped long locations and personal-schedule selection.
- **Driver Schedule & PDF:** stable selected Iqama, full personal week, private local PDF preview/download, real overnight endings and honest unconfigured stations.
- **Roster Import:** both selected source names/counts, complete paired-row/calendar/identity/assignment validation, atomic same-week replacement, paginated issues, worker generation progress/cancellation and explicit incomplete-batch reporting.
- **Stops & Locations:** 76 approved reference coordinates, paginated shared search, Add/Edit Stop, aliases, duplicate/range validation, similar-name warnings, mapping-impact confirmation, unknown-stop resolution without reimport, local JSON export and reviewed atomic JSON replacement.

Maps use latitude before longitude and actual PDF link annotations. Explicit zone coordinates stay separate from stop mappings. Local catalog changes invalidate older downloads. Location export contains only non-personal configuration fields.

WhatsApp Delivery provides settings, proposed English message preview, recipient review and empty future delivery history. Connection starts **Not Configured**. Phone/eligibility values remain unavailable; Send Weekly Schedules is disabled. No messages, provider statuses or phone numbers are fabricated.

## Verification evidence

| Check | Result |
| --- | --- |
| Application JS syntax and `git diff --check` | PASS |
| `node --test tests/*.test.cjs` | PASS — **53 tests**, including 16 Roster tests |
| `tests/workflow.browser.cjs` | PASS — all 16 pages; mocked login, role denial/lookup/logout; existing business workflows |
| `tests/ui.browser.cjs` | PASS — all 16 pages at 320, 375, 768, 1024 and 1440px; 200% text; exact Trip Check PDF function hash preserved |
| `tests/people.browser.cjs` | PASS — Appeals, Training, financial previews and updated empty Roster navigation |
| `tests/roster.browser.cjs` with private reference paths | PASS — actual 263-driver import/ZIP plus **812-driver synthetic** full PDF/ZIP batch; all tabs/filters/dialogs, mapping changes, failed-import preservation, stale-download invalidation, incomplete generation and private-session clearing |
| Actual reference ZIP inspection | PASS — **263 PDFs**, one per correct unique driver; every personal name/Iqama/date/vehicle checked; **1,812** actual Maps annotations compared with each assigned stop's approved coordinates |
| Synthetic artifact inspection | PASS — **815 PDFs** including the 812-file ZIP and individual/resolved/long-name cases; **4,974** correct Maps annotations, English labels, landscape size, green Rest Day cells, logo and page bounds |
| Long/Unicode text and future mapping cases | PASS — supported accented names and long zone/stop text preserved; distinct explicit zone/stop/DEPOT links; explicit isolated station-time fixture only; unsupported glyphs report an incomplete batch |
| Network/storage observations | No legacy requests, operational writes, messaging calls or operational localStorage/IndexedDB writes |

The real complete reference ZIP was approximately **35.8 MB**. The synthetic 812-driver ZIP had the correct dynamic count and week-specific filename. Generation runs in a worker; navigation/pagination remained usable while it ran. Failed PDFs remain in the remaining/error counts and never enable a complete ZIP. Dense vehicle conflicts are reported once per affected assignment through a sorted scan, including a 1,000-driver conflicting-input unit case without quadratic error allocation.

Browser authentication is mocked. Existing live credentials were not supplied. Login/auth configuration, sessions/roles code, all existing business modules, Maintenance provenance and Trip Check source are unchanged. The only shared behavior adjustment clears stale search suggestions when explicitly clearing a search, so logout cannot retain roster suggestions.

Private inputs, personal PDFs, ZIPs, reference/actual PDF renders and raw logs are outside the repository. Public screenshots below contain only cleared, empty assignments and the non-personal catalog. No private workbook, reference PDF, personal schedule or generated PDF/ZIP is committed.

## Changed files

| Area | Files |
| --- | --- |
| Roster | `modules/people/roster/roster.html`, `roster.css`, `roster.js`, `roster-model.js`, `roster-pdf.js`, `roster-worker.js`, approved `locations.json` |
| Shared | `shared/bootstrap.js`, `shared/search.js`, `shared/shell.html` |
| Local dependencies | `assets/vendor/roster/`: three pinned JS distributions, two licensed Unicode fonts, license notices, README and checksums |
| Tests | `tests/roster-fixtures.cjs`, `tests/roster.test.cjs`, `tests/roster.browser.cjs`, `tests/verify-roster-pdfs.py`, updated `tests/people.browser.cjs` and `tests/ui.browser.cjs` |
| Policy/docs | `.gitignore`, `AGENTS.md`, `README.md`, `docs/CHANGELOG.md`, `docs/DESIGN_SYSTEM.md`, `docs/TAXIQAID_WORKFLOW_SPEC.md`, this review |
| Public visual evidence | Eight cleared-interface PNGs under `docs/screenshots/roster/` |

## Screenshots

| View | Desktop | Mobile |
| --- | --- | --- |
| Daily Overview | [Desktop](screenshots/roster/desktop-roster-daily.png) | [Mobile](screenshots/roster/mobile-roster-daily.png) |
| Weekly Roster | [Desktop](screenshots/roster/desktop-roster-weekly.png) | [Mobile](screenshots/roster/mobile-roster-weekly.png) |
| Personal schedule | [Desktop](screenshots/roster/desktop-roster-personal.png) | [Mobile](screenshots/roster/mobile-roster-personal.png) |
| Stops & Locations | [Desktop](screenshots/roster/desktop-roster-locations.png) | [Mobile](screenshots/roster/mobile-roster-locations.png) |

## Remaining integrations

Permanent stop configuration updates; approved per-driver station schedules; secure roster approval/publication/version history and adjacent published-week checks; operational storage and private document retention; Supabase account-to-driver ownership mapping and Driver Portal; verified phone/consent/provider configuration, approved English templates, explicitly confirmed WhatsApp batches, genuine delivery events and idempotent retries. No secret credentials or live integration is implemented. The [workflow specification](TAXIQAID_WORKFLOW_SPEC.md#roster-management--implemented-local-frontend) separates these future contracts from the implemented local behavior.

GitHub publication must be verified against the exact integrated `main` SHA. A successful Pages workflow and direct production accessibility are separate checks; local tests do not prove deployment.
