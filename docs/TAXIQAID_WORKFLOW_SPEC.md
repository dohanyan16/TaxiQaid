# TaxiQaid workflow specification

## Current phase and boundaries

This phase is **frontend-only**. Operational collections start empty. All legacy spreadsheet URLs are disconnected; legacy transport helpers reject without network access. Login and navigation do not synchronize data. Refresh displays the unconnected state. Save, Delete, Export and Send controls in the previously disconnected business modules never persist, download operational data or report success. **Roster Management is an explicitly authorized exception for local administrator-selected Excel processing and PDF/ZIP/location-JSON downloads only; it does not persist or publish operational records.** Unsaved fields, dropdowns, dialogs, inspection scoring and Maintenance tabs are interface previews only. There are no replacement localStorage or IndexedDB databases.

Supabase URL, public key, password login, existing sessions, user profiles, role lookup and logout remain on the existing project. The existing `taxiqaid_roles` authorization boundary is preserved. There are no new tables, migrations, spreadsheets or Apps Script projects. Authentication SDK storage remains separate from operational records.

The shared sidebar, static module paths, existing styling, Fleet/Driver profiles and Trip Check wizard/editor/PDF source remain in place. Customer Care, Helpdesk, User Management and Driver Portal now provide disconnected interfaces; authenticated driver onboarding and all new operational services remain future work. Do not implement persistence until the interfaces and future database design are approved.

## Dedicated identity migration — prepared, not activated

The dedicated Supabase authentication migration is isolated from production until genuine testing and explicit owner cutover approval. See [SUPABASE_AUTH_MIGRATION.md](SUPABASE_AUTH_MIGRATION.md) for the approved public configuration, protected username/Iqama broker, `get-my-access` contract, baseline, security controls, tests, missing live verification and rollback. The old project remains untouched, and ordinary production login stays on the existing configuration during development.

The approved new project is `https://mqkflwsvnzcaylxtvsje.supabase.co`. It owns identity/security information only; Google Sheets remains a future private operational source. The owner has verified the six private tables and exact columns; the mapping uses `user_id`, `role_key`, `department_key`, `permission_key` and boolean `is_allowed`, preserving the reported 107 definitions/101 Master grants without schema recreation. Boolean user overrides convert true to allow, false to deny and absent rows to inherit; inactive permissions and departments are filtered. No operational tables, real account provisioning, permission writes or migration deployments are performed now. Quality is consolidated into canonical `qhse`; Finance and Financial stay separate; nine approved identity departments support multiple memberships without automatic record rights.

The disabled staging entry is `auth-migration-preview.html`. New access resolves the verified UID, active account, approved full name, role defaults, overrides, module/nested dependencies and explicit scope. Management receives no driver self-service capabilities. Future driver login remains UID → stable driver reference → Iqama, with exactly the same four personal sections. The verified account schema has no driver-link/Iqama fields; no columns or identities are added, and backend Iqama resolution remains pending provisioning. AAL1 is valid; no mandatory MFA or additional login verification is introduced. Every future backend operation independently checks identity/status/capability/scope and records authoritative UID/full-name snapshot/UTC time with Asia/Riyadh display.

The disabled username broker candidate uses a restricted PostgreSQL LOGIN identity, transaction-local SET ROLE to the existing non-login backend, and only two narrowly scoped SQL API functions. The owner has verified the counter table already exists; it is never recreated. Distributed counters commit before private lookup/password verification, while the Data API remains disabled. See [the backend review](USERNAME_LOGIN_BACKEND_REVIEW.md) for minimum privileges, review-only SQL, strict TLS/pooling/concurrency, trusted-IP/native-Auth blockers, Dashboard-only setup and the installation-free browser test plan.

The owner reports genuine direct Auth/get-my-access/Master/101-grant/six-denial/sign-out tests passed. No genuine username broker test or production cutover is claimed. The accepted deployed top-level access format is normalized without guessing an active status, approved full name or username; missing metadata fails closed. The proven deployed get-my-access is not replaced. Driver authentication remains disabled until approved provisioning, including direct Iqama attempts. The owner accepts their technical email in their own standard session claims; arbitrary email mappings stay private and visible login remains username/Iqama plus password. No mandatory MFA is introduced. This workspace has no private credentials and the new hostname remains outside its allowlist; local/mocked tests cannot authorize activation or production changes.

## Identifier and timestamp contracts

| Entity | Future identifier | Ownership |
| --- | --- | --- |
| Accident | `ACD-00001` (five digits) | Future backend |
| Breakdown | `BDW-00001` (five digits) | Future backend |
| Maintenance Request | Original Accident or Breakdown ID | Preserve source identity; no separate UI-generated ID |
| Maintenance Work Order | `MTN-000001` (six digits) | Future backend; independent of source ID |
| Fleet vehicle | Car Plate | Future Fleet relationship |
| Driver | Iqama Number | Future Drivers relationship |
| NCR | `NCT-00001` (five digits) | Future backend |
| Penalty | Unique source-supplied reference; format unconfirmed | Future approved external source |
| Trip Check | Future identifier contract to be approved | No current ID generation or storage |
| Customer Care | `CS-YYYYMMDD-NNNN` (date plus four-digit daily sequence) | Future backend; immutable case ID and atomic allocation |
| Helpdesk | Permanent unique ID; format unapproved | Future backend; independent from Customer Care |

IDs shown in placeholder text illustrate formats and are not records or allocated identifiers. Read-only identifier fields remain blank in previews. Server-generated reporting, sending, creation and status-change timestamps must use `Asia/Riyadh` (KSA, UTC+3), from an authoritative backend clock. The browser clock is not authoritative. User-entered accident/breakdown event dates and times remain separate from reporting dates and times. Overview filters use dates only, including both start and end dates; event-time inputs remain in report forms.

## Accident Tracker

Preserve the existing lookup, complete report form and all original columns: Accident ID, Date, Time, Reporting Date, Reporting Time, Reported By, Car Plate, Car Model, Driver Iqama, Driver Name, Location, Severity, Send to Maintenance, Injured, Najm, Najm Status, Mistake %, Investigation, Inv. Status, Accident Type, Description, Root Causes and Damage Description. Add Maintenance Status beside Send to Maintenance. Search supports Accident ID, Car Plate, Driver Iqama and Driver Name. Controls: Add New Accident, Refresh and Export Period Excel.

The form retains event date/time, severity, injury, Najm and dependent report status, mistake percentage, investigation and dependent investigation status, accident type, root cause, accident description and damage description. Reporting date/time and reported user will come from the future backend and authenticated identity. Car Plate and Driver Iqama will select existing Fleet and Driver records; Car Model and Driver Name will be derived and read-only. Relationship dropdowns remain empty while disconnected.

Maintenance Status is read-only: **Not Requested**, **Pending**, **In Progress**, **Done**. A source without a request will show Not Requested; a request's status will drive the other values. Selecting Send to Maintenance in the preview does not change this status or create a request. Save/Delete controls only explain the integration boundary.

## Breakdown Tracker

Controls: Add New Breakdown, Refresh, Export Period Excel, Start Date, End Date and Search Breakdown. Search will match Breakdown ID, Car Plate, Driver Iqama and Driver Name once records are connected. The current empty dataset never produces sample results.

Overview columns in order:

1. Breakdown ID
2. Date
3. Time
4. Reporting Date
5. Reporting Time
6. Reported By
7. Car Plate
8. Car Model
9. Driver Iqama
10. Driver Name
11. Breakdown Location
12. Impact to the Service
13. Breakdown Symptoms
14. Breakdown Description
15. Maintenance Status

The responsive report form contains these fields plus Send to Maintenance (Yes/No). Breakdown ID is read-only; reporting date/time and reported user await authoritative integration. Car Plate and Driver Iqama are empty future relationship dropdowns; model and driver name are read-only derived fields. Event date/time are user editable; description is multiline. Impact to the Service is Yes/No. Save Breakdown, Delete Breakdown and Cancel are available, with persistent actions explaining that integration is pending. The form structure can later support existing record view/edit modes; current previews create no records.

Locations for Accident and Breakdown come from `shared/workflow-options.js`. All 40 original Accident locations are preserved exactly, including spelling, punctuation and order. Do not maintain divergent copies.

Breakdown Symptoms values:

- Immediate Safety Hazard
- No READY / No-Start
- Loss of Propulsion / Limp Mode
- Hybrid System Warning (Drivable)
- Overheating / Cooling System Fault
- HV Battery Performance / Battery Cooling
- HV Safety / Isolation / Interlock / HV Power Path
- 12V / DC-DC / Charging Electrical
- Brake / VSC / ABS / Regenerative Fault
- Tire / TPMS / Wheel-related
- Abnormal Noise / Vibration / Drivetrain
- Fare Equipment / Auxiliary System

Maintenance Status follows the same read-only contract as Accident Tracker. The original Breakdown ID must remain traceable through its request and work order.

## Maintenance Requests

Maintenance Requests and Maintenance Overview are separate keyboard-accessible tabs within the Maintenance module. Requests will receive Accident/Breakdown submissions and will remain visible after acceptance. Controls: Refresh and Export Excel. Filters: one shared Search Records field (Original Source ID, Car Plate, Car Model, Sent By), Start Date, End Date and Status. Status choices: **Pending**, **In Progress**, **Done** (plus All statuses in the filter).

Table columns: **ID, Date, Time, Car Plate, Car Model, Sent By, Status**. ID is always the originating ACD or BDW ID. Original Description is available only in details, not as a main column.

Request details contain:

| Field | Intended behavior |
| --- | --- |
| Original Source ID | Immutable Accident/Breakdown ID |
| Source Type | Immutable Accident or Breakdown |
| Date/Time Sent to Maintenance | Backend KSA timestamp |
| Car Plate / Car Model | Original vehicle relationship and derived model |
| Original Description | Read-only source description |
| Sent By | Authenticated sending user |
| Request Status | Pending, In Progress, Done |
| Linked Maintenance ID | Separate MTN identifier when accepted |

The empty request-detail preview is explicitly accessible without fabricated rows. Selecting In Progress opens an empty Maintenance Acceptance form, without executing acceptance. Cancel returns to request details and preserves unsaved preview choices. The dedicated acceptance preview button also exposes the form without requiring a real request.

## Maintenance Work Orders

Maintenance Overview contains detailed work orders, never replacement source records. Controls: Refresh and Export Excel. Filters: one shared Search Records field (Maintenance ID, Original Source ID, Car Plate, Maintenance Engineer Iqama), Start Date, End Date and Status, using dates only.

Overview columns, in order: Maintenance ID, Date, Time, Created By, Maintenance Description, Maintenance Engineer Iqama, Maintenance Location, Status, Breakdown Type, Description Fault, Action Taken, Action Taken Description, Remarks.

The acceptance/work-order form contains all overview fields and permanent **Original Source ID**, **Original Source Type**, **Maintenance Request reference**, **Car Plate**, and **Car Model** fields. Maintenance ID, original source references, future generated date/time and created user are read-only. Vehicle plate is a future Fleet dropdown with derived read-only model. Maintenance Description, Description Fault, Action Taken Description and Remarks are multiline. Maintenance Engineer Iqama and Maintenance Location are prepared editable fields; their eventual authorized sources remain to be designed. Save Changes explains the integration boundary; Cancel closes the preview.

Work-order statuses:

- Requested
- In Progress
- Pending of Component
- Pending of Approval
- Done

Breakdown Type values:

- Accident
- Air System
- Body Exterior
- Brakes
- Doors
- Electrical
- Gears
- Heating & Cooling
- Interior
- Mechanical
- No Fault Found
- Not Engineering Breakdown
- Puncture
- Wheels And Tyres
- Other

Action Taken: **Changed**, **Repaired**, **Nothing**.

Work-order repair status and request status are separate vocabularies. Pending of Component and Pending of Approval do not become new request statuses. Their exact future mapping and transaction rules must be finalized during backend design.

## Future acceptance and completion

1. An authenticated user sends an Accident or Breakdown to Maintenance.
2. The backend creates a Pending request preserving the original source ID/type and description, vehicle, sending user and KSA timestamp.
3. An authorized user opens that request and selects In Progress.
4. The Maintenance Acceptance form collects required work-order information.
5. The backend independently generates a unique MTN ID and creates the work order, preserving original source ID/type and the request reference.
6. The original request remains visible, becomes In Progress and links to the MTN work order.
7. Work-order repair status is tracked through the separate maintenance vocabulary.
8. Completing the work order sets the linked request to Done; the source tracker reflects the request status.

The backend must enforce authorization, immutable provenance, duplicate-send/acceptance protection, atomic linking and auditable status changes with user identity and KSA timestamps. Cardinality and reopening rules require later approval. No workflow step executes in this phase. A Maintenance ID must never overwrite an ACD or BDW ID.

## Fleet, Drivers and Trip Check

Fleet retains the existing vehicle lookup, profile layout, locked identity fields and edit controls. Car Plate will identify the vehicle; selected plates will derive Car Model throughout the reports and maintenance forms. Fleet availability, odometer, accident counts and other operational fields await the future database design. No legacy Fleet/Post-Trip synchronization runs.

Drivers retains Iqama/name lookup, existing profile and editable-field layout. Iqama Number will identify the driver; selecting it will derive Driver Name. Vehicle assignments will use Car Plate. No legacy reads or writes run.

Trip Check retains the 27-step Pre-Trip/Post-Trip wizard, 24 inspection questions, unsaved answers, score calculation, signature UI, record editor and custom PDF layout/generation source. Its Overview remains empty. Save and export controls display integration pending; no spreadsheet requests, generated persistent IDs, authoritative browser timestamps or operational downloads occur. Future integration must decide inspection identity, vehicle/driver links, signatures, edit auditing, odometer authority and export access before connecting storage.

## Fuel Tracker

Fuel Tracker is a frontend-only interface with Add Fuel Record, Refresh and Export Excel controls. One shared Search Records field covers Fuel Record ID, Car Plate, Driver Iqama and Driver Name. The overview remains empty; filters never load operational data. Refresh and Export only display the integration-pending notice, and Save never persists data or claims success.

Overview columns, in order: **Date, Time, Car Plate, Car Model, Driver Iqama, Driver Name, Driver Arrangement, Fueled In, Outside Depot Location, Fuel Received (L), Fuel Pricing (SAR/L), Total Amount (SAR)**.

The Add Fuel Record form includes every overview field. Date and Time are editable event fields, initially blank; no browser clock supplies authoritative reporting timestamps. The future backend must define and validate the event's KSA time and use authoritative `Asia/Riyadh` timestamps for audit metadata. The read-only Fuel Record ID placeholder is blank and does not allocate an identifier.

| Field | Future relationship / behavior |
| --- | --- |
| Fuel Record ID | A unique, backend-generated identifier for each record; its format remains to be approved |
| Car Plate | Linked Fleet vehicle lookup |
| Car Model | Automatically derived from the selected Fleet vehicle; read-only |
| Driver Iqama | Linked Drivers lookup |
| Driver Name | Automatically derived from the selected driver; read-only |
| Driver Arrangement | Automatically derived from the selected driver; read-only |
| Fueled In | Exactly Depot or Outside Depot |
| Outside Depot Location | Disabled for Depot; required and editable for Outside Depot |
| Fuel Received (L) | Positive, finite decimal quantity entered in liters |
| Fuel Pricing (SAR/L) | Read-only approved 2.18 SAR/L for Depot; positive, finite manual decimal price required for Outside Depot |
| Total Amount (SAR) | Read-only calculation: Fuel Received × Fuel Pricing, shown in SAR with two decimal places |

The approved current Depot tariff is **2.18 SAR/L**, stored in `TAXIQAID_DEPOT_FUEL_PRICE_SAR_PER_LITER` in `modules/operations/fuel/fuel.js`. Depot mode automatically fills the read-only price, clears/disables Outside Depot Location, and calculates the total (50 L × 2.18 SAR/L = **SAR 109.00**). Switching to Outside Depot clears the Depot price, enables manual pricing and requires a location. Switching back restores exactly 2.18 and clears/disables the outside location. Missing/whitespace-only locations and missing, zero or negative manual prices fail preview validation. Invalid quantities and non-finite products never produce a monetary total. Valid quantities/prices update totals live with two-decimal SAR rounding. The tariff is approved frontend configuration, not a database connection. The future backend will own tariff configuration and must preserve each transaction's actual unit price.

Preview Record Details opens a clearly labeled empty, read-only detail form, with an Edit Fields — Preview control for future editing. This prepares record view/edit behavior without fabricated records. Add and detail previews begin blank each time; switching from details to editing only changes unsaved form controls. Cancel, Escape and backdrop dismissal close the dialog; closing discards the preview when it is next opened. Save validates the editable preview fields and explains that integration is pending; it does not create/update a record, close as if saved, reload data or export anything. Fleet/Driver dropdowns remain empty pending integration.

Each future fuel record must preserve the **actual unit price used at the time of fueling**, its SAR currency, the quantity and resulting amount. Historical amounts must not be recomputed using a later Depot tariff or a changed outside price. The future backend should retain tariff provenance/version where applicable and an audit trail for authorized corrections. A unique record ID and the Fleet/Driver references must survive future view/edit workflows. No fuel IDs, fuel records, database tariff sources, schemas, Excel databases or migrations are implemented in this phase.

## NCR Tracker — approved scoring and recovery rules

These business rules are approved. Operational integration remains pending. The module has exactly two main views: **Driver Scores** (default) and **NCR Tracker**. Tabs retain their own filters. Both tables are empty while disconnected; no actual drivers or NCR records are fabricated. Driver details and NCR details/edit/delete controls open explicitly empty previews.

### Driver scores

Every driver registered in Drivers Management starts with **100 points**, including a driver with no NCR history. The future view must query all registered drivers and derive each driver's summary; it must not list only drivers who have NCRs.

`Current Driver Score = 100 - Sum of Active NCR Penalty Magnitudes`

There is **no lower bound**. Two active -50 penalties produce 0; adding -10 produces -10; three active -50 penalties produce -50. A negative balance must not prevent additional NCRs. Display signed negative balances clearly, using the prepared `.ncr-score-negative` styling without changing the number. Starting Points is immutable policy, not a stored running balance.

Driver Scores filters: one shared Search Records field covering Driver Iqama and Driver Name, plus Current Points (exact, inclusive minimum, inclusive maximum). Points inputs accept negative values and have no 0–100 restriction; invalid ranges surface an error. Columns, in order: Driver Iqama, Driver Name, Driver Phone Number, Starting Points, Total NCRs, Active NCRs, Expired NCRs, Active Points Deducted, Current Points.

- Total NCRs counts preserved historical records, including expired NCRs.
- Active Points Deducted is the positive sum currently affecting the score.
- Total Historical Deductions is the separate positive sum of all original penalties, including expired penalties; it never drives the current score.
- Driver detail previews prepare identity, phone, starting/current scores and separate Active NCR History (current deductions) and Expired NCR History (recovered points). Each history includes NCR ID, category, points, NCR Date, Expiry Date, NCR Status, TBT Status and Action Taken.

### Automatic calendar expiry

`Expiry Date = NCR Date + 90 calendar days`

An NCR is Active from its NCR Date until the beginning of its Expiry Date in **Asia/Riyadh**. On that date it is Expired and stops deducting points. Each NCR expires independently; an expired record is never deleted, rewritten or assigned a new ID. Its category, original penalty, descriptions, driver information, statements, TBT, action and remarks remain searchable/auditable in the tracker and future exports. Only explicit user filters may exclude expired records from a view.

For January 1 in a non-leap year, expiry is April 1. Before April 1, a -25 NCR deducts 25; from the beginning of April 1 it deducts nothing. Other active NCRs continue deducting their own penalties. All penalties expiring recovers the driver to 100, without resetting or overwriting a stored score.

A future-dated NCR does not deduct before its NCR Date. Until then, the pure status function returns `null` (neither Active nor Expired), and the summary explicitly flags a future-date validation issue. The form leaves operational status blank and explains that it is not yet active. This is an unresolved future occurrence, not a new selectable compliance status. Preserved future-dated source records remain counted in the total and in a separate `futureNcrs` diagnostic count; they contribute no active deductions. Missing/impossible dates throw a validation error; a resolved current score must not be displayed for an invalid record set.

### Central category configuration

`modules/compliance/ncr/ncr-policy.js` contains the single frozen category configuration with stable keys, exact labels and negative numeric penalties. There are exactly **23 categories: three -50, eight -25, twelve -10**, without duplicates or additional penalties. The form displays each label with its penalty; choosing one fills read-only NCR Score.

| Stable key | Category | NCR Score |
| --- | --- | ---: |
| `cctv-tampering` | Tampering with any CCTV cameras | -50 pt |
| `money-corruption` | Money corruption, fraud, or disloyalty | -50 pt |
| `unauthorized-transport` | Transporting passengers without payment or carrying unauthorized goods in the vehicle | -50 pt |
| `asset-damage` | Damaging TaxiQaid assets, including vehicles or office buildings | -25 pt |
| `smoking` | Smoking inside vehicles, offices, accommodation, or prohibited areas | -25 pt |
| `reckless-driving` | Reckless driving, including vehicle drifting, without causing damage | -25 pt |
| `uniform-hygiene` | Not wearing the full uniform or maintaining poor personal hygiene | -25 pt |
| `personal-vehicle-use` | Using a company vehicle for personal purposes | -25 pt |
| `depot-violations` | Depot violations, including speeding, littering, or improper parking | -25 pt |
| `fights-arguments` | Engaging in fights or arguments with employees, passengers, or others | -10 pt |
| `phone-seat-belt` | Using a phone or not fastening a seat belt while driving | -10 pt |
| `mdt-login` | Failure to log in to the MDT device | -10 pt |
| `occ-reporting` | Failure to report incidents to OCC | -10 pt |
| `unprofessional-behavior` | Unprofessional or rude behavior toward others | -10 pt |
| `vehicle-sleeping-luggage` | Placing blankets or luggage inappropriately, or sleeping in the vehicle | -10 pt |
| `alerts-instructions` | Non-compliance with TaxiQaid alerts or instructions | -10 pt |
| `harmful-conduct` | Conduct harmful to TaxiQaid business that is not otherwise listed | -10 pt |
| `third-party-site-rules` | Non-compliance with rules at third-party operating sites | -10 pt |
| `excessive-stay` | Remaining at one location for an excessive period | -10 pt |
| `unauthorized-absence` | Absence from work without permission | -25 pt |
| `eating-while-driving` | Eating while driving | -10 pt |
| `mdt-black-shift` | MDT Black Shift | -10 pt |
| `pickup-dropoff-rules` | Non-compliance with Passenger Pickup & Drop-off Rules | -25 pt |

### NCR records and form

Tracker filters: one shared Search Records field covering NCR ID, Driver Iqama and Driver Name, Start Date, End Date, TBT Status (All Statuses, Pending, Conducted) and Non-Compliance Status (All Statuses, Active, Expired). Date filters have no time-of-day inputs. Controls: Add New NCR, Refresh and Export Excel.

Exactly 16 overview columns: NCR ID, Driver Iqama, Driver Name, Driver Phone Number, Category, NCR Score, NCR Description, NCR Date, TBT Status, TBT Conducted Date, Action Taken, Action Taken Date, Non-Compliance Expiry Date, Non-Compliance Status, Individual Statement, Remarks.

The Report New NCR form includes every record field and prepares:

- Read-only NCR ID (`NCT-00001` format, backend-generated later; no current allocation).
- User-entered NCR Date, which determines expiry independently of audit timestamps.
- Searchable future Drivers selector by Iqama; Driver Name and Driver Phone Number are derived/read-only. No fake dropdown records are supplied.
- Category selector, read-only negative NCR Score and multiline NCR Description.
- Optional TBT Conducted Date and read-only TBT Status: Pending when absent, Conducted when a valid date exists.
- Action Taken (TBT Conducted, 1st NCR Initiated, 2nd NCR Initiated, 3rd NCR Initiated) and Action Taken Date. No automatic escalation rule is implemented.
- Read-only Non-Compliance Expiry Date and calculated Active/Expired status, with an explicit unsaved-preview notice.
- Multiline Individual Statement and optional Remarks.
- Read-only Reported By, Reporting Date, Reporting Time, Last Modified By and Last Modified At, all blank pending authenticated authoritative backend integration.

TBT Status, Action Taken, NCR Score and compliance expiry are independent. Completing TBT or selecting an action does not recover points, change expiry or overwrite another field. Save says exactly **“Database integration pending — NCR not saved.”** No save/delete/export action persists records or claims success.

### Pure scoring contract and future authority

The reusable `TaxiQaidNcrPolicy` API (also exported for Node tests) provides `getCategoryPenalty`, `getExpiryDate`, `getNcrStatus`, `getTbtStatus`, `summarizeNcrs`, `countActiveNcrs`, `countExpiredNcrs`, `countHistoricalNcrs`, `getActivePointsDeducted`, `getCurrentDriverScore` and `filterDriversByPoints`.

Scoring functions receive records **for a single driver** as `{categoryKey, ncrDate, ...preservedMetadata}` and an explicit authoritative current KSA date (`YYYY-MM-DD`). They never fetch, persist, mutate records or store a running balance. Unknown categories and invalid/missing dates throw. `summarizeNcrs` returns counts, historical/active deduction totals, current points and explicit future-date diagnostics; callers must surface validation issues. Numeric filtering accepts `{exact, min, max}` and driver summaries with numeric `currentPoints`.

`parseIsoDate` validates actual Gregorian dates. Expiry uses UTC calendar setters solely as a timezone-independent Gregorian calculator, not local date parsing or a 90×24-hour duration. `getKsaDate` converts an explicit instant using `Intl.DateTimeFormat` with `timeZone: Asia/Riyadh`. Tests cover KSA midnight and multiple host timezones, daylight-saving transitions, month/year boundaries and leap years.

The unsaved form clearly uses the browser's instant converted to Asia/Riyadh for **preview only**. It recomputes on edits, visibility return and KSA day changes without requiring Refresh. This is not production time authority. Future backend queries must always derive scores and expiry from authoritative KSA dates, correctly even when no user is logged in; correctness must not depend on a browser session, a manual Refresh, destructive score reset or one-time scheduled rewrite. Background jobs may support reporting, but must not be necessary to make a score correct.

Future integration must authorize reads/edits/deletes server-side, preserve original NCR IDs/category penalties/audit history, link Drivers by Iqama and derive name/phone, calculate authoritative current summaries, retain expired records and expose authorized historical searches/exports. No new database implementation or migration is authorized.

## Penalties Tracker — read-only web module

Penalties Tracker is a **read-only** interface. Penalties will be imported, created, corrected and otherwise maintained **outside the web application**, through a future approved external source. No operational database, Excel database, spreadsheet, import, synchronization service or external storage is connected in this phase.

The page describes: “Review vehicle and driver penalties and export filtered penalty reports.” Its only main actions are **Refresh** and **Export by Period**. Both currently show database integration pending and never read a backend, claim successful synchronization, download a workbook or modify source data. Clear Filters is a separate filter action. No Add, New, Save, Edit or Delete Penalty action exists anywhere in this module, including record details, regardless of user role.

### Filters and overview

Three controls are prepared: one **Search Records** field covering **Penalty ID, Driver Iqama, Driver Name and Car Plate**, plus **Start Date** and **End Date**. The shared predicate matches any configured text identifier, normalizes plates and combines the query with the independent date filters. Driver Iqama is the unique future driver reference; names will be linked to Drivers Management, not invented selector records. Leading zeros in Iqama values must be preserved by the future source adapter.

Date filtering applies only to the source **Date** field, includes both boundary dates and does not restrict time of day. One-sided date ranges are supported. Invalid or reversed filter ranges show a validation message without clearing the user's selections. The combined search and date selections survive sidebar navigation and pending Refresh/Export clicks until changed or explicitly cleared. No browser clock is used to infer penalty dates.

The responsive, horizontally scrolling overview has exactly nine columns in this order:

1. ID
2. Details
3. Date
4. Time
5. Car Plate
6. Driver Iqama
7. Driver Name
8. Amount
9. Charged To

The disconnected state is exactly **“No penalties available — database integration pending.”** No sample records, default amounts or fabricated driver records populate the application. Details supports long/multiline text, wraps within bounded table cells and remains available in full in the detail dialog. Source text is rendered with DOM `textContent`, never treated as executable HTML.

### Source values and relationships

- **ID** is the unique penalty reference supplied by the future external source. Its convention is unknown; do not invent prefixes, sequences or persistent IDs.
- **Driver Iqama** links to Drivers Management; **Driver Name** is associated with that driver. The future source contract must define the relationship and how historical names are preserved.
- **Car Plate** links to Fleet Management.
- **Date/Time** must be supplied and normalized by the approved source adapter, using authoritative `Asia/Riyadh` dates/times where applicable. The frontend prepares date-only ISO `YYYY-MM-DD` and validated 24-hour `HH:mm` or `HH:mm:ss`, preserving source seconds when supplied. Invalid/missing display values say Unavailable instead of inventing dates or times. Records without a valid Date cannot match an active period filter.
- **Amount** remains numeric in source data. Display uses SAR and two decimal places; a genuine zero displays SAR 0.00, while a missing/invalid value displays Unavailable. Negative values retain their numeric sign without being labeled credits, refunds or deductions. Their business meaning requires an approved future data contract.
- **Charged To** is displayed exactly as the source supplies it, including unfamiliar text. No vocabulary, dropdown choices or responsibility rules have been approved; confirm them before backend implementation.

### Read-only details

Future rows support click, Enter and Space to open **Penalty Details**, containing ID, Details, Date, Time, Car Plate, Driver Iqama, Driver Name, Amount (SAR) and Charged To. The dialog has only **Close**, with keyboard focus containment/restoration, Escape and backdrop dismissal. It contains no editable form fields, Save, Edit or Delete actions. The structure/rendering hooks exist now, but there are no connected records or clickable fabricated overview rows.

### Future Refresh and Export by Period

Refresh will eventually read only the latest authorized source records and preserve filters. Export by Period must use the same inclusive Start/End Date and combined record search as the overview, include all nine columns and leave the source unchanged. Amounts must remain **numeric Excel cells**, rather than strings containing SAR; apply a suitable currency number format. Dates/times must retain consistent approved formats and precision. The display formatter is not an export serializer. Actual source reads, authorization, imports/corrections and Excel generation remain pending and require the future integration phase.

Pure `TaxiQaidPenalties` helpers prepare source-value formatting, inclusive filtering and safe read-only row construction. They do not connect an external source, import records, allocate IDs or store operational data. Synthetic fixtures used for unit/DOM regression tests are confined to tests and never ship as production records.

## Driver Appeals — frontend and future workflow

The administrative module receives appeals from drivers; it does not create them and has no Add Appeal action. Refresh and Export by Period are disconnected. The eight overview columns remain, in order: Appeal ID, Driver Name, Driver Iqama, Nationality, Appeal Type, Description, Status, Department. Submission Date and Submission Time belong to the underlying record and detail view, not extra overview columns. Start/End Date are inclusive date-only comparisons on the submission date in KSA. An inverted range returns no results and a validation message. Combined search matches Appeal ID, Driver Iqama or Driver Name alongside independent type/department/status filters.

Future backend-generated IDs follow `APL-00001` (five-digit sequence); the browser never allocates them. **Approved status vocabulary:** Pending, In Progress, Done. **Approved department vocabulary:** Pending, Financial, Operation, Quality, IT. Both default independently to Pending when an appeal arrives. Assignment/reassignment never implies resolution. Appeal Type is configuration pending owner approval; no complaint categories are assumed.

Details preserve read-only Appeal ID, driver identity/nationality, type, description, submission date/time, Assigned By/At and Last Updated By/At. Only administrative Status and Department controls are editable in the unsaved interface. Save Changes displays **“Database integration pending — changes not saved.”** The source snapshot is untouched. Future permission checks and an append-only assignment/status history must record authenticated actors and authoritative Asia/Riyadh timestamps; reassignment must preserve earlier decisions.

Future workflow: driver logs in → Driver Portal / Appeals → enters description only → submits → backend validates identity/ownership and allocates APL ID → Status Pending and Department Pending → administrative queue with Appeal Type unset/unclassified → authorized management classifies using an approved type catalog and assigns department → department review → In Progress or Done. The current driver interface has no type, status, department, identity selectors or history table. Name, Iqama and Nationality come from the authenticated account's verified driver-profile link, never arbitrary client identity fields. Drivers may read only their own authorized appeals. Administrative classification/assignment/resolution permissions are separate from driver submission rights. Submission, export, audit storage and authenticated driver data connections remain future work. The eight administrative columns and approved independent status/department vocabularies are preserved; no type vocabulary is invented.

## Training Tracker — frontend and future workflow

Three tabs: **Training Overview**, **Training Sessions**, **Training Attendance**. All operational sources are disconnected; no training records, drivers, courses, references, lifecycle statuses or completion evidence are fabricated. Refresh, Save Session and Export Excel perform no operational writes or exports.

### Overview and requirement policy

Overview columns: Driver Name, Driver Iqama, Training Sessions Pending, Status. One shared Iqama/name search operates alongside Training Status and Training Session filters. Status choices are All Statuses, **On Day**, **Pending Training Sessions**. The future source must include every registered driver, including those without enrollments. Pending count is the number of unmet *applicable approved requirements*, not the number of scheduled classes. On Day means none remain outstanding; Pending Training Sessions means at least one remains unmet. Unknown applicability cannot be represented as compliant.

Training definitions, requirement applicability, validity periods, retraining/expiry and completion criteria require separate approved configuration. Do not assume every driver needs every course. Enrollment/scheduling, an unverified confirmation or a simple attendance marker cannot by themselves complete a requirement. The pure preview helper accepts explicit applicability plus verified, still-valid completion decisions; production must derive these through an authorized policy and authoritative KSA time, not client claims.

### Sessions and scalable selection

Session overview columns: Session Reference, Training Name, Trainer, Session Date, Session Time, Location, Assigned Drivers, Confirmed Attendance, Session Status. **Reference format and lifecycle vocabulary remain unapproved.** Create Training Session prepares Training Name/Description, Trainer, Session Date, Start/End Time, Training Location, optional Capacity, Driver Selection and Additional Notes. Same-day preview times require End after Start; overnight/multiday semantics require later approval. Capacity, when supplied, is a positive whole number and cannot be below the unsaved selection count.

The picker renders **25 drivers per page**, with shared Iqama/name matching, multiple selection, counts, Select All Filtered Drivers, Deselect Selected Drivers, individual removal and a separately paginated selected-driver summary before Use Selection. A stable driver-ID Set prevents duplicates and retains choices across searches/pages. The selection is transient and does not enroll anyone. An applicability-filter control is reserved for future approved requirements, and an adapter may supply an explicit eligible-driver ID set.

Select All means the entire eligible filtered dataset, not the visible 25 rows. It is disabled until the adapter explicitly declares a complete eligible dataset. Partial remote pages must not be represented as complete. Production must either resolve a versioned selection criterion server-side or validate the complete selected driver-ID set, recheck eligibility/capacity/permissions and enforce unique `(session, driver)` enrollment. It must never silently drop off-page selections. Use server pagination/virtualization and scalable queries for 800+ drivers; the browser proof uses isolated synthetic fixtures, not deployed sample drivers. No data source is connected by the adapter methods; their default snapshots are empty.

### Attendance, confirmation and completion

Attendance view has a session selector and columns Training Session, Driver Name, Driver Iqama, Attendance Status, Driver Confirmation, Confirmation Date, Trainer Verification. Attendance facts, driver confirmation and trainer verification are distinct records. Their vocabularies and approved completion policy are pending; no guessed status options or live confirmation controls are implemented.

Future workflow: trainer creates a session → selects eligible drivers → schedules it → assigned drivers will eventually see it in an independently approved personal training workflow (deferred; no Training section is added to the four-section portal) → during/after class trainer opens the authorized confirmation window → driver opens their assigned session and confirms → backend validates the authenticated account and linked Iqama → records evidence and authoritative KSA timestamp → authorized trainer verifies attendance as required → approved policy creates a verified completion → Overview recalculates outstanding requirements. Trainer/driver histories remain preserved.

A **code-based confirmation**, rather than a handwritten image, is planned. Exact verification method, challenge delivery, lifetime, replay protection and evidence policy require approval during portal implementation. Evidence binds authenticated user ID, stable Driver Iqama reference, Training Session reference, confirmation method, confirmation timestamp and attendance/acknowledgment record. Never store reusable plaintext signing codes in Sheets or browser storage. A simple click is not legally equivalent to a certified electronic signature. No confirmation service or code storage is implemented.

### Separate future entities and full exports

| Future concept | Responsibility and relationships |
| --- | --- |
| Training Definition | Approved course identity/content; no implied universal applicability |
| Training Requirement | Configured applicability, validity/retraining and completion rules referencing a definition |
| Training Session | A trainer-led occurrence, times/location/capacity and approved lifecycle |
| Session Enrollment | Driver/session relationship; many drivers per session and many sessions per driver; unique assignment |
| Attendance Confirmation | Authenticated driver acknowledgment/evidence tied to enrollment |
| Trainer Verification | Independent authorized verification and audit trail |
| Driver Training Completion | Approved verified completion satisfying a requirement, with retained validity/history |

Full future exports must cover **every driver and every applicable requirement**, plus assigned sessions, attendance/verification, completion and pending state; never only the visible page. Two complementary numeric Excel datasets are planned: **Driver Compliance Summary**, one row per driver; **Detailed Training Status**, one row per driver and applicable requirement, including related session/completion information (with a documented approach for multiple attempts). Preserve history and avoid a separate column for every course. Export scope, access permissions and the handling of multiple attempts require backend approval. No export is generated now.

## Drivers Deduction — frontend and future financial controls

Three tabs: **Driver Balances**, **Driver Expenses**, **Applied Deductions**, using shared searches and orange design. Monetary values are **SAR with two decimal places**; pure preview arithmetic uses integer halalas and rejects nonfinite, zero/negative, excessive-precision and unsafe-range inputs. No balances or expenses are invented. Source snapshots and unsaved form drafts exist only in memory during the interface preview; no operational records are created, altered or persisted. Refresh and Export Excel remain pending.

### Sources, liability and immutable references

Approved source classifications are exactly **NCR Financial Fine**, **Fuel Charge**, **Traffic Violation**, **Manual Expense**. An original source reference is required for the three source-linked classifications; authorized manual entry may have an optional reference.

- NCR penalties **−50, −25 and −10 are points, not SAR**. Only a separately defined, approved monetary fine may create an expense, retaining the original NCR ID and a distinct financial-fine reference. Point recovery must not silently reverse money and a financial payment must not alter NCR scoring.
- Fuel records do not automatically create debt. Only explicitly classified, approved driver-chargeable fuel can create an expense, preserving the original Fuel Record ID and approved charged value; liters or total transaction value alone do not establish liability.
- Traffic violations require an approved original source and driver-liability decision. A Penalties record and a Traffic Violation describing the same incident must not create two charges. Preserve the original incident/source identity and related penalty reference.
- Manual Expense requires a separate financial permission and an authorized positive monetary entry, not inferred points/quantities.

Future ingestion uses stable source type/ID, financial obligation identity and idempotency controls. Retries/repeated imports or source updates must not duplicate charges. A deliberately authorized separate obligation from the same source needs an explicit identity and audit trail; do not erase original references or use row numbers as permanent IDs. Source approval rules, fine amounts, driver liability, synchronization and update contracts are future decisions. No import or source integration is connected now.

### Balances and expense records

Driver Balances columns: Driver Iqama, Driver Name, Total Charged (SAR), Total Deducted (SAR), Outstanding Balance (SAR). **Outstanding Balance = total authorized posted charges − total applied deductions.** Only approved, posted financial transactions count. Draft, rejected, disputed or reversed transactions must not masquerade as collected payments. A complete authorized financial history is required before reporting a numeric balance; incomplete data displays unavailable. The selected-driver history interface preserves original expenses/source references and linked deductions, without editing completed transactions.

Driver Expenses columns: Expense Reference, Date, Driver Iqama, Driver Name, Source Type, Source Reference, Description, Original Amount (SAR), Amount Deducted (SAR), Outstanding Amount (SAR), Status. Status vocabulary and expense/deduction reference formats are pending approval, not invented in this phase. Add Expense prepares linked Driver Iqama, derived read-only Driver Name, Expense Date, approved Source Type, Source Reference when applicable, Description, positive Amount (SAR), Remarks and read-only Created By/At, Last Modified By/At. Audit actors/times will be server-owned. No save creates a record.

### Partial deductions and audit history

Applied Deductions columns: Deduction Reference, Date, Driver Iqama, Driver Name, Related Expense, Deduction Amount (SAR), Remaining Outstanding (SAR), Deduction Method, Applied By, Remarks. Deduction Method is intentionally unconfigured: **no assumption of salary deduction or any other method**.

Apply Deduction prepares driver identity, an authorized Outstanding Expense, read-only Original Expense Amount, Previously Deducted and Outstanding Amount, New Deduction Amount, live Remaining Balance After Deduction, Deduction Date, Deduction Method and Remarks. New amount must be positive, finite, at most two decimals and no more than the selected expense outstanding. The live preview rejects inconsistent original/deducted/outstanding source values and never applies a transaction. Multiple partial deductions preserve one original expense reference. Production must revalidate identity, liability, current outstanding, permission, idempotency and concurrent updates atomically on the backend; a client preview is not financial authority.

Arithmetic examples exist **only in tests**: original charge SAR 500.00, deduction SAR 150.00 leaves SAR 350.00; another SAR 100.00 produces total deducted SAR 250.00 and remaining SAR 250.00. No corresponding production records are seeded.

Future concepts are separate: authorized driver expense/charge, source financial approval/liability, applied deduction/payment, authorized reversal/adjustment and immutable financial audit event. The original expense remains linked to every deduction and reversal. Completed entries must not be quietly overwritten or deleted. Corrections require permission-controlled reversal/adjustment transactions, reasons, preserved old values and authenticated KSA audit timestamps. Exceptional over-balance adjustment policy is unapproved and not implemented.

Future financial permissions must distinguish **view balances**, **add expenses**, **apply deductions**, **approve reversals/adjustments** and **export financial data**. An existing administrative role alone must not imply every financial write permission. Existing Supabase role checks are unchanged now; no operational permission service is implemented.

## Customer Care Tracker — external customer cases

Customer Care handles external complaints, service requests, inquiries, suggestions, lost property, refund/compensation information and case resolution. It is independent of internal Helpdesk, Driver Appeals and NCR; records, identifiers and histories are not merged. The interface is complete but its operational source is disconnected. Add New Case opens an unsaved form. Refresh and Export Excel only display integration pending and preserve active filters. No cases, accounts, notifications, refunds or exports are fabricated.

### Future permanent case ID

The target convention is **`CS-YYYYMMDD-NNNN`**, represented by `CS-Date-0001` in the business request. Example **`CS-20261110-0001`** refers to November 10, 2026. Date is exactly eight digits `YYYYMMDD`, from the authoritative **Asia/Riyadh** creation date. The four-digit sequence is unique within that date and must be allocated atomically by the future backend, including concurrency checks. The ID is permanent after creation. The precise backend allocation, rollover/exhaustion and retry/idempotency contracts still require approval. Neither a browser clock nor a client counter allocates case IDs now.

### Exact overview fields and forms

The horizontally scrolling overview retains these **23 columns in this exact order**. Long values are rendered through safe text nodes, clipped visually within table cells and fully available in details.

| Order | Field | Intended meaning / current preview |
| --- | --- | --- |
| 1 | ID | Read-only permanent backend case ID; empty in new previews |
| 2 | Received Date | Required customer receipt date, distinct from creation audit time |
| 3 | Customer Name | Optional customer-provided name |
| 4 | Customer Contact | Private phone/email/contact information; neither phone nor email is forced |
| 5 | Channel | Required approved channel |
| 6 | Case Type | Required approved case type |
| 7 | Category | Required approved category |
| 8 | Car Plate | Optional searchable future Fleet reference; no vehicle required for unrelated cases |
| 9 | Trip/Route | Optional trip/route text |
| 10 | Complaint/Requirement Details | Required multiline description |
| 11 | Priority | Required explicit selection; no automatic escalation |
| 12 | Department | Responsible case department; independent of status/priority |
| 13 | Assigned To | Future eligible active user; current selector is empty and disabled |
| 14 | Status | Approved case status; new draft defaults to New |
| 15 | Date | Read-only future creation date |
| 16 | Time | Read-only future KSA creation time, 24-hour display |
| 17 | Created By | Read-only verified actor from the future authenticated backend |
| 18 | Root Cause | Optional multiline resolution information |
| 19 | Action Taken | Optional multiline resolution steps |
| 20 | Refund | Optional details and separately represented SAR amount; not a financial transaction |
| 21 | Customer Satisfaction | Optional integer rating 1–5; unrated is null/blank, never zero |
| 22 | Solved Date | Read-only authoritative resolution date; never browser-populated |
| 23 | Solved Hour | Read-only authoritative KSA resolution time, 24-hour format |

The empty overview says **“No customer care cases available — database integration pending.”** One shared search covers Customer Care Case ID (ID/Case ID aliases), Car Plate and Customer Name, alongside independent Car Plate and Status selectors. Car Plate comparison uses the shared plate normalization. Filters remain selected when navigating away, opening/closing a modal or using pending Refresh/Export controls.

**Add New Customer Care Case** is organized into Customer Information, Case Information, Assignment, Resolution, Customer Satisfaction and Audit Information. Received Date, Channel, Case Type, Category, Priority and Complaint/Requirement Details are required. Resolution-only fields and optional customer identity/contact are not required to create an initial case. The backend-owned ID, creation date/time/actor and solved date/hour are always read-only and start blank. An empty Details preview and future editing mode are available without fake rows. Existing Received Date is read-only during the editing preview so its original value is retained. Changing fields never mutates the source snapshot.

Save Case/Save Changes always displays **“Database integration pending — case not saved.”** Validation can highlight incomplete/invalid draft fields but never appends a case, updates an operational record, allocates an ID or invents a success confirmation. Details include the full description/contact, current source assignment and a read-only future resolution-history list. Edit preview supports department reassignment, future assignee selection, priority/status, resolution/refund information and rating; selecting edit preserves keyboard focus inside the modal.

### Approved selections

| Field | Exact vocabulary, in order |
| --- | --- |
| Channel | Phone; WhatsApp; Email; Website; Social Media; Walk-in; App; Other |
| Case Type | Complaint; Service Request; Inquiry; Suggestion; Lost & Found; Refund/Compensation; General Requirement |
| Category | Driver Behavior; Delay/Punctuality; Ticket/Booking; Refund/Payment; Lost & Found; Vehicle Condition; Staff Conduct; Cleanliness; Safety; Accessibility; Customer Service; Other |
| Priority | Low; Medium; High; Critical |
| Department | Customer Service; Operation; Planning; Finance; Maintenance; HR; IT; QHSE |
| Status | New; Assigned; In Progress; Awaiting Customer; Awaiting Internal Dept; Escalated; Closed |

Filters add All Statuses/All Car Plates; required form selectors start unselected. No unapproved categories/departments/statuses are added. Priority or assignment does not change status automatically. A new draft starts New; a status choice alone does not constitute closure, refund approval or a customer rating.

### Users, refunds, ratings and closure

Future Assigned To choices must come from a **secure, permission-checked TaxiQaid user directory** linked to existing Supabase identities. Only eligible active users under the eventual department/permission configuration may be assigned. The browser must never enumerate Supabase Auth users through an Admin API. No names are hardcoded. An existing case's current assignment can be read from an authorized case response, but the unavailable user selector does not pretend that reassignment is connected.

Refund has a clear distinction between no recorded information, refund/compensation details and an explicit optional monetary amount. The preview representation may contain `{details, amount}`; this is an interface adapter contract, **not an approved database schema or financial workflow**. Optional SAR amounts are finite, nonnegative, at most two decimal places and formatted with two decimals using integer halalas. Blank is different from an explicit SAR 0.00. No payout, financial transaction, approval threshold or automatic charge is implemented. Final refund approvals, corrections and reopening rules remain unspecified.

Customer Satisfaction uses five **native radio controls with vector stars**, accessible labels, normal keyboard/arrow navigation, a numeric `n / 5` output and Clear Rating. The initial state is Unrated; valid values are 1, 2, 3, 4 and 5. Zero, fractions, nonfinite and non-scalar ratings are invalid. Closing a case never fills a rating automatically. Icons are SVG/CSS, not decorative emoji.

Genuine future closure must validate the close permission, record the authenticated closing user and authoritative Asia/Riyadh timestamp, derive Solved Date/Hour, and preserve status/assignment/resolution history, original Received Date and creation timestamp. Closed cases remain available for authorized reporting. The frontend neither creates these audit events nor defines reopening/refund approval policies.

### Future export and privacy permissions

Future Export Excel must include all 23 approved overview columns for the **authorized filtered result**, respecting text, plate and status filters, without limiting output to visible table rows. Dates/times must remain usable, satisfaction must be numeric 1–5 or blank, explicit SAR amounts must remain numeric and multiline descriptions must survive. The representation of both textual refund details and numeric amounts within the fixed overview/export contract still requires approval; do not silently convert money to mixed text or discard details. No Excel export is generated now.

Customer contact and case descriptions are private data. Backend permissions must distinguish **View Cases, Create Cases, Update Cases, Assign Cases, Close Cases, Export Cases**, including field-level contact access/redaction as appropriate. A signed-in account or generic existing administrative role does not imply access to all customer information. Every future read, assignment, update, closure and export must verify the authenticated account/action and return only authorized fields/records. Read-only client fields, source labels and hidden controls are not authorization.

## Internal Helpdesk — staff support tickets

Helpdesk is independent of Customer Care, Driver Appeals and NCR. It has exactly **two main tabs: Create Ticket and Manage Tickets**, using the shared keyboard-accessible tabs. Creation drafts, management filters and record details are separate. No operational tickets or user accounts are created in this phase.

### Creation and verified identity

**Create Helpdesk Ticket** describes submitting an internal request to the appropriate department. Your Email is read-only and displays an existing SDK-authenticated account's **confirmed email** when available. If confirmation/account information is absent, the value stays blank with an account-information-pending explanation; no address is constructed from the login username. A generic confirmation timestamp or user-editable metadata is not substituted for confirmed email. This is a display convenience, not proof of identity for an operational backend.

**Your Department** is a separate read-only future profile field. No department is inferred from user-editable account metadata or the receiving department selector. **Department** means the team receiving the request, with exactly: **Operation, Planning, Finance, Maintenance, HR, IT, QHSE**. Customer Service belongs to the Customer Care configuration, not this ticket dropdown. Receiving Department and the required multiline **Ticket Description** are meaningful initial validation fields.

Submit Ticket always displays **“Database integration pending — ticket not submitted.”** It does not allocate a ticket ID, append a record, generate audit times or send email/WhatsApp/notifications. Clear Form clears the receiving department/description and pending messages while retaining the current verified email. Tab changes do not silently clear drafts or management filters.

### Management and details

Manage Tickets describes reviewing internal tickets assigned to the user's department. It has pending **Refresh**, one shared search for Ticket ID, Creator Email and Creator Name when available, plus **Created By** and **Status** selectors. Created By choices are derived only from the already-authorized ticket response, using stable Creator User ID (email/source identity fallback for preview adapters), never by enumerating all accounts. The overview has exactly: **Ticket ID, Created Date, Created Time, Created By, Creator Email, Assigned Department, Status, Last Updated At**. Full descriptions remain in details rather than the main table.

A record button or empty preview opens a detail modal with Ticket ID, Created By, Creator User ID, Creator Email, Requester's Department, Assigned Department, full Description, Created Date/Time, editable Status, Last Updated By/At and Resolved At. All source/identity/audit fields remain read-only; only the status choice is editable. Save Changes says **“Database integration pending — ticket changes not saved.”** Cancel/Escape return focus. Source rows remain unchanged, and no resolution timestamp is synthesized.

Approved ticket statuses are exactly **Pending, In Progress, Done**, with All Statuses in the filter. Genuine new tickets start Pending; the intended lifecycle is **Pending → In Progress → Done**. Future authorized status transitions must be audited and validated on the backend. The preview selector does not grant transition/update permission, invent extra escalation states or delete completed tickets. Done tickets stay in authorized history. Ticket ID format is **unapproved**; the future backend must generate permanent unique IDs without a browser numbering convention.

### Single registry and server-side department authorization

All future Helpdesk tickets belong to **one unified approved Google Sheet or equivalent operational registry**, not one spreadsheet per department. Suggested logical metadata includes Ticket ID, Creator User ID/verified email, requester department, assigned department, description, creation timestamp, current status, last-updated actor/time, resolved timestamp and status-audit references. This is a future logical contract only: no Sheet, database, table or migration is created.

The secure backend must verify the Supabase authenticated account, current account status, authoritative department memberships, allowed action, current ticket assignment and view/update permission **before returning sensitive ticket data**. IT members may receive only tickets they are authorized to view in IT; Finance/Maintenance and other departments follow their own permissions. Explicitly authorized cross-department administrators may receive broader scopes; a generic admin label alone is insufficient. Permissions changing or tickets being reassigned must be checked again on writes, with audit/concurrency controls.

**Never download the full registry and hide unauthorized rows in JavaScript.** The current preview has no data connection and performs only text/creator/status business filtering on an **already permission-filtered response** supplied by a future adapter. No client-side department filter, scope label, dropdown, manually typed email or account metadata grants access. User-directory and membership/permission contracts remain future approval work; no direct browser Supabase Admin API or exposed operational Sheet is introduced.

Future actions must distinguish **Create Ticket, View Assigned Department Tickets, Update Assigned Department Tickets, View All Department Tickets, Manage Department Permissions**. Only assigned-department users with the permitted action, or explicitly authorized cross-department administrators, may update a ticket. Backend writes must derive creator identity and audit actors from verified sessions, use authoritative **Asia/Riyadh** timestamps, preserve original creation data and retain a full change history. No existing Supabase accounts/roles/sessions are changed now.

### Shared boundaries and future infrastructure

Both support modules start empty, use separate in-memory authorized-response snapshots solely as view adapters, and retain only unsaved form drafts. They never persist operational data through localStorage/IndexedDB, Supabase tables, spreadsheets or any other store. Logout/account change clears snapshots, private drafts and search suggestions. Auth observers only display current account information or clear previews; they do not enumerate users, query operational tables or modify authentication.

Future storage follows the separately approved direction: existing Supabase authentication, a secure authorization/validation backend, approved Sheets or another operational source, and private Drive/document services only when separately authorized. No legacy Sheets/Apps Script integration, live Drive access, email, WhatsApp, notifications, financial service or new persistence is connected in this task. Roster's existing explicitly authorized local file workflows remain unchanged.

## Roster Management — implemented local frontend

The five tabs are **Daily Overview**, **Weekly Roster**, **Driver Schedule & PDF**, **Roster Import**, and **Stops & Locations**. This replaces the Roster placeholder within the same administrative module and navigation path; it does not reinstate a standalone Driver Weekly Schedule page. All interface labels, generated PDF labels, messages, comments and documentation are English. Original driver names, official geographic names and source identifiers are preserved as data.

### Authorized local processing and privacy

The owner explicitly authorizes local, in-memory processing of administrator-selected Day/Night `.xlsx` files, personal PDF previews/downloads, complete weekly ZIP downloads, and non-personal location JSON import/export. These are real local file operations, unlike the disconnected export controls in other business modules. Files are processed by a dedicated worker using local, pinned dependencies. Private workbook contents never enter public assets or source control, browser databases, Supabase operations, Sheets, Apps Script, Drive or a delivery service.

Roster data starts empty. The only supplied configuration committed is the approved, non-personal 76-location JSON. Private reference workbooks/PDF, generated personal schedules, ZIPs and private review images stay outside the repository. `.gitignore` excludes workbook/PDF/ZIP artifacts. Logout and page exit clear the local roster, file inputs, selected driver, PDF/ZIP caches/object URLs, pending workers and local configuration drafts; location edits require an explicit JSON download to retain them. This is not persistent operational storage or a publication workflow. Static frontend authentication is not a future authorization boundary for private server records.

### Source workbook contract and complete validation

Both files must contain worksheet **Roster**. Row 2 contains seven actual dates in columns D–J, in consecutive Sunday–Saturday order. Column B contains Driver Name; C contains the ten-digit Driver Iqama (`Driver Nº` in the references). Beginning at row 3, every driver occupies **two consecutive rows**: assignment cells first, corresponding per-date vehicle cells second. Merged identity cells in B/C are supported by reading the top row only. A lower row cannot introduce another identity. Fully empty pairs are skipped. A shift may have zero drivers; totals are derived dynamically and never fixed to the reference counts.

Working cells use `(HH:MM)-(HH:MM)-Zone: name - Stop: name`. Parsing uses the explicit **Zone:** and **Stop:** delimiters, preserving internal hyphens in either name. Valid 24-hour times come from each cell; the Day/Night classification comes from the selected source, not assumed hours. A working assignment requires a vehicle. A Rest Day must read `REST DAY` in **both** rows; no vehicle/time/location is invented. Missing cells are validation errors, never inferred rest. Formula cells are rejected rather than trusting cached results. Invalid dates, malformed paired rows, incomplete assignments, duplicate identities within/across sources and conflicting driver/vehicle intervals block acceptance. Identical start/end times require source clarification instead of an assumed duration.

Gregorian date calculations are independent of the browser locale. Excel's 1900 and 1904 date systems are supported; the fictitious 1900 leap day is rejected. Intervals use explicit **Asia/Riyadh / UTC+03:00** offsets. An ending time before its starting time belongs to the next calendar day, including a Saturday shift ending Sunday. Overlap checks include these overnight intervals; back-to-back vehicle assignments are allowed. Every affected vehicle assignment is reported once using a sorted interval scan, without allocating a quadratic number of duplicate pair errors. Checks cover the imported week and its overnight endings; comparing adjacent published weeks requires future historical storage. Preview dates are source data, not authoritative publishing/audit timestamps.

Limits are 10 MiB per source, 10,000 paired drivers per shift, expected columns A–J and 4,096 characters per cell. Validation scans the entire supported source and reports issues in paginated results. Both selected files must refer to the same week. Acceptance is atomic: only a successful combined result replaces the prior in-memory week. Failed validation preserves the complete prior preview. A source selection changed during validation cannot accept a stale result. Only the active validated week is selectable; historical/published versions await backend integration.

### Daily, weekly and personal views

Daily Overview combines one Name/Iqama/Car Plate search with Date, Shift Type (All Shifts, Day Shift, Night Shift), Duty Status (All Statuses, Working, Rest Day), Starting Zone and Assigned Stop filters. The ten columns are Driver Name, Driver Iqama, Date, Shift Type, Duty Status, Starting Time, Ending Time, Car Plate, Starting Zone, Assigned Stop. Counts reflect the filtered assignments and both shifts. Rest Days have distinct neutral green styling; absent drivers are not classified as resting.

Weekly Roster has Week, combined Name/Iqama/Car Plate search and Shift Type filters. Each driver occupies one row, with all seven dates and their duty, starting/ending times, car, zone and stop. Date headers derive from the active validated week. Long text wraps inside horizontally scrolling table regions; row selection opens that driver's personal schedule.

Driver Schedule & PDF uses shared Name/Iqama search and shows the selected identity, week, shift and all seven assignments, including station/time if explicitly configured. An overnight ending date is visible. All tables use 25-row pages where applicable, independent of the overall roster size. Searches and business filters use the existing shared component. All drivers remain available beyond the current page; PDF/ZIP generation ignores view pagination and filters.

### Location catalog, aliases and missing stops

`locations.json` preserves the owner's 76 approved named WGS84 coordinates, including the exact supplied DEPOT coordinates. Stop matching is deterministic: exact name, normalized whitespace/case, controlled Unicode dash/apostrophe normalization, then explicit approved aliases. No fuzzy destination is assigned. Similar-name detection produces a warning only. Names and aliases must be nonempty and globally unambiguous within their location group; duplicate normalized names/aliases are rejected.

Catalog schema remains `schemaVersion: 1`, `coordinateOrder: "latitude,longitude"`, with `locations` containing name, numeric latitude/longitude, optional aliases and remarks. A separate optional `zones` group supports **explicit** zone coordinates. Stop coordinates never imply a zone mapping. Exports retain only these configuration fields and exclude roster/driver/phone data. Latitude range is −90…90; longitude is −180…180; both must be finite numbers. Google Maps URLs are generated only as `https://www.google.com/maps/search/?api=1&query=LATITUDE,LONGITUDE`, latitude first.

Stops & Locations lists name, coordinates, Maps link, aliases and provenance (approved reference, local preview edit/addition). Counts distinguish the original approved reference locations from the current preview catalog and show distinct original source stop names used/matched/unmatched, missing coordinates and alias conflicts. Invalid proposed catalogs are rejected atomically; the current catalog remains conflict-free. Unknown stops retain their original text, are listed with **Add This Stop**, and receive no guessed hyperlink. Unmapped names are a local-preview warning, not an excuse to fabricate data or silently omit a driver.

Add New Stop validates name/coordinates, provides a read-only generated Maps URL, aliases/remarks and a Maps preview. Successful addition says **“Stop added to the current preview. Download the updated location catalog to retain this configuration.”** It rechecks the existing roster without reimport. Edit Stop previews mapping impact and requires confirmation of the changed name/aliases/coordinates. Full JSON imports show additions, changes, removals and unmatched impact before explicit replacement confirmation. Existing names/aliases are never silently overwritten.

Catalog edits/replacement invalidate previous PDF/ZIP downloads and affect subsequent generation. Similar-name warnings do not become automatic aliases. A future permanent catalog update requires separate review/authorization; no stop database exists now.

### English-only personal PDFs and complete ZIPs

Fresh PDFs are generated from the **selected driver's actual imported assignments**, never by reusing the private reference PDF as a background. The reviewed reference informs A4 landscape, TaxiQaid logo, white background, black grid, peach/orange day/date headers, centered values and green REST DAY cells. Header: **WEEKLY SCHEDULE**, **Driver Name:**, **Driver Iqama:**. The five row labels are exactly **Car**, **Starting Hour**, **Ending Hour**, **Starting Zone**, **Petrol Station**. Arabic/Indonesian translations from the reference are absent. Original proper names remain source data, including supported Unicode characters.

Starting Zone and `Stop: …` remain distinguishable in each cell. Real PDF link annotations target the approved stop coordinates; explicit zone coordinates and explicitly configured station locations can have separate links. Unknown destinations remain unlinked. Line wrapping, measured row heights and readable font scaling prevent overlap. Oversized text or unsupported font glyphs produce an explicit generation error instead of clipped or silently corrupted output. The embedded licensed Unicode font is separate from the app's interface font. Source overnight times are preserved and marked as ending the next day.

The reference's `DEPOT - 00:30` is **not in either workbook**. Production previews have no inferred station or station time and show **Not Configured**. Per-driver/per-date approved station schedules are a future source contract, represented by optional assignment station name/time. The interface reserves those disabled configuration controls. Tests can exercise explicit isolated station data; this does not configure production schedules.

Preview Weekly PDF uses a local Blob URL; Download Weekly PDF uses a sanitized `<Iqama>_<Name>.pdf` filename. No private PDF is uploaded or given a public schedule URL. Generate All PDFs processes **every unique validated driver**, across both shifts, in a worker. Counts show total, generated, remaining, errors and processed percentage, followed by ZIP progress. Remaining PDFs includes failed items; 100% processed does not imply a successful batch when errors exist. Navigation remains usable and generation can be cancelled. Any failed PDF is reported; incomplete batches never enable a purportedly complete ZIP. A successful batch enables `TaxiQaid_Weekly_Roster_YYYY-MM-DD.zip` for the active validated week only. New accepted source data or location changes invalidate old downloads and stale in-flight results. Zero-driver weeks do not generate empty operational ZIPs.

### WhatsApp Delivery — interface only

The **Weekly Schedule WhatsApp Delivery** dialog shows the selected week, real imported driver count, local PDF readiness and **Not Configured** connection status. Phone availability and eligibility counts are unavailable until a verified Drivers Management/backend source exists; neither numbers nor provider events are invented. Settings prepare Business Account Reference, Phone Number ID, Approved Message Template, English Template Language, future Document Attachment Mode and Connection Status. Settings are unsaved local drafts and contain no secret/token field.

Preview Message displays this **proposed, unapproved English template**:

> Hello {{driver_name}}, your TaxiQaid weekly schedule for {{week_start}} to {{week_end}} is available. Please review your assigned shifts and rest days. Your personal weekly schedule is attached.

Review Recipients shows imported identities alongside unavailable phone linkage, unpublished roster version and pending verification. The future ten-column delivery history (Driver Iqama, Driver Name, Phone Number, Roster Week, Roster Version, Delivery Status, Sent At, Delivered At, Failure Reason, Provider Message Reference) stays empty. **Send Weekly Schedules is disabled.** The message remains **“WhatsApp integration pending — no messages have been sent.”** No provider service, WhatsApp Web automation, account creation or sending is implemented.

Future delivery must use the official WhatsApp Business Platform or an authorized provider, approved templates/policies, verified phone ownership and recipient consent, permission/limit checks and an explicitly reviewed/confirmed batch. Backend matching binds stable Iqama, driver name/verified phone, week, **approved roster version** and that driver's personal PDF. Each driver receives only their own PDF, never the company-wide ZIP. Genuine provider references/events drive delivery history; idempotency by driver/version prevents duplicate sends and safe retries preserve history. Credentials remain server-side.

### Future publication, storage and Driver Portal

Local validation is **not publication or approval for driver distribution**. Future workflow: authorized source upload → full validation → resolve mapping/assignment issues → review → authorized approval → publish an immutable version → securely store approved records → derive personal My Schedule projections/PDFs from that same version → optionally deliver verified personal PDFs → preserve publication, supersession/correction and delivery histories. The reviewed source/PDF formats are now known; future contracts still need approval for station schedules, scheduling exceptions, publication permissions, retention, source identity and storage.

Drivers will use the existing Supabase identity securely linked to a stable Drivers record. **Weekly Schedule** will show only that driver's own shifts/rest days, hours, vehicle, zone/stop/Maps links and English weekly PDF, with optional authorized WhatsApp receipt. URL/Iqama manipulation must never select another driver's identity. Drivers must not read the complete administrative roster/ZIP. Personal PDF and portal view must share one approved version; replacements/corrections cannot leave conflicting published schedules. Generate/cache personal PDFs by approved version/driver/week rather than hundreds of duplicate files on every draft edit.

Future architecture remains Supabase Auth for identity, secure backend authorization/validation, Google Sheets or another separately approved operational source for structured records, and private Google Drive or another approved document store for personal PDFs. No such service is connected or created now. No public Drive links or static frontend service credentials may expose confidential schedules. Authoritative publishing/delivery/audit timestamps use Asia/Riyadh from the backend; historical versions and authenticated actors must remain auditable.

## Driver Portal — frontend prepared, integration pending

The administrative Driver Weekly Schedule placeholder remains retired. It has no sidebar link, active fragment, script or stylesheet, and is not reinstated. There are now **18 administrative destinations**: the existing 16 modules, Driver Portal Preview and User Management. The personal portal is outside the administrative shell, using its own logo, driver name, Sign Out control and mobile layout. It has **exactly four primary sections**:

| Section | Current interface and future authorized source |
| --- | --- |
| **Driver Settings** | Approved name, Iqama and contact phone, separate proposed name/phone fields, and genuine authorized profile-request statuses |
| **Files** | Only personal assigned private immutable documents, full-PDF viewing, version-bound confirmation and genuine signed details |
| **Weekly Schedule** | Only the linked driver's approved published Sunday–Saturday version and its personal English PDF |
| **Appeals** | Required multiline Description and Submit Appeal only |

NCR histories, Training, financial records, an extra dashboard, separate signature/history sections and other personal modules are deferred. Earlier planned My Profile/My Documents/My Signatures/My Schedule areas are consolidated into these four sections; no additional primary routes are implied by future workflow descriptions elsewhere in this document.

### Authentication and authoritative driver identity

Management login retains its existing username + `@taxiqaiddemand.com` email/password flow and `taxiqaid_roles` lookup. An explicitly driver-only role is refused administrative admission and signed out. Existing management roles are not rewritten, migrated or assigned new granular grants. Auth state changes clear private portal and administrative source snapshots. Logout continues to use the existing Supabase project.

The separate **Driver Sign In** screen accepts a ten-digit Iqama and password. `#driver-portal` opens that login screen only; no URL selects a driver or grants access. It validates input, makes **no authentication or public directory lookup**, clears the password on submission and reports **“Driver account authentication is not configured yet.”** Recovery is pending. There is no fabricated Iqama email, password retrieval, logging or local password storage.

Future provisioning must securely link **verified Supabase UID → stable Driver Record Reference → Iqama**. Iqama is a visible identifier, not proof of account ownership. A backend broker or approved Supabase-compatible mapping must verify unique account/driver linkage, active account and approved role/scope before supplying personal data. Do not call `signInWithPassword({iqama})` or expose an Iqama-to-email directory. Password activation/reset and disabled-account enforcement require the approved secure backend. Re-check identity, account status, scope and record ownership for every operation.

The future **Driver registry is the single authority**, with the exact approved storage mechanism deferred. Portal, Drivers Management, Roster, document assignments and approvals reference the same stable record. There must be no second editable driver identity or unsynchronized contact copy. A changed contact phone does not change an authentication phone/login identifier; that requires a separate verified security workflow.

### Driver Settings and profile approval

Only name, contact phone or both may be requested. Approved values stay separate and unchanged. The searchable country/calling-code selector uses pinned international phone metadata; national input is separate, validates the selected calling prefix, rejects repeated international prefixes and normalizes to E.164. A calling prefix proves neither residence nor phone ownership. Proposed values start blank so name-only and phone-only requests remain distinct. Exact no-op response: **“Approval workflow pending — your changes have not been submitted.”** No Supabase profile, Drivers record, status, reference or timestamp is written.

The personal status area supports No Pending Requests, Pending Approval, Approved and Rejected from authorized snapshots only. Pending proposed values are displayed separately from current approved values. The future backend validates allowed fields, source version, uniqueness/contact policy and contradictory overlapping requests, allocates the request reference, preserves original/proposed values and creates a reviewer audit trail. Pending personal status corresponds to Pending in the administrative queue. Approval atomically updates the authoritative Driver registry once and projects the new approved values to both interfaces. Rejection preserves the source values, original request and reviewer/reason/time history. Concurrency must prevent stale or duplicate review operations.

### Files, immutable content and account confirmation

No assignments are invented. Empty state: **“No documents assigned — document integration pending.”** Assigned cards support Pending Signature, Signed and unavailable/canceled assignments. Drivers cannot upload, edit or delete documents. Management must eventually upload/assign documents through separately authorized workflows. Original private PDF reference, document ID, version and content hash must be immutable for each confirmation. The prepared adapter accepts a private PDF Blob only and verifies SHA-256 before displaying it; it creates short-lived local Blob URLs and revokes them on scope/session changes. It does not retrieve public Google Drive links. A full document preview/new-tab opening is available before the explicit reviewed acknowledgment and a separate confirmation dialog. Rendering a PDF does not establish that a person has read it; confirmation is their explicit acknowledgment.

**Approved method: Authenticated Account Confirmation**, using the driver's own authenticated Supabase session. No drawing, signature bitmap, PIN or SMS is required. The current response is **“Signature integration pending — document not signed.”** It never changes the document to Signed or generates a reference/time. Signed versions cannot be confirmed again, and canceled/unavailable versions cannot be signed. The exact displayed version/hash must still match at confirmation. Management preview cannot call this self-service operation.

| Future confirmation metadata | Requirement |
| --- | --- |
| Signature Reference | Unique backend-owned reference |
| Document ID / Document Version / Document Hash | Exact immutable content, including SHA-256 |
| Authenticated Supabase UID / Linked Driver Iqama | Derived from verified session and driver link, never accepted as browser proof |
| Signature Status / Signature Method | Authoritative result / `Authenticated Account Confirmation` |
| Signed At UTC / Signed At KSA | Backend authoritative UTC instant and equivalent `Asia/Riyadh` representation |
| Original Document Reference | Private original version; retained after confirmation |
| Audit Metadata | Actor, authorization, immutable source/version, operation/idempotency reference and protected audit history |

A future backend verifies active session, action permission, assignment ownership, valid current version and previous signature atomically; confirmation must be idempotent and auditable. Preserve signed evidence after replacements/cancellations under the approved retention policy. This confirmation is not automatically a certified electronic signature. The legal status and retention policy need explicit approval in the backend phase.

### Weekly Schedule and Roster publication

The portal reuses the existing Roster model, location resolver, PDF template and worker; it has no separate Excel parser or access to the administrative in-memory draft. An authorized personal snapshot contains owner UID, stable driver reference, approved/published flag, immutable version, week dates, one driver's seven assignments and the approved catalog version. Draft, unapproved, mismatched-owner or non-consecutive weeks are rejected. The driver sees name, Iqama, shift, selected week, Sunday–Saturday dates, working/rest days, hours, car, distinct zone and stop, optional station and approved Maps destinations. Missing coordinates remain plain text; no coordinates or station times are invented.

**Download Weekly Schedule** prepares exactly that authorized personal version using the shared Roster worker. The same snapshot powers cards and PDF; the footer identifies the published version. Existing administrative PDF/ZIP generation retains its “Local preview - unpublished” behavior. The personal portal exposes no full roster, company ZIP, workbook imports, delivery settings or other driver's schedule. Empty state: **“Your weekly schedule is not available yet.”** Permissioned administrative schedule assignment/approval/publication, version replacement, storage/caching and delivery remain future backend work. No local administrative import is treated as published.

### Appeals contract

The portal has Description and Submit Appeal only, with **“Appeal integration pending — your appeal has not been submitted.”** No local appeal ID, record or success status is allocated. Future identity, name, Iqama and nationality derive from the authenticated stable Driver link. Backend IDs retain `APL-00001`; initial status and department remain independently Pending, and Appeal Type is unset/unclassified until authorized management classification. The administrative eight-column queue gains a prepared **Classify Appeal Type** control with approved types unconfigured, and separate classify/assign/update-status capabilities. No categories, status history table or driver-side classification are invented.

### Management preview

The administrative **Driver Portal Preview** selector is empty until an authorized scoped directory exists. “Preview Empty Layout” displays no driver data and is a read-only layout aid for the existing management session. It grants no operational capability. A future genuine preview requires `driver-portal.view`, `driver-portal.preview` and explicit selected-driver scope; private documents additionally require `driver-portal.preview-documents` and selected document scope. Published schedule viewing and personal PDF download have separate capabilities. A read-only **“Management Preview — Read Only”** banner is always visible. Manager UID/session is retained, never replaced by a selected driver. Request Changes, Confirm & Sign and Submit Appeal are blocked in handlers as well as controls, including manually re-enabled buttons. Backend enforcement remains mandatory.

## User Management — frontend prepared, integration pending

The Administration sidebar contains **User Management** and Driver Portal Preview. Driver-only accounts cannot enter the ERP shell. The three User Management tabs are **Users**, **Access & Permissions**, **Driver Profile Requests**. All operational lists start empty; the browser does not fetch the Supabase Auth directory.

Users provides shared ID/name/login/Iqama search, Account Type/Status filters, Create User and disconnected Refresh. Its nine columns are User ID, Display Name, Account Type, Email / Login, Department, Role, Account Status, Last Sign In and Actions. Future authorized rows offer separately permissioned edit, enable/disable and access review. Create/Edit prepare account type, display name, multiple management departments, proposed role, login identifier, driver Iqama and Active/Disabled status. Driver login identifier is derived from entered Iqama for the proposed form only. Existing management authentication conventions remain unchanged. **“Account management integration pending — user not created.”** No Supabase user, role, mapping, password, last-login time or reference is created. Real provisioning/activation/recovery requires server-side administrative APIs; never place service-role credentials or privileged user creation in static JavaScript.

The six **proposed configurable templates** are Super Administrator, Administrator, Department Manager, Supervisor, Staff and Driver. They do not correspond to new production role rows or grants. Defaults are unconfigured until the approved protected backend supplies them. Department reference labels in existing modules are not a canonical ID migration: Finance/Financial and QHSE/Quality mappings need approval and are never silently merged. Multiple department membership is supported. No trusted administrator or recovery account is invented; initial bootstrap, emergency recovery and highest-level self-lockout prevention require an approved server-side process.

### Permission catalog and effective access

`shared/permission-catalog.js` is the stable catalog, `permission-model.js` is the pure evaluator, `access-runtime.js` holds only the current actor's rendering context, and `permission-bindings.js` maps real controls (including nested workflows) to capabilities. The matrix covers all 18 destinations. Each module has independent `<module>.view`; meaningful actions also require that module and any nested read dependency. Penalties exposes view/export only. Refresh uses existing read capability. Local tab mechanics, Clear, Cancel, pagination and decorative controls are not new backend privileges; tabs with distinct protected resources use the corresponding read capability.

Role defaults, department/driver/document scope, per-user Inherit / Explicit Allow / Explicit Deny and effective result/source remain separate. Explicit deny takes precedence, unknown keys deny, missing module/dependency denies, inactive/unverified/missing contexts deny. Driver accounts cannot acquire management capabilities, and management accounts cannot acquire driver self-service writes. Helpdesk updates require membership of the assigned department or explicit cross-department scope plus the separate view-all capability. Driver previews require selected-driver scope and documents require additional document scope.

The Access tab has a shared authorized user selector, proposed template, account type, expandable module/action groups and controls to View Effective Permissions, Edit Module Access, Edit Action Permissions, Save Permissions and Cancel. Drafts may be explored without a selected user but are clearly unassigned. A selected user's defaults/overrides inform the target draft only. Effective cells distinguish inherited grants, explicit overrides, missing dependencies and denial. **“Permission management integration pending — changes not saved.”** Save never calls `applyAuthorizedContext`, updates the acting user or grants runtime access. Cancel discards drafts. Changing a proposed template supplies no fabricated role defaults.

**Migration boundary:** existing management admission continues through its original `taxiqaid_roles` check and retains previously authorized disconnected interfaces and Roster local processing. It is not converted to an all-permissions role. New operational data and granular capabilities default denied until a verified context exists; legacy-visible new screens contain empty scaffolding/no-op drafts only. Once an approved context is supplied, the rendering adapter hides denied navigation/views and makes denied controls inert with capture/handler checks. All 18 module/action bindings use stable selectors/keys, not displayed button text. Browser state and a `source: authorized-backend` marker are adapter contracts, **never proof of authority**; malicious browser edits cannot be made secure by client code. Every future protected endpoint must independently verify JWT/session, account status, effective permissions and record scope.

The future permissions authority supplies UID, account type/status, role/defaults, departments, per-user overrides, effective version, stable driver link and scoped resources. It must apply permission updates atomically with approved actor authority, target restrictions, self-escalation/lockout checks and audit actor/time/before/after. Enforce a defined session-refresh, revocation and cache invalidation policy; stale contexts cannot authorize backend work. No client draft or broad legacy role can grant operational rights.

### Driver Profile Requests

The queue has exactly ten columns: Request Reference, Driver Iqama, Driver Name, Requested Field, Current Value, Requested Value, Requested At, Status, Reviewed By, Reviewed At. Shared search covers reference/Iqama/name, with separate Pending/Approved/Rejected status and Name/Phone field filters. Details retain current/proposed values and review notes. Approve and Reject have independent `driver-profile.approve` / `driver-profile.reject` capabilities requiring User Management and request-view permissions. **“Approval integration pending — request not updated.”** No review result, driver field or timestamp is mutated. Future approval/rejection validates the original request/source version, reviewer authority, identity, overlap rules and idempotency, with one authoritative driver update and retained reviewer/audit trail. Contact phone and account-login identifier changes remain separate.

## Proposed future infrastructure — no connections authorized now

The proposed direction retains **Supabase authentication** for user/session identity. A secure backend would validate all module permissions, record ownership, source decisions and operational writes. Approved operational records may later use **Google Sheets or another approved system**; documents, attachments and generated PDFs may later use **Google Drive**. These are architectural options, not approval to create a database, spreadsheet, Apps Script project or Drive structure now.

Private data cannot rely on public Sheets/Drive links, guessable identifiers or client filtering. The backend must verify Supabase identity and scope every read/write/download/export to authorized module permissions and driver ownership. Service-role keys, Google credentials and privileged source access belong only on the server; never expose them in static client files or URLs. Existing public Supabase configuration and connected authentication stay unchanged. Legacy Sheets and Apps Script endpoints remain retired and disconnected; a future approved architecture must not silently reactivate them.

## Future connection inventory

- Existing Supabase authentication and roles remain unchanged; the future operational service must verify identity and permissions server-side.
- Fleet vehicle lookup keyed by Car Plate, with model derivation and approved odometer ownership.
- Drivers lookup keyed by Iqama Number, with name derivation and vehicle assignment relationships.
- Accident and Breakdown entities with server-generated unique identifiers and reporting audit metadata.
- Source-to-Maintenance submission and independent request lifecycle with immutable provenance.
- Maintenance acceptance transaction, MTN identifier allocation, work-order storage and permanent source/request references.
- Repair status, request completion and source read-only status projection with audit history.
- Trip Check inspection persistence, signatures, authorized edits and eventual exports.
- Fuel records with unique backend IDs, Fleet/Driver relationships, configured Depot tariffs, historical price snapshots and authorized edit auditing.
- NCR records/unique IDs, all-driver summaries, authoritative 90-day KSA expiry, preserved historical penalties and independent TBT/action audit fields.
- Authorized external Penalties source/refresh, source-supplied IDs, Fleet/Drivers references, confirmed Charged To/amount contracts and read-only filtered numeric Excel exports.
- Future Driver Portal account-to-driver ownership mapping and authorized Driver Settings, Files/confirmation, Weekly Schedule and Appeals; deferred NCR/training features require later approval; permission-controlled administrative schedule assignments. No portal connections exist in this phase.
- Driver Appeals with backend APL IDs, authenticated driver/profile origin, independent status/department assignment and audit history.
- Training definitions/requirements, sessions/enrollments, confirmation evidence, trainer verification, valid completions and full all-driver compliance/detail exports.
- Driver financial source approvals, stable/idempotent expense provenance, posted charges, partial deductions, reversal/adjustment audit trails and distinct financial permissions.
- Roster local parsing, validation, projections and personal PDF/ZIP generation are implemented; secure versioned approval/publication, station schedules, storage, personal portal access and verified WhatsApp delivery remain future integrations.
- Customer Care authorized case source, permanent daily CS IDs, eligible active account directory, resolution/refund/rating contracts, contact privacy and filtered numeric Excel reporting.
- One unified Helpdesk registry with server-side department/action filtering, verified creator metadata and retained status-resolution audit history.
- Authorized date/search/filter reads and Excel/PDF export services using connected records.

These are prepared interfaces or planned services, not schema proposals, migrations or permission grants.

## Shared interface standards

Follow [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the centralized orange/neutral tokens, typography, 46px minimum controls, monochrome SVG navigation, responsive cards/tables/modals and unified multi-field search. Each conventional view uses one combined record search and keeps independent business filters. No scoring rules, identifiers, transaction pricing or source relationships changed during visual standardization. Trip Check retains its specialized workflow and custom PDF source.

## Verification and review

Run `node --test tests/*.test.cjs` for compatibility and scoring/expiry regression tests. Run `node tests/workflow.browser.cjs` and `node tests/ui.browser.cjs` against a local HTTP server for workflow, shared-search and responsive visual regression checks. Browser tests use mocked authentication and role responses, never a live user account or real operational records. Penalties rendering tests inject temporary synthetic DOM fixtures locally and remove them; the deployed module has no sample records. They cover all sidebar modules, date-only filters, shared location equality, forms, maintenance tabs/acceptance, mobile overflow, Fuel conditional fields/validation/approved Depot tariff/live totals/detail editing, both NCR views/retained filters/23 categories/automatic KSA preview rollover/TBT independence, read-only Penalties/combined search and date retention/long-text safety/detail keyboard access, pending controls and the absence of legacy requests, operational writes, downloads and uncaught errors. Live Supabase login/session behavior still requires review with an existing authorized account; no account credentials were supplied to this task.

The people-operation regression suite (`node tests/people.browser.cjs`) checks appeal filters and independent assignments, training tabs and bounded cross-page selection above 800 drivers, and financial previews with original references and partial deductions. Its records are isolated test fixtures and cleared before screenshots; the deployed application starts empty. Pure people-policy tests verify inclusive dates, selection completeness/uniqueness, requirement completion boundaries, currency precision and source/posted-transaction controls.

Roster verification adds `node tests/roster.browser.cjs` and `python tests/verify-roster-pdfs.py <private-test-output>` (PyMuPDF). Pure tests cover paired rows, variable/empty shifts, calendar dates, overnight conflicts, aliases, coordinates and atomic source validation. Browser tests include dynamic batches above 800 drivers, complete/incomplete ZIP handling, mapping changes, private-session clearing, all tabs/filters/dialogs and responsive layouts. Reference workbooks may be supplied through environment paths; neither them nor generated personal output belongs in the repository.

Support verification adds `node tests/support.browser.cjs` alongside the existing suites. Synthetic fixtures test the exact 23/8 columns and vocabularies, required initial data, five-star keyboard controls and unrated distinction, optional SAR/refund fields, confirmed versus unconfirmed email, independent requester/receiving departments, immutable source snapshots, retained filters, private-session clearing and pending operations. All 18 administrative destinations remain in navigation regression coverage; no customer/ticket fixtures are deployed. Live authentication still needs an existing authorized account; preview tests use mocks.


Driver Portal/User Management verification adds `node tests/portal.browser.cjs` and `tests/portal-permissions.test.cjs`. Synthetic authorized adapter fixtures verify unconfigured driver authentication makes no auth request, unchanged management login convention, driver-only role rejection, four sections, phone/name validation, no-op requests/signatures/appeals/user/permission/review actions, immutable private PDF hashes, repeat-sign prevention, published personal PDF reuse, selected-driver/document scopes, denied runtime controls, empty responsive preview and session clearing. No live driver credentials or backend source is configured. No private test PDFs, ZIPs, accounts or personal screenshots are committed.
