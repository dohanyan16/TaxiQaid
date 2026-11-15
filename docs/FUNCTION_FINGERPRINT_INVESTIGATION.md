# Live function fingerprints — exact CRLF cause and reviewed proposals

Branch `feat/dedicated-supabase-auth`, investigation baseline `874671b`. No live SQL, settings, Cron activation, public authentication, Worker/Edge deployment, main merge or branch deletion is authorized. Owner-supplied Step 120 fingerprints are evidence for comparison, never an input to the production allowlist.

## Established cause for all five mismatches

**Every supplied live fingerprint exactly equals SHA-256 of the corresponding known committed body with LF converted to CRLF.** No other byte change is needed to reproduce any of the five values. Four match the historical SQL 01 bodies in `095f494`, including the invalid 65-character watermark. The counter matches SQL 00 in `095f494`/`874671b`, with global/IP/identifier limits **20/10/10** and windows **60/60/900 seconds**.

An audit of the original SQL 00/01 at `095f494` and the embedded literals in SQL 04/05 at `874671b` confirms that all five expected LF hashes were computed from exactly those original bodies; there is no body-extraction or source-version discrepancy in those reference values.

The earlier generator compared SHA-256 of UTF-8 `pg_proc.prosrc` with only the repository LF body. SHA-256 correctly distinguishes LF (0A) from CRLF (0D0A); the existing allowlist did not cover the observed exact CRLF form. This explains all five DIFFERENT_BODY results and the SQL 05 FAILs even while SQL 03 security checks PASS. It is not evidence that SQL 03 checks were bypassed: that script verifies owners, hardening and privileges, not function-body identity.

The isolated PostgreSQL fixture installs the known bodies through actual SQL, preserving CRLF within dollar-quoted function source. PostgreSQL then returns the owner's exact five hashes from prosrc. It also stores the repository LF input as the corresponding LF hashes, validating the generator's body extraction and UTF-8 hash calculation. PostgreSQL does not spontaneously turn these LF inputs into CRLF in this test. The CRLF bytes arrived in the deployed SQL input; the supplied evidence cannot identify which browser/editor/clipboard/transfer step introduced them. `pg_get_functiondef` reserializes the declaration and is a different hash subject from prosrc; mixing those hashes is incorrect, but is not needed to explain these five values.

All four historical SQL 01 bodies were unchanged across several earlier reviewed commits; their hashes alone cannot determine an exact deployment date or distinguish those commits. They **do** distinguish the old 65-character code from the corrected 64-character code. The counter hash identifies the 20/10/10 version and does not match the withdrawn 20/2/10 or earlier 200/20/10 policies. No unknown logic change is required to explain the observed fingerprints. Fresh live catalog verification remains owner-side; the agent has not executed live SQL or authenticated a public request.

## Original bodies and hash comparison

The LF hashes below are what the earlier SQL 04/05 expected. Each CRLF hash is independently recomputed from the same repository body and matches the owner's observation exactly.

| Function | Expected LF SHA-256 at 874671b | Observed = independently derived CRLF SHA-256 |
| --- | --- | --- |
| `consume_login_counters` | `143f160059c9c4e80b30824d8855de89de30510e1949a9950e0f49a6349e7eae` | `d616c97d7dc76dedad6bd9bb0c86f9593b4e083cba6e5a345d67e17141f57fc3` |
| `public_login_limits_healthy` | `44e59d313c81eb389e1d518454d10de78000c989f5a42f2c797c3dad2a5e1f58` | `df08001b1aac4a1ad736fcf09a0d3b1db5f285eb6c2d5d7ee046cca2204a561b` |
| `maintain_public_login_counters` | `25514a977e8b8724837f7fcc0638b6c7bcf213ea3ed07d0420dca886d1e82561` | `9beafec47ac169c70ccfcfe0158a1abcdb7eef4a8926fcfd086302043ece5ed3` |
| `claim_gateway_nonce` | `6fc0b6e815a8278768603b375056aaf4c5ab0c0ea1552fd9ed68e863a5961d97` | `236885ef27aa3959e943acd1a0cb60f1793754fda6dcb0d878d7c1125a9744b0` |
| `begin_signed_login_attempt` | `9f86bd933fc93215b064953cf6bd7695aae6cbd98178fd600650be1c472445cf` | `5925c6a5f8a9effa1c5ac8f8cbccd6a563ddca58a23c0929e3f26ba4de146314` |

## Narrow correction to SQL 04/05/06

The proposals now compare the **raw, unmodified live source hash** against exactly two independently generated hashes per reviewed body: its LF bytes and its CRLF bytes. They do not strip whitespace/comments, normalize database source, remove punctuation, accept arbitrary observed hashes or treat security PASS as code equivalence. Mixed endings, trimming, extra comments, other formatting and actual logic changes still fail closed unless separately reviewed.

The two expected forms are derived solely from committed SQL 00, corrected SQL 01 and the frozen historical SQL 01 test source. `tests/fixtures/live-fingerprints-step120.json` records the owner's observations for regression assertions only; generators never read it to build accepted hashes.

A conservative build-time eligibility check refuses automatic CRLF variants when source contains newlines inside string literals or quoted identifiers, escaped-string complexities, nested dollar quoting, lone CRs or incomplete quoting/comments. This prevents a future string containing a meaningful newline from being silently treated as an equivalent literal. The five current bodies have line breaks outside their literals; the exact conversion changes formatting only. This check is not presented as a general SQL parser.

All security/interface checks remain: exact signatures/defaults/results, expected owners/EXECUTE ACLs, SECURITY DEFINER, fixed search_path and row_security, language/volatility/parallel/strictness properties, managed memberships and temporary grant cleanup. SQL 04 still replaces only the four watermark-related bodies and preserves their non-body metadata and all records. It does not rewrite the counter function or change 20/10/10. It still requires known historical bodies before repair and known corrected bodies after repair; recognizing CRLF does not label broken code as corrected.

## Additional owner-side read-only diagnostic

[07_inspect_function_fingerprints.sql](../supabase/review/public-login/07_inspect_function_fingerprints.sql) is a standalone catalog SELECT inside `BEGIN TRANSACTION READ ONLY` with timeouts and final ROLLBACK. It reads only fixed pg_proc/pg_language entries and privilege metadata. It does not invoke the five target functions, execute maintenance, read private accounts/mappings/counters/logs, create objects, grant privileges or change job/settings state.

It returns only fixed function signatures, server version number, UTF-8 source/definition hashes, static reviewed-reference hashes, character/byte/newline/tab counts, and interface/security/rate-policy review statuses. It never returns source text, proconfig values, arguments/default strings or snippets from unknown source. The full-definition hash is clearly separate from raw_prosrc_sha256.

Expected **before repair**, assuming the database still matches Step 120:

- Five rows with body_review EXACT_REVIEWED_BYTES, interface_review PASS and security_review PASS.
- Counter: matched reference REVIEWED_20_10_10, line_endings CRLF, rate_policy_review CONFIRMED_20_10_10_WINDOWS_60_60_900.
- Other four: matched reference LEGACY_65_CHARACTER_WATERMARK, line_endings CRLF. This means the bug remains and needs the separately approved repair.
- All five raw hashes equal the supplied Step 120 values; CRLF pairs equal LF character counts, with no lone CRs.
- Updated SQL 05: constraints/rate policy PASS, four watermark fields NEEDS_REPAIR, existing_cron_state DISABLED. SQL 03 remains security PASS, cron_extension INSTALLED.

After a separately approved repair, all four references must be CORRECTED_64_CHARACTER_WATERMARK with exact LF or CRLF bytes, and SQL 05's four function checks must PASS. A read-only PASS does not authorize repair, maintenance, job reactivation or login.

## Exact browser-only Dashboard procedure

1. On GitHub select this exact feature-branch commit. Review 07, regenerated 04/05/06 and this document. In the dedicated Supabase Dashboard leave Cron inactive and all public login/gateway flags false. Do not rerun SQL 00 or SQL 01, run maintenance, or deploy any function/Worker.
2. Open SQL Editor under the existing postgres administrator context. Run only unchanged SQL 03 and all of **07**. Both are read-only. Verify the five rows against the expected source/reference/interface/security results above. Share only these source hashes, structural counts and statuses, not source definitions, credentials, sessions, account rows or sensitive logs.
3. Run the **updated SQL 05 from this commit**, not a saved LF-only copy from `874671b`. It remains read-only. Require rate/constraint PASS and all four legacy watermark fields NEEDS_REPAIR with Cron DISABLED. Any MISSING/UNREVIEWED_BODY, unexpected raw fingerprint, interface/security FAIL, wrong rate result or job state means stop; do not overwrite a function or add its hash to an allowlist.
4. If current evidence matches, the exact formatting cause and installed rate policy are verified for this snapshot. Obtain **separate explicit owner approval for the complete new SQL 04 transaction** before any live change. Follow the [repair runbook](CRON_MAINTENANCE_WATERMARK_REPAIR.md) for preflight, replacement, postflight, temporary-grant verification and rollback. No approval is implied by this investigation.
5. After approved 04, rerun 03, 05 and 07. Require all security/definition checks PASS, the corrected reference for four bodies, unchanged counter policy and Cron DISABLED. SQL 06's rollback-only functional probe needs separate approval. Resuming the one existing Cron job needs separate approval and at least two real successful scheduled runs plus healthy status. Public login remains disabled regardless of Cron results; its genuine public gateway/browser/capacity validation and main cutover remain separate.

### Owner-controlled source review if fresh evidence is different

No full source dump is necessary for the five supplied hashes: they already match exact independently derived source bytes. If a fresh 07 result is unknown, the owner can inspect **one fixed function at a time** in Database → Functions or by a private SQL Editor SELECT of `pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('<one exact signature listed by 07>'))`. This reads the catalog and never calls that function. Do not save/recreate/edit the function from that screen.

Keep that definition view/output private: an unexpected function could contain sensitive literals. Compare it locally in the browser against the pinned GitHub SQL 00/01 function block, including all conditions, constants, counter order, nonce/conflict handling, UID/mapping checks and security declaration. Do not upload it to public diff sites, paste it into chat, publish screenshots/logs or copy private credentials/identity data. Return only reviewed status/hash information. Any actual code/interface/privilege difference requires a new narrowly scoped review; do not claim semantic equivalence from a whitespace-stripped hash. This task adds no client-controlled SQL or generic source-export endpoint.

## Tests and remaining blockers

Local validation passed:

- Original SQL 00/01 at `095f494` agree exactly with all five LF hash literals in `874671b` SQL 04/05. The supplied live hashes independently match only their exact CRLF forms among the inspected reviewed versions.
- **PostgreSQL 16** reproduced every supplied hash from actual stored prosrc after CRLF SQL input. The whole SQL 03 security verifier still PASSes while an unsafe nonce-body change is deliberately installed in the fixture; updated 04/05/07 reject that changed body. Thus source acceptance is independent of security PASS.
- 07 ran as a genuinely read-only catalog transaction and preserved fixture records/metadata, returning no inserted synthetic private-source marker. It identified all five legacy/current CRLF sources, exact 20/10/10 policy and reviewed interfaces. Modified comments, withdrawn 200/20/10 and 20/2/10 profiles, an increased threshold, unsafe nonce replay handling, trimming and mixed endings were rejected.
- The complete actual 04 repair, submitted with CRLF line endings, passed as ordinary non-superuser postgres. Postflight and 07 recognized only corrected CRLF watermark bodies; owner/ACL/metadata, all existing counters/accounts/mappings/departments/permissions and the unchanged CRLF counter source were preserved. All **36 repair rejection/rollback cases** and **36 existing managed-role cases** passed, together with maintenance, stale-health, nonce race/uniqueness, bounded backlog and concurrency cases. Restricted access remains 101 management grants/six Driver denials, with 107 definitions unchanged.
- **PostgreSQL 15** original private-identity/privilege regression passed separately. All SQL ran only in network-isolated disposable containers; Cron catalogs were mocked and no actual scheduler or Supabase connection was used.
- **139 Node tests**, **30 Deno tests**, Deno type checking, **117 JavaScript syntax checks**, Python syntax, permission-catalog integrity, all five artifact checks, documentation links and whitespace checks passed.
- **Eight browser suites** passed across all 18 administrative pages, mocked authentication/authorization/logout and business modules, with no uncaught errors or legacy requests. Roster verification passed **815 synthetic PDFs and 4,974 map annotations**, stored outside the public repository.

No live SQL, provider setting, secret, Cron activation, Edge/Worker deployment or public authentication request was performed by the agent. Main remains `42ab3a504d76e5119733791c2262f24565336576`; GitHub reports its existing Pages build as built at that commit. No PR is merged or branch deleted. The feature branch is retained for owner review and genuine hosted verification. Catalog/container success does not establish public-authentication readiness.

Remaining requirements are fresh owner-side 03/07/05 confirmation, explicit approval of the corrected 04 proposal, hosted transactional repair/postflight, separately approved rollback-only probe, and separately approved Cron reactivation with real scheduled success/refresh evidence. All existing public-authentication/security/capacity/cutover gates remain. No main merge or branch deletion is authorized.

## Exact changed files

- `docs/FUNCTION_FINGERPRINT_INVESTIGATION.md`
- `docs/CRON_MAINTENANCE_WATERMARK_REPAIR.md`
- `scripts/lib/sql-source-fingerprints.cjs`
- `scripts/lib/function-fingerprint-diagnostic.cjs`
- `scripts/lib/maintenance-repair-sql.cjs`
- `supabase/review/public-login/04_repair_maintenance_watermark.sql`
- `supabase/review/public-login/05_verify_maintenance_watermark.sql`
- `supabase/review/public-login/06_probe_maintenance_rollback.sql`
- `supabase/review/public-login/07_inspect_function_fingerprints.sql`
- `tests/function-fingerprints.test.cjs`
- `tests/_function-fingerprint-fixture.cjs`
- `tests/_maintenance-repair-fixture.cjs`
- `tests/fixtures/live-fingerprints-step120.json`

SQL 00/01/02/03, rate-policy JSON, table constraints/role definitions, all deployed Edge/Worker and generated Dashboard sources, get-my-access, permission inventory and application modules remain unchanged from `874671b`. The existing `build-public-role-proposals.cjs` command regenerates and checks all dependent artifacts, including 07; no owner installation or build command is needed.
