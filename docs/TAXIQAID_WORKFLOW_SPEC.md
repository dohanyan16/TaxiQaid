# TaxiQaid workflow specification

## Current phase and boundaries

This phase is **frontend-only**. Operational collections start empty. All legacy spreadsheet URLs are disconnected; legacy transport helpers reject without network access. Login and navigation do not synchronize data. Refresh displays the unconnected state. Save, Delete, Export and Send controls never persist, download operational data or report success. Unsaved fields, dropdowns, dialogs, inspection scoring and Maintenance tabs are interface previews only. There are no replacement localStorage or IndexedDB databases.

Supabase URL, public key, password login, existing sessions, user profiles, role lookup and logout remain on the existing project. The existing `taxiqaid_roles` authorization boundary is preserved. There are no new tables, migrations, spreadsheets or Apps Script projects. Authentication SDK storage remains separate from operational records.

The shared sidebar, static module paths, existing styling, Fleet/Driver profiles and Trip Check wizard/editor/PDF source remain in place. Other planned modules retain Coming Soon states. Do not implement persistence until the interfaces and future database design are approved.

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

## Future Driver Portal — planned only

Driver Weekly Schedule is removed from the administrative sidebar, active module configuration, stylesheet/script imports and standalone placeholder files. There is no replacement administrative weekly schedule page. The administrative application now contains 16 modules. No schedule records or other operational data were deleted; the retired module contained only a Coming Soon placeholder.

Weekly schedules will be available exclusively to drivers through **Driver Portal → My Schedule**. The Driver Portal is a future, authenticated personal area, not an implemented module or route in this phase.

| Planned section | Intended personal access |
| --- | --- |
| **My Profile** | Personal driver details from the linked Drivers Management record |
| **My Schedule** | The driver's own weekly shifts, working days, rest days and vehicle assignments |
| **My Documents** | The driver's own authorized documents, certificates and downloads |
| **My Signatures** | Documents and inspections requiring that driver's confirmation |
| **My NCRs** | The driver's personal NCR history, current points and expired NCR penalties, preserving the approved scoring/recovery rules and historical records |

The portal will reuse the **existing Supabase authentication system**, project, sessions, profiles and permissions. Every driver account must have a verified link between its authenticated Supabase user ID and the corresponding stable driver record. A driver-entered Iqama, URL parameter or browser-side filter must not grant access to another driver's records.

The future backend must verify authenticated identity and record ownership for each read, download and confirmation action. Drivers may access **only their own authorized records** across every portal section; hiding other drivers in the interface is not an authorization boundary. The exact account-to-driver mapping and enforcement mechanism will be designed and approved during future database integration. Existing administrative authorization checks remain unchanged now.

Administrators with appropriate permissions will eventually manage schedule assignments through a permission-controlled administrative workflow, with authenticated audit information and authoritative KSA timestamps. That workflow is future work and does not reinstate a standalone administrative Driver Weekly Schedule page or expose other drivers' schedules through the personal portal.

This section documents future functionality only. **No Driver Portal UI, login route, account mapping, schedule workflow, storage, Supabase tables, migrations, data connections or new databases are implemented.** No legacy spreadsheet or Apps Script integration is reconnected. All other administrative modules, standardized orange styling and existing Supabase authentication remain intact.

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
- Future Driver Portal account-to-driver ownership mapping and authorized personal profile, schedule, documents, signatures and NCR access; permission-controlled administrative schedule assignments. No portal connections exist in this phase.
- Authorized date/search/filter reads and Excel/PDF export services using connected records.

These are planned capabilities, not schema proposals or migrations.

## Shared interface standards

Follow [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the centralized orange/neutral tokens, typography, 46px minimum controls, monochrome SVG navigation, responsive cards/tables/modals and unified multi-field search. Each conventional view uses one combined record search and keeps independent business filters. No scoring rules, identifiers, transaction pricing or source relationships changed during visual standardization. Trip Check retains its specialized workflow and custom PDF source.

## Verification and review

Run `node --test tests/*.test.cjs` for compatibility and scoring/expiry regression tests. Run `node tests/workflow.browser.cjs` and `node tests/ui.browser.cjs` against a local HTTP server for workflow, shared-search and responsive visual regression checks. Browser tests use mocked authentication and role responses, never a live user account or real operational records. Penalties rendering tests inject temporary synthetic DOM fixtures locally and remove them; the deployed module has no sample records. They cover all sidebar modules, date-only filters, shared location equality, forms, maintenance tabs/acceptance, mobile overflow, Fuel conditional fields/validation/approved Depot tariff/live totals/detail editing, both NCR views/retained filters/23 categories/automatic KSA preview rollover/TBT independence, read-only Penalties/combined search and date retention/long-text safety/detail keyboard access, pending controls and the absence of legacy requests, operational writes, downloads and uncaught errors. Live Supabase login/session behavior still requires review with an existing authorized account; no account credentials were supplied to this task.
