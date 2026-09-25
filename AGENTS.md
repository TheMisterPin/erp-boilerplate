<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ERP Boilerplate — agent guide

ERP UI boilerplate. Prefer existing shared systems over one-off patterns. Human docs: `.docs/components/`. Glob-scoped Cursor rules: `.cursor/rules/`.

**Doc precedence:** [AGENTS.md](AGENTS.md) + `.cursor/rules/` + `.docs/components/` define **architecture and behavior**. [DESIGN.md](DESIGN.md) defines **visual style** (theme, typography, spacing, surfaces) within those patterns. If DESIGN suggests a layout or interaction that AGENTS forbids (detail routes, global search, list-detail shells, drawers as CRUD), follow AGENTS.

## Before you write code

1. Read the relevant guide under `.docs/components/` (and the matching `.cursor/rules/*.mdc` when editing those globs).
2. Mirror the **users** vertical for new features (`src/features/users/`) — see `.docs/components/architecture.md`.
3. Do not invent parallel form, modal, or error pipelines.
4. **Stateless views**: page logic lives in `features/<f>/hooks/`; `app/` routes only inject hook output into the view.
5. For tenant-owned data: read [organization ownership](docs/organization-ownership.md) and plan tenant-isolation tests (`.docs/components/testing.md`).

## Systems (do not reinvent)

| System | Import / path | Docs | Rule |
|--------|---------------|------|------|
| Dynamic forms | `@/components/shared/forms/…` | `.docs/components/forms.md` | `dynamic-forms.mdc` |
| Modals | `@/components/shared/modals` → `useModal()` | `.docs/components/modals.md` | `universal-modals.mdc` |
| Errors (client) | `@/features/errors` → `useError()` | `.docs/components/error-handling.md` | `error-handling.mdc` |
| Errors (server) | `@/features/errors/server` + `dto` | same | same |
| Toasts | `sonner` (`toast`) | error-handling + modals docs | — |
| Shared zod | `src/lib/schemas/<model>.ts` | forms + error-handling | — |
| Auth / RBAC | `permissions.ts` (`Actions`, `can`) + `session.ts` (`authorize`) | `.docs/components/auth.md` | `auth-rbac.mdc` |
| Tenancy / orgs | session `activeOrganizationId` + `organizationId` on models; memberships admin | `docs/organization-ownership.md`, `docs/organization-roles.md`, `.docs/components/testing.md` | `auth-rbac.mdc` |
| DynamicTable | `@/components/shared/table` (`DynamicTable`, `DataTableFrame`, `TablePageViewport`, `TableSkeleton`) | `.docs/components/tables.md` | `dynamic-table.mdc` |
| List-page CRUD | feature hook + `*list-page` view | `.docs/components/list-pages.md` | `list-page-crud.mdc` |
| Feature architecture | `src/features/<f>/` layout | `.docs/components/architecture.md` | `feature-architecture.mdc` |
| Logging / audit | `@/features/logging/server` → `logActivity` | `.docs/components/logging.md` | `logging.mdc` |
| Settings pages | profile (+ future settings hubs) | `.docs/components/settings-pages.md` | `settings-pages.mdc` |
| Dashboards | Command Center / KPI + chart hubs | `.docs/components/dashboards.md` | `dashboards.mdc` |
| Clock (kiosk) | `(auth)/clock` + attendance | `.docs/components/clock-pages.md` | `clock-pages.mdc` |
| Calendar pages | schedule grids (e.g. my-shifts) | `.docs/components/calendar-pages.md` | `calendar-pages.mdc` |
| Testing | `tests/` (+ legacy `scripts/*.test.ts`) | `.docs/components/testing.md` | `testing.mdc` |

## Hard conventions

- **Server actions** always return `ActionResult<T>` via `withErrorBoundary`. Never throw across the wire. Known failures: `throw new AppError({ kind, code, message })`.
- **Client actions** use only `useError().run()` — no try/catch UI in feature components. Form submits: `run(action, { form })` (maps Zod field errors via `applyServerErrors`).
- **RBAC**: server `await authorize(Actions.<feature>.read|write)`; client `can(me.role, Actions.<feature>.write)`. Org-role matrix + catalog in `permissions.ts` (`OrganizationRoleKey`: ADMIN / MANAGER / OPERATOR / VIEWER). Never import `session.ts` from client.
- **Tenancy**: Organizations are the tenant boundary. Scope every tenant-owned query/mutation with `session.activeOrganizationId` (require `organizationId` on models). Reject cross-org relation IDs as not-found. Do not invent a parallel tenant context. Demo: `/organization/memberships`. Details: `docs/organization-ownership.md` / `docs/organization-roles.md`.
- **Auth**: jose cookie sessions + `loginAction` / `logoutAction` / `getMeAction` only. Do not add REST `/api/auth/*` or axios session clients.
- **Forms**: FieldDef arrays + thin `*Form` wrappers around `DynamicForm`. `onSubmit(values, form)`. Shared validators from `src/lib/schemas/`.
- **Modals**: `confirm` / `notify` / `openModal({ type: "form" })`. Transient feedback → toast, not `notify`. Modal package must not import form types.
- **Tables**: `DynamicTable` + `toXTableRow` + `toolbarActions` / `rowActions` (not action cells in `format`). Sticky toolbar / scrollable body via `DataTableFrame` + `TablePageViewport` on list routes — do not invent page-level scroll that moves the search bar. Loading: `TableSkeleton` (toolbar visible, Create/search disabled) — never bare “Loading…” text. Client-side search/filter/sort/pagination only — do not invent server `page`/`cursor` list APIs unless building that system deliberately.
- **List UI only** (CRUD verticals): list + modal. Do not add `[id]` detail routes unless the task asks for them. Non-list surfaces use their own patterns — settings, dashboards, clock, calendar (see Systems table); do not force `TablePageViewport` onto those.
- **Removal semantics**: prefer the matching pattern for the domain — org entities soft-delete (`deletedAt`, often with `isActive: false`); member removal deactivates membership (`INACTIVE`) without deleting the user; workflow records (e.g. time-off) use status transitions. Lists filter out soft-deleted rows (`deletedAt: null`).
- **Layout**: Error Boundary wraps content only inside `AppShell` — leave sidebar/header outside. Providers in `AppProviders` (`ThemeProvider` → Modal → Auth → Error → ModalRoot).
- **Import hygiene**: client may import `@/features/errors` (barrel). Never import `@/features/errors/server` from client code. Same for `@/features/logging` vs `@/features/logging/server`.
- **Audit trail**: server `logActivity({ userId, organizationId, activity, activityData? })` — never raw `prisma.userActivity.create`.
- **Feature layout**: `types` → `actions` → `hooks` (state) → `components/{forms,tables,pages}` (stateless views). Route `page.tsx` = `useXListPage()` + `<XListPage {...page} />`. See `.docs/components/architecture.md`.
- Named exports; strict TypeScript; no `any` on public APIs.

## Do not invent

- Parallel form / modal / error / auth stacks
- Parallel tenancy / “current org” contexts outside the signed session + `activeOrganizationId`
- Detail/show pages or orphan `getX(id)` actions without a route that uses them
- Server-paginated list endpoints “for scale” by default
- Global sidebar search, alternate theme systems, or duplicate providers — extend the existing `ThemeProvider` / shell instead
- REST auth routes alongside server actions

## Canonical snippets

```ts
// Server
export async function updateX(input: unknown): Promise<ActionResult<T>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.users.write)
    return schema.parse(input)
  })
}
```

```ts
// Client
const data = await run(updateX(values), { form })
if (data) toast.success("Saved")
```

## Demos

| Route | What it proves |
|-------|----------------|
| `/` | Command Center — dashboard pattern (KPIs, coverage, approvals, activity) |
| `/login` | Auth gate entry + `SESSION_EXPIRED` acknowledge target |
| `/clock` | Clock kiosk pattern — on-page login, check-in/out, attendance ↔ `UserActivity` |
| `/team/members` | List-page CRUD (forms + modals + `run()`) |
| `/team/activity` | Audit trail list (`logActivity` + ADMIN `logging:read`) |
| `/team/shift-templates` | Shift templates CRUD + generate instances (Admin / location manager) |
| `/team/my-shifts` | Calendar pattern — own shifts (users) / managed locations (managers) |
| `/profile` | Settings pattern — edit profile, upcoming shifts, request time off / sick |
| `/team/time-off` | Leave requests inbox — admin / location manager approve; cancels overlapping shifts |
| `/organization/departments` | Org vertical + list CRUD |
| `/organization/locations` | Org vertical + manager select + list CRUD |
| `/organization/memberships` | Membership admin — add/activate/deactivate/remove + role assign (tenant-scoped) |

## Adding a feature vertical

1. Reproduce `src/features/users/` folder layout (see `.docs/components/architecture.md`)
2. `types/` — model types (include `organizationId` when the model is tenant-owned)
3. `src/lib/schemas/<model>.ts` — shared zod
4. Extend RBAC: `Permission`, `ROLE_PERMISSIONS`, `Actions.<feature>` in `permissions.ts`
5. `actions/*-actions.ts` — `"use server"` + `withErrorBoundary` + `authorize` + scope all reads/writes by `session.activeOrganizationId` + the correct removal pattern for the domain (soft-delete, membership status, or workflow status)
6. `components/forms/*-form-fields.ts` + thin `*Form`
7. `components/tables/*-table-columns.tsx` + `toXTableRow`
8. `hooks/use-*-list-page.tsx` — page state, modals, `run()`
9. `components/pages/*-list-page.tsx` — **stateless** view + props type; `!loaded` → `TableSkeleton` (toolbar visible, actions disabled)
10. Route `src/app/(app)/…/page.tsx` — `const page = useX…(); return <TablePageViewport><XListPage {...page} /></TablePageViewport>` + nav entry
11. Call `logActivity` from privileged mutations when warranted (extend `Activity` enum first if needed; always pass `organizationId`)
12. Extend `tests/integration/tenant-isolation.integration.test.ts` in the same PR (list/enumeration, one foreign mutation, every cross-org relation id) — see `.docs/components/testing.md`
13. Update `.docs` / rules only when conventions change

Auth uses jose cookie sessions (`src/features/auth/utils.ts`) + Prisma users. Guards live in `src/features/auth/session.ts` and throw `AppError` with stable kinds/codes so the client channel table stays stable.
