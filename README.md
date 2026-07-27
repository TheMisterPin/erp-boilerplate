# Components Playground

Next.js (App Router) ERP boilerplate / component playground. Shared UI systems live under `src/components/shared`; feature verticals under `src/features`. Auth uses jose cookie sessions + Prisma; middleware requires login for all app routes.

## Stack

- **Next.js 15** App Router + TypeScript
- **shadcn/ui** + Tailwind
- **react-hook-form** + **zod**
- **Prisma** + PostgreSQL
- **sonner** toasts
- Package manager: **pnpm**

## Getting started

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

Seeded by `pnpm db:seed`:

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
| Start | `pnpm start` |
| Generate Prisma client | `pnpm db:generate` |
| Migrate DB | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` |

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
  app/                      Routes (login, home, team, organization)
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
  lib/
    schemas/                Shared zod (FieldDefs + server)
    navigation.ts           Sidebar nav
    db.ts / env.ts          Prisma + env helpers

prisma/                     Schema, migrations, seed
.docs/components/           Human guides
.cursor/rules/              Agent rules (glob-scoped)
AGENTS.md                   Agent entrypoint (Next.js + this repo)
```

## Documentation

Human guides live in **`.docs/components/`**. Cursor rules in **`.cursor/rules/`** mirror those conventions for agents. Start with:

1. [Forms](.docs/components/forms.md)
2. [Modals](.docs/components/modals.md)
3. [Error handling](.docs/components/error-handling.md)

Agent instructions: [`AGENTS.md`](AGENTS.md) (also referenced by `CLAUDE.md`).

## Notes

- Prefer **pnpm**.
- This Next.js version may differ from training data — see `AGENTS.md` and `node_modules/next/dist/docs/` before inventing APIs.
- Auth uses jose cookie sessions + Prisma; `authorize(Actions.*)` / `can(role, Actions.*)` use the permission matrix and throw/gate with stable `AppError` kinds/codes.
- Generated Prisma client lives under `src/generated/prisma` (gitignored) — run `pnpm db:generate` after install.
