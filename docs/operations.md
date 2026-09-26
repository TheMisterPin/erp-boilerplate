# Operations and security defaults

## Health endpoints

| Endpoint | Purpose | Database access | Success | Failure |
|---|---|---|---|---|
| `GET /api/health/live` | Process liveness | None | `200 {"status":"ok"}` | Only fails if the app cannot serve requests |
| `GET /api/health/ready` | Deployment readiness | `SELECT 1` probe | `200 {"status":"ok"}` | `503 {"status":"unavailable"}` without database details |

Both responses use `Cache-Control: no-store`. Docker uses the readiness endpoint
for the application health check; keep the database service health check separate.

## Security headers

Every response receives `X-Content-Type-Options: nosniff`, `X-Frame-Options:
DENY`, a strict referrer policy, a restrictive permissions policy, and a
same-origin opener policy. The middleware also issues a per-request CSP nonce,
sets `Content-Security-Policy`, and returns `X-Request-ID` for correlation.
The root layout calls `connection()` so each page renders on the request and
Next.js can stamp that nonce onto its scripts. A statically prerendered shell
has no nonce; with `strict-dynamic`, browsers then ignore `'self'` and block
those scripts.

The CSP blocks plug-ins, framing, cross-origin form submission, arbitrary script
execution, and unapproved connections. It permits HTTPS images because profile
avatars are user-configured URLs. It retains `style-src 'unsafe-inline'` only
because Next.js runtime and component libraries can emit inline style tags; it
does **not** permit unsafe inline scripts or eval in production. Development
adds `'unsafe-eval'` so React Refresh can run under `next dev`.

## Operational logging and error reporting

Operational logs are JSON lines with `timestamp`, `level`, `event`, and a
request ID when one is available. They are separate from the `UserActivity`
business audit trail: audit events remain feature data, while operational logs
are emitted to standard output for the deployment platform to collect.

The logger redacts fields named like passwords, tokens, credentials, cookies,
authorization headers, API keys, and connection strings before serialization.
Do not place secrets in event names or unstructured string fields.

`src/lib/observability/server.ts` exposes the `ErrorReporter` contract and a
default structured-log adapter. Replace that adapter at the deployment boundary
to send exceptions to Sentry, Datadog, or another provider; feature and domain
code must continue to use `reportServerError` rather than a vendor SDK.

## Supply-chain checks

- Dependabot opens weekly dependency and GitHub Actions update pull requests.
- Dependency Review blocks a pull request that introduces a high or critical
  vulnerability when GitHub's **Dependency graph** is enabled in repository
  settings. The workflow remains non-blocking until that one-time setting is
  enabled, because GitHub otherwise rejects the action before it can inspect a
  pull request. After enabling it, remove `continue-on-error` and configure the
  check as required on `main`.
- CodeQL runs the `security-extended` JavaScript/TypeScript suite on pull
  requests, `main`, and weekly. It is available on public repositories and on
  GitHub Team/Enterprise repositories with Code Security enabled.
