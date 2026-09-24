# Logging / audit trail

Server-side activity logging on Prisma `UserActivity`, plus an ADMIN-only read list.

Live demo: `/team/activity` (ADMIN). Writes happen on login, logout, and member create (`REGISTER`).

---

## When to use this

Call `logActivity` from **server** code whenever an operation should leave an audit trail (auth events, privileged mutations, etc.).

Do **not** invent parallel `prisma.userActivity.create` call sites. Do **not** log from client components.

## Operational logging is separate

`UserActivity` is a business audit trail, not a replacement for deployment
observability. JSON operational logs, request IDs, redaction, error reporting,
and health endpoints are documented in [Operations](../../docs/operations.md).
Do not write operational events into `UserActivity`, and do not store audit
events only in process logs.

---

## Folder map

```
src/features/logging/
  server.ts                 logActivity (server-only)
  index.ts                  Client-safe barrel (types only)
  types/activity-types.ts   UserActivityItem + Activity re-export
  actions/activity-actions.ts
  hooks/use-activity-list-page.ts
  components/tables/        Columns + toActivityTableRow
  components/pages/         Stateless ActivityListPage

prisma/schema.prisma        UserActivity model + Activity enum
```

---

## Writing activity

```ts
import { logActivity } from "@/features/logging/server"

await logActivity({
  userId: user.id,
  activity: "LOGIN",
  // activityData: { ip: "…" }, // optional JSON
})
```

| Field | Notes |
|-------|--------|
| `userId` | Existing `User.id` |
| `activity` | Prisma `Activity` enum value |
| `activityData` | Optional JSON blob for context |

`logActivity` has **no** RBAC of its own — callers already sit inside authorized actions / auth flows. Await it; failures surface through the caller's `withErrorBoundary` / route error handling.

### Built-in call sites

| Event | Where |
|-------|--------|
| `LOGIN` | `loginAction` |
| `LOGOUT` | `logoutAction` |
| `REGISTER` | `createUser` |

### Extending the `Activity` enum

1. Add the value to `enum Activity` in `prisma/schema.prisma`
2. `pnpm db:migrate --name add_activity_<name>`
3. `pnpm db:generate`
4. Call `logActivity({ …, activity: "NEW_VALUE" })` from the relevant server action

Current values: `LOGIN`, `LOGOUT`, `REGISTER`, `VERIFY`, `UNVERIFY`.

---

## Reading activity (ADMIN list)

RBAC: `Actions.logging.read` / permission `logging:read` — **ADMIN only**.

```ts
// Server
await authorize(Actions.logging.read)

// Client UI gate
can(me.role, Actions.logging.read)
```

List page is **read-only**: `DynamicTable` without toolbar/row actions or forms. Pattern: load via `useError().run(listActivities())`; if `!canRead`, show a permission message (server still enforces).

---

## Import hygiene

| Code | Import from |
|------|-------------|
| Server actions / route handlers | `@/features/logging/server` → `logActivity` |
| Client list UI | `@/features/logging` (types) + `actions/activity-actions` |
| Never | `server.ts` from client components or the client barrel |

---

## Related

- [Auth / RBAC](./auth.md) — `Actions` / `authorize` / `can`
- [List pages](./list-pages.md) — table shell pattern (this vertical omits CRUD modals)
- [Error handling](./error-handling.md) — `withErrorBoundary` / `run()`
