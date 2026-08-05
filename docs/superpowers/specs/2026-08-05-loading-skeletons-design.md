# Loading skeletons — design

**Date:** 2026-08-05  
**Status:** Approved (approach A)

## Goal

Replace “Loading…” placeholder text with UI-matching skeletons. Keep page chrome (toolbar / headers / tabs) visible while data loads; controls stay **disabled** until `loaded`.

Long-term direction: every component owns its own skeleton. This pass covers list pages plus schedule, clock, and login — not modal form option loaders.

## Decisions

| Topic | Choice |
|-------|--------|
| Scope now | List/table pages + shift schedule + clock + login (option **B**) |
| Toolbar while loading | Visible but **disabled** / non-interactive |
| Tabbed page chrome | Full chrome: title, disabled Create, tab shells + table skeleton |
| Architecture | Shared `TableSkeleton` + page-owned chrome; colocated skeletons for special pages (approach **A**) |
| Empty / permission | Unchanged — no skeleton |
| Modal form “Loading form options…” | Out of scope (later) |
| Docs / rules | Update `.docs` + `.cursor/rules` so new features follow this pattern |

## Scope

### In

- Shared `TableSkeleton` under `@/components/shared/table` (uses `Skeleton` + `DataTableFrame`)
- List pages: members, locations, departments, shift templates, activity
- Special pages: shift schedule, clock (`authLoading`), login (`Suspense` fallback)
- Docs: `.docs/components/list-pages.md`, `.docs/components/tables.md` (and AGENTS mention if needed)
- Rules: `.cursor/rules/list-page-crud.mdc`, `.cursor/rules/dynamic-table.mdc`

### Out

- Modal / form option loading skeletons
- Per-column-config skeleton fidelity (generic row bars are enough)
- Interactive Create / search before first load
- New loading state machine beyond existing `loaded` / `authLoading`

## Design

### 1. Shared `TableSkeleton`

Location: `src/components/shared/table/table-skeleton.tsx`  
Export from `@/components/shared/table` barrel.

Renders inside `DataTableFrame`:

| Region | Content |
|--------|---------|
| Toolbar | Search input (disabled), optional tools affordance, `toolbarActions` slot (caller passes Create; must be disabled) |
| Body | ~`PAGE_SIZE` skeleton rows (generic cell bars; not driven by feature `ColumnConfig`) |
| Footer | Optional results / pagination placeholder bars |

Props (minimal):

```ts
type TableSkeletonProps = {
  toolbarActions?: ReactNode
  /** default PAGE_SIZE */
  rowCount?: number
  className?: string
}
```

Do **not** invent a parallel table stack. Prefer reusing toolbar layout classes / structure so loaded ↔ loading does not jump.

### 2. Simple list pages

Departments, shift templates, activity (and future simple lists):

When `!loaded`:

```tsx
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
```

No early return that drops the toolbar. Empty state still uses `DataTableFrame` with enabled Create when `canWrite`.

### 3. Tabbed list pages (Members, Locations)

When `!loaded`, still render:

1. Page header (title + subtitle)
2. Create in header — **disabled** when `canWrite`
3. Tab shells (labels visible; counts as `—` or omitted until loaded)
4. Active tab body = `TableSkeleton` (table search toolbar disabled; no row actions)

After load, current tab + table behavior unchanged.

### 4. Special pages

| Surface | Skeleton |
|---------|----------|
| Shift schedule | Colocated `ShiftScheduleSkeleton`: calendar chrome (disabled nav), month grid of day cells with a few shift-bar skeletons, legend card skeletons. Do not mount live `ShiftCalendar` until loaded. |
| Clock | While `authLoading`: keep `HomeLink` + layout; skeleton header + status card (circle, lines, CTA bar). |
| Login | `Suspense` fallback mirrors centered form: title/subtitle + two fields + button skeletons (non-interactive). |

### 5. Accessibility

- Skeleton regions use `aria-busy="true"` and an accessible name (e.g. `aria-label="Loading…"`) on the frame/root.
- Prefer not announcing every skeleton bar.

### 6. Docs and rules (required)

Update so future verticals default to this pattern:

**`.docs/components/list-pages.md` — Loading and empty states**

- Replace “show Loading… until first settle” with: keep chrome; use `TableSkeleton`; disable write actions until `loaded`.
- Tabbed pages: keep header + tabs during load.
- Point to `TableSkeleton` export.

**`.docs/components/tables.md`**

- Document `TableSkeleton` next to sticky toolbar / empty-loading guidance.
- Explicit: loading must keep toolbar chrome via `TableSkeleton` / `DataTableFrame`, not a text-only body.

**`.cursor/rules/list-page-crud.mdc`**

- View rule: `!loaded` → `TableSkeleton` (+ page chrome when present); never bare “Loading…” text; Create/search disabled until loaded.

**`.cursor/rules/dynamic-table.mdc`**

- Add `TableSkeleton` to layout table; require it for list loading states.

**`AGENTS.md` / architecture** — only if the systems table or hard conventions need a one-line pointer; prefer not duplicating full guidance.

## Non-goals / future

- `loading` prop on `DynamicTable` that wraps `TableSkeleton` internally (nice follow-up toward per-component ownership)
- Form / modal option skeletons
- Sidebar user chip already has a small loading path — leave unless it still shows raw text

## Test plan (manual)

- [ ] Each list route: first paint shows toolbar (disabled Create if write) + row skeletons; no “Loading…” copy
- [ ] Members / Locations: header + tabs visible during load; counts settle after load
- [ ] Empty list after load still shows Create when allowed
- [ ] Schedule: calendar-shaped skeleton, then real grid
- [ ] Clock: auth settle shows card skeleton, then login or clock UI
- [ ] Login Suspense: form-shaped skeleton
- [ ] No layout jump of sticky toolbar when data arrives
