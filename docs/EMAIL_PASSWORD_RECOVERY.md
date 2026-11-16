# TaxiQaid — employee password recovery by email (proposed, not deployed)

## User experience

Master selects **Reset Password** for an active Manager or Supervisor. The administrative Edge Function rechecks the live Master session, private capability, exact active user row/version/ETag, private Auth mapping and official Auth UID/email. It calls the official Supabase `resetPasswordForEmail` method for that exact email with the fixed callback:

`https://dohanyan16.github.io/TaxiQaid/reset-password.html`

The service returns only `{"delivery":"requested"}` after Supabase accepts the request. It does **not** claim actual inbox delivery. It neither generates nor changes the target password, returns no credential or email address, and does not require the operator to forward a temporary password.

The employee clicks the email's single-use recovery link. The standalone `reset-password.html` uses the pinned official Supabase SDK and a memory-only dedicated Auth client, accepts only the SDK's `PASSWORD_RECOVERY` event for the callback's URL fragment, verifies online user identity, offers New Password and Confirm Password inputs, and calls `auth.updateUser({password})`. It removes URL tokens after SDK consumption and locally signs out once the password is updated. The regular TaxiQaid login remains **username + password via the existing signed Cloudflare gateway**.

Disabled accounts, Driver accounts and Master are never valid targets. User creation continues to generate a one-time initial credential until a separately approved change to the creation/onboarding policy.

## Employee self-service from the login screen

In dedicated Auth mode the regular sign-in screen also has **Reset Password**. Selecting it opens a request form for the **same real employee email registered at account creation**, not the username and not a technical/placeholder address. Its public, memory-only Supabase client calls `resetPasswordForEmail(email, {redirectTo: exactCallback})` with the same callback as the Master flow. No new endpoint, email lookup by username, privileged service key, old password, or driver login is used. The UI never indicates whether an address belongs to an account, and a mail-provider error is not presented as delivery success. Supabase Auth enforces provider rate limits.

After clicking the one-use email link, employees choose and confirm the new password and still sign in with their **original username**. Legacy-mode login intentionally keeps the self-service entry hidden. Only the configured dedicated Supabase Auth accounts can use this flow: a stored contact address that differs from the official Auth email cannot receive the reset. This feature neither provisions accounts nor changes user records.

## Mandatory hosted configuration — operator approval required

**This feature cannot deliver to normal employees using the default SMTP of a new Supabase Free project.** Supabase's standard sender is limited to project team email addresses. An approved SMTP sender/provider must be configured for production email delivery; **each employee uses their existing email** and needs no new Gmail or domain. SMTP sender verification may require a verified domain or a provider-approved From identity.

In the dedicated Supabase project:
1. Inspect **Authentication → SMTP Settings** and configure a supported, approved custom SMTP provider using the Dashboard in a separate authorized operation. Do not enter SMTP keys in GitHub, public JavaScript, chat or screenshots.
2. Under **Authentication → URL Configuration**, add the exact redirect URL `https://dohanyan16.github.io/TaxiQaid/reset-password.html` (no wildcard). Verify the Reset Password email template uses the standard Supabase ConfirmationURL or properly respects the requested redirect.
3. Test one authorized non-Master active office test account with a real inbox: one request, expected callback, user-chosen password, login with original username and new password, old password failure, no Driver or Master mutation, and cleanup. Respect provider rate limits; do not spam the email sender.
4. Only after local tests, security review and separate owner authorization may the updated `manage-users` Dashboard bundle be deployed and the static recovery files merged into `main`. Check the published exact SHA and a single controlled hosted email delivery cycle.

### No SQL migration

The code-based email request reads through the existing owner-approved restricted SQL dispatch. It intentionally does not use `reset-reserve`, because that SQL action changes account versions and records a completed credential reset before any email can be sent. Supabase Auth applies provider mail rate limiting. A future explicit outbox/audit/cooldown mechanism can be proposed if required; it is not implemented or claimed here.

### Failure and rollback

Missing SMTP, unauthorized address, email-provider error or throttle must return an error; neither User Management nor the UI claims email delivery. If the email never arrives, the old password remains unchanged. Existing pending mail may still be actionable after reverting code, until the link expires, so the fallback is not full token revocation.

Restore the previously deployed single-file `manage-users` version and revert the frontend recovery-page release using normal GitHub procedures; retain the working Master login, existing User Management records, SQL 05, the Cloudflare gateway, keys and permissions. No passwords, identity mappings, database rows, Auth accounts, Secrets or branches are modified by this implementation.
