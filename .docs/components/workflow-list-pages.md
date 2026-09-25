# Workflow list pages

Inbox-style lists for **status workflows** (request → review → approve/reject/cancel). Same table shell as CRUD lists; different mutations and gates.

Canonical reference: **`src/features/time-off/`** → `/team/time-off`  
Requester surface (create/cancel): **`src/features/profile/`** (settings pattern).

Related: [List pages](./list-pages.md), [Settings pages](./settings-pages.md), [Architecture](./architecture.md).

---

## When to use this

| Use workflow lists | Use plain list CRUD instead |
|--------------------|-----------------------------|
| Approve / reject / cancel inboxes | Entity create/edit/soft-delete |
| Status lifecycle (`PENDING` → …) | Catalogs (departments, locations, templates) |
| Submit on one surface, review on another | Single-page full CRUD |

---

## Shape (shared with list CRUD)

| Layer | Job |
|-------|-----|
| Route | `TablePageViewport` + hook → view |
| Hook | `use-*-list-page` — load via `run()`, open review modals, reload |
| View | `DynamicTable` + `TableSkeleton`; row actions from props |
| Actions | List + transition mutations; optional `*-access.ts` for resource checks |

Do **not** invent a parallel table stack. Keep `toXTableRow` + `toolbarActions` / `rowActions`.

---

## Conventions (delta from CRUD)

1. **Split surfaces**: requesters create/cancel on a settings/self-service page (or their own hub); reviewers use the team inbox list.
2. **Row actions from status + server flag**: e.g. time-off exposes `canReview` on each row; only show Approve/Reject when `canReview && status === "PENDING"`. Do not gate review solely with `can(me.role, Actions.*.write)`.
3. **Thin review forms**: small `*ReviewForm` (optional note) via `openModal({ type: "form" })` — not a full entity editor.
4. **Status transitions**, not soft-delete UI: update `status` (`PENDING` → `APPROVED` | `REJECTED` | `CANCELLED`). Still filter `deletedAt: null` if the model has it.
5. **Side effects in the approve/reject action** (e.g. cancel overlapping shifts) — keep them server-side inside `withErrorBoundary`.
6. **Toolbar**: often empty (no Create on the inbox). Empty state can explain that requests are filed elsewhere.
7. **Audit**: `logActivity` with the matching `TIME_OFF_*` (or domain) enum values + `organizationId`.

```ts
// ✅ review gate — resource check, not matrix write alone
await assertCanReviewTimeOff(session, request)
```

```tsx
// ✅ row actions — status + server-computed canReview
rowActions={
  ({ row }) => {
    const item = items.find((i) => i.id === row.id)
    if (!item?.canReview || item.status !== "PENDING") return null
    return (/* Approve / Reject → onApprove / onReject */)
  }
}
```

---

## Time-off map

| Concern | Location |
|---------|----------|
| Inbox list | `hooks/use-time-off-list-page.tsx`, `components/pages/time-off-list-page.tsx` |
| Review form | `components/forms/time-off-review-form.tsx` |
| Review access | `actions/time-off-access.ts` |
| Create / cancel UI | `features/profile` (settings page) |
| Demo route | `/team/time-off` |

---

## Adding another workflow inbox

1. Reuse list-page folder shape under `src/features/<f>/`.
2. Add status enum + transition actions; document who may transition (matrix vs resource check).
3. Put submit/cancel on the requester surface; put review on the inbox list.
4. Extend tenant-isolation tests for list + foreign transitions.
5. Do not add `[id]` detail routes unless the task asks for them.
