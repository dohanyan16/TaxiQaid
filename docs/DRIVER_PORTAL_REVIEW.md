# Driver Portal and User Management frontend review

The Driver Portal and User Management interfaces are prepared without provisioning accounts, connecting operational sources, granting permissions, persisting records or signing documents. Existing management authentication and business modules remain available through their original role admission. Explicit driver-only roles are refused administrative login. Live authentication was not tested because no account credentials were supplied.

## Changed areas

- `modules/driver-portal/`: separate Iqama login, four personal sections, international phone validation, read-only management preview, private immutable document viewer/confirmation, and published personal schedule adapter using the existing Roster worker/template.
- `modules/administration/user-management/`: Users, Access & Permissions and Driver Profile Requests; account/role/department forms, target-user unsaved drafts, effective permission sources and no-op reviews.
- `shared/permission-*.js`, `shared/access-runtime.js`: central 18-module capability catalog, deny-by-default evaluator, scoped rendering and stable action bindings, independent from unsaved drafts and legacy role admission.
- Bootstrap, shell, login and stylesheet registration; prepared administrative appeal classification; optional published-version label in the shared Roster PDF path.
- Workflow specification, README, pinned MIT phone metadata and tests.

## Validation

- Syntax checks pass for all 58 application/test JavaScript files, plus the vendored phone bundle.
- All 68 unit tests pass, including permission dependencies, explicit deny, account audience, department/driver/document scope, international phone normalization, duplicate-prefix rejection and personal publication ownership.
- Six browser suites pass: workflow, UI, people, support, Roster and portal/User Management. Navigation covers 18 administrative destinations; the retired standalone Driver Weekly Schedule remains absent. UI checks cover 320, 375, 768, 1024 and 1440px and 200% text scaling; new portal controls use shared 46px minimum targets.
- Portal tests use isolated synthetic authorized-adapter fixtures. They verify no Iqama authentication request, management login and driver-role denial, profile/name/phone no-op submission, document hash/version binding, replacement-version selection, hash-mismatch rejection, repeat-sign prevention, read-only management preview under the manager UID, protected runtime actions, authorized-source fixture rendering, account edit/status no-ops, inherited/explicit target drafts, profile approval no-ops and private-session clearing.
- The published personal PDF is one landscape page with the expected driver and published version; it reuses the shared Roster PDF generator/worker and contains no unpublished footer.
- Roster regression generates 812 synthetic batch PDFs. Artifact verification checks 815 synthetic PDFs, English labels, landscape A4, green rest cells, page bounds and 4,974 map annotations. No private reference workbooks were needed or committed.
- Trip Check PDF function hash remains `f3ca12a764f62d34862e4a1893c0cf9511a27ebf162e56541370a9b68af9218a`.
- Browser suites report no uncaught errors, broken module resources, legacy spreadsheet requests, operational writes or operational storage. Only explicitly tested local Roster/personal-PDF downloads occur. No operational sources, account directory, service-role APIs, databases or migrations are connected.

## Integration limits

Iqama authentication, account provisioning/recovery, profile approval, document assignment/storage/signature, schedule approval/publication, appeals and permission saving need the approved authenticated backend. A browser-side source marker and UI permission checks cannot establish authority. Every future endpoint must recheck session, status, effective capabilities, scoped ownership, source versions and audit requirements. Role defaults and initial administrator/recovery policy remain unconfigured proposals.

Review screenshots contain only empty layouts. Generated PDFs, ZIPs and synthetic personal screenshots remain in private test output. GitHub integration and exact-commit Pages deployment are reported separately after publication verification.
