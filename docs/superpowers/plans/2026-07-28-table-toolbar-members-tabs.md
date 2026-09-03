# Table toolbar + Members tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put DynamicTable search + Create on one row with Filters/Group/Clear in a shared `⋯` menu, and convert `/team/members` to Locations-style tabs.

**Architecture:** Change `.table-toolbar` to a horizontal flex row. Refactor `DynamicTable` toolbar so Filters (dialog) and Group by (popover) use controlled `open` state triggered from `RowActionsMenu` / `RowActionItem`, with Create remaining in `toolbarActions`. Rewrite `UserListPage` to mirror `LocationListPage` tabs.

**Tech Stack:** Next.js App Router, React client components, shadcn Dialog/Popover, existing `RowActionsMenu`, Tailwind / `globals.css` table utilities.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-28-table-toolbar-members-tabs-design.md`
- Reuse `RowActionsMenu` / `RowActionItem` — do not invent a parallel overflow menu
- Create stays outside the `⋯` menu (`toolbarActions`)
- Do not invent parallel form/modal/error stacks
- Named exports; no `any` on public APIs
- Do **not** `git commit` unless the user explicitly asks (repo user rule overrides plan commit steps — mark commits skipped)

---

## File map

| File | Responsibility |
|------|----------------|
| `src/app/globals.css` | `.table-toolbar` single-row layout |
| `src/components/shared/table/dynamic-table.tsx` | Toolbar composition + controlled filter/group UI |
| `src/features/users/components/pages/user-list-page.tsx` | Members tabs UI |
| `.docs/components/tables.md` | Document toolbar `⋯` for secondary actions |
| `.cursor/rules/dynamic-table.mdc` | Same note for agents |

No new files.

---

### Task 1: Single-row toolbar CSS

**Files:**
- Modify: `src/app/globals.css` (`.table-toolbar` block ~324–329)

**Interfaces:**
- Consumes: existing `.table-toolbar` class used by `DataTableFrame`
- Produces: horizontal toolbar row so search + actions sit on one line

- [ ] **Step 1: Update `.table-toolbar`**

Replace:

```css
.table-toolbar {
  @apply sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b px-4 py-3;
  background-color: var(--table-toolbar);
  color: var(--table-toolbar-foreground);
  border-color: var(--table-toolbar-border);
}
```

with:

```css
.table-toolbar {
  @apply sticky top-0 z-20 flex shrink-0 flex-row flex-wrap items-center gap-2 border-b px-4 py-3;
  background-color: var(--table-toolbar);
  color: var(--table-toolbar-foreground);
  border-color: var(--table-toolbar-border);
}
```

(`flex-wrap` is only a narrow-viewport fallback; primary layout is one row.)

- [ ] **Step 2: Visual check**

Open any list page (e.g. `/organization/departments`). Confirm the toolbar no longer forces search above buttons purely from CSS (full one-line behavior completes in Task 2).

- [ ] **Step 3: Commit** — skip unless user asks

---

### Task 2: DynamicTable toolbar `⋯` menu

**Files:**
- Modify: `src/components/shared/table/dynamic-table.tsx`

**Interfaces:**
- Consumes: `RowActionsMenu`, `RowActionItem` from `@/components/shared/table/row-actions-menu` (or relative `./row-actions-menu`); existing filter dialog body; existing group popover body
- Produces: Toolbar layout `[search | ⋯ | toolbarActions]` with controlled `filterDialogOpen` / `groupPopoverOpen`

- [ ] **Step 1: Add imports and open-state**

Near the top of `dynamic-table.tsx`:

1. Import `RowActionItem`, `RowActionsMenu` from `./row-actions-menu` (same package as `DataTableFrame`).
2. Keep `Dialog` / `Popover` imports; **remove** unused `DialogTrigger` / `PopoverTrigger` if no longer referenced after the refactor.
3. Inside `DynamicTable`, after existing state hooks, add:

```tsx
const [filterDialogOpen, setFilterDialogOpen] = useState(false)
const [groupPopoverOpen, setGroupPopoverOpen] = useState(false)
```

4. Derive clearable flag (same condition as today’s Clear button):

```tsx
const hasClearableState =
  appliedTags.length > 0 || !!groupByField || !!searchQuery
```

5. Derive whether the toolbar menu should render:

```tsx
const showToolbarMenu = filterable || groupable || hasClearableState
```

- [ ] **Step 2: Replace toolbar JSX**

Replace the current `toolbar={<>…</>}` content (search block + the `div.flex.flex-wrap` of Filters / Group / Clear / `toolbarActions`) with this structure:

```tsx
toolbar={
  <>
    {searchable ? (
      <div className="relative min-w-0 flex-1">
        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="table-toolbar-search">
          {/* keep existing appliedTags / groupByField / searchQuery badges + Input unchanged */}
        </div>
      </div>
    ) : (
      <div className="min-w-0 flex-1" />
    )}

    <div className="flex shrink-0 items-center gap-2">
      {showToolbarMenu ? (
        <RowActionsMenu label="Table tools">
          {filterable ? (
            <RowActionItem
              label="Filters"
              icon={<Filter className="h-4 w-4" />}
              onClick={() => setFilterDialogOpen(true)}
            />
          ) : null}
          {groupable ? (
            <RowActionItem
              label="Group by"
              icon={<Group className="h-4 w-4" />}
              onClick={() => setGroupPopoverOpen(true)}
            />
          ) : null}
          {hasClearableState ? (
            <RowActionItem
              label="Clear all filters"
              icon={<X className="h-4 w-4" />}
              onClick={() => {
                setFilterState({ logicOperator: "AND", rules: [] })
                setActiveFilters({ logicOperator: "AND", rules: [] })
                setAppliedTags([])
                setGroupByField(null)
                setSearchQuery("")
              }}
            />
          ) : null}
        </RowActionsMenu>
      ) : null}

      {toolbarActions}

      {/* Controlled Filter dialog — DialogTrigger removed; open via state */}
      {filterable ? (
        <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
          <DialogContent className="sm:max-w-150">
            {/* keep existing DialogHeader / filter rules UI / DialogFooter unchanged;
                Clear + Apply buttons should still call existing handlers;
                after successful Apply, optionally setFilterDialogOpen(false) */}
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Controlled Group popover — anchor near the menu; PopoverTrigger removed */}
      {groupable ? (
        <Popover open={groupPopoverOpen} onOpenChange={setGroupPopoverOpen}>
          <PopoverContent className="w-50 p-0" align="end">
            {/* keep existing column list + Clear grouping UI;
                on column select, keep setGroupByField behavior;
                optionally setGroupPopoverOpen(false) after pick/clear */}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  </>
}
```

**Important details:**

- Move the **entire** existing filter dialog body (AND/OR, rules, Clear/Apply) into the controlled `Dialog` — do not delete filter logic.
- Move the **entire** existing group-by popover body into the controlled `Popover`.
- Because there is no `PopoverTrigger`, Radix may need an invisible anchor. If the popover does not position correctly without a trigger, wrap a zero-size anchor next to the menu:

```tsx
<Popover open={groupPopoverOpen} onOpenChange={setGroupPopoverOpen}>
  <PopoverTrigger asChild>
    <span className="sr-only" aria-hidden />
  </PopoverTrigger>
  <PopoverContent …>…</PopoverContent>
</Popover>
```

Prefer keeping a visually hidden `PopoverTrigger` only if positioning breaks; otherwise controlled content-only is fine if Radix version supports it. Verify in the browser.

- After Apply filters (`applyFilter`), call `setFilterDialogOpen(false)`.
- Remove the old always-visible Filters / Group by / Clear buttons and the old `DialogTrigger` / `PopoverTrigger` wrappers.

- [ ] **Step 3: Typecheck / lint**

Run:

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Expected: no new errors in `dynamic-table.tsx`.

- [ ] **Step 4: Manual UI check**

On `/organization/departments` (or `/team/shift-templates`):

1. Search, `⋯`, and Create are on one line.
2. `⋯` → Filters opens advanced filter dialog; Apply still works.
3. `⋯` → Group by opens group UI; grouping still works.
4. With search/filter/group active, Clear appears in `⋯` and resets state.
5. Row `⋯` menus still work.

- [ ] **Step 5: Commit** — skip unless user asks

---

### Task 3: Members page → tabs

**Files:**
- Modify: `src/features/users/components/pages/user-list-page.tsx`

**Interfaces:**
- Consumes: same props as today (`UserListPageProps`); pattern from `src/features/locations/components/pages/location-list-page.tsx`
- Produces: tabbed assigned / unassigned members lists

- [ ] **Step 1: Rewrite page to match Locations**

Replace stacked `UserSection` layout with tabs. Target structure (adapt names/copy; keep existing row-action handlers):

```tsx
"use client"

import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"

import {
  DataTableFrame,
  DynamicTable,
  RowActionItem,
  RowActionsMenu,
} from "@/components/shared/table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  toUserTableRow,
  userTableColumns,
} from "@/features/users/components/tables/user-table-columns"
import type { User } from "@/features/users/types/user-types"

export type UserListPageProps = {
  loaded: boolean
  users: User[]
  rows: ReturnType<typeof toUserTableRow>[]
  canWrite: boolean
  canAssignLocation: boolean
  onCreate: () => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onAssignLocation: (user: User) => void
}

type UserTabPanelProps = {
  emptyMessage: string
  users: User[]
  canWrite: boolean
  canAssignLocation: boolean
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onAssignLocation: (user: User) => void
}

function UserTabPanel({
  emptyMessage,
  users,
  canWrite,
  canAssignLocation,
  onEdit,
  onDelete,
  onAssignLocation,
}: UserTabPanelProps) {
  const showActions = canWrite || canAssignLocation

  if (users.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-6">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DynamicTable
        data={users.map(toUserTableRow)}
        columns={userTableColumns}
        searchable
        sortable
        filterable
        rowActions={
          showActions
            ? ({ row }) => {
                const user = users.find((item) => item.id === row.id)
                if (!user) return null
                return (
                  <RowActionsMenu label={`Actions for ${user.fullName}`}>
                    {canAssignLocation ? (
                      <RowActionItem
                        label="Assign location"
                        icon={<MapPin className="h-4 w-4" />}
                        onClick={() => onAssignLocation(user)}
                      />
                    ) : null}
                    {canWrite ? (
                      <RowActionItem
                        label="Edit"
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => onEdit(user)}
                      />
                    ) : null}
                    {canWrite ? (
                      <RowActionItem
                        label="Delete"
                        icon={<Trash2 className="h-4 w-4" />}
                        destructive
                        onClick={() => void onDelete(user)}
                      />
                    ) : null}
                  </RowActionsMenu>
                )
              }
            : undefined
        }
      />
    </div>
  )
}

export function UserListPage({
  loaded,
  users,
  canWrite,
  canAssignLocation,
  onCreate,
  onEdit,
  onDelete,
  onAssignLocation,
}: UserListPageProps) {
  const createButton = canWrite ? (
    <Button size="sm" onClick={onCreate}>
      <Plus className="mr-2 h-4 w-4" />
      New member
    </Button>
  ) : null

  if (!loaded) {
    return (
      <DataTableFrame>
        <p className="text-sm text-muted-foreground">Loading members…</p>
      </DataTableFrame>
    )
  }

  const withLocation = users.filter((user) => !!user.locationId)
  const withoutLocation = users.filter((user) => !user.locationId)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            Staff by location assignment.
          </p>
        </div>
        {createButton}
      </header>

      {users.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <Tabs
          defaultValue="with-location"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-4"
        >
          <TabsList className="mb-3 w-fit shrink-0 self-start">
            <TabsTrigger value="with-location">
              Assigned to a location ({withLocation.length})
            </TabsTrigger>
            <TabsTrigger value="without-location">
              Without a location ({withoutLocation.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="with-location"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <UserTabPanel
              emptyMessage="No members are assigned to a location yet."
              users={withLocation}
              canWrite={canWrite}
              canAssignLocation={canAssignLocation}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssignLocation={onAssignLocation}
            />
          </TabsContent>

          <TabsContent
            value="without-location"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <UserTabPanel
              emptyMessage="Every member has a location."
              users={withoutLocation}
              canWrite={canWrite}
              canAssignLocation={canAssignLocation}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssignLocation={onAssignLocation}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
```

Remove the old `UserSection` component entirely.

Note: Members tables keep `filterable` but not `groupable` (current `UserSection` behavior) — do not enable `groupable` unless Locations also does for those tabs (Locations does not).

- [ ] **Step 2: Manual UI check**

Open `/team/members`:

1. Tabs switch between assigned / unassigned; only one table visible.
2. Counts update with list size.
3. Create in header still works; row actions still work.
4. Empty tab shows dashed empty state.

- [ ] **Step 3: Commit** — skip unless user asks

---

### Task 4: Docs / agent rule

**Files:**
- Modify: `.docs/components/tables.md`
- Modify: `.cursor/rules/dynamic-table.mdc`

**Interfaces:**
- Consumes: Task 2 toolbar behavior
- Produces: docs that match implementation

- [ ] **Step 1: Update tables.md**

In the Props table / Constraints, add a short note:

- Toolbar secondary controls (Filters, Group by, Clear) render inside `RowActionsMenu` (`⋯`); `toolbarActions` (Create) stays visible on the same row as search.

Update the Sticky toolbar section if it implies Filters are always visible buttons.

- [ ] **Step 2: Update dynamic-table.mdc**

After the `toolbarActions` / `rowActions` bullet, add:

- Toolbar: search + `toolbarActions` on one row; Filters / Group by / Clear live in a toolbar `RowActionsMenu` (`⋯`), not as separate always-visible buttons.

- [ ] **Step 3: Commit** — skip unless user asks

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| One-line search + actions | 1 + 2 |
| Filters / Group / Clear in `⋯` | 2 |
| Create outside menu | 2 |
| Controlled dialog/popover | 2 |
| Members tabs like Locations | 3 |
| Docs note | 4 |
| No new overflow component | 2 (reuse) |

Placeholder scan: none. Types: `UserListPageProps` unchanged; toolbar uses existing filter/group state.
