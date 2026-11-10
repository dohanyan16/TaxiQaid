# Dedicated identity database baseline — owner-verified columns

The owner performed a read-only inspection of the real `taxiqaid_private` schema and supplied the following exact columns and types. This is a verified column inventory, not a complete DDL export or an agent-run live connection test. Existing indexes, constraints, RLS policies, grants and the deployed function still need their own review. Do not recreate or rename any table.

| Existing table | Verified columns |
| --- | --- |
| `user_accounts` | `user_id uuid`, `username text`, `full_name text`, `account_type text`, `role_key text`, `status text`, `created_at timestamptz`, `updated_at timestamptz` |
| `departments` | `department_key text`, `department_name text`, `is_active boolean`, `created_at timestamptz` |
| `user_departments` | `user_id uuid`, `department_key text`, `assigned_at timestamptz` |
| `permissions` | `permission_key text`, `module_key text`, `action_key text`, `display_name text`, `description text` (nullable), `is_active boolean` |
| `role_permissions` | `role_key text`, `permission_key text`, `is_allowed boolean` |
| `user_permission_overrides` | `user_id uuid`, `permission_key text`, `is_allowed boolean`, `updated_at timestamptz`, `updated_by uuid` (nullable) |

`schema-mapping.example.json` maps internal response aliases to these exact names, including metadata columns that the access query does not return. `store.ts` validates any supplied `TAXIQAID_SCHEMA_MAPPING` against that inventory before opening a pool. The existing explicit mapping requirement and all disabled readiness flags remain in place; this correction does not activate the broker.

## Query and override semantics

- Account reads select `user_id` as `uid`, `full_name` as `fullName`, `account_type` as `type` and `role_key` as `role`, scoped to the authenticated UID. No other account is selected.
- Department membership joins `user_departments.department_key` to `departments.department_key` and includes only `departments.is_active = true`.
- Role grants join `role_permissions.permission_key` to `permissions.permission_key`, requiring both `role_permissions.is_allowed = true` and `permissions.is_active = true`.
- User overrides join by `permission_key`, filter the authenticated `user_id` and require an active permission definition. **`true` becomes `allow`; `false` becomes `deny`; no row means inherit** (the key is absent from the response override object). False rows must not be filtered out or treated as missing. Non-boolean values fail closed. A deny wins over an inherited grant and blocks dependent actions; conflicting duplicate fixture rows also resolve to deny.
- The management response retains version 1, the verified UID, active account, full-name identity, canonical active departments, role defaults, string override effects, empty unconfigured record scopes and the existing short access lease. It remains compatible with `shared/auth-contract.js` and the shared authorization evaluator.

The verified `user_accounts` has **no Iqama or stable driver-record linkage columns**. No such columns, identities or mappings are added. Numeric Iqama input remains visible in the future login interface, but private resolution returns no driver identity and performs no Iqama-column query. Access for an account typed `driver` is denied until an approved provisioning workflow establishes the verified UID/driver/Iqama relationship. The strict future frontend driver contract is retained; missing linkage is never invented.

## Preserved configuration and remaining validation

The existing Master and reported 107 definitions/101 super_admin grants remain untouched. Six driver-only actions stay excluded; role names alone grant nothing. The full 107-key public catalog is unchanged. Canonical departments remain customer_service, finance, financial, hr, it, maintenance, operation, planning and qhse; Quality is consolidated into QHSE, while Finance and Financial remain separate. Membership alone grants no capability or unrestricted record scope.

Run `node scripts/check-auth-catalog.cjs` to check definition drift and `deno test --cached-only --allow-read --config supabase/deno.json supabase/functions/_shared/security_test.ts supabase/functions/_shared/store_test.ts` for offline backend tests. SQL-tag fixtures exercise the real adapter's column references, keyed joins, activity filters, boolean conversion, UID isolation and frontend dependency evaluation without opening a database connection.

`inspect.sql` remains an optional **owner-run read-only** validation of columns, RLS/grants/constraints and aggregate permission/activity counts. Do not request private credentials or export personal account/Auth rows into GitHub. Genuine password authentication, private SQL/TLS results, active Master permissions and deployed function behavior still require authorized end-to-end testing. No login broker or function replacement is activated or deployed here.

Keep the Data API disabled. No business tables, account mutations, grants or automatic migration workflow are introduced. The pre-existing `PROPOSED_login_rate_limits.sql` remains a separate undeployed security proposal; it does not alter the six identity tables. Review server-role-only RLS policies, least-privilege connection rights, trusted ingress, concurrent counters and retention before any future deployment. Never disable RLS or certificate verification to make a query work.
