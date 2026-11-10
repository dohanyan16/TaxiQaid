# TaxiQaid shared design and search standards

The application is a static, modular frontend. Use `shared/common.css` and `shared/search.js` for conventional module interfaces. Do not add a parallel framework or copy a search implementation into individual modules. All user-facing text, comments and documentation are English. Keep the TaxiQaid logo and existing sidebar/navigation structure.

## Tokens and typography

| Purpose | Shared token / value |
| --- | --- |
| Primary / hover | `--primary: #F58220`, `--primary-hover: #D96A10` |
| Sidebar | `--bg-dark: #1E1E2D` |
| Page / card | `--bg-light: #F4F6F8`, `--card-bg: #FFFFFF` |
| Neutral controls | `--secondary`, `--secondary-hover`, `--readonly-bg` |
| Text / borders | `--text-main`, `--text-muted`, `--border-color` |
| Font | `--font-family`: Arial, Helvetica, sans-serif |
| Page titles | `--font-page: 1.625rem` (26px at default size) |
| Section titles | `--font-section: 1.25rem` (20px) |
| Body / controls | `--font-body`, `--font-control`: .875rem (14px) |
| Descriptions / labels / tables | `--font-small`, `--font-table`: .8125rem (13px) |
| Line height / weights | `--line-height: 1.5`, normal 400, strong 600, bold 700 |
| Standard control minimum | `--control-height: 2.875rem` (46px) |
| Control radius / padding | `--control-radius: .5rem`, `--control-padding` |
| Card / modal / spacing | `--card-padding`, `--modal-padding`, `--layout-gap`, `--field-gap`, `--card-radius` |

Rem-based typography and control minimums support increased text size. Heights grow with content; never clamp long button text or labels to a fixed single line. Prominent inspection scores may retain their specialized scale.

## Conventional interfaces

Use a title, short description, actions, shared record search plus independent business filters, then a horizontally scrolling overview with counts or an honest empty state. Cards, tabs, field grids and action rows reuse `.card`, `.card-header-flex`, `.button-group-row`, `.workflow-grid`, `.workflow-tabs`, `.action-row` and `.tracker-table-container`.

- `.btn-primary`: orange for Add and Save. `.btn-secondary`: neutral for Refresh, Export, Clear, Cancel and Close. `.btn-danger`: reserved for destructive actions. Buttons have matching type, padding, radius, minimum height, focus and disabled treatment; desktop widths remain natural and actions wrap on small screens.
- Standard inputs/selects use matching minimum height, font, padding, borders and orange focus. Labels wrap above controls. Read-only/disabled controls use legible neutral styling. Textareas grow vertically.
- Native selects keep their original semantics. If a selected value is clipped, a full-text description appears beneath it and is associated through `aria-describedby`; the option is not renamed or truncated in the source. Dynamically created profile selects receive the same treatment.
- Tables retain all business columns and identifiers, use shared header/cell spacing, and scroll inside their own containers. Empty messages stay visible within the container. Do not use the page itself as a horizontal scrolling surface.
- Normal modals use responsive widths, internal scrolling, consistent title/field/action spacing and keyboard dismissal/focus containment. Preserve read-only modules' Close-only record dialogs.
- Integration-pending notices participate in layout, including within a currently open dialog. They must not float over inputs or action buttons. No backend action may imply success while disconnected.
- Buttons are text-only. Sidebar icons are monochrome SVGs with the same view box, size and stroke. Decorative emojis are removed; mathematical symbols, data fields and IDs remain unchanged. The compact sidebar retains meaningful icons and a labeled collapse/expand control.

## One record search per view

`TaxiQaidSearch.CONFIG` declares the searchable fields and preferred stable identifier for each view. `setupSearchDropdown` / `TaxiQaidSearch.create` binds the same accessible component to every overview; `TaxiQaidSearch.matches` is the shared pure matching function.

| Configuration | Search fields |
| --- | --- |
| fleet | Car Plate/Plate, VIN, Model, Brand |
| drivers | Iqama, Driver Name/Full Name, Phone Number |
| accidents | Accident ID, Car Plate, Driver Iqama, Driver Name |
| breakdowns | Breakdown ID, Car Plate, Driver Iqama, Driver Name |
| requests | Original Source ID/ID, Car Plate, Car Model, Sent By |
| overview | Maintenance ID, Original Source ID, Car Plate, Maintenance Engineer Iqama |
| fuel | Fuel Record ID, Car Plate, Driver Iqama, Driver Name |
| ncr | NCR ID, Driver Iqama, Driver Name |
| scores | Driver Iqama, Driver Name |
| penalties | Penalty ID/ID, Driver Iqama, Driver Name, Car Plate |
| roster | Driver Name, Driver Iqama, Car Plate |
| rosterDriver | Driver Name, Driver Iqama |
| rosterLocations | Stop Name, Aliases |
| customerCare | Customer Care Case ID (ID/Case ID), Car Plate, Customer Name |
| helpdesk | Ticket ID, Creator Email, Creator Name/Created By |
| tripcheck | Check ID, Car Plate, Driver Iqama, Driver Name |
| appeals | Appeal ID, Driver Iqama, Driver Name |
| trainingOverview | Driver Iqama, Driver Name |
| trainingSessions | Session Reference, Training Name, Trainer |
| trainingAttendance | Driver Iqama, Driver Name, Training Session |
| driverBalances | Driver Iqama, Driver Name |
| driverExpenses | Expense Reference, Driver Iqama, Driver Name, Source Reference |
| appliedDeductions | Deduction Reference, Driver Iqama, Driver Name, Related Expense |

Matching trims/collapses whitespace, normalizes case and supports partial text. Only plate fields also ignore spaces, hyphens, underscores and periods. Aliases handle existing Fleet/Drivers field names; numeric zero is preserved. A field description below the control remains readable on narrow screens even when the placeholder is clipped.

Suggestions use actual supplied records, safe `textContent`, a combobox/listbox relationship, `aria-expanded`, `aria-activedescendant`, and selected option state. Arrow Down/Up navigate; Enter selects; Escape, Tab and outside clicks close the list. Selecting a suggestion applies its stable identifier and exact record state, so similarly prefixed IDs do not accidentally select multiple records. Typing again clears that selection. Empty results never fabricate records.

Date ranges, statuses, categories and NCR exact/min/max point filters remain separate and operate alongside text matching. Switching module/tabs retains filters until the user changes or clears them. The application still has no connected operational source: empty modules remain empty, and a later authorized source adapter must supply the actual records and apply the shared predicate with its business filters. Search itself performs no network requests or persistence.

## Trip Check exception

Preserve its 27-step wizard, 24 questions, inspection scoring, signature canvas, special choices, editor and custom PDF layout/source. Standard page actions use shared orange/neutral colors and typography; dedicated scoped styles retain the inspection layout and allow long choices to wrap. Specialized vehicle/driver selector keyboard behavior remains supported. Do not replace these widgets with a generic one-page form.

## Validation

Run `node --test tests/*.test.cjs`, the `tests/workflow.browser.cjs`, `tests/ui.browser.cjs`, `tests/people.browser.cjs`, `tests/roster.browser.cjs` and `tests/support.browser.cjs` against a local HTTP server. The UI audit checks all 16 administrative pages at 320, 375, 768, 1024 and 1440px, and 200% text scaling at 768px. It checks label/control separation, natural button growth, page/modal overflow, long selected text, shared search keyboard/selection behavior and exact Trip Check PDF source preservation.

Review desktop/mobile screenshots for Dashboard, Fleet, Drivers, Accident, Breakdown, Maintenance, Fuel, NCR, Penalties, Trip Check, Appeals, Training and Drivers Deduction, plus enlarged-text form examples. The people suite audits all internal tabs and dialogs, including the bounded driver picker and financial history. Synthetic test records are isolated to local test harnesses and removed afterwards; they are never production fixtures or database records.

Roster uses the same shared search, controls, tabs and responsive tables. Its approved geographic catalog is visible from startup; private assignments remain empty until local imports validate. Read-only configuration provenance distinguishes supplied coordinates from local edits/additions. Real local PDF/ZIP/JSON downloads are explicitly authorized for Roster only. Its landscape PDF follows the reviewed company reference with English labels and separate measured text layout. No other module export behavior changes.

Customer Care uses native radios with monochrome SVG star outlines and orange selected fills, 46px targets, numeric rating output and an explicit unrated state. Details/editing share the standard modal and preserve focus when controls change mode. Helpdesk has two tabs; its shared search appears in the Manage Tickets overview, while Create Ticket is a separate form. Long private descriptions stay fully readable in details and use safe text nodes/visual clipping in overview cells. User-directory and department-access notices describe unavailable features without claiming permissions.
