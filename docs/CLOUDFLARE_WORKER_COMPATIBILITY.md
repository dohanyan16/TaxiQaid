# Cloudflare Worker fetch compatibility correction

Continue `feat/dedicated-supabase-auth`, correcting review commit `b8a033f`. The owner created `taxiqaid-auth-gateway` and reported Dashboard TS2353 for the browser-only `credentials` property. The agent has not deployed to or tested the owner's hosted Worker.

Owner-reported settings remain unchanged:

- `TAXIQAID_GATEWAY_ENABLED=false`
- `TAXIQAID_GATEWAY_ORIGIN=https://taxiqaid-auth-gateway.dohanyan.workers.dev`
- `TAXIQAID_GATEWAY_ORIGINS=https://taxiqaid-auth-gateway.dohanyan.workers.dev`

## Corrected file and behavior

Use the complete regenerated [Dashboard file](../gateway/dashboard-worker.mjs) for review. It is generated from [the Worker source](../gateway/worker.mjs) plus the unchanged shared signing helpers.

The Worker upstream fetch now omits `credentials` and uses `redirect:'manual'`. Every status from 300 through 399 is explicitly rejected with a generic, non-cached 503, including redirects to the same approved host or a relative URL. The response body is cancelled; Location, Set-Cookie and raw errors are not forwarded. No second destination is fetched. The fixed HTTPS Supabase target, timeout, no-store behavior, explicit request headers, HMAC/body binding, canonical IP/provenance checks, origin constraints, nonce proof and session-field filtering remain intact. Browser cookies are not copied into the server request; removing a browser-only option does not introduce cookie forwarding.

The generator now rejects unsupported Worker `credentials` options or `redirect:'error'`, so source and generated output cannot silently regress independently. No TypeScript suppression, custom permissive RequestInit, altered Supabase code or weakened authentication check was added. The source remains a single-purpose gateway, not a redirecting/general proxy.

The owner may review this complete file in the Dashboard editor. This task authorizes no save/deploy/enablement, secret change or live test. Keep the three existing variable values above; do not enable login, alter Supabase or paste any real credential into a test request.

## Compatibility verification

`tests/cloudflare-worker.compat.cjs` is a developer-only test; the owner needs no installation. Developer dependencies were installed outside the repository in a separate tools directory, not into the website or Pages source. Reproduce using an installed tools directory:

```sh
TAXIQAID_CLOUDFLARE_TOOLS=/path/to/developer-tools node tests/cloudflare-worker.compat.cjs
```

That directory must contain `typescript`, `@cloudflare/workers-types` and `miniflare`. Tested versions: TypeScript **7.0.2**, Cloudflare Workers types **5.20261112.1**, Miniflare **4.20260730.0**.

The test performs two distinct checks:

1. It extracts the **actual upstream fetch expression** from both source and generated Worker and compiles it strictly against official Cloudflare RequestInit types, without DOM/Node type merging or compiler error suppression. A negative control reintroduces `credentials:'omit'` and must reproduce **TS2353**. This is a scoped Fetch compatibility check, not a claim that the entire untyped JavaScript codebase underwent strict TypeScript analysis.
2. It boots the **complete generated Dashboard artifact** in Miniflare's local **workerd** runtime, with compatibility date **2026-07-30**, synthetic Cloudflare metadata and isolated outbound services. Success 200 retains only official session fields. Redirects 301/302/303/304/307/308 return generic 503 with no second hop or Location header. A negative control changing `manual` to `follow` must actually take the extra hop, proving the harness detects redirect following. No real Supabase, Cloudflare account or arbitrary external host is contacted.

The isolated outbound service intentionally returns redirects directly to workerd. Miniflare's convenience fetchMock adapter introduces a Node fetch that can follow a redirect before workerd receives it; using that adapter would confound this particular runtime test.

Node regression tests additionally assert no `credentials` property, `redirect:'manual'`, timeout/no-store options and explicit rejection/body cancellation for **27 combinations**: statuses 300/301/302/303/304/305/307/308/399 against external, same-host and relative locations. Existing signature/provenance/origin/body/session tests remain in place.

**Not verified:** the owner's hosted Dashboard compiler/runtime, its actual compatibility date, Cloudflare ingress/header provenance, real gateway→Supabase connectivity, live signature/nonce/SQL behavior or public username authentication. Local workerd is meaningful runtime evidence but is not a hosted deployment result. Those checks remain pending separate approval and owner execution; the [public architecture review](PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md) still controls the broader deployment/security prerequisites.

## Exact changed files

- `gateway/worker.mjs`
- `gateway/dashboard-worker.mjs`
- `scripts/build-public-gateway.cjs`
- `tests/public-gateway.test.cjs`
- `tests/cloudflare-worker.compat.cjs`
- `docs/CLOUDFLARE_WORKER_COMPATIBILITY.md`
- `docs/PUBLIC_USERNAME_LOGIN_ARCHITECTURE.md`

## Final validation

- 130 Node tests passed; the eight gateway tests were rerun after adding incoming-cookie non-forwarding assertions.
- All eight applicable browser suites passed: workflow, UI, people, roster, support, portal, authentication migration and public gateway. Navigation retained 18 administrative pages.
- Official Cloudflare Fetch type checks and seven local workerd success/redirect cases passed, plus the deliberate-follow negative control. Local runtime also confirmed incoming cookies are not forwarded.
- 105 JavaScript files and Python syntax passed; Deno type checking, all four generated-artifact checks and the 107-definition catalog integrity check passed.
- Roster verification passed 815 synthetic PDFs and 4,974 map annotations outside the repository. No personal artifact or developer tooling dependency was added to the website.
- Supabase, shared frontend and module sources were compared with `b8a033f` and remain unchanged. No live SQL, Supabase/Cloudflare deployment, secret/variable edit, login activation, main integration or branch deletion occurred.
