# Profile Hub & Time Off Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a tabbed `/profile` hub (self-edit, upcoming shifts, leave requests) plus a `/team/time-off` approval inbox where admins and location managers confirm leave and cancel overlapping scheduled shifts.

**Architecture:** Thin `features/profile` (self-service hub) composes existing `listShiftInstances` and a new `features/time-off` vertical (Prisma model, actions, list page). Profile mutations use session ownership only; time-off approve/reject uses the same manager-location gate pattern as shift writes.

**Tech Stack:** Next.js (App Router), Prisma + PostgreSQL, jose sessions, zod + DynamicForm, `useError().run()`, shadcn Tabs / Table, sonner toasts.

**Spec:** `docs/superpowers/specs/2026-08-06-profile-time-off-design.md`

## Global Constraints

- Mirror `src/features/users/` layout: `types` → `actions` → `hooks` → `components/{forms,tables,pages}`; route pages only wire hook → view.
- Server actions always return `ActionResult<T>` via `withErrorBoundary`; known failures throw `AppError`.
- Client: only `useError().run()` — no try/catch UI; form submits use `run(action, { form })` or `onFieldErrors` + `applyServerErrors`.
- RBAC: extend `permissions.ts` with `Actions.timeOff.*`; never import `session.ts` from client.
- Soft-delete: filter `deletedAt: null` on `TimeOffRequest`.
- Loading: `TableSkeleton` / section skeletons — never bare “Loading…” text.
- Named exports; strict TypeScript; no `any` on public APIs.
- This repo has **no unit test runner** — verify each task with `pnpm typecheck` (and listed manual checks). Do not add a test framework in this plan.

---

## File map

| Path | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | `TimeOffType`, `TimeOffStatus`, `TimeOffRequest`, User relations, `Activity` values |
| `src/features/auth/permissions.ts` | `timeOff:read` / `timeOff:write` + `Actions.timeOff` |
| `src/lib/schemas/profile.ts` | `updateOwnProfileSchema` |
| `src/lib/schemas/time-off.ts` | Create / review zod schemas |
| `src/features/profile/**` | Types, actions, ProfileForm, ProfilePage, `useProfilePage` |
| `src/features/time-off/**` | Types, access helper, actions, forms, table, list page hook/view |
| `src/app/(app)/profile/page.tsx` | Wire profile hub |
| `src/app/(app)/team/time-off/page.tsx` | Wire time-off list |
| `src/components/shared/layout/sidebar-user.tsx` | Footer → `/profile` |
| `src/lib/navigation.ts` | Team → Time off; `getPageTitle` for `/profile` |
| `src/app/(app)/page.tsx` + `AGENTS.md` | Demo links |

---

### Task 1: Schema, Activity enum, RBAC

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/features/auth/permissions.ts`
- Create: migration via Prisma CLI

**Interfaces:**
- Produces: Prisma models/enums `TimeOffRequest`, `TimeOffType`, `TimeOffStatus`; Activity values `PROFILE_UPDATE`, `TIME_OFF_REQUEST`, `TIME_OFF_APPROVE`, `TIME_OFF_REJECT`, `TIME_OFF_CANCEL`; `Actions.timeOff.read` / `.write`

- [ ] **Step 1: Extend Prisma schema**

On `User`, add:

```prisma
  timeOffRequests         TimeOffRequest[] @relation("TimeOffRequester")
  reviewedTimeOffRequests TimeOffRequest[] @relation("TimeOffReviewer")
```

Add before `enum Activity` (or after ShiftAttendance):

```prisma
enum TimeOffType {
  TIME_OFF
  SICK
}

enum TimeOffStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model TimeOffRequest {
  id           String        @id @default(uuid())
  userId       String
  user         User          @relation("TimeOffRequester", fields: [userId], references: [id])
  type         TimeOffType
  status       TimeOffStatus @default(PENDING)
  startDate    DateTime
  endDate      DateTime
  note         String?
  reviewedById String?
  reviewedBy   User?         @relation("TimeOffReviewer", fields: [reviewedById], references: [id])
  reviewedAt   DateTime?
  reviewNote   String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  deletedAt    DateTime?

  @@index([userId, status])
  @@index([status, startDate])
}
```

Append to `enum Activity`:

```prisma
  PROFILE_UPDATE
  TIME_OFF_REQUEST
  TIME_OFF_APPROVE
  TIME_OFF_REJECT
  TIME_OFF_CANCEL
```

- [ ] **Step 2: Migrate and generate**

Run:

```bash
pnpm exec prisma migrate dev --name profile-time-off
```

Expected: migration applied; client regenerated under `src/generated/prisma` (or project’s configured output). If the project historically uses `db push` only, `pnpm exec prisma db push && pnpm db:generate` is acceptable — prefer `migrate dev` when it works.

- [ ] **Step 3: Extend RBAC**

In `src/features/auth/permissions.ts`:

1. Add `"timeOff:read" | "timeOff:write"` to `Permission`.
2. Grant both to `ADMIN` and `USER` in `ROLE_PERMISSIONS`.
3. Add to `Actions`:

```ts
  timeOff: {
    read: { id: "timeOff.read", permission: "timeOff:read" },
    write: { id: "timeOff.write", permission: "timeOff:write" },
  },
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`  
Expected: PASS (no new TS consumers yet; generated client must compile).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/features/auth/permissions.ts src/generated
git commit -m "$(cat <<'EOF'
Add TimeOffRequest schema and timeOff RBAC permissions.

EOF
)"
```

(Only stage generated paths that this repo tracks.)

---

### Task 2: Shared zod + domain types

**Files:**
- Create: `src/lib/schemas/profile.ts`
- Create: `src/lib/schemas/time-off.ts`
- Create: `src/features/profile/types/profile-types.ts`
- Create: `src/features/time-off/types/time-off-types.ts`

**Interfaces:**
- Consumes: field validators from `src/lib/schemas/user.ts`; Prisma enums
- Produces: `updateOwnProfileSchema`, `createTimeOffRequestSchema`, `reviewTimeOffRequestSchema`, `Profile`, `ProfileFormValues`, `TimeOffRequest`, `TimeOffRequestFormValues`, `TimeOffReviewFormValues`

- [ ] **Step 1: Profile schema + types**

`src/lib/schemas/profile.ts`:

```ts
import { z } from "zod"
import {
  userFirstNameSchema,
  userLastNameSchema,
  userPasswordOptionalSchema,
  userPictureUrlSchema,
} from "@/lib/schemas/user"

export const updateOwnProfileSchema = z.object({
  firstName: userFirstNameSchema,
  lastName: userLastNameSchema,
  pictureUrl: userPictureUrlSchema,
  password: userPasswordOptionalSchema,
})

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>
```

`src/features/profile/types/profile-types.ts`:

```ts
import type { Role } from "@/generated/prisma/client"

export type Profile = {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: Role
  pictureUrl: string | null
  departmentId: string | null
  departmentName: string | null
  locationId: string | null
  locationName: string | null
}

export type ProfileFormValues = {
  firstName: string
  lastName: string
  pictureUrl?: string
  password?: string
}
```

- [ ] **Step 2: Time-off schema + types**

`src/lib/schemas/time-off.ts`:

```ts
import { z } from "zod"

export const TIME_OFF_TYPE_VALUES = ["TIME_OFF", "SICK"] as const
export const TIME_OFF_STATUS_VALUES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const

export const timeOffTypeSchema = z.enum(TIME_OFF_TYPE_VALUES, {
  required_error: "Required",
})

export const timeOffNoteSchema = z.string().optional()

export const timeOffDateSchema = z.date({
  required_error: "Required",
  invalid_type_error: "Pick a date",
})

export const createTimeOffRequestSchema = z
  .object({
    type: timeOffTypeSchema,
    startDate: timeOffDateSchema,
    endDate: timeOffDateSchema,
    note: timeOffNoteSchema,
  })
  .refine((v) => v.endDate.getTime() >= v.startDate.getTime(), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })

export const reviewTimeOffRequestSchema = z.object({
  id: z.string().uuid("Invalid request id"),
  reviewNote: z.string().optional(),
})

export type CreateTimeOffRequestInput = z.infer<typeof createTimeOffRequestSchema>
export type ReviewTimeOffRequestInput = z.infer<typeof reviewTimeOffRequestSchema>
```

`src/features/time-off/types/time-off-types.ts`:

```ts
import type {
  TimeOffStatus as PrismaTimeOffStatus,
  TimeOffType as PrismaTimeOffType,
} from "@/generated/prisma/client"

export type TimeOffType = PrismaTimeOffType
export type TimeOffStatus = PrismaTimeOffStatus

/** Public row returned by time-off actions. Dates are YYYY-MM-DD. */
export type TimeOffRequest = {
  id: string
  userId: string
  userName: string | null
  userLocationId: string | null
  type: TimeOffType
  status: TimeOffStatus
  startDate: string
  endDate: string
  note: string | null
  reviewedById: string | null
  reviewedByName: string | null
  reviewedAt: Date | null
  reviewNote: string | null
  /** Server-computed: current session may approve/reject this row. */
  canReview: boolean
  createdAt: Date
  updatedAt: Date
}

export type TimeOffRequestFormValues = {
  type: TimeOffType
  startDate: Date
  endDate: Date
  note?: string
}

export type TimeOffReviewFormValues = {
  reviewNote?: string
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/profile.ts src/lib/schemas/time-off.ts \
  src/features/profile/types/profile-types.ts \
  src/features/time-off/types/time-off-types.ts
git commit -m "$(cat <<'EOF'
Add profile and time-off schemas and domain types.

EOF
)"
```

---

### Task 3: Profile server actions

**Files:**
- Create: `src/features/profile/actions/profile-actions.ts`

**Interfaces:**
- Consumes: `updateOwnProfileSchema`, `Profile`, `hashPassword`, `requireSession`, `logActivity`
- Produces:
  - `getProfile(): Promise<ActionResult<Profile>>`
  - `updateOwnProfile(input: unknown): Promise<ActionResult<Profile>>`

- [ ] **Step 1: Implement actions**

```ts
"use server"

import { requireSession } from "@/features/auth/session"
import { hashPassword } from "@/features/auth/password"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"
import type { Profile } from "@/features/profile/types/profile-types"
import { prisma } from "@/lib/db"
import { updateOwnProfileSchema } from "@/lib/schemas/profile"

const profileInclude = {
  department: { select: { name: true } },
  location: { select: { name: true } },
} as const

function toProfile(row: {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: Profile["role"]
  pictureUrl: string | null
  departmentId: string | null
  locationId: string | null
  department?: { name: string } | null
  location?: { name: string } | null
}): Profile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    role: row.role,
    pictureUrl: row.pictureUrl,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
  }
}

function fullNameFrom(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim()
}

export async function getProfile(): Promise<ActionResult<Profile>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const row = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      include: profileInclude,
    })
    if (!row) {
      throw new AppError({
        kind: "not_found",
        code: "USER_NOT_FOUND",
        message: "Your profile could not be found.",
      })
    }
    return toProfile(row)
  })
}

export async function updateOwnProfile(
  input: unknown,
): Promise<ActionResult<Profile>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = updateOwnProfileSchema.parse(input)
    const pictureUrl = parsed.pictureUrl || null

    const data: {
      firstName: string
      lastName: string
      fullName: string
      pictureUrl: string | null
      password?: string
    } = {
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      fullName: fullNameFrom(parsed.firstName, parsed.lastName),
      pictureUrl,
    }
    if (parsed.password && parsed.password.length > 0) {
      data.password = await hashPassword(parsed.password)
    }

    const row = await prisma.user.update({
      where: { id: session.userId },
      data,
      include: profileInclude,
    })

    await logActivity({
      userId: session.userId,
      activity: "PROFILE_UPDATE",
      activityData: { fields: Object.keys(data).filter((k) => k !== "password") },
    })

    return toProfile(row)
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/actions/profile-actions.ts
git commit -m "$(cat <<'EOF'
Add getProfile and updateOwnProfile server actions.

EOF
)"
```

---

### Task 4: Time-off access helper + server actions

**Files:**
- Create: `src/features/time-off/actions/time-off-access.ts`
- Create: `src/features/time-off/actions/time-off-actions.ts`

**Interfaces:**
- Consumes: `listManagedLocationIds` from `@/features/shifts/actions/shift-access`, `parseDateOnly` / `formatDateOnly`, schemas from Task 2, `Actions.timeOff`
- Produces:
  - `assertCanReviewTimeOff(session, requesterLocationId)`
  - `listTimeOffRequests(): Promise<ActionResult<TimeOffRequest[]>>`
  - `createTimeOffRequest(input: unknown): Promise<ActionResult<TimeOffRequest>>`
  - `cancelTimeOffRequest(id: string): Promise<ActionResult<TimeOffRequest>>`
  - `approveTimeOffRequest(input: unknown): Promise<ActionResult<TimeOffRequest>>`
  - `rejectTimeOffRequest(input: unknown): Promise<ActionResult<TimeOffRequest>>`

- [ ] **Step 1: Access helper**

`src/features/time-off/actions/time-off-access.ts`:

```ts
import type { AppSession } from "@/features/auth/session"
import { AppError } from "@/features/errors/server"
import { listManagedLocationIds } from "@/features/shifts/actions/shift-access"

/** ADMIN always; otherwise must manage the requester's location. */
export async function assertCanReviewTimeOff(
  session: AppSession,
  requesterLocationId: string | null,
): Promise<void> {
  if (session.role === "ADMIN") return
  if (!requesterLocationId) {
    throw new AppError({
      kind: "permission",
      code: "FORBIDDEN",
      message: "You do not have permission to review that request.",
    })
  }
  const managed = await listManagedLocationIds(session)
  if (!managed.includes(requesterLocationId)) {
    throw new AppError({
      kind: "permission",
      code: "FORBIDDEN",
      message: "You do not have permission to review that request.",
    })
  }
}

export async function canReviewTimeOff(
  session: AppSession,
  requesterLocationId: string | null,
): Promise<boolean> {
  if (session.role === "ADMIN") return true
  if (!requesterLocationId) return false
  const managed = await listManagedLocationIds(session)
  return managed.includes(requesterLocationId)
}
```

- [ ] **Step 2: Implement CRUD + review actions**

In `time-off-actions.ts`:

1. `toPublicRequest(row, canReview)` maps dates with `formatDateOnly`, includes `user.fullName`, `user.locationId`, `reviewedBy.fullName`.
2. `listTimeOffRequests`: `authorize(Actions.timeOff.read)`; scope:
   - ADMIN → all `deletedAt: null`
   - else if managed location ids non-empty → `OR: [{ userId: session.userId }, { user: { locationId: { in: managedIds } } }]`
   - else → `userId: session.userId`
   - orderBy `createdAt desc`; compute `canReview` per row via `canReviewTimeOff`.
3. `createTimeOffRequest`: `authorize(Actions.timeOff.write)`; parse schema; create with `userId: session.userId`, `status: PENDING`, dates via `parseDateOnly`; `logActivity` `TIME_OFF_REQUEST`.
4. `cancelTimeOffRequest(id)`: authorize write; load request; must be own + `PENDING` else `conflict` / `FORBIDDEN` / `not_found`; set `CANCELLED`; audit `TIME_OFF_CANCEL`.
5. `approveTimeOffRequest(input)`: `requireSession` (or authorize read then review gate); parse `reviewTimeOffRequestSchema`; load request + user.locationId; `assertCanReviewTimeOff`; must be `PENDING`; in a transaction:
   - update request → `APPROVED`, set reviewer fields
   - `shiftInstance.updateMany` where `userId`, `deletedAt: null`, `status: SCHEDULED`, `date` between `startDate` and `endDate` (inclusive) → `CANCELLED`
   - audit `TIME_OFF_APPROVE` with cancelled count in `activityData`
6. `rejectTimeOffRequest(input)`: same gate; → `REJECTED`; audit `TIME_OFF_REJECT`; no shift changes.

Date range for shifts: use the stored UTC midnight `startDate`/`endDate` on the request (same `parseDateOnly` convention as shifts).

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`  
Expected: PASS

- [ ] **Step 4: Manual smoke (optional if DB available)**

Via app later; for now ensure actions compile.

- [ ] **Step 5: Commit**

```bash
git add src/features/time-off/actions/
git commit -m "$(cat <<'EOF'
Add time-off list, create, cancel, and approve/reject actions.

EOF
)"
```

---

### Task 5: Time-off list UI + Team route

**Files:**
- Create: `src/features/time-off/components/forms/time-off-request-form-fields.ts`
- Create: `src/features/time-off/components/forms/time-off-request-form.tsx`
- Create: `src/features/time-off/components/forms/time-off-review-form-fields.ts`
- Create: `src/features/time-off/components/forms/time-off-review-form.tsx`
- Create: `src/features/time-off/components/forms/index.ts`
- Create: `src/features/time-off/components/tables/time-off-table-columns.tsx`
- Create: `src/features/time-off/components/pages/time-off-list-page.tsx`
- Create: `src/features/time-off/hooks/use-time-off-list-page.tsx`
- Create: `src/app/(app)/team/time-off/page.tsx`
- Modify: `src/lib/navigation.ts`

**Interfaces:**
- Consumes: actions from Task 4; `TimeOffRequest` / form value types
- Produces: `TimeOffListPageProps`, `useTimeOffListPage()`, route at `/team/time-off`

- [ ] **Step 1: Forms**

Request form fields (`type` select, `startDate`/`endDate` date, `note` textarea). Support props:

```ts
type TimeOffRequestFormProps = {
  /** When set, lock type field (used for Call in sick). */
  lockedType?: TimeOffType
  initialValues?: Partial<TimeOffRequestFormValues>
  onSubmit: (
    values: TimeOffRequestFormValues,
    form: UseFormReturn<TimeOffRequestFormValues>,
  ) => void | Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  submitLabel?: string
}
```

For sick: caller passes `lockedType: "SICK"` and `initialValues` with today for both dates; hide or `canEdit: false` the type field when locked (prefer omit type from fields and inject in submit wrapper, or `canEdit: false` with initial value).

Review form: single optional `reviewNote` textarea; thin `TimeOffReviewForm` around `DynamicForm`.

- [ ] **Step 2: Table columns**

Export `timeOffTableColumns` and `toTimeOffTableRow(request)` with keys: `id`, `userName`, `type`, `startDate`, `endDate`, `status`, `note`, `reviewNote`, `canReview`. Format `type`/`status` with Badge.

- [ ] **Step 3: List hook + page**

Mirror departments list:

- `useTimeOffListPage`: load `listTimeOffRequests`; `loaded`; `onApprove` / `onReject` open form modal with `TimeOffReviewForm` → `approveTimeOffRequest` / `rejectTimeOffRequest` → toast + `load()`.
- Row actions only when `request.canReview && request.status === "PENDING"`.
- No Create button on this page (create lives on profile Leave tab).
- View: `!loaded` → `TableSkeleton` (no create); else `DynamicTable` with search; empty frame OK.

- [ ] **Step 4: Route + nav**

`src/app/(app)/team/time-off/page.tsx`:

```tsx
"use client"

import { TablePageViewport } from "@/components/shared/table"
import { TimeOffListPage } from "@/features/time-off/components/pages/time-off-list-page"
import { useTimeOffListPage } from "@/features/time-off/hooks/use-time-off-list-page"

export default function TeamTimeOffPage() {
  const page = useTimeOffListPage()
  return (
    <TablePageViewport>
      <TimeOffListPage {...page} />
    </TablePageViewport>
  )
}
```

In `navigation.ts` Team `items`, add `{ title: "Time off", url: "/team/time-off" }` (after Activity or after My shifts — prefer after My shifts).

- [ ] **Step 5: Typecheck + manual**

Run: `pnpm typecheck`  
Manual: open `/team/time-off` as ADMIN — table loads (empty OK); skeleton then table.

- [ ] **Step 6: Commit**

```bash
git add src/features/time-off/ src/app/\(app\)/team/time-off/ src/lib/navigation.ts
git commit -m "$(cat <<'EOF'
Add team time-off list page with approve and reject flows.

EOF
)"
```

---

### Task 6: Profile hub UI + sidebar entry

**Files:**
- Create: `src/features/profile/components/forms/profile-form-fields.ts`
- Create: `src/features/profile/components/forms/profile-form.tsx`
- Create: `src/features/profile/components/pages/profile-page.tsx`
- Create: `src/features/profile/hooks/use-profile-page.tsx`
- Create: `src/app/(app)/profile/page.tsx`
- Modify: `src/components/shared/layout/sidebar-user.tsx`
- Modify: `src/lib/navigation.ts` (`getPageTitle` for `/profile`)

**Interfaces:**
- Consumes: `getProfile` / `updateOwnProfile`; `listShiftInstances`; time-off list/create/cancel + request forms
- Produces: `ProfilePageProps`, `useProfilePage()`, `/profile` route

- [ ] **Step 1: Profile form**

Fields: firstName, lastName, pictureUrl, password (optional). Layout `LayoutMode.Single`, columns 2. Thin `ProfileForm` wrapper.

- [ ] **Step 2: Stateless `ProfilePage` with tabs**

Use shadcn `Tabs` like members list:

| Tab value | Content |
|-----------|---------|
| `profile` | Read-only dl/grid: email, role, departmentName, locationName. Then `ProfileForm` wired via props (`profile`, `onSaveProfile`, `profileSaving` if needed). |
| `shifts` | List upcoming: filter prop `upcomingShifts` (SCHEDULED, date >= today, sort asc, cap ~10). Link button to `/team/my-shifts`. Skeleton bars when `!loaded`. |
| `leave` | Mini table or list of `ownRequests`; toolbar buttons Request time off / Call in sick; cancel pending via callback. |

Props sketch:

```ts
export type ProfilePageProps = {
  loaded: boolean
  tab: string
  onTabChange: (tab: string) => void
  profile: Profile | null
  onSaveProfile: (
    values: ProfileFormValues,
    form: UseFormReturn<ProfileFormValues>,
  ) => Promise<void>
  upcomingShifts: ShiftInstance[]
  ownRequests: TimeOffRequest[]
  onRequestTimeOff: () => void
  onCallInSick: () => void
  onCancelRequest: (request: TimeOffRequest) => void
}
```

Keep tab list visible while `!loaded`; disable interactive controls until loaded.

- [ ] **Step 3: `useProfilePage`**

- State: `tab` default `"profile"`, `profile`, `shifts`, `requests`, `loaded`.
- Load in parallel: `getProfile()`, `listShiftInstances()`, `listTimeOffRequests()` then filter `userId === me.id` (or trust list scoping and filter client-side to own).
- `onSaveProfile` → `run(updateOwnProfile(values), { form })` → toast → `refreshMe()` from `useAuth` → reload profile.
- Upcoming: from instances where `status === "SCHEDULED"` and `date >= today` (use local YYYY-MM-DD), sort, slice(0, 10).
- Leave modals: open `TimeOffRequestForm` for time off; sick with `lockedType: "SICK"` and today defaults; submit → `createTimeOffRequest` → toast → reload requests.
- Cancel: `confirm` → `cancelTimeOffRequest(id)` → toast → reload.

- [ ] **Step 4: Route**

```tsx
"use client"

import { ProfilePage } from "@/features/profile/components/pages/profile-page"
import { useProfilePage } from "@/features/profile/hooks/use-profile-page"

export default function ProfileRoute() {
  const page = useProfilePage()
  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <ProfilePage {...page} />
    </div>
  )
}
```

- [ ] **Step 5: Sidebar + title**

In `sidebar-user.tsx`, make the avatar + name/email block navigate to `/profile` (button or clickable region with `aria-label="Open profile"`). Keep logout button separate; stop propagation on logout click.

In `getPageTitle`, before segment fallback:

```ts
  if (pathname === "/profile") return "Profile"
```

Optionally `getPageIcon` → `User` from lucide for `/profile`.

- [ ] **Step 6: Typecheck + manual**

Run: `pnpm typecheck`  
Manual checklist from spec: footer → profile; edit name; shifts tab; request leave; cancel pending.

- [ ] **Step 7: Commit**

```bash
git add src/features/profile/ src/app/\(app\)/profile/ \
  src/components/shared/layout/sidebar-user.tsx src/lib/navigation.ts
git commit -m "$(cat <<'EOF'
Add tabbed profile hub with self-edit, shifts, and leave.

EOF
)"
```

---

### Task 7: Docs and home demos

**Files:**
- Modify: `src/app/(app)/page.tsx`
- Modify: `AGENTS.md` (Demos table)
- Optional one-liner in `.docs/components/architecture.md` only if needed for self-service vs `users:write`

- [ ] **Step 1: Home demos**

Add entries:

```ts
  {
    href: "/profile",
    title: "Profile",
    description:
      "Self-service hub — edit profile, upcoming shifts, request time off / sick",
  },
  {
    href: "/team/time-off",
    title: "Time off",
    description:
      "Leave requests inbox — admin / location manager approve cancels shifts",
  },
```

- [ ] **Step 2: AGENTS.md demos table**

Add rows for `/profile` and `/team/time-off` matching the design.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`  
Expected: PASS

- [ ] **Step 4: Full manual test plan** (from spec)

- [ ] Footer → `/profile`; tabs work; logout still works  
- [ ] USER updates name / picture / password; email/role/dept/location not editable  
- [ ] Shifts tab + link to calendar  
- [ ] Request time off + call in sick → PENDING  
- [ ] Cancel own pending  
- [ ] Manager approve → APPROVED + overlapping SCHEDULED shifts CANCELLED  
- [ ] Manager cannot approve outside managed locations  
- [ ] ADMIN full inbox  
- [ ] USER cannot approve others  
- [ ] Activity shows new event types  

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/page.tsx AGENTS.md .docs/components/architecture.md
git commit -m "$(cat <<'EOF'
Document profile and time-off demos in home and AGENTS.

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `TimeOffRequest` model + soft-delete | 1 |
| Approve cancels overlapping SCHEDULED shifts | 4 |
| `timeOff` RBAC + Activity enums | 1 |
| `updateOwnProfile` without `users:write` | 3 |
| `/profile` tabs Profile / Shifts / Leave | 6 |
| Sidebar footer entry | 6 |
| Two leave entry points, one model | 5 (forms) + 6 (modals) |
| `/team/time-off` inbox | 5 |
| Admin + location manager review | 4 + 5 |
| Skeletons / no “Loading…” | 5, 6 |
| Docs / demos | 7 |
| Out-of-scope items omitted | — |

## Self-review notes

- No placeholders left in steps.
- Types `TimeOffRequest.canReview` / `Profile` / form values stay consistent across tasks 2–6.
- Client never imports `*/server` or `session.ts`.
- Create stays on profile; list page is review-focused (matches spec §5).
