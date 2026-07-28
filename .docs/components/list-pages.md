# List pages

Feature list CRUD: **hook** (state) + **stateless page view** + form/confirm modals + `useError().run()` + RBAC.

Canonical reference: `src/features/users/`  
- Hook: `hooks/use-user-list-page.tsx`  
- View: `components/pages/user-list-page.tsx`  
- Route: `src/app/(app)/team/members/page.tsx`  

Architecture overview: [Architecture](./architecture.md).

Also: departments, locations, logging (read-only) under `src/features/*/`.

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

Soft-delete is the server convention (`deletedAt` + `isActive: false`).

---

## Loading and empty states

Handled in the **view** from props the hook provides:

1. `loaded` boolean — show “Loading…” until the first `run(listX())` settles
2. After load, empty list still shows Create when `canWrite` (not a dead end)
3. Read-only lists: if `!canRead`, show a permission message; hook skips the list fetch

`DynamicTable` search / filter / sort / page are **client-side** on the full array from `listX()`. Do not add server pagination unless deliberately building that pattern.

---

## Related

| Doc / rule | Role |
|------------|------|
| `.docs/components/architecture.md` | Feature folder + hook/view split |
| `.cursor/rules/list-page-crud.mdc` | Agent rule |
| `.cursor/rules/feature-architecture.mdc` | Architecture agent rule |
| `.docs/components/tables.md` | DynamicTable API |
| `.docs/components/modals.md` | Form / confirm APIs |
| `.docs/components/auth.md` | `Actions` / `can` |
| `.docs/components/error-handling.md` | `run` / channels |
