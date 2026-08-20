# Table toolbar + Members tabs — design

**Date:** 2026-07-28  
**Status:** Approved approach A (pending user review of this spec)

## Goal

1. Put the DynamicTable search bar and primary actions on **one line**.
2. Move secondary toolbar controls into the shared **`RowActionsMenu`** (`⋯` + popover).
3. Align `/team/members` with `/organization/locations`: **tabs**, not two stacked section tables.

## Decisions

| Topic | Choice |
|-------|--------|
| Toolbar layout | Single horizontal row |
| Secondary actions | Filters, Group by, Clear filters → `RowActionsMenu` |
| Primary Create | Stays visible as `toolbarActions` (not in `⋯`) |
| Members grouping UI | Tabs mirroring Locations (`with-location` / `without-location`) |
| Row actions | Unchanged (`RowActionsMenu` already used) |

## Scope

### In

- `DynamicTable` toolbar markup + `.table-toolbar` CSS (shared; affects all list tables)
- `UserListPage` → Locations-style tabs

### Out

- New overflow/menu components (reuse `RowActionsMenu` / `RowActionItem`)
- Changing Locations, Departments, Shift templates page chrome beyond the shared toolbar
- Calendar / schedule UI
- Server APIs or RBAC

## Design

### 1. Shared toolbar (`DynamicTable` + CSS)

**Layout (left → right):**

1. Search field (flex-grow) — existing badges for applied filters / group / search stay inside the search chrome
2. `RowActionsMenu` when any of `filterable`, `groupable`, or “clearable” state applies
3. `toolbarActions` (e.g. New member / New department) — always outside the menu

**CSS:** `.table-toolbar` changes from `flex-col` to a single row (`flex-row items-center`, search grows, actions shrink-0). Avoid wrapping on typical desktop widths; allow wrap only as a last resort on very narrow viewports if needed.

**Menu items (when enabled):**

| Item | Behavior |
|------|----------|
| Filters | Opens the existing advanced-filter **dialog** (same content as today) |
| Group by | Opens the existing group-by **popover** (same column list as today) |
| Clear all filters | Same clear handler as today; only shown when filters/group/search are active |

Implementation note: dialog/popover open state is controlled from menu item clicks (do not rely on nesting `DialogTrigger` / `PopoverTrigger` inside the actions menu in a way that fights popover close). Prefer controlled `open` state for Filter dialog and Group popover, triggered by `RowActionItem` `onClick`.

### 2. Members page (`UserListPage`)

Mirror `LocationListPage`:

- Page header (title + subtitle + Create) unchanged
- `Tabs` with:
  - **Assigned to a location** (`with-location`) + count
  - **Without a location** (`without-location`) + count
- Each `TabsContent` hosts one `DynamicTable` (or empty dashed state) via a small panel helper like `LocationTabPanel`
- Remove stacked `UserSection` dual-table layout
- Sticky toolbar / scroll rules unchanged (`TablePageViewport` + `DataTableFrame` chain)

## Files (expected)

| File | Change |
|------|--------|
| `src/app/globals.css` | `.table-toolbar` → single-row layout |
| `src/components/shared/table/dynamic-table.tsx` | Toolbar composition + controlled filter/group UI from `RowActionsMenu` |
| `src/features/users/components/pages/user-list-page.tsx` | Sections → tabs like locations |
| `.docs/components/tables.md` / `dynamic-table.mdc` | Brief note on toolbar `⋯` for secondary actions (only if docs already describe toolbar buttons) |

## Success criteria

- On any DynamicTable list: search, `⋯`, and Create appear on one line; Filters / Group / Clear are only reachable via `⋯`.
- `/team/members` switches between assigned / unassigned via tabs; only one table body visible at a time.
- Row `⋯` menus and CRUD modals still work.
- Locations / departments / shift-templates pick up the toolbar layout automatically with no feature-specific hacks.

## Non-goals / risks

- Nesting dialogs/popovers inside `RowActionsMenu` can close the menu before the secondary UI opens — mitigated by controlled open state after menu item click.
- Very narrow widths: prefer keeping one row; if wrap is required, search stays full-width above actions only as a fallback (prefer not introducing a second permanent row).
