# Feature architecture

How feature verticals are structured and how route pages stay thin. Canonical reference: **`src/features/users/`**.

Related: [List pages](./list-pages.md), [Forms](./forms.md), [Auth](./auth.md), [Logging](./logging.md).

---

## Separation of concerns

| Layer | Owns | Does not own |
|-------|------|----------------|
| `src/app/(app)/…/page.tsx` | Layout shell + **wire hook → view** | Business logic, fetch, modals |
| `features/<f>/hooks/` | State, effects, `run()`, modals, RBAC gates | JSX layout (beyond modal form trees) |
| `features/<f>/components/` | Stateless UI from props (`TableSkeleton` / page skeletons while `!loaded`) | `useState` / data fetching for the page |
| `features/<f>/actions/` | Server mutations/queries + `authorize` | UI |
| `src/components/shared/` | Cross-feature systems (forms, modals, table) | Feature domain rules |

```tsx
// ✅ route page — inject state
"use client"

import { UserListPage } from "@/features/users/components/pages/user-list-page"
import { useUserListPage } from "@/features/users/hooks/use-user-list-page"

export default function TeamMembersPage() {
  const page = useUserListPage()
  return (
    <div className="/* table shell wrapper */">
      <UserListPage {...page} />
    </div>
  )
}
```

```tsx
// ❌ do not put list fetch / modal CRUD inside the route or a fat “page component”
export default function TeamMembersPage() {
  const [users, setUsers] = useState([])
  useEffect(() => { /* … */ }, [])
  return <DynamicTable … />
}
```

**Stateless view** = props in, UI out. Handlers (`onCreate`, `onEdit`, …) come from the hook. Local UI-only concerns (e.g. deriving a toolbar button from `canWrite` + `onCreate`) may live in the view.

**Form wrappers** (`*Form`) may load select options via `run(listX())` — that is form-shell data, not page orchestration. Prefer builders + static `FieldDef.options` after load (see forms docs).

---

## Feature folder map (`users` example)

```
src/features/users/
  types/
    user-types.ts              Domain + form value types
  actions/
    user-actions.ts            "use server" — list/create/update/delete + authorize
  hooks/
    use-user-list-page.tsx     Page orchestration (state + modals + run)
  components/
    forms/
      user-form-fields.ts      FieldDef builders (pure)
      user-form.tsx            Thin DynamicForm wrapper (+ option load)
      index.ts
    tables/
      user-table-columns.tsx   ColumnConfig + toUserTableRow
    pages/
      user-list-page.tsx       Stateless list view + UserListPageProps
    index.ts                   Re-exports forms (optional)
  index.ts                     Client-safe public types / form exports
```

| Subfolder / file | What goes here |
|------------------|----------------|
| `types/` | Model types, form value types. No React. |
| `actions/` | Server actions returning `ActionResult<T>`. `withErrorBoundary` + `authorize`. Soft-delete. Call `logActivity` when auditing. |
| `hooks/` | Client hooks that own page/feature state. Name: `use-<thing>-page.ts(x)`. Return the view’s props object. Use `.tsx` if the hook opens modal trees with JSX. |
| `components/forms/` | `*-form-fields.ts` (FieldDefs) + thin `*Form` around `DynamicForm`. |
| `components/tables/` | `*TableColumns` + `toXTableRow`. No actions in `format`. |
| `components/pages/` | Stateless page views. Export `XListPageProps` + `XListPage`. |
| `index.ts` | Client-safe barrel only — never re-export `actions/` or server modules. |

Shared zod lives in `src/lib/schemas/<model>.ts` (FieldDefs + server parse), not under the feature.

---

## Adding a new vertical (reproduce `users`)

1. Copy the folder shape from `src/features/users/` (types → actions → hooks → components).
2. Add shared zod in `src/lib/schemas/<model>.ts`.
3. Extend RBAC in `permissions.ts` (`Permission`, `ROLE_PERMISSIONS`, `Actions.<feature>`).
4. Implement `actions/*-actions.ts`.
5. Implement form fields + `*Form`, table columns + `toXTableRow`.
6. Implement `hooks/use-<feature>-list-page.tsx` (logic) and `components/pages/<feature>-list-page.tsx` (view).
7. Add route: `src/app/(app)/…/page.tsx` that calls the hook and renders `<XListPage {...page} />`.
8. Register nav in `src/lib/navigation.ts`.
9. Audit events: `logActivity` + extend `Activity` enum when needed.
10. Update `.docs` / rules only when the convention itself changes.

Read-only lists (e.g. logging) skip forms/modals but still use **hook + stateless page**.

---

## Constraints

- Named exports; no `any` on public APIs.
- Route pages must not import `@/features/*/actions` directly for orchestration — go through the feature hook (views stay free of actions too).
- Never import `@/features/errors/server` or `@/features/logging/server` from client hooks/views.
- Do not invent a second layout or state library for feature pages.

---

## Related

| File | Role |
|------|------|
| `.cursor/rules/feature-architecture.mdc` | Agent rule |
| `.docs/components/list-pages.md` | List CRUD details |
| `src/features/users/` | Canonical vertical |
