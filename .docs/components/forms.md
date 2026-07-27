# Dynamic Forms

Schema-driven forms built on **react-hook-form**, **zod**, and **shadcn/ui**. You describe fields once; `DynamicForm` handles rendering, conditional logic, and validation.

Live examples: feature forms in list-page modals (e.g. `/team/members`).

Server-action submit + field errors: see [Error Handling](./error-handling.md).

---

## When to use this

Use `DynamicForm` for feature create/edit forms that need:

- Typed fields tied to a model
- Per-field zod validation
- Conditional visibility or required-ness
- Locked fields in edit mode
- Single-page, multi-step, or tabbed layouts

Do **not** use it for tiny one-off controls (e.g. sidebar search).

`FieldDef` `options` arrays are **static** at render time. When options come from the server (departments, managers, …), load them in the thin `*Form` wrapper with `useError().run(listX())`, then pass the arrays into a `build*FormFields({ …options })` helper. Do **not** fetch inside `FieldDef`, field inputs, or `DynamicForm`.

---

## Folder map

```
src/components/shared/forms/
  types/          FieldDef, LayoutConfig, DynamicFormProps
  inputs/         One component per FieldType (text, select, date, …)
  lib/            fieldRegistry, buildValidationSchema, dynamicResolver, applyServerErrors
  templates/      DynamicForm (public API)

src/features/<feature>/
  types/                    Model types (e.g. User)
  components/forms/         Field schemas + thin *Form wrappers
  actions/                  Server actions returning ActionResult<T>

src/lib/schemas/            Shared zod validators (FieldDefs + server parse)
```

---

## Quick start

### 1. Model type

```ts
// src/features/users/types/user-types.ts
export type User = {
  email: string
  name: string
  role: "ADMIN" | "USER"
  department?: string
  notify: boolean
  phone?: string
}
```

### 2. Field schema

```ts
// src/features/users/components/forms/user-form-fields.ts
import { z } from "zod"
import type { FieldDef } from "@/components/shared/forms/types"
import type { User } from "@/features/users/types/user-types"

export const userFormFields: FieldDef<User>[] = [
  {
    name: "email",
    type: "text",
    label: "Email",
    validation: z.string().min(1, "Required").email(),
    canEdit: false, // locked when isEdit
  },
  {
    name: "role",
    type: "select",
    label: "Role",
    validation: z.enum(["ADMIN", "USER"]),
    options: [
      { label: "Admin", value: "ADMIN" },
      { label: "User", value: "USER" },
    ],
  },
  {
    name: "department",
    type: "select",
    label: "Department",
    validation: z.string().optional(),
    options: [
      { label: "Engineering", value: "engineering" },
      { label: "Design", value: "design" },
    ],
    visibleWhen: (values) => values.role === "ADMIN",
  },
  {
    name: "phone",
    type: "text",
    label: "Phone",
    validation: z.string().optional(),
    requiredWhen: (values) => values.notify === true,
  },
]
```

When select options are dynamic, prefer a builder (see `UserForm` / `LocationForm`):

```ts
export function buildCreateUserFormFields(opts: {
  departmentOptions: SelectOption[]
  locationOptions: SelectOption[]
}): FieldDef<UserFormValues>[] {
  // … FieldDefs with options: opts.departmentOptions, etc.
}
```

Load those options in the `*Form` wrapper before rendering `DynamicForm`.
### 3. Thin wrapper

```tsx
"use client"

import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import { userFormFields } from "./user-form-fields"
import type { User } from "@/features/users/types/user-types"

export function UserForm({
  isEdit = false,
  initialValues,
  onSubmit,
}: {
  isEdit?: boolean
  initialValues?: Partial<User>
  onSubmit: (values: User, form: UseFormReturn<User>) => void | Promise<void>
}) {
  return (
    <DynamicForm<User>
      fields={userFormFields}
      layout={{ mode: LayoutMode.Single, columns: 2 }}
      isEdit={isEdit}
      initialValues={initialValues}
      onSubmit={onSubmit}
      submitLabel={isEdit ? "Save changes" : "Create user"}
    />
  )
}
```

`onSubmit` receives the RHF `form` instance so callers can pass it to `run(…, { form })` (see [Error Handling](./error-handling.md)).

### 4. Submit via `useError().run()`

```tsx
const { run } = useError()

<UserForm
  onSubmit={async (values, form) => {
    const data = await run(updateUser(values), { form })
    if (data) toast.success("Saved")
  }}
/>
```

Shared field validators should live in `src/lib/schemas/<model>.ts` and be imported by both FieldDefs and server actions.

---

## Field types

| `type` | Control | Notes |
|--------|---------|--------|
| `text` | Input | |
| `email` | Input `type="email"` | |
| `password` | Input `type="password"` | |
| `number` | Input `type="number"` | Value coerced to `number` |
| `textarea` | Textarea | |
| `select` | Select | Requires `options` |
| `multiselect` | Checkbox group | Value is `string[]`; requires `options` |
| `radio` | RadioGroup | Requires `options` |
| `checkbox` | Checkbox | Boolean |
| `switch` | Switch | Boolean |
| `date` | Popover + Calendar | Value is a `Date` |

---

## `FieldDef` reference

| Prop | Required | Description |
|------|----------|-------------|
| `name` | yes | Key of the form model (`keyof T`) |
| `type` | yes | One of the field types above |
| `label` | yes | Visible label |
| `validation` | yes | Zod schema for this field |
| `placeholder` | no | Input placeholder |
| `description` | no | Helper text under the control |
| `defaultValue` | no | Default when not in `initialValues` |
| `options` | for select/radio/multiselect | `{ label, value }[]` — static only |
| `visibleWhen` | no | `(values) => boolean` — hide from UI **and** validation when false |
| `requiredWhen` | no | `(values) => boolean` — treat empty as invalid when true |
| `canEdit` | no | Default `true`. When `false` and `isEdit`, field is disabled |
| `hide` | no | Default `false`. Never render (e.g. `createdAt`) |
| `colSpan` | no | `1` or `2` (single layout grid) |
| `section` | no | Step/tab key for multi-step or tabs layouts |
| `render` | no | Custom JSX escape hatch (skips registry) |

---

## Layouts

Use `LayoutMode` from `@/components/shared/forms/types`.

### Single

```ts
{ mode: LayoutMode.Single, columns: 2 } // columns: 1 | 2
```

Honors each field’s `colSpan`.

### Multi-step

```ts
{
  mode: LayoutMode.MultiStep,
  showProgressBar: true,
  steps: [
    { key: "account", label: "Account", description: "Basics" },
    { key: "prefs", label: "Preferences" },
  ],
}
```

Set each field’s `section` to a step `key`. **Next** validates only the current step; the last step submits the full form.

### Tabs

```ts
{
  mode: LayoutMode.Tabs,
  tabs: [
    { key: "profile", label: "Profile" },
    { key: "settings", label: "Settings" },
  ],
}
```

All fields stay in form state. Submit validates everything.

---

## Conditional behavior cheatsheet

| Goal | How |
|------|-----|
| Hide a field based on other values | `visibleWhen` |
| Keep field visible but sometimes required | `requiredWhen` + optional zod base |
| Never show (server-only / meta) | `hide: true` |
| Lock after create | `canEdit: false` + pass `isEdit` |
| Custom UI for one field | `render` |

Hidden via `hide` or `visibleWhen` are **excluded from validation** for that pass.

---

## Extending with a new field type

1. Add the string to the `FieldType` union in `types/types.ts`.
2. Create `src/components/shared/forms/inputs/<name>-input.tsx` (named export, shadcn `Form*` wrappers).
3. Export it from `inputs/index.ts`.
4. Register it in `lib/registry.ts` (`fieldRegistry`).

That is the full extension path — no changes to `DynamicForm` required.

---

## Conventions

- **Named exports only** (no default exports for form modules).
- **Strict TypeScript** — no `any`.
- Prefer the registry over bespoke RHF + Input wiring.
- Feature forms live under `features/<feature>/components/forms`, not under `app/`.
- Keep wrappers thin: schema + `DynamicForm` props, no business logic in the template.

---

## Related files

| File | Role |
|------|------|
| `src/components/shared/forms/templates/dynamic-form.tsx` | Main renderer |
| `src/components/shared/forms/lib/dynamic-resolver.ts` | Value-aware zod resolver |
| `src/components/shared/forms/lib/apply-server-errors.ts` | Map server `fieldErrors` → RHF |
| `src/features/users/components/forms/user-form.tsx` | Reference wrapper |
| `src/features/users/components/pages/userlist-page-component.tsx` | List-page form modals |
| [error-handling.md](./error-handling.md) | `run()` + `ActionResult` pipeline |
