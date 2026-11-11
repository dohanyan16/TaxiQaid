# Earlier local-only Master authentication diagnostic

The owner reports the genuine direct-Auth/get-my-access Master test has passed. This helper remains available to developers only; **it is not an owner installation requirement**. The current username broker task uses the [Dashboard and browser-only plan](USERNAME_LOGIN_BACKEND_REVIEW.md#isolated-browser-only-genuine-test). Do not ask the owner to install Python, Node, Git or CLI tooling.

This temporary technical test bypasses the **disabled username/Iqama broker** and signs in directly to the dedicated project using the owner's existing Supabase Auth email/password. This exception applies only to this private test; the final application still requires username or Iqama plus password. It never deploys/replaces `get-my-access`, enables the broker, changes the six private tables, grants permissions or modifies production.

## Run on your own computer

1. Open the existing checkout on `feat/dedicated-supabase-auth` and update that branch normally. Do not merge it to main.
2. From the repository root, run:

   ```sh
   python3 scripts/_local_master_smoke/server.py
   ```

3. Open the exact `http://127.0.0.1:<port>/` address printed by the command in a private browser window. Enter the existing Auth email and password privately; **both fields are masked**. Click **Run Once and Sign Out** and keep the tab open until automatic sign-out finishes.
4. Click **Copy Sanitized Summary** and report only that summary. Close the tab and press **Ctrl+C** in the terminal to remove the temporary page.

Python 3 and a modern browser are sufficient. No credentials go in command arguments, environment files, the repository or chat. Do not save the form in a password manager or record browser network/HAR traces. Do not share input screenshots, SDK objects, raw responses, email, passwords, UIDs or tokens.

The launcher downloads public Supabase SDK **2.119.0** before any private input, checks the pinned SHA-256 and serves it locally. If an exact offline SDK copy is already available, `--sdk-file /path/to/supabase.js` accepts it only if the checksum matches. Never disable TLS or bypass a network restriction to obtain the SDK. The key is read from the existing dedicated public configuration; a secret/service-role key or different project is rejected.

## What happens

- The server binds only to `127.0.0.1`, chooses a free port, allows only fixed asset routes and validates Host/Origin. It never reads credential request bodies or logs requests. It does not proxy Auth or Edge Function traffic.
- The page is generated **in server memory**. No test HTML page is written into the repository, and no link/import is added to the application. Source is under an underscored tools directory, excluded by default Jekyll processing. Do not port-forward, tunnel, host or publish the test.
- A storage guard runs before the pinned SDK. Browser local/session storage, IndexedDB and Cache Storage are blocked for this page. SDK session persistence and automatic refresh are disabled; inputs clear immediately on submission. The tab holds only its own short-lived session in memory.
- The browser calls **`supabase.auth.signInWithPassword({email,password})`** over HTTPS directly to `mqkflwsvnzcaylxtvsje.supabase.co`, verifies the resulting user through Auth, then sends the user JWT directly to the already deployed **GET `/functions/v1/get-my-access`**.
- Only those necessary Auth requests, user verification, the existing access function and **local-scope sign-out** are permitted. Passwords/email are sent only to Auth; the JWT goes only to the approved project's user/access/logout endpoints. No secret is forwarded to the local server, analytics, a proxy endpoint, the broker, a spreadsheet or the Data API.
- Results contain only fixed test statuses, HTTP status numbers, sanitized diagnostic codes and permission counts. No UID, email, profile/name, permission list, session, SQL error text or complete private response is displayed or copied.
- Sign-out runs automatically in `finally`, including after an access/permission failure. Its success is checked and reported. It targets this test session (`scope: local`), not the owner's other sessions. Keep the tab open until it finishes; closing early only permits best-effort cleanup. If sign-out cannot be confirmed, the overall test fails: close the tab and review/revoke the test session privately using the owner's Supabase controls. Standard access JWT expiry is separate from refresh-session sign-out; no instant JWT revocation is claimed.

## Verification and interpretation

A complete PASS requires genuine password authentication, verified Auth identity, authenticated HTTP 200 from the existing Edge Function, matching returned UID, active management account, exact `super_admin` role, **101 effective management capabilities**, denial of **all six driver-only actions**, accepted **AAL1/password-only access**, and confirmed automatic sign-out. No MFA enrollment, challenge or extra login confirmation is requested.

Permission counts apply the existing catalog, explicit-deny precedence, account audience and module/nested dependencies. The diagnostic also checks that the server response itself does not grant driver-only/unknown capabilities; it does not hide a bad server grant merely through frontend audience filtering. These are capability counts, not a test of every record/document scope or business operation.

The database status is explicitly **“PASS (via function response)”**: a valid authenticated response demonstrates the existing function's database-backed account/permission read path at the API level. This tool does not make an independent PostgreSQL connection, inspect SQL execution or prove TLS/RLS policy definitions. A function returning hardcoded data would require source review; do not describe this HTTP check as an independent direct SQL probe.

Supported access formats are the existing version-1 account/roleDefaults/overrides contract and explicit schema-shaped account data with permission-key lists, boolean maps or `permission_key`/`is_allowed` rows. Unsupported or incomplete shapes fail with `ACCESS_RESPONSE_UNSUPPORTED`; do not paste a private response to diagnose it. An owner can review the function's response structure privately without sharing values.

| Result | Safe interpretation |
| --- | --- |
| Auth HTTP 400/401 | Auth rejected the attempt; credential/account details are deliberately omitted |
| Access HTTP 401/403 | JWT/function authorization was rejected; no permissions, MFA or functions are changed automatically |
| Access HTTP 500/503 | The existing function failed or was unavailable; database success is not claimed |
| HTTP 200, unsupported response | Authenticated HTTP request succeeded, but the required account/permission checks are not confirmed |
| `NETWORK_OR_CORS`, HTTP unavailable | The browser could not expose a response (network, CORS, timeout or redirect policy). No HTTP status is invented |
| Wrong UID, inactive account, wrong role or incorrect counts | Test fails without printing private fields |
| `SIGNOUT_NOT_CONFIRMED` | Cleanup could not be confirmed; the overall result is not a pass |

The deployed function must already allow the loopback browser origin through its existing CORS policy for the browser to read it. If it does not, report the sanitized failure; **this task does not redeploy the function, weaken JWT checks or add a secret-bearing local proxy**.

## Validation of the tool

Automated tests use the real pinned browser SDK with mocked HTTPS replies. They exercise successful and rejected requests, UID mismatch, incorrect driver grants, unsupported data, network failures and failed sign-out, and assert that no private fixture values reach the output/logs/storage. They also test loopback Host/Origin/method/route restrictions. Such tests are **not genuine Master authentication**.

Run `node --test tests/local-master-smoke.test.cjs` and `node tests/local-master-smoke.browser.cjs`. The browser harness can use `TAXIQAID_SMOKE_SDK_FILE` for the public pinned SDK copy; it contains no credentials. Actual live success remains pending the owner's local authenticated run and sanitized results.
