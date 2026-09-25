# Testing

The project uses two complementary test runners:

- `node:test` via `tsx` for existing lightweight server and security tests in `scripts/*.test.ts`.
- Vitest for new unit, React component, and Prisma integration tests under `tests/`.

## Run locally

Create a dedicated test database once, then point `.env.test` at it:

```bash
cp .env.test.example .env.test
# Edit DATABASE_URL_TEST if your local PostgreSQL credentials differ.
pnpm test
```

`pnpm test` applies migrations to `DATABASE_URL_TEST`, runs the existing
security tests, then the Vitest unit/component suite and integration suite.
The integration helper refuses to run without `DATABASE_URL_TEST`, refuses a
database name not ending in `_test`, and outside CI refuses a URL equal to
`DATABASE_URL`. It resets the test database before every integration test.

## Where tests belong

- `scripts/*.test.ts`: existing low-level server/security checks.
- `tests/unit/`: pure domain and utility behavior.
- `tests/components/`: React UI behavior; use a `jsdom` environment directive.
- `tests/integration/`: Prisma-backed behavior; use factories and
  `resetTestDatabase` from `tests/support/test-database.ts`.

Authentication and scope checks belong in integration tests whenever the current
database account state or a resource relationship is part of the decision. Mock
only framework boundaries such as cookie access; invoke the auth gate or server
action directly and assert its stable error DTO.

Integration tests must use the supplied test client and factories. Do not import
`src/lib/db.ts`, which intentionally uses the application database connection.

## Tenant-isolation matrix

`tests/integration/tenant-isolation.integration.test.ts` is the regression
matrix for organization boundaries. It creates two active organizations with the
same human-readable name, then invokes server actions with one active session.
The matrix verifies that lists cannot enumerate the other organization, foreign
record mutations return their stable not-found errors, and relation identifiers
from the other organization are rejected.

When adding a tenant-owned vertical, extend this matrix in the same pull
request. Cover the vertical's list/enumeration action, one foreign record
mutation, and every form or action identifier that references another tenant's
record. Include audit or operational data when the vertical creates it.

---

## Related

| File | Role |
|------|------|
| `.cursor/rules/testing.mdc` | Agent rule (tests + feature actions) |
| `docs/organization-ownership.md` | Tenant boundary |
| `AGENTS.md` | Systems catalog + vertical checklist |
