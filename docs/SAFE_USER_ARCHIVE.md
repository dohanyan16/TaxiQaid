# TaxiQaid — Safe deletion of management accounts

## Meaning of Delete User

**Delete User is a protected archive/revocation action**, not a physical erase of Auth identities or audit history. The button appears only when Master opens **Edit User** for a Manager or Supervisor. The confirmation requires entering the exact username. Create User never offers Delete User; Master and Driver accounts are not valid targets.

On a confirmed request, the server checks the authenticated Master, `user-management.edit-user` and `user-management.change-status` capabilities, the current database account, version, ETag and the exact Auth UID/email. Under a single database transaction the private SQL dispatcher:

- changes the account to `disabled`, sets an `archived_at` marker and increments its version;
- disables the signed-username broker identity and increments the mapping revision **before** any subsequent provider network request;
- saves the operation receipt and an audit record without removing history;
- hides archived accounts from ordinary `list` responses and prevents subsequent edits/permission resets.

The administrative Edge Function then requests an official Supabase Auth ban for 100 years. On success it marks the Auth synchronization complete through the existing internal `auth-synced` action. If Supabase Auth cannot confirm the ban, the SQL account and mapping remain disabled, and the UI reports provider synchronization pending rather than claiming full confirmation. A future privileged reconciliation mechanism is required to clear that pending state; **no automatic retries, physical deletion or restoration UI are included**.

This design retains historical records, UUID, contact email and username for audit and integrity. Usernames/emails **cannot be assumed reusable** after archival. It does not delete unrelated Driver records, Storage objects, records from other systems, or existing audit/outbox history. Supabase JWTs can remain cryptographically valid until expiry, but the dedicated app continues to require an active private account and enabled broker mapping; a ban is an additional safeguard.

## Deployment order

1. Review and apply `supabase/review/user-management/06_safe_archive_users.sql` to the dedicated **TaxiQaid** project only. It has an exact installed-function baseline guard and preserves security metadata and privileges. The script creates a nullable archive timestamp and updates the restricted SQL dispatcher. Do not apply to the old DemandAnalysis project.
2. Ensure the SQL deployment succeeded before replacing the single-file `manage-users` Edge Function using the deterministic `supabase/dashboard/manage-users.ts` artifact, with `verify_jwt:true`, and without modifying existing environment variables, Master credentials, or gateway configuration.
3. Merge the frontend from the feature branch into `main` and wait for the matching GitHub Pages deployment. No alternate website is created.
4. Verify that selecting Reset Password **only** reports the accepted email request on Users and never opens Edit User. Check that Delete User is visible only in Edit User for office staff, requires exact-username confirmation, and never allows Master/Driver deletion. Avoid destructive live account tests without an explicitly approved disposable employee account.

## Failure handling

If SQL rollout is blocked, **do not publish the Delete User button**; the feature must remain on its branch rather than displaying a button backed by an unavailable action.

If a deletion returns a network error or 503, refresh and inspect authoritative records: SQL may have already revoked access. Do not retry a different operation against an uncertain account. A provider ban failure leaves the SQL-archived account disabled, but its Auth identity remains. Retain the audit receipt and reconcile from trusted administrative tools.

Rollback must preserve the archived marker and never silently re-enable any archived account. Reverting frontend and Edge changes does not remove an Auth ban or undo the SQL archival. Never drop the archival column or restore the original dispatcher after live archives without a separate data-safe reconciliation plan.
