# Dashboards

Role-scoped operational reports: KPIs, charts, queues, feeds. **Not** list + modal CRUD and **not** settings hubs.

Canonical reference: **`src/features/dashboard/`** → `/home` (Command Center).

Related: [Architecture](./architecture.md), [Modals](./modals.md), [Auth](./auth.md).

---

## When to use this

| Use dashboards | Do not use dashboards |
|----------------|------------------------|
| Aggregated KPIs / coverage charts | Entity CRUD tables |
| Attention queues over existing workflows | Profile / settings configuration |
| Read-mostly command surfaces | Clock kiosk or schedule calendars |

---

## Shape

| Layer | Job |
|-------|-----|
| Route | Thin wire only (scroll may live in the view) |
| Hook | `use*-page` — one (or few) aggregate loads via `run()`; open modals for in-place workflow actions |
| View | Compose small presentational widgets (KPI cards, charts, feeds); feature skeleton while `!loaded` |
| Actions | Aggregate read model (`getCommandCenterData`-style); mutations call the **owning** feature’s actions |

```tsx
// ✅ route
"use client"
export default function Home() {
  const page = useCommandCenterPage()
  return <CommandCenterPage {...page} />
}
```

---

## Conventions

- Still **hook → stateless view → thin route**.
- Do **not** wrap in `TablePageViewport` / `DynamicTable` unless a section is deliberately a list (prefer linking to the list vertical instead).
- Scope data by org role / managed locations / self — mirror server checks in the aggregate action; do not invent `Actions.dashboard.*` unless product needs a dedicated permission.
- Cross-feature writes (e.g. approve time-off from an attention queue) reuse that feature’s actions + form modals, then reload the dashboard.
- Loading: dashboard-specific skeleton; never bare “Loading…”.
- Visual language: DESIGN cards/KPI guidance; keep one job per section.

---

## Adding another dashboard

1. Prefer a dedicated feature folder (or clear subfolder under `dashboard`) — do not bolt charts onto a list page.
2. Aggregate in server actions; keep widgets presentational.
3. Register nav / home as product requires.
4. Tenant-scope aggregates with `activeOrganizationId`.

---

## Live demo

| Route | Feature |
|-------|---------|
| `/home` | `features/dashboard` (Command Center) |
