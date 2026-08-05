# DynamicTable

Shared searchable / sortable / filterable / groupable table for ERP list pages.

Implementation: `src/components/shared/table/dynamic-table.tsx`  
Frame: `src/components/shared/table/data-table-frame.tsx` (`DataTableFrame`, `TablePageViewport`)  
Barrel: `@/components/shared/table`  
List wiring: [List pages](./list-pages.md)

---

## Sticky toolbar (required)

The toolbar (search, table tools menu, and primary actions) must stay fixed while rows scroll. Pagination stays in a fixed footer.

Toolbar layout is a single row: search grows on the left; secondary controls (Filters, Group by, Clear all filters) live in a toolbar `RowActionsMenu` (`⋯`); `toolbarActions` (e.g. Create) stays visible on the same row—not inside the menu.

| Piece | Role |
|-------|------|
| `TablePageViewport` | Route wrapper — bounded height under the app header |
| `DataTableFrame` | Shell: sticky toolbar + scrollable body + optional footer |
| `DynamicTable` | Uses `DataTableFrame` internally |

Do **not** wrap `DynamicTable` in an outer `overflow-y-auto` that scrolls the toolbar. `AppShell` locks the main content slot (`overflow-hidden`). Keep a `h-full` → `min-h-0` → `overflow-hidden` flex chain from `TablePageViewport` to the table so only `.table-surface` scrolls.

Default pagination uses `PAGE_SIZE` (`10`) from `@/components/shared/table` / `table-constant.ts`. The footer stays pinned under the scroll region: results summary on the left, page controls on the right (hidden when there is only one page). Column headers stick within the scroll region so sort stays available.

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

### Loading skeleton (required)

Use shared `TableSkeleton` from `@/components/shared/table` while `!loaded`. It renders real toolbar chrome (disabled search + optional tools `⋯` + `toolbarActions`) and skeleton rows/footer — not placeholder text.

```tsx
import { TableSkeleton } from "@/components/shared/table"

if (!loaded) {
  return <TableSkeleton toolbarActions={disabledCreateButton} />
}
```

| Prop | Purpose |
|------|---------|
| `toolbarActions` | Right-side slot (pass Create **disabled** until loaded) |
| `rowCount` | Skeleton rows (default `PAGE_SIZE`) |
| `showToolsMenu` | Disabled `⋯` affordance (default `true`) |

Do not early-return a text-only `DataTableFrame` body that drops the search toolbar.

---

## Props

| Prop | Purpose |
|------|---------|
| `data` | `Record<string, unknown>[]` (flattened rows) |
| `columns` | Optional `ColumnConfig[]` (else auto-detect keys) |
| `pageSize` | Fixed page size (default `PAGE_SIZE`) |
| `searchable` / `sortable` / `filterable` / `groupable` | Toolbar features (`filterable` / `groupable` expose Filters / Group by via the toolbar `⋯` menu, not as always-visible buttons) |
| `toolbarActions` | Right-side toolbar slot (e.g. Create button)—always visible on the search row, outside the `⋯` menu |
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

- Toolbar secondary controls (Filters, Group by, Clear all filters) render inside the toolbar `RowActionsMenu` (`⋯`); `toolbarActions` (Create) stays visible on the same row as search
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
