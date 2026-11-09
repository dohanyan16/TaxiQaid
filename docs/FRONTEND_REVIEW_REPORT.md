# TaxiQaid UI standardization review

Base inspected: `main` at `29a6157`. This revision standardizes frontend presentation and record search without connecting operational databases or changing approved business rules.

## Design system

`shared/common.css` now defines one orange/neutral system for color, typography, weights, line heights, 46px minimum controls, radius, padding, spacing, cards, tables, tabs and normal dialogs. Orange is #F58220 with #D96A10 hover; the sidebar remains #1E1E2D. Primary actions use orange and exports/refresh/cancel/close use neutral styling. Dedicated semantic colors remain for danger and meaningful inspection/NCR statuses.

Redundant ordinary-control inline styles and green Excel/Save colors were removed. Buttons grow or wrap instead of clipping labels, desktop actions retain natural widths, labels wrap above controls, and native controls have consistent padding/focus/read-only treatment. Full native-select values appear below the control when clipped. Integration notices participate in layout instead of covering fields or buttons. Headers can grow, compact navigation remains usable, field grids shrink safely and table scrolling stays inside table containers.

Decorative emoji labels were removed. Navigation uses a consistent monochrome SVG set; collapse/expand controls retain visible chevrons, accessible names and state. The TaxiQaid logo remains unchanged. Mathematical symbols, field values, identifiers and approved category labels are preserved.

## Shared search

`shared/search.js` provides the centralized field/identifier configuration and one combobox/listbox implementation for Fleet, Drivers, Accident, Breakdown, both Maintenance views, Fuel, both NCR views, Penalties and Trip Check Overview. Former adjacent identifier filters were consolidated into one Search Records field. Date ranges, status/category selectors and NCR exact/min/max point controls remain independent.

Matching trims/collapses whitespace, ignores case, supports partial text and normalizes license-plate separators. Existing field aliases and numeric zero are preserved. Suggestions render text safely and expose accessible control/option state. Arrow Up/Down, Enter, Escape, Tab and outside-click behavior are shared. A selected suggestion applies the stable record identifier and exact selection state, avoiding similarly prefixed IDs matching multiple records. Typing resets that selection. Full field descriptions remain readable on narrow screens. No source requests or fabricated operational records were added.

Fleet/Drivers profile searches now use the shared component, including VIN/model and phone matching. Existing Accident and Trip Check date/type filters use the selected-record predicate. Penalties uses the same shared query alongside its inclusive date range. Disconnected modules stay empty pending future authorized source adapters.

## Preserved behavior

- Existing Supabase configuration, password login, role lookup, sessions and logout remain in place; the login script change concerns only the sidebar toggle's visual/accessibility state.
- NCR category penalties and 90-day recovery implementation are unchanged.
- Depot pricing remains 2.18 SAR/L and 50 L still calculates SAR 109.00.
- Accident/Breakdown/Maintenance IDs, all overview business columns and permanent original source references remain intact.
- Penalties is still read-only with Close-only record details and no creation/edit/deletion actions.
- Trip Check retains all 27 steps, 24 inspection questions, scoring, signature canvas, editor and custom PDF implementation. The PDF generator source is verified byte-for-byte against its pre-change hash. Only ordinary styling, emoji labels, overview search and modal focus/notice handling changed.
- Legacy spreadsheet/Apps Script connections remain disconnected; no schemas, migrations, backend scripts, operational storage or database connections were added.

## Validation results

| Check | Result |
| --- | --- |
| All application JavaScript syntax and `git diff --check` | Pass |
| Unit regressions (`node --test tests/*.test.cjs`) | 24 passed |
| Existing workflow browser suite | Pass, all 17 pages |
| New visual/search browser audit | Pass, all 17 pages |
| Responsive widths | 320, 375, 768, 1024, 1440px |
| Increased text scaling | 200% at 768px |
| Shared search | Fields/aliases, normalized plates, partial/case/whitespace matching, exact selection, empty results and safe suggestions |
| Keyboard and accessible search state | Arrow Up/Down, Enter, Escape, outside dismissal, combobox/option state |
| Search with independent filters | Accident inclusive dates and Trip Check date/type filters verified with temporary local fixtures |
| Profile selection | Fleet VIN and Drivers phone searches select the correct plate/Iqama and open the correct profile |
| Layout | Label/control separation, natural button growth, no document/main/modal horizontal overflow, long selected-option descriptions |
| Trip Check | Hidden wizard state remains hidden; custom PDF source unchanged |
| Existing pricing/scoring/read-only requirements | Pass in unit and workflow tests |
| Runtime errors / legacy requests / operational writes / downloads | 0 |

Browser tests mock authentication and roles; live account/session verification was not performed because no account credentials were supplied. Synthetic records are used only in isolated local test harnesses and removed afterwards; they never populate production collections or persistent storage. The audit checks representative normal dialogs as well as the Trip Check wizard. Screenshots capture the actual browser, not generated designs.

Run a local server, then use `TAXIQAID_URL` to select it for `tests/workflow.browser.cjs` and `tests/ui.browser.cjs`. `TAXIQAID_SCREENSHOTS` selects an output directory. The new [design-system reference](DESIGN_SYSTEM.md) documents tokens, shared search and the Trip Check exception; the [workflow specification](TAXIQAID_WORKFLOW_SPEC.md) reflects unified searches while retaining business rules.

## Screenshots

| Page | Desktop (1440px) | Mobile (320px) |
| --- | --- | --- |
| Dashboard | [Desktop](screenshots/ui/desktop-dashboard.png) | [Mobile](screenshots/ui/mobile-dashboard.png) |
| Fleet Management | [Desktop](screenshots/ui/desktop-fleet.png) | [Mobile](screenshots/ui/mobile-fleet.png) |
| Drivers Management | [Desktop](screenshots/ui/desktop-drivers.png) | [Mobile](screenshots/ui/mobile-drivers.png) |
| Accident Tracker | [Desktop](screenshots/ui/desktop-accidents.png) | [Mobile](screenshots/ui/mobile-accidents.png) |
| Breakdown Tracker | [Desktop](screenshots/ui/desktop-breakdowns.png) | [Mobile](screenshots/ui/mobile-breakdowns.png) |
| Maintenance Tracker | [Desktop](screenshots/ui/desktop-maintenance.png) | [Mobile](screenshots/ui/mobile-maintenance.png) |
| Fuel Tracker | [Desktop](screenshots/ui/desktop-fuel.png) | [Mobile](screenshots/ui/mobile-fuel.png) |
| NCR Tracker / Driver Scores | [Desktop](screenshots/ui/desktop-ncr.png) | [Mobile](screenshots/ui/mobile-ncr.png) |
| Penalties Tracker | [Desktop](screenshots/ui/desktop-penalties.png) | [Mobile](screenshots/ui/mobile-penalties.png) |
| Trip Check | [Desktop](screenshots/ui/desktop-tripcheck.png) | [Mobile](screenshots/ui/mobile-tripcheck.png) |

Enlarged-text examples: [NCR form at 200%](screenshots/ui/text-200-ncr-form.png) and [long selected category](screenshots/ui/text-200-ncr-category.png).

## Changed files

- `AGENTS.md`
- `README.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/FRONTEND_REVIEW_REPORT.md`
- `docs/TAXIQAID_WORKFLOW_SPEC.md`
- `docs/screenshots/ui/desktop-accidents.png`
- `docs/screenshots/ui/desktop-breakdowns.png`
- `docs/screenshots/ui/desktop-dashboard.png`
- `docs/screenshots/ui/desktop-drivers.png`
- `docs/screenshots/ui/desktop-fleet.png`
- `docs/screenshots/ui/desktop-fuel.png`
- `docs/screenshots/ui/desktop-maintenance.png`
- `docs/screenshots/ui/desktop-ncr.png`
- `docs/screenshots/ui/desktop-penalties.png`
- `docs/screenshots/ui/desktop-tripcheck.png`
- `docs/screenshots/ui/mobile-accidents.png`
- `docs/screenshots/ui/mobile-breakdowns.png`
- `docs/screenshots/ui/mobile-dashboard.png`
- `docs/screenshots/ui/mobile-drivers.png`
- `docs/screenshots/ui/mobile-fleet.png`
- `docs/screenshots/ui/mobile-fuel.png`
- `docs/screenshots/ui/mobile-maintenance.png`
- `docs/screenshots/ui/mobile-ncr.png`
- `docs/screenshots/ui/mobile-penalties.png`
- `docs/screenshots/ui/mobile-tripcheck.png`
- `docs/screenshots/ui/text-200-ncr-category.png`
- `docs/screenshots/ui/text-200-ncr-form.png`
- `modules/accidents/accidents.css`
- `modules/accidents/accidents.html`
- `modules/accidents/accidents.js`
- `modules/breakdowns/breakdowns.html`
- `modules/breakdowns/breakdowns.js`
- `modules/compliance/ncr/ncr.css`
- `modules/compliance/ncr/ncr.html`
- `modules/compliance/ncr/ncr.js`
- `modules/compliance/penalties/penalties.css`
- `modules/compliance/penalties/penalties.html`
- `modules/compliance/penalties/penalties.js`
- `modules/drivers/drivers.css`
- `modules/drivers/drivers.html`
- `modules/drivers/drivers.js`
- `modules/fleet/fleet.css`
- `modules/fleet/fleet.html`
- `modules/fleet/fleet.js`
- `modules/login/login.css`
- `modules/login/login.js`
- `modules/maintenance/maintenance.html`
- `modules/maintenance/maintenance.js`
- `modules/operations/fuel/fuel.css`
- `modules/operations/fuel/fuel.html`
- `modules/operations/fuel/fuel.js`
- `modules/tripcheck/tripcheck.css`
- `modules/tripcheck/tripcheck.html`
- `modules/tripcheck/tripcheck.js`
- `shared/common.css`
- `shared/frontend-preview.js`
- `shared/search.js`
- `shared/shell.html`
- `tests/fleet.test.cjs`
- `tests/penalties.test.cjs`
- `tests/search.test.cjs`
- `tests/ui.browser.cjs`
- `tests/workflow.browser.cjs`
