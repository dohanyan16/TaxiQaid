# TaxiQaid repository policy

Repository: https://github.com/dohanyan16/TaxiQaid
Production: https://dohanyan16.github.io/TaxiQaid/

## Production workflow

- Treat `main` as the permanent production source of truth. Start each task from the latest fetched `main` and preserve unrelated local changes.
- Inspect local/remote branches, open PRs and protection rules before changing branch history or cleaning up. Reuse a relevant open PR instead of creating duplicates.
- Use a temporary feature branch only when necessary. Small, self-contained changes may go directly to `main` when repository rules permit.
- Complete the requested changes and run available syntax, navigation and interface tests before integrating. For this static app, check all application JavaScript with `node --check`, run `node --test tests/fleet.test.cjs tests/ncr-policy.test.cjs`, and run `node tests/workflow.browser.cjs` against a local HTTP server. Keep generated test artifacts separate unless intentionally updating review screenshots.
- Merge completed, validated work into `main`, respecting required checks, reviews and branch protection. Verify that the remote `main` contains the intended commits. Do not leave completed work indefinitely on feature branches.
- If merging is blocked by incomplete work, failed checks, conflicts or permissions, retain the affected branch and report the blocker with exact GitHub actions the owner must take. Do not bypass protection rules.
- After successful integration, delete obsolete local and remote temporary branches only after verifying that their tips are safely incorporated into `main`, that they are unprotected and that no active work still depends on them. Prefer normal ancestry checks and non-forced deletion.
- Never delete `main`, protected branches, unmerged commits or branches supporting active/open PR work. Keep uncertain work and explain why. Never use force pushes, destructive resets or repository recreation to simplify cleanup.

## Publication and reporting

- Preserve the existing GitHub Pages configuration, publishing from `main` at `/`. Do not create an alternative production site.
- After each integration, verify the Pages workflow/deployment for the exact new `main` commit. Check production accessibility and, where possible, confirm the new interface is visible.
- Do not claim publication or accessibility without evidence. Distinguish a successful GitHub deployment from a direct site check blocked by environment networking. Report deployment failures and the necessary correction.
- Finish each task by reporting the current `main` commit, PRs merged, branches deleted or retained (with reasons), test results, Pages deployment status and production URL.

## Application boundaries

- Use TaxiQaid branding. All UI text, code comments and documentation must be in English.
- Preserve the existing modular structure, completed interfaces and permanent Maintenance Original Source ID/type/request relationships. Avoid unrelated redesigns.
- Preserve the connected Supabase project, credentials, authentication, sessions, profiles, roles and authorization checks.
- Keep legacy Google Sheets and Google Apps Script integrations disconnected. Never reconnect them without explicit owner authorization.
- The current phase is frontend-only: no operational persistence, fabricated records or success confirmations. Do not add databases, Supabase tables, migrations, spreadsheets, Excel databases, Apps Script projects or replacement localStorage/IndexedDB databases without explicit authorization for a future integration phase.
- Use `docs/TAXIQAID_WORKFLOW_SPEC.md` as the future workflow reference, including backend-owned IDs, preserved fueling prices and authoritative `Asia/Riyadh` timestamps.
