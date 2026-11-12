# Supabase-managed owner memberships — corrected SQL proposals

Continue `feat/dedicated-supabase-auth`, correcting reviewed commit `40b9cec`. **No live SQL, deployment, secret/settings change, main merge or branch deletion is authorized.** The owner has verified real authentication, private mapping, access compatibility and restricted TLS connectivity. This correction preserves that evidence and does not claim a new live execution result.

## Verified baseline and official procedure

The owner reports these permanent rows in the actual database:

| Role | Member | Grantor | ADMIN | INHERIT | SET |
| --- | --- | --- | --- | --- | --- |
| taxiqaid_auth_rate_owner | postgres | supabase_admin | true | false | false |
| taxiqaid_auth_lookup_owner | postgres | supabase_admin | true | false | false |

The existing counter and lookup functions are owned by the corresponding owner roles. Neither owner has schema CREATE. `pg_cron` is not installed.

[Supabase's official explanation](https://supabase.com/kb/troubleshooting/cant-revoke-a-role-membership-granted-by-supabase_admin-d08922) describes these memberships as normal administrative grants. It documents temporarily granting SET and schema CREATE for ownership work, then removing the administrator's own grant. This proposal follows that procedure with explicit grantor selection and catalog assertions. The original guard that rejected *any* membership was incorrect. Permanent platform grants must remain.

PostgreSQL 16+ is required to inspect and independently validate ADMIN/INHERIT/SET options and grantor rows. This is not a PostgreSQL 15 compatibility workaround. See [GRANT](https://www.postgresql.org/docs/16/sql-grant.html) and [REVOKE](https://www.postgresql.org/docs/16/sql-revoke.html). A provider membership is not evidence that postgres automatically inherits object-owner rights or can SET ROLE.

## Revised preflight

Both `00_conservative_limits.sql` and `01_signed_attempt_and_cleanup.sql` now require:

- An ordinary, **non-superuser postgres session**, with both current_user and session_user postgres. The Dashboard role selector alone is not proof; the read-only verifier checks both. If the provider uses a different session arrangement, stop for review rather than relaxing this check.
- Exactly the two verified permanent membership rows, with grantor supabase_admin and the options above. A symmetric set comparison rejects missing/extra rows, other members/grantors and changed options.
- No additional inbound or outbound memberships **involving these two custom owner roles**. Unrelated built-in Supabase memberships held by postgres are outside this check and remain untouched; requiring the whole cluster to contain only two memberships would be another incorrect precondition.
- Both owner roles remain NOLOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE and NOREPLICATION, with no effective CREATE on taxiqaid_auth_api.
- The existing counter/lookup functions retain their expected owners, SECURITY DEFINER, fixed pg_catalog/pg_temp search path, row_security=on and narrow non-delegable EXECUTE grants. Unknown grants/default privileges are not silently accepted.

A new read-only `03_verify_role_state.sql` returns statuses only. It does not read private account, mapping, counter or Auth-user rows. Other unverified preconditions may still fail even when the managed memberships correctly PASS; do not label every failure an unexpected provider grant.

## Temporary grant and cleanup

Only the rate owner needs temporary authority for 00; both owners need it for 01. Each temporary grant is explicitly **made by postgres**:

```sql
GRANT taxiqaid_auth_rate_owner TO postgres
  WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_auth_rate_owner;
```

While active, catalog validation permits only the corresponding additional self-granted row `(postgres grantor, ADMIN=false, INHERIT=false, SET=true)` alongside the unchanged permanent row. It also checks temporary schema CREATE exactly matches the owner roles required by that file. No ADMIN or automatic INHERIT privilege is temporarily added.

00 explicitly uses `SET LOCAL ROLE taxiqaid_auth_rate_owner` to replace the existing owned counter function, then returns to postgres. This matters: SET capability is not inherited ownership. 01 creates each function as postgres, transfers it to the reviewed owner using temporary SET/CREATE authority, then explicitly switches to that owner for EXECUTE ACL changes. It returns to postgres before the next administrative operation. No runtime role gains SET/CREATE or table access.

Cleanup names the self-grantor and uses RESTRICT:

```sql
REVOKE CREATE ON SCHEMA taxiqaid_auth_api
  FROM taxiqaid_auth_rate_owner GRANTED BY postgres RESTRICT;
REVOKE taxiqaid_auth_rate_owner FROM postgres GRANTED BY postgres RESTRICT;
```

The analogous lookup-owner grants are removed in 01. No statement revokes or modifies a grant made by supabase_admin, impersonates that role or uses CASCADE. The permanent ADMIN=true/INHERIT=false/SET=false rows survive unchanged, including their catalog identities.

Before COMMIT, the scripts recheck the exact permanent membership set and no effective owner SET ROLE or schema CREATE. A transaction-local metadata snapshot verifies that the original complete API-schema ACL and preexisting functions' OIDs, owners, security configuration, definitions and EXECUTE ACLs were restored/preserved. Only 00 may change the intended counter-function body budget; all other preexisting definitions must be identical. Its OID/owner/ACL/security configuration must stay intact. 01 separately validates each new function's owner, hardening and allowed EXECUTE grantees. The temporary metadata table is dropped at commit; it stores catalog metadata, not account/counter data. No persistent verification function/table is created.

## Expected EXECUTE state

Owners retain their own authority; required non-owner callers have EXECUTE without grant option:

| Function | Owner | Non-owner callers |
| --- | --- | --- |
| consume_login_counters(text,text,text) | rate owner | lookup owner |
| begin_login_attempt(text,text,text,text) | lookup owner | taxiqaid_auth_backend |
| public_login_limits_healthy() | rate owner | lookup owner, postgres |
| maintain_public_login_counters(integer) | rate owner | postgres |
| claim_gateway_nonce(text,bigint) | rate owner | lookup owner |
| begin_signed_login_attempt(text,text,text,text,text,bigint) | lookup owner | taxiqaid_auth_backend |

Anon, authenticated and the login role have no direct EXECUTE on these APIs; the restricted login uses its separately authorized backend SET ROLE path. The backend cannot invoke maintenance/health/claim directly. Existing access APIs, private table/schema privileges, Auth policies, accounts, departments and the 107/101/six permission split are unchanged. No driver identity, MFA or additional challenge is introduced.

## Atomic execution and failure handling

Every proposal is a complete explicit BEGIN/COMMIT transaction. Read-only preflight runs before any temporary grant. A SQL/ownership error or failed postcondition prevents commit: temporary memberships/CREATE, function DDL and ACL edits roll back together. Incomplete cleanup is an error, not a warning to ignore. Successful reapplication of 01 is not supported: existing new functions cause a transactional failure, preserving the installed state instead of silently overwriting it.

Run the **entire file**, never highlighted fragments or separate grant/cleanup steps. If the Dashboard reports an aborted transaction after an approved attempt, run `ROLLBACK;` in that same session if needed, then rerun only the read-only verifier. Do not reconnect halfway through a transaction and assume the prior grants were committed. A deliberately partial execution followed by manual COMMIT is outside the safety guarantee. No crash/permission error justifies SETTING ADMIN/INHERIT true, using supabase_admin, broad grants, CASCADE or removing a managed membership.

The existing 20/global-minute, two/IP-minute and ten/identifier-15-minute capacity proposal is not newly approved by this membership fix. The function payloads, nonce/cleanup logic and all SQL remain subject to the earlier architecture/security review.

## Browser-only Dashboard order after separate approval

1. Open the dedicated project in Supabase Dashboard, SQL Editor, default postgres context. Keep public login and the Worker disabled. Do not change existing settings, users/passwords or secrets. Retain the exact reviewed commit and privately back up current affected function definitions/ACLs before any approved replacement; do not paste private responses or credentials into a report.
2. Run only `03_verify_role_state.sql` first. Expected baseline: executor, managed memberships, owner attributes, effective SET removal, CREATE removal and existing function security **PASS**; proposed functions **NOT_APPLIED**; cron **NOT_INSTALLED**. A mixed proposed-function state or any FAIL means stop and inspect the relevant catalog metadata privately. This task does not execute even this read-only live check for the owner.
3. After explicit approval for the complete 00 change, paste/run **all** of `00_conservative_limits.sql` as one transaction. Its internal postflight must complete and COMMIT must succeed. Run 03 again: the same baseline statuses are expected, including proposed functions NOT_APPLIED and cron NOT_INSTALLED. Managed memberships must still be the permanent provider rows, not self-grants.
4. After explicit approval for 01, run **all** of `01_signed_attempt_and_cleanup.sql`. Run 03 again: all security statuses **PASS**, including proposed functions; cron remains NOT_INSTALLED. No self-granted membership or owner CREATE may remain. The internal snapshot also checks preexisting ACLs/ownership; a read-only PASS cannot repair an incomplete earlier transaction.
5. Stop before `02_cron_proposal.sql`. The owner verified pg_cron is absent. Enable/install the supported Cron integration only after separate approval, then review the single job, execution authority and schedule as described in the [public architecture runbook](PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md). After that separate setup, 03 may report cron INSTALLED; that does not prove job health. Two successful maintenance runs and the existing health gate remain separate prerequisites.
6. Public gateway deployments, secrets, native Auth scope/capacity review, hosted provenance/origin closure, actual public-handler/browser tests, activation and eventual main cutover remain separately blocked. This membership correction is not deployment or merge approval.

## Regression evidence and limits

The managed-membership fixture runs in an isolated network-disabled PostgreSQL 16 container. Its bootstrap administrator is named supabase_admin. After baseline setup, the proposal executor postgres is made NOSUPERUSER, NOBYPASSRLS and NOINHERIT; the two provider memberships are created with exactly the verified grantor/options. Setup/corruption assertions use only the disposable bootstrap role. **Both actual proposals execute solely as ordinary postgres**, not as a superuser or through a substituted catalog.

The fixture checks unexpected options, self/additional grantor rows, extra members and owner role edges, missing provider grants, preexisting CREATE, omitted SET/CREATE cleanup, mid-DDL SQL errors, incorrect existing/new ownership, missing role-switch authority and unexpected EXECUTE. Each rejected attempt compares catalog/function state and account/Auth identity/mapping/counter/grant/definition/department data before/after to prove rollback. Successful executions compare permanent membership catalog rows including identities, preserved records and read-only verification results. The post-change restricted SECURITY DEFINER access read retains 101 effective Master grants and six Driver denials. Existing adapter, replay, rate, concurrency and cleanup tests still run afterward.

The older private-integrity verifier now displays grantor/option metadata and recognizes the optional signed API only with its reviewed owner, hardening and narrow EXECUTE ACL. It does not broaden actual permissions. It still needs its existing administrative private-integrity read authority; the new 03 verifier is the metadata-only membership/cleanup check.

The older PostgreSQL 15 baseline suite remains separate for its original role/identity behavior; it is not evidence of 16+ membership-option compatibility. The tests do not simulate every Supabase event trigger, grant-authority rule or provider version. Real execution remains pending review and owner approval. Read-only caller, security configuration and ACL facts beyond the supplied memberships still require the owner's status check before applying anything.

## Changed files and reproducibility

The SQL files are standalone for the browser. `scripts/build-public-role-proposals.cjs` generates shared guards/cleanup and 03; the marked function-body sections in 00/01 remain the reviewed payload source. Edit those sections or the generator as appropriate, regenerate, then verify with:

```sh
node scripts/build-public-role-proposals.cjs --check
TAXIQAID_TEST_PUBLIC_GATEWAY=true node tests/broker-postgres.cjs
```

These are developer commands, not software requirements for the owner's computer. The fixture uses only the explicit local Docker socket, clears daemon redirection selectors, publishes no database port and uses no live database URL or credential.

## Exact changed files

- `docs/PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md`
- `docs/SUPABASE_MANAGED_ROLE_PROPOSALS.md`
- `scripts/build-public-role-proposals.cjs`
- `supabase/review/public-login/00_conservative_limits.sql`
- `supabase/review/public-login/01_signed_attempt_and_cleanup.sql`
- `supabase/review/public-login/02_cron_proposal.sql`
- `supabase/review/public-login/03_verify_role_state.sql`
- `supabase/review/username-broker/03_verify_privileges.sql`
- `tests/_managed-membership-fixture.cjs`
- `tests/broker-postgres.cjs`

## Final validation results

- PostgreSQL 16 managed-role fixture: **PASS**, with **36 rejected/rolled-back cases**, both successful proposals run by ordinary postgres, exact permanent membership catalog rows preserved, all account/Auth/mapping/counter/permission/department records preserved, and post-change restricted access still at 101 Master grants/six Driver denials. The existing signed-attempt/replay/budget/cleanup/concurrency cases also passed.
- PostgreSQL 15 original private-identity/least-privilege suite: **PASS**, separately from the 16+ membership correction.
- **130 Node tests**, all **eight applicable browser suites**, **107 JavaScript syntax checks**, Python syntax and Deno type checking passed. Browser navigation retained all 18 administrative pages; Auth responses are mocked.
- All five generated SQL/Worker/helper artifact checks, the 107-definition permission catalog check, local documentation links and whitespace checks passed. Roster verification passed 815 synthetic PDFs and 4,974 annotations outside the repository.
- Application/Worker/function sources, Supabase deployment settings and baseline permissions remain unchanged from `40b9cec`. All executed SQL was confined to disposable local PostgreSQL fixtures. No live SQL, provider setting, deployment, secret, account, main or branch cleanup action was performed.

Remaining requirements: owner approval of the complete SQL payloads; read-only live confirmation of the ordinary Dashboard session plus expected hardening/ACL statuses; provider-specific execution/grant authority verification; separate approval for missing pg_cron installation and scheduled maintenance; and all outstanding signed-gateway/public-authentication/cutover tests. Local PostgreSQL success is not a Supabase deployment result or production activation approval.
