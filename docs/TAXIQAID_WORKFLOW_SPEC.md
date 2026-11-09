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

Maintenance Requests and Maintenance Overview are separate keyboard-accessible tabs within the Maintenance module. Requests will receive Accident/Breakdown submissions and will remain visible after acceptance. Controls: Refresh and Export Excel. Filters: Car Plate, Start Date, End Date and Status. Status choices: **Pending**, **In Progress**, **Done** (plus All statuses in the filter).

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

Maintenance Overview contains detailed work orders, never replacement source records. Controls: Refresh and Export Excel. Filters: Car Plate, Start Date, End Date and Status, using dates only.

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

## Future connection inventory

- Existing Supabase authentication and roles remain unchanged; the future operational service must verify identity and permissions server-side.
- Fleet vehicle lookup keyed by Car Plate, with model derivation and approved odometer ownership.
- Drivers lookup keyed by Iqama Number, with name derivation and vehicle assignment relationships.
- Accident and Breakdown entities with server-generated unique identifiers and reporting audit metadata.
- Source-to-Maintenance submission and independent request lifecycle with immutable provenance.
- Maintenance acceptance transaction, MTN identifier allocation, work-order storage and permanent source/request references.
- Repair status, request completion and source read-only status projection with audit history.
- Trip Check inspection persistence, signatures, authorized edits and eventual exports.
- Authorized date/search/filter reads and Excel/PDF export services using connected records.

These are planned capabilities, not schema proposals or migrations.

## Verification and review

Run `node --test tests/fleet.test.cjs` for retained pure compatibility helpers. Run `node tests/workflow.browser.cjs` against a local HTTP server for frontend regression checks. Browser tests use mocked authentication and role responses, never a live user account or operational records. They cover all sidebar modules, date-only filters, shared location equality, forms, maintenance tabs/acceptance, mobile overflow, pending controls and the absence of legacy requests, operational writes, downloads and uncaught errors. Live Supabase login/session behavior still requires review with an existing authorized account; no account credentials were supplied to this task.
