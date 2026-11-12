# Cron maintenance watermark — reviewed repair

Continue `feat/dedicated-supabase-auth` from `095f494`. **No live SQL, Cron/settings change, deployment, secret change, public login activation, main merge or branch deletion is authorized.** This commit prepares a repair for the owner to review and explicitly approve.

## Incident and correction

The owner reports SQL 00 and 01 were successfully installed and all security checks in 03 passed. The existing minute job, executing as postgres, then repeatedly failed the counter table's CHECK constraint. Cron is now disabled; public username login remains disabled. The earlier NOT_APPLIED/NOT_INSTALLED statements in historical reviews are superseded by this owner-verified state.

The committed watermark was 65 lowercase hexadecimal characters. The live table requires exactly 64, and attempts must be positive. Maintenance pruned eligible rows and then tried to insert the invalid watermark with attempts=1. The insert fails, so PostgreSQL rolls back the entire call, including that pruning. The health check cannot find such a row; nonce admission consequently remains blocked. No existing table constraint should be weakened.

The corrected reserved identifier is:

```text
dcb1306e6346ce4bb67985af42e8376d56df9b3f9ac325c4a0a96cf4e9d28279
```

It is exactly 64 lowercase hexadecimal characters. Health, maintenance, nonce protection and the signed-admission wrapper use it consistently. Maintenance continues to write attempts=1, with epoch-zero window_start and a five-minute expiry. The wrapper rejects this identifier in any global/IP/identifier/nonce input before counter writes or private lookup. Nonce claim also rejects it directly.

HMAC outputs span the full 256-bit range; a reserved digest is not mathematically outside that range. We do **not** claim hash equality is impossible. Instead, the public signed API rejects that value, and ordinary rate windows and fresh nonce timestamps are current-time values, disjoint from the watermark's epoch-zero composite primary key. Even the unchanged legacy internal rate API cannot overwrite epoch zero with a current-window record if its digest happens to equal the marker. A conflicting nonce/counter primary key fails closed. Regression tests exercise the reserved value explicitly rather than relying on a small collision probability. No HMAC secret/key rotation or counter reset is proposed.

## Exact repair and preserved state

Use only [04_repair_maintenance_watermark.sql](../supabase/review/public-login/04_repair_maintenance_watermark.sql) for this already-installed deployment. **Never rerun 01.** Its four functions already exist. The corrected 01 source is retained solely for future first-install reproducibility and generator input.

04 is a complete BEGIN/COMMIT transaction. It:

1. Requires ordinary non-superuser postgres, the exact existing managed memberships/options, restricted owner attributes, existing SECURITY DEFINER hardening and narrow EXECUTE ACLs. Both owners must initially lack effective SET/CREATE authority.
2. Requires the exact validated named CHECK constraints, the reviewed SQL 00 definition (20 global/minute, 10 verified-IP/minute, 10 identifier/15 minutes), all four known `095f494` body hashes/interfaces and exactly one **disabled** existing maintenance job with the expected name, command, database, postgres role and minute schedule. Mixed, already-repaired or unreviewed definitions stop for review. The new marker/epoch-zero record must not already exist.
3. Snapshots API function metadata, schema ACL, and counter-table owner/RLS/ACL/constraints/policies in a transaction-local temporary metadata table. It does not copy operational records.
4. Grants only temporary self-granted SET and schema CREATE to the existing rate/lookup owners, switches to each actual owner and uses CREATE OR REPLACE on the four existing functions. It does not drop functions, transfer ownership, alter EXECUTE ACLs, create permanent tables/roles or modify the counter schema.
5. Removes only the postgres-granted temporary memberships/CREATE, with explicit grantor and RESTRICT. Permanent supabase_admin ADMIN=true/INHERIT=false/SET=false grants remain untouched. No ADMIN/INHERIT or runtime privilege is added.
6. Before commit, verifies exact new body hashes and interfaces/security, every pg_proc field other than the four intended prosrc changes, all unrelated API definitions, schema ACL, constraints/table security, unchanged rate policy and still-disabled Cron state. Any failure rolls everything back. The temporary metadata table drops at commit.

The repair executes **no operational INSERT/UPDATE/DELETE/TRUNCATE**, does not invoke maintenance, and does not reset/delete/prune existing counters. There is no repair of impossible 65-character rows because the live CHECK already prevents them. Accounts, private mappings, departments, all 107 definitions, 101 Master grants, six Driver denials, the deployed get-my-access and all Edge/Worker sources remain untouched.

[05_verify_maintenance_watermark.sql](../supabase/review/public-login/05_verify_maintenance_watermark.sql) compares SHA-256 hashes of public SQL bodies, exact input/default/return interfaces, language, volatility/parallel/strictness properties, hardening and narrow EXECUTE grants against reviewed sources. Hashes identify SQL code, not user data. Its output contains statuses only. It complements 03, whose security PASS by itself did not validate watermark behavior.

## Browser-only owner procedure after explicit approval

No installation, local command, credential entry or public login is required.

1. On GitHub, select this exact feature-branch commit. Review the complete 04 script and this runbook. In Supabase Dashboard confirm the **dedicated** project, public broker flags false and Cloudflare gateway disabled. In Integrations → Cron, confirm the existing `taxiqaid-public-login-counter-maintenance` job is inactive. Do not create/reschedule a second job or run 02. Privately retain the current four function definitions and ACLs for incident evidence; never post private mappings, credentials or account responses.
2. In SQL Editor using the ordinary postgres session, run the unchanged **03** verifier, then **05**. Neither writes data. Expected 03: every security field PASS and cron_extension INSTALLED. Expected 05: constraints/rate policy PASS; the four function fields NEEDS_REPAIR; existing_cron_state DISABLED. Any FAIL, missing job, mixed function state or different constraint representation means stop and review sanitized metadata. Do not relax a guard or request broader privileges. These scripts require the owner's existing Dashboard inspection authority; no new database grant is proposed.
3. Obtain explicit owner authorization for **the complete 04 transaction at this commit**. Paste/run the whole file, with no highlighted fragments or manual COMMIT halfway through it. Require successful COMMIT. No maintenance, Cron activation or public login occurs in 04.
4. Run 03 and 05 again. All 03 security checks must PASS, cron_extension remains INSTALLED. All 05 constraints/rate/function fields must PASS and existing_cron_state must remain DISABLED. The function statuses validate the installed bodies and interfaces against the reviewed definitions; no raw pg_get_functiondef dump is returned. 04's internal snapshot also proves that the existing ACLs/metadata were preserved through replacement. If any status differs, keep Cron/login disabled.
5. After **separate approval for a rollback-only functional probe**, run all of [06_probe_maintenance_rollback.sql](../supabase/review/public-login/06_probe_maintenance_rollback.sql). It invokes maintenance twice inside one transaction, validates CHECK-compatible watermark shape, five-minute TTL, refresh and health, returns four PASS statuses, then **ROLLBACK**. The code really executes but every counter insertion, update and expired-row prune is undone. Healthy state created only by this probe is undone too. On error, run ROLLBACK in the same session if needed; report only the sanitized SQLSTATE/status. Do not copy raw failing rows or SQL output containing private values. If more than 1,000 eligible expired rows prevent healthy admission, the probe stops and rolls back: approve a separate bounded-backlog recovery plan before any scheduler reactivation, rather than deleting buckets, bypassing health or increasing privileges.
6. Only after the repair/verifiers/probe PASS and **explicit owner approval to resume this existing job**, open Integrations → Cron → the verified job → enable/activate it. Preserve its exact name, postgres role, `* * * * *` schedule and command `SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);`. Do not create a duplicate or enable public login. Normal approved scheduled maintenance will prune eligible expired records and commit the watermark; this is distinct from the DDL-only repair and rollback-only probe.
7. Wait for at least **two consecutive scheduled successful runs**. In Dashboard inspect only status/start/end times, not private logs. Run 03 and 05 again: security/definition/policy/constraint checks must PASS; the existing job state now reads ENABLED. Run the status-only health query below. Require PASS and a subsequent successful scheduled refresh. A local mocked Cron catalog is not evidence of this hosted scheduler behavior. Any error, stale health, changed job or failing definition check means disable that job again and keep login disabled pending review.

```sql
-- Read-only, statuses only. Use after separately approved real scheduled maintenance.
SELECT CASE WHEN taxiqaid_auth_api.public_login_limits_healthy()
       THEN 'PASS' ELSE 'FAIL' END AS scheduled_maintenance_health;
```

05 checks the two reported named CHECK definitions exactly after whitespace normalization. If the real definition uses a different expression/cast, stop for review of the sanitized constraint definition; do not weaken or recreate it. More general table-security/constraint metadata is also preserved by the repair's snapshot.

## Rollback and failure handling

Before commit, any SQL/ownership/constraint/hash/cleanup/postflight error aborts the whole transaction, including temporary grants and body replacements. If the Dashboard leaves an aborted transaction open, issue ROLLBACK there, then rerun only 03/05. Expected old bodies still report NEEDS_REPAIR, with permanent memberships intact and no temporary CREATE/SET. Do not commit a partial highlighted selection. A completed repair deliberately refuses accidental reapplication; use its read-only verifiers instead.

After a committed repair, leave Cron and login disabled if verification fails. Preserve the saved before/after definitions and sanitized failure status. Prepare a separately reviewed forward correction or owner-approved restoration under the same role/ACL transaction safeguards. Do not blindly restore the known-broken 65-character definitions, weaken constraints, truncate/reset counters, manually forge a healthy watermark or use a privileged public connection. Resuming/closing a Cron window is a separate owner-controlled action; the agent has not changed any job.

## Validation and remaining blockers

Local regression results:

- **PostgreSQL 16: PASS.** The exact two live CHECK constraints are now part of the fixture. Original `095f494` functions reproduce the bucket CHECK failure and its rollback of expired-row pruning. The actual complete repair executes as ordinary non-superuser postgres; all non-body pg_proc metadata, ACLs, permanent memberships, constraints and existing account/mapping/counter records are independently compared before/after.
- **25 repair rejection/rollback cases: PASS**, including missing/unvalidated CHECKs, unexpected/mixed definitions, changed rate policy, wrong ownership/ACL/hardening, omitted temporary SET/CREATE cleanup, SQL errors, incorrect/duplicate/active Cron configuration and accidental reapplication. The earlier **36 managed-role rollback cases** still pass.
- Maintenance execution, five-minute watermark TTL/refresh, nonce replay uniqueness, reserved inputs before lookup/writes and epoch-zero isolation passed. The rollback-only 06 probe passed and preserved all counter records. Existing stale-health/no-write behavior, 1,001-row expired-backlog recovery in bounded batches, nonce races and rate-limit/concurrency tests also passed. Restricted access remains at 101 Master grants/six Driver denials, with 107 definitions unchanged.
- **PostgreSQL 15: PASS** for the separate original private-identity/privilege suite, now also using the live counter CHECKs. All database SQL execution occurred only in network-isolated disposable containers. The test Cron catalog is simulated; no scheduler/extension or hosted job execution is claimed.
- **135 Node tests**, **30 Deno tests**, Deno type checking, **113 JavaScript syntax checks**, Python syntax, permission catalog, all five artifact-generation checks, documentation links and whitespace checks passed. The explicit 64-character length assertion was strengthened afterward and its focused tests/syntax/generation checks passed again without changing generated SQL.
- **Eight browser suites passed**: workflow, UI, people, roster, support, portal, auth migration and public gateway. All 18 administrative pages, mocked login/authorization/logout and business-module regressions passed without uncaught errors or legacy spreadsheet requests. These mocks do not establish genuine public authentication.

Roster artifact verification passed **815 synthetic PDFs and 4,974 map annotations**, stored outside the public repository. No real Supabase or Cloudflare requests/deployment, secret/settings change or database modification occurred. No branches are deleted. Main remains `42ab3a504d76e5119733791c2262f24565336576`; GitHub reports its existing Pages build as built for that commit. This repair branch is retained for explicit owner review and hosted validation.

Remaining blockers: owner review/explicit authorization of 04; genuine hosted preflight, transactional repair, postflight and separately approved rollback-only probe; separate Cron reactivation approval plus successful scheduled refresh evidence. Public gateway provenance/origin closure, real public-handler/browser authentication, capacity review, activation and eventual main cutover remain separate and unapproved. No local PASS is a live repair or production-readiness claim.

## Changed files

- `docs/CRON_MAINTENANCE_WATERMARK_REPAIR.md`
- `docs/PUBLIC_LOGIN_RATE_LIMIT_CAPACITY.md`
- `docs/PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md`
- `docs/SUPABASE_MANAGED_ROLE_PROPOSALS.md`
- `scripts/build-public-role-proposals.cjs`
- `scripts/lib/maintenance-repair-sql.cjs`
- `supabase/review/public-login/01_signed_attempt_and_cleanup.sql`
- `supabase/review/public-login/02_cron_proposal.sql`
- `supabase/review/public-login/04_repair_maintenance_watermark.sql`
- `supabase/review/public-login/05_verify_maintenance_watermark.sql`
- `supabase/review/public-login/06_probe_maintenance_rollback.sql`
- `tests/_maintenance-repair-fixture.cjs`
- `tests/broker-postgres.cjs`
- `tests/fixtures/cron-watermark-095f494.sql`
- `tests/maintenance-watermark.test.cjs`

Developer reproducibility uses `node scripts/build-public-role-proposals.cjs --check` and `TAXIQAID_TEST_PUBLIC_GATEWAY=true node tests/broker-postgres.cjs`. These are optional developer commands, not installations or commands required on the owner's computer. SQL 04/05/06 are standalone browser-ready artifacts generated from the canonical corrected 01 bodies and historical test-only source fingerprints. SQL 00, 03, rate-policy JSON, deployed-function/Worker sources, generated Dashboard functions, application modules, permission inventory and existing account/mapping SQL are unchanged.
