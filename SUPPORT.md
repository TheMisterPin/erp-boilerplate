# Support

## How to get help

- Usage questions: open a GitHub Discussion (if enabled) or Issue using the appropriate template.
- Bugs: use the bug-report template with reproduction steps and a test plan.
- Features: use the feature-request template with acceptance criteria.
- Security concerns: follow [SECURITY.md](./SECURITY.md) and report privately.

## What this project supports

- Current repository state on the default branch (`0.x`, no long-term support branches yet).
- Development workflows documented in `README.md` and `CONTRIBUTING.md`.
- pnpm-based scripts in `package.json`:
  - `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - Prisma workflows: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`

## Compatibility expectations

- Runtime and architecture assumptions follow the canonical stack/setup documented in:
  - `README.md` (stack + project layout)
  - `CONTRIBUTING.md` (local setup + contributor workflow)
- Backward compatibility for internal APIs, schema shape, and UX is **best effort** during `0.x` and may change between minor versions.
- Contributors should include migration/documentation notes whenever behavior or schema changes.
