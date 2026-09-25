# Auth & RBAC

Jose cookie sessions, middleware auth gate, and a **permission-matrix** action catalog. Roles grant permissions; typed `Actions` map to those permissions; `authorize` / `can` enforce them.

Related: [Error Handling](./error-handling.md) (how `FORBIDDEN` / `SESSION_EXPIRED` surface in the UI).

---

## Folder map

```
src/features/auth/
  utils.ts           encrypt / decrypt / createSession / getSession / updateSession
  session-policy.ts  idle/absolute lifetime and cookie policy helpers
  session-state.ts   resolve signed identity against current database account state
  credentials.ts     constant-work credential comparison helper
  login-rate-limit.ts replaceable limiter contract + bounded local adapter
  permissions.ts     Permission, ROLE_PERMISSIONS, Actions, can, hasPermission
  session.ts         requireSession, authorize (server-only)
  password.ts        hash / authenticate
  hooks/             AuthProvider, useAuth
  actions/           loginAction, logoutAction, getMeAction

src/middleware.ts
src/app/(auth)/login/
src/components/shared/layout/app-providers.tsx
```

---

## Session cookie

- Cookie name: `session` (HTTP-only, lax, path `/`, Secure in production)
- Payload: `userId`, `email`, `role`, `fullName`, `expires`, `absoluteExpires`
- Secret: `JWT_SECRET` via `src/lib/env.ts`; production requires at least 32 characters
- Idle lifetime: `SESSION_IDLE_MAX_AGE_SECONDS` (default 7 days)
- Absolute lifetime: `SESSION_ABSOLUTE_MAX_AGE_SECONDS` (default 30 days)
- JWT identity: `SESSION_JWT_ISSUER` / `SESSION_JWT_AUDIENCE`

Do not put passwords in the JWT. Public user shape is `Me` (`src/features/auth/types.ts`).

The signed JWT proves the session identity but is not the authorization source of truth.
Every call to `requireSession` reloads the user by ID and rejects missing, inactive, or
soft-deleted accounts. It replaces the token's email, name, and role with current database
values before any permission or resource-scope check. Role downgrades and account
deactivation therefore apply on the next protected server action without waiting for the
cookie to expire. Middleware validates the token for routing, but it does not replace this
server-side account lookup.

Authenticated requests roll the idle expiry forward, capped at the original absolute
expiry. Activity can therefore keep a session alive only until its absolute lifetime.
Changing the signing secret, issuer, or audience invalidates existing sessions. Tokens
created before the absolute-lifetime fields were introduced are intentionally invalid and
users must sign in again after that deployment.

`SESSION_MAX_AGE_SECONDS` remains a deprecated fallback for the idle lifetime so existing
development environments do not break immediately. New configuration must use
`SESSION_IDLE_MAX_AGE_SECONDS`.

Secret rotation currently invalidates every existing session. To rotate safely, deploy the
new secret and expect users to authenticate again; multi-key overlap is not implemented.

---

## Middleware gate

| Case | Behavior |
|------|----------|
| No session, not public | Redirect `/login?next=<pathname>` |
| Session on `/login` | Redirect `/` |
| Session elsewhere | Refresh idle expiry up to the absolute expiry, then continue |
| Public | `/login`, `/clock` |

Login client should honor `next` (safe same-origin path only) after successful sign-in.

---

## Client vs server

| Need | Use |
|------|-----|
| Current user in UI | `useAuth()` → `me`, `status`, `login`, `logout`, `refreshMe` |
| Hide Create/Edit/Delete | `can(me.role, Actions.<feature>.write)` |
| Guard server action | `await authorize(Actions.<feature>.read\|write)` |

```ts
// Server
import { Actions } from "@/features/auth/permissions"
import { authorize } from "@/features/auth/session"

await authorize(Actions.departments.write)
```

```ts
// Client — never import session.ts
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"

const { me } = useAuth()
const canWrite = me ? can(me.role, Actions.departments.write) : false
```

---

## Permission matrix

Business authorization uses **organization roles** (`OrganizationRoleKey`) from the active membership. Defined in `ROLE_PERMISSIONS`:

| Org role | Permissions |
|----------|-------------|
| `ADMIN` | `*:read` + `*:write` for users, departments, locations, shifts, time off, and memberships; plus `logging:read` |
| `MANAGER` | read on users/departments/locations; `shifts` read+write; `timeOff` read+write (no logging / memberships write) |
| `OPERATOR` | read on users/departments/locations/shifts; `timeOff` read+write |
| `VIEWER` | read on users/departments/locations/shifts/timeOff |

Separately, system account role `User.role` (`ADMIN` / `USER`) only gates platform ops via `SYSTEM_ROLE_PERMISSIONS` (today: `system:organizations:write` for system `ADMIN`). Never use `User.role` for org business data.

Location managers (users with `Location.managerId`) may get extra **resource-scoped** shift write checks inside shift actions — that is additive to the org-role matrix, not a fifth org role.

`Actions` catalog entries point at permission strings (e.g. `Actions.users.write.permission === "users:write"`). Full dual-scope model: [organization roles](../../docs/organization-roles.md).

### Adding a vertical

1. Extend `Permission` union
2. Update `ROLE_PERMISSIONS` for each **org** role
3. Add `Actions.<feature>.read` / `.write`
4. Call `authorize` / `can` with those actions

## Organization switching and membership administration

The active organization is stored in the signed session cookie, but every
request still validates the current membership and role from the database.
`switchOrganization` accepts only an active membership with an active role and
reissues that cookie for the selected organization.

Organization administrators use `memberships:read` / `memberships:write` to
manage existing accounts in their current organization. They can add a
membership, assign a role, activate or deactivate it, and remove it without
deleting the underlying user account. Every mutation is tenant-scoped and
audited. The server prevents the last active administrator from being demoted,
deactivated, or removed; the rule is checked inside a serializable transaction.

Tenant-owned Prisma models must carry `organizationId`. Server actions derive
that value from the session for creates and include it in every list, lookup,
update guard, and relationship validation. Foreign-org identifiers are
not-found. Full rules: [organization ownership](../../docs/organization-ownership.md).
When adding a tenant-owned vertical, extend the
[tenant-isolation matrix](./testing.md) in the same PR.

---

## Providers

Root mount (`AppProviders`):

1. `ThemeProvider` (existing `next-themes` wrapper — extend it; do not add a second theme stack)
2. `ModalProvider`
3. `AuthProvider`
4. `ErrorProvider` → children + **`ModalRoot`** + Sonner

`ErrorProvider` wraps modals so list-page form submits can use `useError().run()`.

Route groups:

- `(app)` → `AppShell` (sidebar + header; content `ErrorBoundary`)
- `(auth)` → minimal layout (login)

---

## Login channels

Auth is **server actions only**: `loginAction` / `logoutAction` / `getMeAction` via `useAuth`. Do not add REST `/api/auth/*` or axios session clients.

### Login abuse protection

`loginAction` normalizes email identifiers, applies failed-attempt limits to both the
identifier and the client source when a trusted proxy supplies one, and returns the stable
`LOGIN_RATE_LIMITED` code when either threshold is reached. Unknown accounts, inactive
accounts, and wrong passwords all return `INVALID_CREDENTIALS`; the unknown-account path
still performs one bcrypt comparison against a fixed dummy hash to reduce timing leaks.

The default policy is configurable:

| Variable | Default | Meaning |
|----------|---------|---------|
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | `5` | Failures allowed for one normalized identifier |
| `LOGIN_RATE_LIMIT_SOURCE_MAX_ATTEMPTS` | `25` | Failures allowed for one client source across identifiers |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | `900` | Fixed counter lifetime |

A successful login clears that identifier's counter. The aggregate source counter ages out
instead of being reset by one valid account, so an attacker cannot use a known credential to
erase failures against other accounts. Throttle events are written to operational logs with
one-way fingerprints and the retry delay; raw email addresses, client sources, and passwords
are never logged.

The bundled `InMemoryLoginRateLimiter` is intentionally **process-local**. It is bounded to
avoid unbounded memory growth, but its counters are not shared across replicas and disappear
on restart or serverless cold start. Multi-instance and serverless deployments must replace
the exported `loginRateLimiter` binding with a Redis/KV-backed implementation of the
`LoginRateLimiter` interface whose increments and expiries are atomic. Do not describe the
local adapter as distributed protection.

Client-source limiting trusts `x-forwarded-for` (falling back to `x-real-ip`). Only enable
that dimension behind a proxy that overwrites these headers; otherwise clients can spoof
them. Identifier limiting remains active when no source is available.

---

## Constraints

- Named exports; strict TypeScript
- Client imports `permissions` + hooks only — never `session.ts`
- Prefer `authorize(Actions.*)` over deprecated `requirePermission`
- Do not gate features with bare `role === "ADMIN"` (org or system) — use `can` / `authorize`
- Stable `AppError` kinds/codes for auth/permission failures

---

## Related

| File | Role |
|------|------|
| `.cursor/rules/auth-rbac.mdc` | Agent rule |
| `.docs/components/error-handling.md` | Channels for auth/permission errors |
| `.docs/components/list-pages.md` | List CRUD write gating |
| `.docs/components/testing.md` | Tenant-isolation matrix for new verticals |
| `docs/organization-ownership.md` | Tenant boundary + `organizationId` scoping |
| `docs/organization-roles.md` | System vs org roles |
| `src/features/users/actions/user-actions.ts` | Reference `authorize` usage |
