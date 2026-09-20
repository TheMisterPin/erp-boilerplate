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

Defined in `ROLE_PERMISSIONS`:

| Role | Permissions |
|------|-------------|
| `ADMIN` | `*:read` + `*:write` for users, departments, locations, shifts; plus `logging:read` |
| `USER` | `*:read` for users, departments, locations, shifts (no logging / no `shifts:write`) |

Location managers (users with `Location.managerId`) get shift **write** via resource checks in shift actions — not a separate Role.

`Actions` catalog entries point at those strings (e.g. `Actions.users.write.permission === "users:write"`).

### Adding a vertical

1. Extend `Permission` union
2. Update `ROLE_PERMISSIONS` for each role
3. Add `Actions.<feature>.read` / `.write`
4. Call `authorize` / `can` with those actions

---

## Providers

Root mount (`AppProviders`):

1. `ModalProvider`
2. `AuthProvider`
3. `ErrorProvider` → children + **`ModalRoot`** + Sonner

`ErrorProvider` wraps modals so list-page form submits can use `useError().run()`.

Route groups:

- `(app)` → `AppShell` (sidebar + header; content `ErrorBoundary`)
- `(auth)` → minimal layout (login)

---

## Login channels

Auth is **server actions only**: `loginAction` / `logoutAction` / `getMeAction` via `useAuth`. Do not add REST `/api/auth/*` or axios session clients.

---

## Constraints

- Named exports; strict TypeScript
- Client imports `permissions` + hooks only — never `session.ts`
- Prefer `authorize(Actions.*)` over deprecated `requirePermission`
- Do not gate features with bare `role === "ADMIN"`
- Stable `AppError` kinds/codes for auth/permission failures

---

## Related

| File | Role |
|------|------|
| `.cursor/rules/auth-rbac.mdc` | Agent rule |
| `.docs/components/error-handling.md` | Channels for auth/permission errors |
| `.docs/components/list-pages.md` | List CRUD write gating |
| `src/features/users/actions/user-actions.ts` | Reference `authorize` usage |
