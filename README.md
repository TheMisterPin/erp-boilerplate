# Components Playground

Next.js (App Router) ERP boilerplate / component playground. Shared UI systems live under `src/components/shared`; feature verticals under `src/features`. Auth uses jose cookie sessions + Prisma; middleware requires login for all app routes.

## Stack

- **Next.js 15** App Router + TypeScript
- **shadcn/ui** + Tailwind
- **react-hook-form** + **zod**
- **Prisma** + PostgreSQL
- **sonner** toasts
- Package manager: **pnpm**
- **Docker Compose** for the packaged Mac app (Postgres + Next.js)

## Getting started

### Option A — Mac apps (Docker)

Prerequisite: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running. Host Node is not required to *run* this path (you need pnpm only to generate the `.app` icons).

```bash
pnpm packaging:macos
```

That writes two apps:

- `packaging/macos/dist/Start ERP.app`
- `packaging/macos/dist/Stop ERP.app`

Drag them to the Desktop, `/Applications`, or the Dock. Double-click **Start ERP**: Compose builds/starts Postgres (volume `pgdata`) and the app, then opens [http://localhost:3000](http://localhost:3000). First start downloads images and can take a few minutes; later starts are faster. Closing the browser leaves the stack running. Double-click **Stop ERP** to stop containers. Data survives.

If you move this repo, run `pnpm packaging:macos` again so the apps pick up the new path.

Compose env is demo-only (`JWT_SECRET` is not for production). Published ports: **3000** (app), **5432** (Postgres).

```bash
pnpm docker:up      # same stack as Start, without the browser
pnpm docker:down    # same as Stop (keeps the database volume)
pnpm docker:reset   # docker compose down -v — deletes all packaged DB data
```

After `docker:reset`, the next Start re-runs migrations and seed.

### Option B — local development

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
# DATABASE_URL can point at localhost:5432 if the Docker db service is running

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

Seeded on first empty database (`pnpm db:seed` or Docker first run):

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `password123` | ADMIN (read + write) |
| `user@example.com` | `password123` | USER (read-only) |

### Scripts

| Script | Command |
|--------|---------|
| Dev | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Test | `pnpm test` |
| Start | `pnpm start` |
| Generate Prisma client | `pnpm db:generate` |
| Migrate DB | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` |
| Mac Start/Stop apps | `pnpm packaging:macos` |
| Docker up | `pnpm docker:up` |
| Docker stop | `pnpm docker:down` |
| Docker reset (deletes volume) | `pnpm docker:reset` |

## What’s implemented

| System | Where to see it | Docs | Cursor rule |
|--------|-----------------|------|-------------|
| **Dynamic forms** — FieldDef registry, layouts, conditional fields | Feature forms (e.g. member create/edit modal) | [`.docs/components/forms.md`](.docs/components/forms.md) | [`.cursor/rules/dynamic-forms.mdc`](.cursor/rules/dynamic-forms.mdc) |
| **Universal modals** — stack of notify / confirm / form | List-page create/edit/delete | [`.docs/components/modals.md`](.docs/components/modals.md) | [`.cursor/rules/universal-modals.mdc`](.cursor/rules/universal-modals.mdc) |
| **Error handling** — `ActionResult`, `withErrorBoundary`, `useError().run()` | Server actions + list CRUD | [`.docs/components/error-handling.md`](.docs/components/error-handling.md) | [`.cursor/rules/error-handling.mdc`](.cursor/rules/error-handling.mdc) |
| **Auth / RBAC** — jose session, middleware, `Actions` / `authorize` / `can` | `/login`, list write gates | [`.docs/components/auth.md`](.docs/components/auth.md) | [`.cursor/rules/auth-rbac.mdc`](.cursor/rules/auth-rbac.mdc) |
| **DynamicTable** — columns, toolbar/row actions | Members / org lists | [`.docs/components/tables.md`](.docs/components/tables.md) | [`.cursor/rules/dynamic-table.mdc`](.cursor/rules/dynamic-table.mdc) |
| **List-page CRUD** — hook + stateless view + RBAC | `/team/members`, org pages | [`.docs/components/list-pages.md`](.docs/components/list-pages.md) | [`.cursor/rules/list-page-crud.mdc`](.cursor/rules/list-page-crud.mdc) |
| **Feature architecture** — folder layout, hook → view | `src/features/users/` | [`.docs/components/architecture.md`](.docs/components/architecture.md) | [`.cursor/rules/feature-architecture.mdc`](.cursor/rules/feature-architecture.mdc) |
| **Logging / audit** — `logActivity` + ADMIN activity list | `/team/activity`, login/logout | [`.docs/components/logging.md`](.docs/components/logging.md) | [`.cursor/rules/logging.mdc`](.cursor/rules/logging.mdc) |

### Demos

| Route | What it proves |
|-------|----------------|
| `/` | Home landing — links to list CRUD + activity demos |
| `/login` | Auth gate + `SESSION_EXPIRED` acknowledge target |
| `/clock` | Kiosk time clock — on-page login, check-in/out, attendance ↔ `UserActivity` |
| `/team/members` | List-page CRUD (forms + modals + `run()`) |
| `/team/activity` | Audit trail (`logActivity` + ADMIN `logging:read`) |
| `/team/shift-templates` | Shift templates CRUD + generate instances |
| `/team/my-shifts` | Schedule calendar — own shifts / managed locations |
| `/profile` | Self-service hub — profile, upcoming shifts, time off / sick |
| `/team/time-off` | Leave inbox — approve/reject; cancels overlapping shifts |
| `/organization/departments` | Org vertical + list CRUD |
| `/organization/locations` | Org vertical + manager select + list CRUD |

### Layout

`AppShell` (`src/components/shared/layout/app-shell.tsx`) provides sidebar + header for authenticated routes. Root `AppProviders` mounts `ModalProvider`, `AuthProvider`, `ErrorProvider`, `ModalRoot`, and Sonner. Login lives under `(auth)` without the sidebar.

### Users vertical (reference)

- Forms: `src/features/users/components/forms/`
- Shared schema: `src/lib/schemas/user.ts`
- Server actions: `src/features/users/actions/user-actions.ts`
- Session / RBAC: `src/features/auth/permissions.ts` (`Actions`, `can`) + `session.ts` (`authorize`)

Canonical client submit:

```ts
const data = await run(updateUser(values), { form })
if (data) toast.success("Saved")
```

## Project layout

```
src/
  app/                      Routes (login, home, team, organization, profile, clock)
  components/
    shared/forms/           DynamicForm system
    shared/modals/          Modal stack
    shared/layout/          AppShell, sidebar, header
    shared/table/           DynamicTable
    ui/                     shadcn primitives
  features/
    auth/                   Sessions, RBAC, login actions
    errors/                 Error DTO, boundary, useError (client barrel)
    users/                  Reference vertical (members)
    departments/            Org vertical
    locations/              Org vertical
    logging/                Audit trail (logActivity + activity list)
    shifts/                 Templates, instances, calendar, clock
    profile/                Self-service hub
    time-off/               Leave requests + inbox
  lib/
    schemas/                Shared zod (FieldDefs + server)
    navigation.ts           Sidebar nav
    db.ts / env.ts          Prisma + env helpers

prisma/                     Schema, migrations, seed
Dockerfile                  Production Next + Prisma image
docker-compose.yml          app + Postgres (volume pgdata)
packaging/macos/            Start/Stop app build scripts
scripts/                    Docker entrypoint + seed-once helper
.docs/components/           Human guides
docs/superpowers/specs/     Design specs
.cursor/rules/              Agent rules (glob-scoped)
AGENTS.md                   Agent entrypoint (Next.js + this repo)
```

## Documentation

### Human guides

| Guide | Path |
|-------|------|
| Architecture | [`.docs/components/architecture.md`](.docs/components/architecture.md) |
| Auth / RBAC | [`.docs/components/auth.md`](.docs/components/auth.md) |
| Error handling | [`.docs/components/error-handling.md`](.docs/components/error-handling.md) |
| Forms | [`.docs/components/forms.md`](.docs/components/forms.md) |
| List pages | [`.docs/components/list-pages.md`](.docs/components/list-pages.md) |
| Logging | [`.docs/components/logging.md`](.docs/components/logging.md) |
| Modals | [`.docs/components/modals.md`](.docs/components/modals.md) |
| Tables | [`.docs/components/tables.md`](.docs/components/tables.md) |

Agent instructions: [`AGENTS.md`](AGENTS.md) (also referenced by `CLAUDE.md`). Cursor rules in [`.cursor/rules/`](.cursor/rules/) mirror the guides.

### Design specs

| Spec | Path |
|------|------|
| Table toolbar / members tabs | [`docs/superpowers/specs/2026-07-28-table-toolbar-members-tabs-design.md`](docs/superpowers/specs/2026-07-28-table-toolbar-members-tabs-design.md) |
| Loading skeletons | [`docs/superpowers/specs/2026-08-05-loading-skeletons-design.md`](docs/superpowers/specs/2026-08-05-loading-skeletons-design.md) |
| Profile hub & time off | [`docs/superpowers/specs/2026-08-06-profile-time-off-design.md`](docs/superpowers/specs/2026-08-06-profile-time-off-design.md) |
| Mac Docker launcher | [`docs/superpowers/specs/2026-08-18-mac-docker-launcher-design.md`](docs/superpowers/specs/2026-08-18-mac-docker-launcher-design.md) |

## Notes

- Prefer **pnpm**.
- This Next.js version may differ from training data — see `AGENTS.md` and `node_modules/next/dist/docs/` before inventing APIs.
- Auth uses jose cookie sessions + Prisma; `authorize(Actions.*)` / `can(role, Actions.*)` use the permission matrix and throw/gate with stable `AppError` kinds/codes.
- Generated Prisma client lives under `src/generated/prisma` (gitignored) — run `pnpm db:generate` after install.
- The Docker JWT secret is a fixed demo value in `docker-compose.yml`, not a production secret.
