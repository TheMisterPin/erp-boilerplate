# Error Handling

A single pipeline for server-action failures and client presentation. Every vertical uses the same contract, boundary, and `useError().run()` call shape — no bespoke try/catch or ad-hoc error UI.

Live demo: use list-page create/edit modals (e.g. `/team/members`). Session expire → `/login`.

---

## When to use this

| Need | Use |
|------|-----|
| Server action return type | `ActionResult<T>` — never throw across the wire |
| Known business / auth failure inside an action | `throw new AppError({ … })` |
| Wrap an action body | `withErrorBoundary(async () => { … })` |
| Call a server action from the client | `useError().run(actionPromise, opts?)` — prefer `{ form }` on form submits |
| Map server Zod field errors onto a form | `run(…, { form })` (or `applyServerErrors` via `onFieldErrors`) |
| Transient success / soft failure feedback | Sonner `toast` (via `run` channel table or explicit success toast) |
| Blocking auth / permission message | `run` → modal channel (`notify`) — do not hand-roll |
| Crash outside React’s catch (rejected promise) | `run` → `reportFatal` → content `ErrorBoundary` |

Do **not** toast rejected promises — a rejection means the DTO contract broke and must hit the Error Boundary. Do **not** import `@/features/errors/server` from client components.

---

## Folder map

```
src/features/errors/
  dto.ts                 ErrorKind, ErrorDTO, ActionResult (isomorphic)
  server.ts              AppError, withErrorBoundary (server only)
  error-boundary.tsx     Fixed content fallback
  error-provider.tsx     reportFatal → throw during render
  use-error.ts           handle, run, DEFAULT_ERROR_CHANNELS
  index.ts               Client-safe barrel (excludes server.ts)

src/features/auth/permissions.ts  Actions catalog + ROLE_PERMISSIONS + can()
src/features/auth/session.ts       requireSession / authorize (cookie JWT + Role)
src/lib/schemas/<model>.ts   Shared zod used by FieldDefs + server parse

src/components/shared/forms/lib/apply-server-errors.ts
```

Mounted in `AppProviders`: `ModalProvider` → `AuthProvider` → `ErrorProvider` → `{children}` + `ModalRoot` + Sonner. `AppShell` keeps a content-only `ErrorBoundary` so page crashes leave the sidebar usable.

---

## Contract

```ts
// src/features/errors/dto.ts — safe on server and client
type ErrorKind =
  | "validation"
  | "auth"
  | "permission"
  | "not_found"
  | "conflict"
  | "network"
  | "internal"

type ErrorDTO = {
  kind: ErrorKind
  code: string // SCREAMING_SNAKE, e.g. SESSION_EXPIRED
  message: string // always user-safe — never raw Error.message / stacks
  fieldErrors?: Record<string, string[]> // zod flatten().fieldErrors
}

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorDTO }
```

**Hard rule:** server actions always return `ActionResult<T>`. Throwing is legal *inside* the action; `withErrorBoundary` normalizes it.

---

## Channel table

`DEFAULT_ERROR_CHANNELS` is the single presentation policy:

| Kind | Channel | UI |
|------|---------|-----|
| `validation` | `silent` | Inline via `applyServerErrors` (form owns it) |
| `auth` | `modal` | `notify({ variant: "error" })`; `SESSION_EXPIRED` → `/login` on acknowledge |
| `permission` | `modal` | Blocking notification |
| `conflict` | `toast` | `toast.error(message)` |
| `not_found` | `toast` | same |
| `network` | `toast` | same |
| `internal` | `toast` | same |

Per-call override:

```ts
await run(action, { overrides: { conflict: "modal" } })
```

---

## Quick start — server action

```ts
"use server"

import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { Actions } from "@/features/auth/permissions"
import { authorize } from "@/features/auth/session"
import { userSchema } from "@/lib/schemas/user"
import type { User } from "@/features/users/types/user-types"

export async function updateUser(input: unknown): Promise<ActionResult<User>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.users.write)
    const parsed = userSchema.parse(input)
    // persist…
    return parsed
  })
}

// Known failure (thrown inside the boundary):
throw new AppError({
  kind: "conflict",
  code: "DUPLICATE_EMAIL",
  message: "A user with this email already exists.",
})
```

`withErrorBoundary` maps:

| Thrown | Result |
|--------|--------|
| `ZodError` | `kind: "validation"`, `code: "VALIDATION_FAILED"`, `fieldErrors` |
| `AppError` | Its DTO (pass-through) |
| Anything else | `console.error` server-side; client gets `kind: "internal"`, `code: "INTERNAL"`, generic message |

User-facing strings belong on the DTO / `AppError` construction site — not in the UI switch.

---

## Quick start — client call

```tsx
"use client"

import { useError } from "@/features/errors"
import { updateUser } from "@/features/users/actions/user-actions"
import { toast } from "sonner"

function EditForm() {
  const { run } = useError()

  return (
    <UserForm
      isEdit
      onSubmit={async (values, form) => {
        const data = await run(updateUser(values), { form })
        if (data) {
          toast.success("Saved")
        }
      }}
    />
  )
}
```

Preferred form-submit shape: `run(action, { form })` — validation `fieldErrors` are applied via `applyServerErrors` automatically. Use explicit `onFieldErrors` when you need a custom mapper (it wins if both are set). Do **not** use axios (or REST `/api/auth/*`) for this pipeline — server actions + `run()` only.

### `run()` behavior

1. Await the promise.
2. **Reject** → `reportFatal(error)` → content Error Boundary; return `null`. No toast.
3. `{ ok: false, error }` with `kind === "validation"` and `fieldErrors` → `onFieldErrors` if set, else `applyServerErrors(form, …)` when `form` is set; return `null`.
4. Other `{ ok: false }` → `handle(error, overrides)`; return `null`.
5. `{ ok: true }` → return `data`.

No try/catch in feature client components — `run()` is the only invocation pattern.

---

## Shared schemas

Put zod used by both FieldDefs and server actions in `src/lib/schemas/<model>.ts`. Feature `*-form-fields.ts` imports those validators; the action calls `schema.parse(input)`.

```ts
// FieldDef
validation: userEmailSchema

// Server
const parsed = userSchema.parse(input)
```

---

## Layout / providers

```
AppShell
  ModalProvider
    Sidebar + Header          ← outside ErrorBoundary
    content scroll region
      ErrorBoundary           ← fixed fallback only
        ErrorProvider         ← reportFatal throws here
          {children}
    Toaster (sonner)
```

A crash in one page leaves navigation alive. `useError` needs both `ModalProvider` and `ErrorProvider` as ancestors (including for form modals rendered by `ModalRoot`).

---

## Auth session / RBAC

Jose cookies in `src/features/auth/utils.ts`. Full guide: [Auth & RBAC](./auth.md).

- `authorize(Actions.users.write)` → `AppError` `FORBIDDEN` when the session role lacks that permission
- Client UI: `can(me.role, Actions.users.write)` (import from `permissions.ts`, never `session.ts`)
- Matrix: `ROLE_PERMISSIONS` — `ADMIN` = read+write; `USER` = read only

Keep throwing `AppError` with the same kinds/codes so the client channel table stays stable.

---

## Checklist (list CRUD)

| Control | Expected |
|---------|----------|
| Create/edit form field errors | Inline via `run(…, { form })` → `applyServerErrors` |
| Permission denied on write | Blocking `notify` |
| Session expired | Modal; OK → `/login` |
| Conflict / not found / internal | Error toast; internal also `console.error` on server |
| Rejected promise → boundary | Content fallback; sidebar still works |

`skipClientValidation` on `DynamicForm` is an escape hatch — do not use it in feature forms.

---

## Constraints

- Named exports; strict TypeScript; no `any` on the public API.
- Client barrel: `@/features/errors` — never re-export `server.ts`.
- Server imports: `@/features/errors/server` and `@/features/errors/dto` only.
- Modal package must not import the form or error systems for presentation policy — `useError` composes `useModal` + toast.
- Do not customize the Error Boundary fallback per vertical.
- Prefer Sonner for transient feedback; reserve `notify` for must-acknowledge cases (`auth` / `permission`).

---

## Related

| File | Role |
|------|------|
| `.cursor/rules/error-handling.mdc` | Agent rule |
| `.docs/components/auth.md` | Session + RBAC |
| `.docs/components/forms.md` | DynamicForm + `applyServerErrors` |
| `.docs/components/modals.md` | `notify` for blocking errors |
| `.docs/components/list-pages.md` | List CRUD |
| `src/features/users/actions/user-actions.ts` | Reference server actions |
| `src/features/users/components/pages/userlist-page-component.tsx` | List-page CRUD |
