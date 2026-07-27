# Universal Modals

Stack-based, context-managed modals built on **shadcn/ui** `Dialog` and `AlertDialog`. Call `useModal()` from anywhere under `ModalProvider`; the system pushes entries onto a stack and renders every open modal (so lower ones stay mounted when a confirm stacks on top).

Live examples: list-page create/edit/delete (e.g. `/team/members`).

---

## When to use this

| Need | Use |
|------|-----|
| Destructive or blocking decision (must answer) | `confirm()` |
| Form create/edit in a dialog, with discard guard | `openModal({ type: "form", … })` |
| Blocking acknowledgment the user must dismiss | `notify()` / `openModal({ type: "notification", … })` |
| Transient success / info feedback | Prefer a **toast** — not this system |
| Auth / permission blocking errors from server actions | Prefer `useError().run()` — it routes to `notify` via the channel table (see [Error Handling](./error-handling.md)) |

Do **not** add auto-dismiss / timeouts here — that is toasts’ job. Do **not** import form types (`DynamicForm`, `FieldDef`, feature forms) into the modal package; compose at the call site.

---

## Folder map

```
src/components/shared/modals/
  types.ts              ModalConfig union, StackEntry, ModalContextValue
  modal-context.tsx     reducer, ModalProvider, useModalContext
  use-modal.ts          public API (useModal)
  modal-root.tsx        stack → notification / confirm / form renderers
  index.ts              named re-exports
```

`ModalProvider` wraps the app in `src/components/shared/layout/app-providers.tsx` (`ModalRoot` mounts inside `ErrorProvider` so form modals can use `useError`).

---

## Quick start

### 1. Confirm (promise)

```tsx
"use client"

import { useModal } from "@/components/shared/modals"
import { Button } from "@/components/ui/button"

export function DeleteButton() {
  const { confirm } = useModal()

  return (
    <Button
      variant="destructive"
      onClick={async () => {
        const ok = await confirm({
          title: "Delete this item?",
          message: "This cannot be undone.",
          variant: "destructive",
          confirmLabel: "Delete",
        })
        if (!ok) return
        // proceed with delete
      }}
    >
      Delete
    </Button>
  )
}
```

`confirm()` resolves `true` / `false` from the buttons. If the entry is removed another way (e.g. `closeAll()`), it resolves `false`.

### 2. Notification

```tsx
const { notify } = useModal()

// Prefer a toast for “Saved” in real apps — this proves the modal path.
notify({
  variant: "success",
  title: "Saved",
  message: "Your changes were saved successfully.",
})
```

### 3. Form modal + dirty guard

`openModal` returns the stack `id` synchronously. Capture it in a `let` so the form content can call `setDirty` / `closeModal`:

```tsx
const { openModal, closeModal, setDirty } = useModal()

let formId = ""
formId = openModal({
  type: "form",
  title: "New User",
  size: "lg",
  component: (
    <UserForm
      onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
      onSubmit={(values) => {
        // save…
        closeModal(formId)
      }}
    />
  ),
})
```

If the form is dirty and the user tries to close (ESC, overlay, X), a destructive confirm stacks on top: discard closes both; cancel closes only the warning.

### 4. List-page CRUD (table + modals)

Canonical pattern for feature list pages (`UserListPageComponent`, departments, locations):

1. Pass `toolbarActions` (Create) and `rowActions` (Edit / Delete) into `DynamicTable`.
2. Gate write UI with `can(me.role, Actions.<feature>.write)` from `@/features/auth/permissions`.
3. Create/Edit → `openModal({ type: "form", … })` with dirty bridge; submit via `useError().run()` + `applyServerErrors`; on success `toast.success`, `closeModal`, reload list.
4. Delete → `confirm({ variant: "destructive" })` then `run(deleteX(id))` + toast + reload.

Full guide: [List pages](./list-pages.md). Auth: [Auth & RBAC](./auth.md).


```tsx
let formId = ""
formId = openModal({
  type: "form",
  title: "New member",
  size: "lg",
  component: (
    <UserForm
      onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
      onSubmit={async (values, form) => {
        const data = await run(createUser(values), { form })
        if (data) {
          toast.success("Member created")
          closeModal(formId)
          await load()
        }
      }}
    />
  ),
})
```

Reference implementations: `src/features/users|departments|locations/components/pages/*list-page-component.tsx`.

---

## Modal types

| `type` | Primitive | Purpose |
|--------|-----------|---------|
| `notification` | `Dialog` | Acknowledge-only message (`error` / `warning` / `success`) |
| `confirm` | `AlertDialog` | Must decide — no outside-click dismiss by default |
| `form` | `Dialog` | Opaque `component` body; optional title + size |

Every pushed entry gets a generated `id`. Form entries also track internal `isDirty` (callers never pass `id` or `isDirty` in the config).

---

## `useModal` API

| Method | Signature | Notes |
|--------|-----------|--------|
| `openModal` | `(config: ModalConfig) => string` | Pushes onto stack; returns `id` |
| `closeModal` | `(id?: string) => void` | With `id`: remove that entry anywhere. Without: pop top |
| `setDirty` | `(id: string, isDirty: boolean) => void` | Updates form-entry dirty flag only |
| `closeAll` | `() => void` | Clears stack (logout, route change, etc.) |
| `confirm` | `(config) => Promise<boolean>` | Omits `type` / `onConfirm` / `onCancel` |
| `notify` | `(config) => string` | Omits `type`; returns `id` |

Import from `@/components/shared/modals`. Prefer `useModal` over `useModalContext` in app code.

---

## Config reference

### Notification

| Prop | Required | Description |
|------|----------|-------------|
| `type` | yes | `"notification"` |
| `variant` | yes | `"error"` \| `"warning"` \| `"success"` |
| `title` | yes | Heading |
| `message` | yes | Body |
| `onAcknowledge` | no | Called before close when OK / dismiss |
| `acknowledgeLabel` | no | Default `"OK"` |

### Confirm

| Prop | Required | Description |
|------|----------|-------------|
| `type` | yes | `"confirm"` |
| `title` | yes | Heading |
| `message` | yes | Body |
| `onConfirm` | yes* | Required for raw `openModal`; wired by `confirm()` |
| `onCancel` | no | Optional cancel side effect |
| `confirmLabel` | no | Default `"Confirm"` |
| `cancelLabel` | no | Default `"Cancel"` |
| `variant` | no | `"default"` \| `"destructive"` (default `"default"`) |

\*When using `confirm()`, you omit callbacks — the promise handles them.

### Form

| Prop | Required | Description |
|------|----------|-------------|
| `type` | yes | `"form"` |
| `component` | yes | Opaque `ReactNode` (modal package does not inspect it) |
| `title` | no | Dialog title |
| `size` | no | `"sm"` \| `"md"` \| `"lg"` (default `"md"`) → `max-w-sm` / `max-w-lg` / `max-w-2xl` |

Dirty state is **not** part of the public config. Report it upward with `setDirty(id, boolean)` (e.g. via `DynamicForm` / `UserForm` `onDirtyChange`).

---

## Dirty-close guard

On form close attempt:

1. `isDirty === false` → `closeModal(formId)`
2. `isDirty === true` → keep form open; push confirm “Discard unsaved changes?”
   - Confirm → close warning, then form
   - Cancel → close warning only; form stays dirty

Successful submit should call `closeModal(formId)` itself — no discard prompt.

---

## Composition with forms

Keep packages decoupled:

- Modal system: stack, rendering, dirty **boolean** only
- Form system: fields, validation, `onDirtyChange?: (isDirty: boolean) => void`

They meet at the call site (feature page or thin wrapper), not inside `src/components/shared/modals`.

---

## Conventions

- **Named exports only** in the modal package.
- **Strict TypeScript** — no `any`.
- Use shadcn `Dialog` / `AlertDialog` as-is (portal, overlay, focus trap).
- Prefer `confirm()` / `notify()` over hand-rolling callback configs when those fit.
- Do not invent modal `id`s — always use the value returned by `openModal` / `notify`.
- Stack renders **all** entries so lower modals keep state when a warning stacks on top.
- Open animations spring in from the center of the screen (overrides default Dialog zoom/slide).

---

## Related files

| File | Role |
|------|------|
| `src/components/shared/modals/use-modal.ts` | Public hook |
| `src/components/shared/modals/modal-context.tsx` | Provider + reducer |
| `src/components/shared/modals/modal-root.tsx` | Renderers + dirty guard |
| `src/components/shared/layout/app-providers.tsx` | `ModalProvider` mount |
| `src/features/users/components/pages/userlist-page-component.tsx` | List-page create/edit/delete |
| [error-handling.md](./error-handling.md) | Routes `auth` / `permission` DTOs into `notify` |
