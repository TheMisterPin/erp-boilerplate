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

Integration tests must use the supplied test client and factories. Do not import
`src/lib/db.ts`, which intentionally uses the application database connection.
