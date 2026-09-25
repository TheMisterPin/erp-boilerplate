# Clock (kiosk)

Public time-clock surface: on-page login, check-in/out, no AppShell chrome. **Not** a list page, settings hub, or dashboard.

Canonical reference: **`src/features/attendance/`** → `/clock` under `(auth)`.

Related: [Architecture](./architecture.md), [Auth](./auth.md), [Logging](./logging.md).

---

## When to use this

| Use clock | Do not use clock |
|-----------|------------------|
| Shared device / kiosk punch | Admin attendance tables (if added later → list CRUD) |
| On-page sign-in for the next employee | Profile self-service or Command Center |

---

## Shape

| Layer | Job |
|-------|-----|
| Route | `(auth)/clock/page.tsx` — thin wire; public middleware path |
| Layout | `(auth)` layout — centered, scrollable, **no** sidebar/header |
| Hook | `useClockPage` — login/logout, status load, punch + confirms |
| View | Stateless kiosk UI + feature skeleton |
| Actions | `getClockStatus` / `checkIn` / `checkOut` — session-scoped; audit via `logActivity` |

```tsx
// ✅ public auth-route
"use client"
export default function ClockRoutePage() {
  const page = useClockPage()
  return <ClockPage {...page} />
}
```

---

## Conventions

- Keep `/clock` in middleware **public** paths (with `/login`). Unauthenticated users see the page; punches still require a session from on-page login.
- On-page login may be a **hand-rolled** email/password form (intentional kiosk exception) still wired through `useError().run()` + `loginAction` / `logoutAction` / `refreshMe()`.
- After logout, clear local clock state so the next employee starts clean.
- Use `confirm` / `notify` for early/late/conflict punch UX; prefer channel overrides already used by attendance over new dialog stacks.
- Do **not** wrap with `AppShell`, `TablePageViewport`, or force `DynamicForm` for the kiosk login box.
- Do not invent REST punch endpoints alongside server actions.

---

## Live demo

| Route | Feature |
|-------|---------|
| `/clock` | `features/attendance` |
