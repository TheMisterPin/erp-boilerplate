# DynamicTable

Shared searchable / sortable / filterable / groupable table for ERP list pages.

Implementation: `src/components/shared/table/dynamic-table.tsx`  
Frame: `src/components/shared/table/data-table-frame.tsx` (`DataTableFrame`, `TablePageViewport`)  
Barrel: `@/components/shared/table`  
List wiring: [List pages](./list-pages.md)

---

## Sticky toolbar (required)

The search / filter toolbar must stay fixed while rows scroll. Pagination stays in a fixed footer.

| Piece | Role |
|-------|------|
| `TablePageViewport` | Route wrapper — bounded height under the app header |
| `DataTableFrame` | Shell: sticky toolbar + scrollable body + optional footer |
| `DynamicTable` | Uses `DataTableFrame` internally |

Do **not** wrap `DynamicTable` in an outer `overflow-y-auto` that scrolls the toolbar. Keep a `h-full` → `min-h-0` → `overflow-hidden` flex chain from the viewport to the table.

Default pagination uses `PAGE_SIZE` (`10`) from `@/components/shared/table` / `table-constant.ts`. Column headers stick within the scroll region so sort stays available.

```tsx
import { TablePageViewport, PAGE_SIZE } from "@/components/shared/table"

export default function Page() {
  const page = useUserListPage()
  return (
    <TablePageViewport>
      <UserListPage {...page} />
    </TablePageViewport>
  )
}
```

Empty / loading states should also use `DataTableFrame` so height and chrome stay consistent.

---

## Props

| Prop | Purpose |
|------|---------|
| `data` | `Record<string, unknown>[]` (flattened rows) |
| `columns` | Optional `ColumnConfig[]` (else auto-detect keys) |
| `pageSize` | Default page size |
| `searchable` / `sortable` / `filterable` / `groupable` | Toolbar features |
| `toolbarActions` | Right-side toolbar slot (e.g. Create button) |
| `rowActions` | Per data-row Actions column renderer |

```ts
export type ColumnConfig = {
  key: string
  label: string
  type?: DataType
  format?: (value: unknown) => ReactNode
  sortable?: boolean
}
```

---

## Feature pattern

```tsx
// tables/user-table-columns.tsx
export const userTableColumns: ColumnConfig[] = [ /* … */ ]

export function toUserTableRow(user: User): Record<string, unknown> {
  return {
    id: user.id,
    fullName: user.fullName,
    departmentName: user.departmentName ?? null,
    // …
  }
}
```

```tsx
const rows = useMemo(() => users.map(toUserTableRow), [users])

<DynamicTable
  data={rows}
  columns={userTableColumns}
  toolbarActions={createButton}
  rowActions={({ row }) => {
    const user = users.find((u) => u.id === row.id)
    if (!user) return null
    return (
      <RowActionsMenu label={`Actions for ${user.fullName}`}>
        <RowActionItem
          label="Edit"
          icon={<Pencil className="h-4 w-4" />}
          onClick={() => onEdit(user)}
        />
        <RowActionItem
          label="Delete"
          icon={<Trash2 className="h-4 w-4" />}
          destructive
          onClick={() => void onDelete(user)}
        />
      </RowActionsMenu>
    )
  }}
/>
```

---

## Constraints

- Prefer `toolbarActions` / `rowActions` over action columns in `format`
- Keep domain entities in React state; table rows are a projection
- Soft-deleted rows should not appear (`listX` filters `deletedAt: null`)
- Named exports; no `any` on public column helpers
- Always preserve sticky toolbar / scrollable body (see above)

---

## Related

| File | Role |
|------|------|
| `.cursor/rules/dynamic-table.mdc` | Agent rule |
| `.docs/components/list-pages.md` | Full list CRUD |
