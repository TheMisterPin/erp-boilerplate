<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Components Playground — agent guide

ERP UI boilerplate. Prefer existing shared systems over one-off patterns. Human docs: `.docs/components/`. Glob-scoped Cursor rules: `.cursor/rules/`.

## Before you write code

1. Read the relevant guide under `.docs/components/` (and the matching `.cursor/rules/*.mdc` when editing those globs).
2. Mirror the **users** vertical for new features (`src/features/users/`) — see `.docs/components/architecture.md`.
3. Do not invent parallel form, modal, or error pipelines.
4. **Stateless views**: page logic lives in `features/<f>/hooks/`; `app/` routes only inject hook output into the view.

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
| DynamicTable | `@/components/shared/table` (`DynamicTable`, `DataTableFrame`, `TablePageViewport`, `TableSkeleton`) | `.docs/components/tables.md` | `dynamic-table.mdc` |
| List-page CRUD | feature hook + `*list-page` view | `.docs/components/list-pages.md` | `list-page-crud.mdc` |
| Feature architecture | `src/features/<f>/` layout | `.docs/components/architecture.md` | `feature-architecture.mdc` |
| Logging / audit | `@/features/logging/server` → `logActivity` | `.docs/components/logging.md` | `logging.mdc` |

## Hard conventions

- **Server actions** always return `ActionResult<T>` via `withErrorBoundary`. Never throw across the wire. Known failures: `throw new AppError({ kind, code, message })`.
- **Client actions** use only `useError().run()` — no try/catch UI in feature components. Form submits: `run(action, { form })` (maps Zod field errors via `applyServerErrors`).
- **RBAC**: server `await authorize(Actions.<feature>.read|write)`; client `can(me.role, Actions.<feature>.write)`. Matrix + catalog in `permissions.ts`. Never import `session.ts` from client.
- **Auth**: jose cookie sessions + `loginAction` / `logoutAction` / `getMeAction` only. Do not add REST `/api/auth/*` or axios session clients.
- **Forms**: FieldDef arrays + thin `*Form` wrappers around `DynamicForm`. `onSubmit(values, form)`. Shared validators from `src/lib/schemas/`.
- **Modals**: `confirm` / `notify` / `openModal({ type: "form" })`. Transient feedback → toast, not `notify`. Modal package must not import form types.
- **Tables**: `DynamicTable` + `toXTableRow` + `toolbarActions` / `rowActions` (not action cells in `format`). Sticky toolbar / scrollable body via `DataTableFrame` + `TablePageViewport` on list routes — do not invent page-level scroll that moves the search bar. Loading: `TableSkeleton` (toolbar visible, Create/search disabled) — never bare “Loading…” text. Client-side search/filter/sort/pagination only — do not invent server `page`/`cursor` list APIs unless building that system deliberately.
- **List UI only**: verticals are list + modal CRUD. Do not add `[id]` detail routes unless the task asks for them.
- **Layout**: Error Boundary wraps content only inside `AppShell` — leave sidebar/header outside. Providers in `AppProviders` (Modal → Auth → Error → ModalRoot).
- **Import hygiene**: client may import `@/features/errors` (barrel). Never import `@/features/errors/server` from client code. Same for `@/features/logging` vs `@/features/logging/server`.
- **Audit trail**: server `logActivity({ userId, activity, activityData? })` — never raw `prisma.userActivity.create`.
- **Feature layout**: `types` → `actions` → `hooks` (state) → `components/{forms,tables,pages}` (stateless views). Route `page.tsx` = `useXListPage()` + `<XListPage {...page} />`. See `.docs/components/architecture.md`.
- Named exports; strict TypeScript; no `any` on public APIs.

## Do not invent

- Parallel form / modal / error / auth stacks
- Detail/show pages or orphan `getX(id)` actions without a route that uses them
- Server-paginated list endpoints “for scale” by default
- Global sidebar search or theme providers unless productizing them
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
| `/` | Home landing — links to list CRUD + activity demos |
| `/login` | Auth gate entry + `SESSION_EXPIRED` acknowledge target |
| `/clock` | Kiosk time clock — on-page login, check-in/out, attendance ↔ `UserActivity` |
| `/team/members` | List-page CRUD (forms + modals + `run()`) |
| `/team/activity` | Audit trail list (`logActivity` + ADMIN `logging:read`) |
| `/team/shift-templates` | Shift templates CRUD + generate instances (Admin / location manager) |
| `/team/my-shifts` | Schedule calendar — own shifts (users) / managed locations (managers) |
| `/profile` | Self-service hub — edit profile, upcoming shifts, request time off / sick |
| `/team/time-off` | Leave requests inbox — admin / location manager approve; cancels overlapping shifts |
| `/organization/departments` | Org vertical + list CRUD |
| `/organization/locations` | Org vertical + manager select + list CRUD |

## Adding a feature vertical

1. Reproduce `src/features/users/` folder layout (see `.docs/components/architecture.md`)
2. `types/` — model types
3. `src/lib/schemas/<model>.ts` — shared zod
4. Extend RBAC: `Permission`, `ROLE_PERMISSIONS`, `Actions.<feature>` in `permissions.ts`
5. `actions/*-actions.ts` — `"use server"` + `withErrorBoundary` + `authorize` + soft-delete (`deletedAt`)
6. `components/forms/*-form-fields.ts` + thin `*Form`
7. `components/tables/*-table-columns.tsx` + `toXTableRow`
8. `hooks/use-*-list-page.tsx` — page state, modals, `run()`
9. `components/pages/*-list-page.tsx` — **stateless** view + props type; `!loaded` → `TableSkeleton` (toolbar visible, actions disabled)
10. Route `src/app/(app)/…/page.tsx` — `const page = useX…(); return <XListPage {...page} />` + nav entry
11. Call `logActivity` from privileged mutations when warranted (extend `Activity` enum first if needed)
12. Update `.docs` / rules only when conventions change

Auth uses jose cookie sessions (`src/features/auth/utils.ts`) + Prisma users. Guards live in `src/features/auth/session.ts` and throw `AppError` with stable kinds/codes so the client channel table stays stable.
