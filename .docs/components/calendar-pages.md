# Calendar pages

Schedule / calendar UIs (month/week grids, shift cards). **Not** list + modal CRUD — templates and other tabular CRUD stay on list routes.

Canonical reference: **`src/features/shifts/`** schedule surface → `/team/my-shifts`  
(list CRUD twin: `/team/shift-templates`).

Related: [Architecture](./architecture.md), [List pages](./list-pages.md), [Modals](./modals.md).

---

## When to use this

| Use calendar pages | Do not use calendar pages |
|--------------------|---------------------------|
| Personal or managed schedule grids | Shift **template** CRUD (use list page) |
| Time-based instance overview | Dashboards (KPIs/charts) or settings hubs |

---

## Shape

| Layer | Job |
|-------|-----|
| Route | Thin wire + **page scroll** shell (`overflow-y-auto`); no `TablePageViewport` |
| Hook | `use*-schedule-page` (or equivalent) — load instances/locations via `run()`, assign/delete modals |
| View | Stateless page composing calendar primitives (`shift-calendar/*`) |
| Calendar UI | May hold local navigation state (current month/week) only |
| Actions | Same feature’s instance actions + resource-scoped write checks |

```tsx
// ✅ route — page scrolls; list templates stay on TablePageViewport
"use client"
export default function MyShiftsPage() {
  const page = useShiftSchedulePage()
  return (
    <div className="h-full min-h-0 overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-7xl">
        <ShiftSchedulePage {...page} />
      </div>
    </div>
  )
}
```

---

## Conventions

- Still **hook → stateless view → thin route**.
- Loading: schedule-specific skeleton — not `TableSkeleton`.
- Writes: form modal / confirm via shared modals; honor location-manager resource checks as well as `Actions.shifts.*`.
- Keep list CRUD (templates) and calendar (instances) as **separate pages** even inside one feature.
- Do not put `DynamicTable` inside the calendar scroll shell.

---

## Live demo

| Route | Feature surface |
|-------|-----------------|
| `/team/my-shifts` | `features/shifts` schedule + `components/shift-calendar` |
| `/team/shift-templates` | Same feature — **list** pattern (see list-pages) |
