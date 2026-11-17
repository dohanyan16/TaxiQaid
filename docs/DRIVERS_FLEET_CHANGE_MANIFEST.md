# Drivers/Fleet readonly integration — change manifest

Base: `c9510b6b07fc43e6c0ef964b9ca5e0c6d7750b5f`. Repository-only review branch; hosted deployment was blocked by automatic approval review. No main/Pages, secret, SQL, account, role or existing function changes were applied.

35 changed files:

- `AGENTS.md`
- `auth-migration-preview.html`
- `docs/DRIVERS_FLEET_CHANGE_MANIFEST.md`
- `docs/DRIVERS_FLEET_SHEETS.md`
- `docs/FRONTEND_RUNTIME.md`
- `docs/OPERATIONAL_SHEETS_ARCHITECTURE.md`
- `docs/TAXIQAID_WORKFLOW_SPEC.md`
- `driver.html`
- `index.html`
- `modules/drivers/drivers.html`
- `modules/drivers/drivers.js`
- `modules/fleet/fleet.html`
- `modules/fleet/fleet.js`
- `scripts/_auth_pilot/fixture.js`
- `scripts/build-operational-data.cjs`
- `scripts/check-operational-reads.browser.js`
- `shared/asset-versions.js`
- `shared/bootstrap.js`
- `shared/data.js`
- `shared/operational-contract.js`
- `shared/operational-sources.js`
- `shared/search.js`
- `shared/sheets-model.js`
- `supabase/config.toml`
- `supabase/dashboard/operational-data.mjs`
- `supabase/deno.json`
- `supabase/functions/operational-data/google.mjs`
- `supabase/functions/operational-data/handler.mjs`
- `supabase/functions/operational-data/index.ts`
- `supabase/functions/operational-data/write-proposal.mjs`
- `supabase/review/operational-data/01_write_receipts_proposal.sql`
- `tests/fleet.test.cjs`
- `tests/sheets.browser.cjs`
- `tests/sheets.deno.ts`
- `tests/sheets.test.cjs`

Validation: 200 Node tests, 56 Deno tests, strict Deno source checks, 13 browser suites (including the new real-frontend Sheets suite with simulated providers), 163 JavaScript syntax checks, deterministic readonly/auth/admin generators and 107 static digests. 815 synthetic PDF artifacts/4,974 map annotations passed verification. Hosted access/counts/latency for both Sheets are UNVERIFIED, not zero.

Read deployment artifact source SHA-256: `cd44a236d07defc289ce42054d59e72fdccad94f3cdff38eb2ecfb00e906d34a`. Writes/CHANGE_LOG are unconnected proposals; the new receipt SQL has not been executed. See [the exact boundaries and owner read-check procedure](DRIVERS_FLEET_SHEETS.md).
