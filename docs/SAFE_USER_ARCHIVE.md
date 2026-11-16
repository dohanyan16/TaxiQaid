# TaxiQaid — Permanent office-account deletion

The previous SQL 06 / `archive-user` implementation only archived private records and banned Auth identities. It did **not** delete Auth users or release their username/email. SQL 06 remains unchanged as a historical prerequisite and compatibility interface. The current frontend never calls it as Delete User.

The replacement is implemented and tested locally, **not deployed or activated**. Until the reviewed backend upgrade is available, Delete User is disabled with an explanatory tooltip. Ordinary creation, editing, permissions and email recovery remain available. No existing archived account is automatically deleted.

## Permanent deletion protocol

1. Only the online-verified, active existing Master with edit and change-status capabilities may act. SQL independently enforces this. Self, Master, Driver, unknown roles and protected server Auth metadata are rejected. Exact username confirmation, current version and ETag are required for a new operation.
2. The server verifies exact Auth UID/email through official Admin `getUserById`. Unknown application foreign-key dependencies block before any removal; the dedicated schema must be inspected before rollout. Managed Auth dependencies are handled by the official API. Storage-owned objects may prevent provider deletion; no objects are automatically erased.
3. A private SQL transaction reserves the operation, disables the account and identity mapping, marks it archived, and preserves an audit receipt. Access is revoked **before** provider mutation. An operation UUID, actor/target binding and a two-minute lease protect retries and concurrency.
4. The backend requests an Auth ban, rechecks its lease, calls official `auth.admin.deleteUser(uid, false)` (hard delete), and independently confirms `user_not_found` with HTTP 404. Other errors, including an unspecified 404, never prove deletion.
5. A final SQL transaction removes active overrides, department membership, mapping, metadata, pending user mirror payload and the private account. It retains operation/audit history. Only then can the UI report complete deletion. Username/email may then be reused by a **new UID**, subject to the existing uniqueness rules. Never reuse a deleted UID.

Auth and SQL cannot share a transaction. On failure the account stays revoked and the UI reports the incomplete stage. **Pending Deletions** offers same-operation retry, including after a lost response/browser restart, or explicitly reviewing an account archived by the old implementation. The Master must confirm the exact username again. No automatic or bulk destructive reconciliation is included. Completed-operation replay does not touch a newly created replacement account.

Previously issued JWTs may remain cryptographically valid until expiry. The private account/mapping checks continue to deny ERP access; hard deletion is not a claim of instant JWT invalidation. Supabase Admin credentials remain server-only. Legacy Sheets remains disconnected; no external mirror deletion or rollback synchronization is claimed.

## Required owner approval and browser-only upgrade

No hosted SQL, Edge replacement or flag change was performed during this work. Automatic approval review rejected the attempted read-only schema inspection because hosted SQL/private metadata requires additional explicit approval. Do not bypass that decision.

After separate owner approval:

1. In the dedicated TaxiQaid Supabase Dashboard (never DemandAnalysis), open **SQL Editor → New query** and run `supabase/review/user-management/07_hard_delete_inspect.sql`. It returns only dependency definitions, trigger names/functions (no source or arguments), column metadata, security attributes and source hashes. Keep the results owner-controlled. No account rows or credentials are needed. Review every dependency and any custom deletion trigger; unresolved side effects block rollout: unknown historical/business references must be intentionally detached or retained in a separately reviewed proposal; never enable a cascade to make deletion pass.
2. Confirm SQL 06 is already installed; do not blindly rerun it. Confirm an owner-approved database recovery method (Dashboard backup if available on the plan) and the deployed `manage-users` source. Review/apply **only** `07_hard_delete_users.sql` after schema compatibility is established. It is transactional, refuses repeat installation, preserves permanent Supabase-managed memberships, removes temporary SET/CREATE grants before COMMIT and deletes no accounts on installation. A failed transaction must be rolled back; do not run selected fragments.
3. Replace only `manage-users` with generated `supabase/dashboard/manage-users.ts`, retaining online JWT verification, existing administrative connection, origin configuration and existing secrets. No authentication broker, access function, permission catalog, role grants, Cron or Cloudflare changes are needed.
4. After SQL/security postflight review, set server-only `TAXIQAID_HARD_DELETE_ENABLED=true`. Until then the new endpoint fails closed. A Master directory refresh advertises `features.hardDelete:true` only if the new SQL function's dependency and authorization checks pass. Inspect the new function's owner, `SECURITY DEFINER`, fixed `pg_catalog,pg_temp` search path, `row_security=on`, backend-only EXECUTE and exact restored memberships. No browser role may receive private-table access.
5. Test only an explicitly approved disposable synthetic office account. Do not delete or reset passwords for any existing employee. Compare Auth, private account, mapping, membership/overrides and retained audit results under owner control. Local tests do not replace this hosted validation.

## Rollback and recovery

Set `TAXIQAID_HARD_DELETE_ENABLED=false` first; this disables new requests and UI capability advertisement. Retain SQL 07, receipts, audit, archived markers and disabled mappings. Restore the saved Edge source only after recording incomplete operations; an old frontend must never label archive as permanent deletion. SQL application failures roll back all installation changes. Do not drop dependencies, reset counters, unban archived accounts or erase receipts to recover.

A completed Auth hard delete is irreversible through frontend/SQL rollback. A replacement account requires explicit provisioning with a new UID. Pending operations must be reconciled using the upgraded protected service after the owner resolves the provider/dependency issue; retry only the original operation. No secret, private identity or token should be pasted into GitHub, browser logs or the public repository.
