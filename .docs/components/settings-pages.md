# Settings pages

Self-service and configuration hubs (tabs, inline forms, page scroll). **Not** list + modal CRUD.

Canonical reference: **`src/features/profile/`** → `/profile`.

Future app/org settings screens should mirror this pattern and stay in their own feature folder — do not fold them into `users` list CRUD or invent detail routes.

Related: [Architecture](./architecture.md), [Forms](./forms.md), [Modals](./modals.md).

---

## When to use this

| Use settings pages | Do not use settings pages |
|--------------------|---------------------------|
| Profile / account self-service | Admin member CRUD (`features/users` list) |
| Future org/app configuration hubs | Dense operational tables |
| Tabbed “manage my …” surfaces | Dashboards, clock, calendars (their own docs) |

---

## Shape

| Layer | Job |
|-------|-----|
| Route | Thin wire + **page scroll** shell (`h-full min-h-0 overflow-y-auto` + padding) |
| Hook | `use*-page` — load via `run()`, modals, toasts; no table viewport |
| View | Stateless hub — tabs/sections from props; feature skeleton while `!loaded` |
| Actions | Session-scoped or dedicated `Actions.*` as the domain needs; reuse other features’ actions for side workflows |

```tsx
// ✅ route — page scrolls; no TablePageViewport
"use client"
export default function ProfileRoute() {
  const page = useProfilePage()
  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <ProfilePage {...page} />
    </div>
  )
}
```

---

## Conventions

- Still **hook → stateless view → thin route** (same as list pages).
- Prefer **inline** `DynamicForm` for the primary edit surface; use `openModal({ type: "form" })` for secondary requests (e.g. time-off from profile).
- Loading: feature-specific skeleton — not `TableSkeleton`, not bare “Loading…”.
- Content width: readable column (profile uses `max-w-4xl`); do not force full-bleed tables.
- Profile edits do **not** require `users:write`; keep admin CRUD on `features/users`.
- Cross-cutting mutations (leave, password, etc.) stay in their feature actions — the settings hub only orchestrates.

---

## Adding another settings hub

1. New `src/features/<settings-feature>/` (or extend an existing settings feature — do not dump into `profile` unless it is truly personal).
2. Hook + stateless page + page-scroll route under `(app)`.
3. Nav entry (user menu or Organization/Settings group as product dictates).
4. Reuse shared forms/modals/errors; do not invent a settings framework.

---

## Live demo

| Route | Feature |
|-------|---------|
| `/profile` | `features/profile` |
