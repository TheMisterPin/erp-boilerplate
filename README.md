# ERP Boilerplate

[![Quality](https://github.com/TheMisterPin/erp-boilerplate/actions/workflows/quality.yml/badge.svg)](https://github.com/TheMisterPin/erp-boilerplate/actions/workflows/quality.yml)

A production-minded foundation for internal operations software: start with a
working Next.js application, PostgreSQL data model, server-side authorization,
reusable CRUD systems, and operational demos—instead of losing a week to auth,
tables, modal behaviour, and sidebar colours.

It is deliberately a **foundation**, not a finished ERP. The included people,
organization, scheduling, attendance, leave, and audit modules show the
architecture in use. Build your inventory, purchasing, finance, restaurant, or
other domain modules on the same patterns.

## Start here

### Fastest path: Docker Compose

Prerequisite: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/TheMisterPin/erp-boilerplate.git
cd erp-boilerplate
SEED_PASSWORD='choose-a-local-demo-password' docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The first run applies
Prisma migrations and seeds the demo database automatically. Stop it with
`docker compose stop`; use `docker compose down -v` only when you deliberately
want to delete the local database volume.

### Local development

Prerequisites: Node.js 22+, pnpm, and PostgreSQL 16+ (or the database service
from the Compose file).

```bash
git clone https://github.com/TheMisterPin/erp-boilerplate.git
cd erp-boilerplate
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Set `DATABASE_URL`, a strong `JWT_SECRET`, and a `SEED_PASSWORD` of at least 12
characters in `.env` before starting. If you use the Compose database from
local Node, its connection string is:

```bash
DATABASE_URL="postgresql://erp:erp@localhost:5432/components_playground"
```

### Guided setup

From a clean clone, run `pnpm setup` to create `.env` with a branded product,
initial organization and admin address, database choice, module selection, and
generated secrets. Review the plan first with `pnpm setup -- --dry-run`.

The command never overwrites `.env` implicitly. If a generated file needs to be
recreated, copy it somewhere safe, then run `pnpm setup -- --force`; the old
file is intentionally left for you to inspect before replacement.

## Demo accounts

These accounts exist **only in a newly seeded local demo database**. They are
not safe credentials and must never be used in a public deployment.

| Account | Password | What to try |
|---|---|---|
| `admin@example.com` | Your `SEED_PASSWORD` | Full CRUD, organization, activity trail |
| `user@example.com` | Your `SEED_PASSWORD` | Read-only access and self-service routes |
| `manager@example.com` | Your `SEED_PASSWORD` | Location-scoped shift-management rules |

## What is included

| Capability | Status | Where to look |
|---|---|---|
| Cookie sessions, server-side guards, RBAC, current-account checks | Implemented | [`auth` guide](.docs/components/auth.md) |
| Abuse-safe sign-in throttling | Implemented | [`auth` guide](.docs/components/auth.md) |
| Users, departments, locations, forms, modals, table CRUD | Implemented | `/team/members`, `/organization/*` |
| Shift templates, schedule calendar, clock in/out | Implemented | `/team/shift-templates`, `/team/my-shifts`, `/clock` |
| Profile and time-off workflow | Implemented | `/profile`, `/team/time-off` |
| Audit trail | Implemented | `/team/activity` |
| Security headers, dependency review and CodeQL | Implemented | [`operations`](docs/operations.md) |
| Health/readiness and structured operational logs | Implemented | [`operations`](docs/operations.md) |
| Feature-folder architecture and typed server-action errors | Implemented | [`architecture`](.docs/components/architecture.md), [`errors`](.docs/components/error-handling.md) |
| Inventory, purchasing, accounting, CRM, multi-tenancy | Not included | Build as domain verticals |
| Password reset, MFA, durable session revocation | Planned | Security roadmap |
| Distributed rate limiting, email delivery | Planned | Replace the local adapters |
| GitHub Actions quality gate | Implemented | [Quality workflow](.github/workflows/quality.yml) |

## Take the demo tour

1. Sign in as `admin@example.com`.
2. Open **Team → Members** and create, edit, or archive a member: this is the
   reference CRUD vertical.
3. Open **Organization → Locations**, assign a manager, then compare that
   manager's scope with the admin's.
4. Open **Team → Activity** to see the audit log created by sign-ins and
   privileged mutations.
5. Sign out and try `user@example.com` to see that hiding buttons is only a
   UX choice—the server still enforces permissions.

## Architecture at a glance

```text
app route → feature hook → stateless page/component
                   ↓
          server action → authorize() → Prisma
                   ↓
             ActionResult → useError().run()
```

Feature modules follow one repeatable shape:

```text
src/features/<feature>/
  types/        domain and form types
  actions/      server actions, validation, authorization
  hooks/        client orchestration and modal state
  components/   forms, tables, stateless page views
```

The `users` vertical is the reference implementation. Read the full
[architecture guide](.docs/components/architecture.md) before creating a new
domain module.

## Create your first feature

Use a small, boring domain first—`vendors`, `cost-centres`, or `equipment`—to
learn the shape before building a large workflow.

1. Copy the folder layout from `src/features/users/`.
2. Define your model in `prisma/schema.prisma`, run a migration, and generate
   the client.
3. Add a shared Zod schema in `src/lib/schemas/`.
4. Add permissions and `Actions.<feature>` in
   `src/features/auth/permissions.ts`.
5. Add server actions using `withErrorBoundary()` and
   `authorize(Actions.<feature>.*)`.
6. Build typed FieldDefs, a thin form wrapper, table columns, then a feature
   hook and stateless page view.
7. Add the route and sidebar entry; record audit events for privileged changes.

That sounds structured because it is. The point is that the second feature
should feel repetitive, not like a fresh architectural debate.

## Product configuration

The supported customization surface is [`src/lib/app-config.ts`](src/lib/app-config.ts). It supplies product copy, logo choice, support links, accent tokens, and the enabled-module registry. Defaults preserve the demo identity; use the documented `NEXT_PUBLIC_*` variables in `.env` to customize a generated project.

Configuration is **compile-time**: restart development or rebuild the deploy after changing it. It is intentionally not organization-specific runtime branding. Only `publicAppConfig` is available to Client Components, so never add secrets or server-only settings to this file or a `NEXT_PUBLIC_*` variable.

`NEXT_PUBLIC_ENABLED_MODULES` accepts a comma-separated subset of the IDs in `.env.example`. Disabled modules are removed from navigation, but this is product composition—not an authorization boundary. Keep server-side RBAC checks on every route action.

## Common commands

| Task | Command |
|---|---|
| Start development | `pnpm dev` |
| Run all checks | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |
| Unit and component tests | `pnpm test:unit` |
| Prisma integration tests | `pnpm test:integration` |
| Generate Prisma client | `pnpm db:generate` |
| Create a development migration | `pnpm db:migrate` |
| Seed a local demo database | `pnpm db:seed` |
| Start/stop Compose | `pnpm docker:up` / `pnpm docker:down` |
| Reset Compose data | `pnpm docker:reset` |
| Build Mac Docker launchers | `pnpm packaging:macos` |

`pnpm docker:reset` deletes the local Docker volume. It is intentionally
destructive.

## Quality gate

Pull requests and pushes to `main` run the `Quality / quality` GitHub Actions
check. It uses the pinned pnpm version, starts PostgreSQL, generates the Prisma
client, applies migrations, and runs lint, typecheck, tests, and a production
build.

Configure `Quality / quality` as a required status check in the `main` branch
protection rules before requiring pull requests to merge.

## Production caveats

- The supplied Docker Compose secrets and demo credentials are for local use
  only. Set real environment variables in every deployment.
- The default sign-in limiter is process-local. Replace it with an atomic
  Redis/KV adapter for multi-instance or serverless deployments.
- Client source limiting relies on proxy headers. Only trust those headers
  behind infrastructure that overwrites them.
- Use `/api/health/live` for liveness and `/api/health/ready` for readiness;
  see the [operations guide](docs/operations.md) for logging, CSP, and supply-chain defaults.
- Authorization is server-side and reloads the current database account state;
  client-side visibility is not a security boundary.
- This is not yet a complete business product. It does not include tenancy,
  backups, email delivery, accounting controls, or a production operations
  runbook out of the box.

## Documentation

| Guide | Use it for |
|---|---|
| [Auth and RBAC](.docs/components/auth.md) | sessions, roles, limits, protected actions |
| [Feature architecture](.docs/components/architecture.md) | new verticals and thin routes |
| [Forms](.docs/components/forms.md) | FieldDefs and DynamicForm |
| [List pages](.docs/components/list-pages.md) | CRUD table pages |
| [Error handling](.docs/components/error-handling.md) | `ActionResult` and client error UX |
| [Logging](.docs/components/logging.md) | audit events |
| [Operations](docs/operations.md) | health checks, structured logs, security headers, and CI scanning |
| [Contributing](CONTRIBUTING.md) | local workflow and pull requests |
| [Security policy](SECURITY.md) | responsible vulnerability reporting |

## Licence

Released under the [MIT License](LICENSE).
