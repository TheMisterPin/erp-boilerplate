# Profile hub & time off — design

**Date:** 2026-08-06  
**Status:** Approved (approach 2)

## Goal

Give every signed-in user a **Profile** hub (sidebar footer) to edit limited personal data, see upcoming shifts, and request time off or call in sick. Approvers (admins and location managers) confirm leave before it takes effect; approval cancels overlapping scheduled shifts. Approvers also get a Team inbox list at `/team/time-off`.

## Decisions

| Topic | Choice |
|-------|--------|
| Page shape | One hub at `/profile` with **tabs**: Profile / Shifts / Leave |
| Entry | Sidebar footer user block → `/profile` (not main nav tree) |
| Architecture | Thin `features/profile` hub + full `features/time-off` vertical (approach **2**) |
| Self-edit fields | `firstName`, `lastName`, `pictureUrl`, optional password |
| Leave model | Date-range request: `TIME_OFF` \| `SICK` + optional note |
| Leave UX | Two entry points, one model: “Request time off” vs “Call in sick” (sick defaults to today, type locked) |
| On approve | Cancel overlapping `ShiftInstance` with `status: SCHEDULED` in range (set `CANCELLED`) |
| Approvers | ADMIN + location managers for requesters at managed locations |
| Approver UI | Own requests on Leave tab; inbox at `/team/time-off` |

## Scope

### In

- `/profile` tabbed hub + footer navigation
- `updateOwnProfile` / `getProfile` (session ownership; not `users:write`)
- Upcoming shifts summary + link to `/team/my-shifts`
- Prisma `TimeOffRequest` + enums; shared zod; RBAC; audit activities
- Create / cancel own pending; approve / reject with optional review note
- `/team/time-off` list page + Team nav item
- Skeletons / `TableSkeleton` per existing conventions
- Short demo / AGENTS / `.docs` updates when shipping

### Out (v1)

- PTO balances, accruals, holiday calendars
- Email / push notifications
- Auto-approve sick leave
- Re-open rejected requests; edit approved leave
- Cover / reassignment of cancelled shifts
- Self-service email, role, department, or location changes
- `?tab=` deep links
- Detail routes (`/profile/[id]`, etc.)

## Design

### 1. Data model

**`TimeOffRequest`**

| Field | Notes |
|-------|--------|
| `id` | uuid |
| `userId` | → User |
| `type` | `TIME_OFF` \| `SICK` |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED` |
| `startDate`, `endDate` | Inclusive calendar dates (store UTC midnight, same as shifts) |
| `note` | optional |
| `reviewedById`, `reviewedAt`, `reviewNote` | set on approve/reject |
| `createdAt`, `updatedAt`, `deletedAt` | soft-delete like other domain models |

Indexes: `[userId, status]`, `[status, startDate]`.

**Approve side effect:** status → `APPROVED`; then update requester’s `ShiftInstance` rows where `deletedAt: null`, `status: SCHEDULED`, and `date` in `[startDate, endDate]` → `status: CANCELLED`. Reject / user-cancel of `PENDING` does not touch shifts. No re-approve of rejected rows in v1 (submit a new request).

**User relation:** add `timeOffRequests TimeOffRequest[]` on `User` (and optional `reviewedTimeOffRequests` via `reviewedById`).

### 2. Permissions & audit

**RBAC** (`permissions.ts`)

| Permission | ADMIN | USER |
|------------|-------|------|
| `timeOff:read` | yes | yes |
| `timeOff:write` | yes | yes |

- **Create / cancel own pending:** `authorize(Actions.timeOff.write)` + `userId === session.userId`.
- **List:** `authorize(Actions.timeOff.read)` then scope: USER → own; location manager → requesters whose `locationId` is in managed locations; ADMIN → all.
- **Approve / reject:** not granted by matrix alone — after `requireSession`, allow if `role === ADMIN` **or** requester’s `locationId` is managed by session user (mirror `assertCanWriteShiftsAtLocation` / assign-location pattern). Throw `AppError` `permission` / `FORBIDDEN` otherwise.
- **Profile self-update:** `requireSession` + always operate on `session.userId` only. Do **not** require `users:write`.

**`Activity` enum additions:** `PROFILE_UPDATE`, `TIME_OFF_REQUEST`, `TIME_OFF_APPROVE`, `TIME_OFF_REJECT`, `TIME_OFF_CANCEL`. Call `logActivity` on those mutations.

### 3. Routes & navigation

| Route | Role |
|-------|------|
| `/profile` | Tabbed hub; footer entry |
| `/team/time-off` | List inbox / request list |
| `/team/my-shifts` | Unchanged full calendar (linked from Shifts tab) |

- `SidebarUser`: clicking avatar/name (not logout) → `router.push("/profile")`.
- `navigation.ts`: add Team sub-item `{ title: "Time off", url: "/team/time-off" }`.
- `getPageTitle("/profile")` → `"Profile"` (explicit case; not in `navigationItems`).

### 4. Profile hub UI

Stateless `ProfilePage` + `useProfilePage` hook. Use shadcn `Tabs` (same pattern as members/locations list chrome).

| Tab | Contents |
|-----|----------|
| **Profile** | Read-only: email, role, department name, location name. Editable: first name, last name, picture URL, optional new password. Submit → `updateOwnProfile` via `run({ form })` → toast → `refreshMe()`. |
| **Shifts** | Compact list of upcoming own `SCHEDULED` instances (from existing `listShiftInstances` scoping). CTA link to `/team/my-shifts`. |
| **Leave** | Own requests + status. Toolbar: **Request time off** / **Call in sick** (form modals). Cancel own `PENDING` via `confirm`. |

- Default tab: **Profile**.
- Loading: keep tab chrome; per-tab body skeleton (or page-level gate with disabled tab panels) — never bare “Loading…” text.
- Forms: FieldDef builders + thin wrappers around `DynamicForm`; validators from `src/lib/schemas/`.

**Call in sick vs time off:** same `TimeOffRequest` model and create action. Sick modal locks `type: SICK` and defaults `startDate`/`endDate` to today; time-off modal allows future ranges and `type: TIME_OFF`.

### 5. Team time-off list

Mirror users list vertical:

- Route: thin `page.tsx` → `useTimeOffListPage` → `TimeOffListPage`.
- `TablePageViewport` + `DynamicTable` + `TableSkeleton` while `!loaded`.
- Columns: person, type, dates, status, note (and review fields as needed).
- Row actions: Approve / Reject when current user may approve that row; optional review-note form modal.
- Create stays on profile Leave tab (list page is primarily the inbox; USERs may still see their own rows here).

### 6. Feature layout

```
src/features/profile/
  types/
  actions/          # getProfile, updateOwnProfile
  hooks/use-profile-page.tsx
  components/forms/
  components/pages/profile-page.tsx

src/features/time-off/
  types/
  actions/          # list, create, cancel, approve, reject + access helper
  hooks/use-time-off-list-page.tsx
  components/forms/
  components/tables/
  components/pages/time-off-list-page.tsx

src/lib/schemas/time-off.ts   # (+ profile field reuse from user schemas)
src/app/(app)/profile/page.tsx
src/app/(app)/team/time-off/page.tsx
```

### 7. Server actions (contract)

All return `ActionResult<T>` via `withErrorBoundary`. Known failures → `AppError`.

| Action | Gate | Behavior |
|--------|------|----------|
| `getProfile` | session | Current user + dept/location names |
| `updateOwnProfile` | session | Parse subset; hash password if present; update self; audit |
| `listTimeOffRequests` | `timeOff:read` | Scoped list, `deletedAt: null` |
| `createTimeOffRequest` | `timeOff:write` + self | Validate range; create `PENDING`; audit |
| `cancelTimeOffRequest` | `timeOff:write` + self + `PENDING` | → `CANCELLED`; audit |
| `approveTimeOffRequest` | approver gate | → `APPROVED`; cancel overlapping scheduled shifts; audit |
| `rejectTimeOffRequest` | approver gate | → `REJECTED`; audit |

Client: only `useError().run()` — no try/catch UI. Toasts for success; channel table for failures.

### 8. Docs on ship

- AGENTS demos table: `/profile`, `/team/time-off`
- Touch `.docs/components/architecture.md` or auth only if conventions need a one-liner (self-service vs `users:write`)

## Test plan (manual)

- [ ] Footer → `/profile`; tabs Profile / Shifts / Leave; logout still works
- [ ] USER updates name / picture / password; email/role/dept/location not editable; `refreshMe` updates sidebar
- [ ] Shifts tab shows upcoming scheduled; link opens `/team/my-shifts`
- [ ] Request time off (future range) and call in sick (today); both appear as `PENDING`
- [ ] USER cancels own pending; cannot cancel approved
- [ ] Manager approves request for user at managed location → status `APPROVED` + overlapping scheduled shifts `CANCELLED`
- [ ] Manager cannot approve for users outside managed locations
- [ ] ADMIN sees full `/team/time-off` inbox; approve/reject with optional note
- [ ] USER cannot approve others
- [ ] List/profile loading uses skeletons, not “Loading…” text
- [ ] Activity log records profile update and time-off lifecycle events
