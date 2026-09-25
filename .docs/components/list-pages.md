# List pages

Feature list CRUD: **hook** (state) + **stateless page view** + form/confirm modals + `useError().run()` + RBAC.

Canonical reference: `src/features/users/`  
- Hook: `hooks/use-user-list-page.tsx`  
- View: `components/pages/user-list-page.tsx`  
- Route: `src/app/(app)/team/members/page.tsx`  

Architecture overview: [Architecture](./architecture.md).

Also under `src/features/*/`: departments, locations, shift-templates, time-off (**[workflow list](./workflow-list-pages.md)**), memberships (admin naming), logging (read-only).

For approve/reject inboxes (status lifecycle, split submit/review surfaces), read [Workflow list pages](./workflow-list-pages.md) — do not force full entity CRUD onto those hooks.

---

## Responsibilities

| Layer | Job |
|-------|-----|
| `app/(app)/…/page.tsx` | Client route: call `useXListPage()`, render `<XListPage {...page} />` + shell class |
| `hooks/use-*-list-page` | Load, modals, delete confirm, reload, `canWrite` / `canRead` |
| `components/pages/*-list-page` | Stateless UI from props |
| `*-table-columns.tsx` | `ColumnConfig` + `toXTableRow` |
| `*-form.tsx` | Thin `DynamicForm` wrapper |
| `*-actions.ts` | Server CRUD + `authorize(Actions.*)` |

---

## Route wiring

```tsx
"use client"

import { TablePageViewport } from "@/components/shared/table"
import { UserListPage } from "@/features/users/components/pages/user-list-page"
import { useUserListPage } from "@/features/users/hooks/use-user-list-page"

export default function TeamMembersPage() {
  const page = useUserListPage()
  return (
    <TablePageViewport>
      <UserListPage {...page} />
    </TablePageViewport>
  )
}
```

Do not fetch or open modals in the route file.

---

## Write gating

```ts
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"

const { me } = useAuth()
const canWrite = me ? can(me.role, Actions.users.write) : false
```

Compute `canWrite` in the **hook**; pass it to the view. Pass Create / Edit / Delete callbacks only when the hook allows writes. Server still enforces via `authorize`.

---

## Table slots (in the view)

```tsx
<DynamicTable
  data={rows}
  columns={userTableColumns}
  toolbarActions={canWrite ? createButton : null}
  rowActions={
    canWrite
      ? ({ row }) => {
          const entity = items.find((i) => i.id === row.id)
          if (!entity) return null
          return (/* Edit + Delete calling onEdit / onDelete */)
        }
      : undefined
  }
/>
```

Do not put action buttons in `ColumnConfig.format` — use `rowActions`.

---

## Form modal (in the hook)

Capture `formId` from `openModal` synchronously. Bridge dirty + submit:

```tsx
let formId = ""
formId = openModal({
  type: "form",
  title: "New member",
  size: "lg",
  component: (
    <UserForm
      onDirtyChange={(d) => setDirty(formId, d)}
      onSubmit={async (values, form) => {
        const data = await run(createUser(values), { form })
        if (data) {
          toast.success("Member created")
          closeModal(formId)
          await load()
        }
      }}
    />
  ),
})
```

Update payloads include `id` from the selected row (`updateUser({ ...values, id })`).

---

## Delete (in the hook)

```ts
const ok = await confirm({
  title: "Delete this member?",
  message: "…",
  variant: "destructive",
  confirmLabel: "Delete",
})
if (!ok) return
const result = await run(deleteUser(id))
if (result) {
  toast.success("Member deleted")
  await load()
}
```

**Removal semantics** (pick the pattern that matches the domain):

| Pattern | When | Examples |
|---------|------|----------|
| Soft-delete | Org-owned entities with `deletedAt` | departments, locations, shift templates (`deletedAt` + often `isActive: false`) |
| Membership status | User stays; org membership ends or pauses | `deleteUser` → membership `INACTIVE`; membership admin activate/deactivate/remove |
| Workflow status | Request/lifecycle records | time-off `CANCELLED` / approve / reject |

List queries for soft-deletable models filter `deletedAt: null`. Do not invent a hard delete for those models. Workflow inboxes: see [Workflow list pages](./workflow-list-pages.md).

---

## Loading and empty states

Handled in the **view** from props the hook provides:

1. `loaded` boolean — until the first `run(listX())` settles, keep page chrome and show [`TableSkeleton`](./tables.md) (not “Loading…” text)
2. Toolbar / Create stay **visible but disabled** while `!loaded`
3. Tabbed pages (Members, Locations): keep header + tab shells during load; active tab body = `TableSkeleton`; counts can show `—` until data arrives
4. After load, empty list still shows Create when `canWrite` (not a dead end)
5. Read-only lists: if `!canRead`, show a permission message; hook skips the list fetch

```tsx
if (!loaded) {
  return (
    <TableSkeleton
      toolbarActions={
        canWrite ? (
          <Button size="sm" disabled>
            <Plus className="mr-2 h-4 w-4" />
            New …
          </Button>
        ) : null
      }
    />
  )
}
```

`DynamicTable` search / filter / sort / page are **client-side** on the full array from `listX()`. Do not add server pagination unless deliberately building that pattern.

---

## Related

| Doc / rule | Role |
|------------|------|
| `.docs/components/architecture.md` | Feature folder + hook/view split |
| `.docs/components/workflow-list-pages.md` | Approve/reject inbox lists |
| `.cursor/rules/list-page-crud.mdc` | Agent rule |
| `.cursor/rules/workflow-list-pages.mdc` | Workflow inbox agent rule |
| `.cursor/rules/feature-architecture.mdc` | Architecture agent rule |
| `.docs/components/tables.md` | DynamicTable API |
| `.docs/components/modals.md` | Form / confirm APIs |
| `.docs/components/auth.md` | `Actions` / `can` |
| `.docs/components/error-handling.md` | `run` / channels |
