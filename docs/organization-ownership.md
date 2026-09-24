# Organization ownership

Organizations are the tenant boundary. A user may have memberships in many
organizations, but each request resolves exactly one active organization from
the signed session. Both the organization and membership must be active.

The global `User.role` is reserved for platform-level operations.
Organization-scoped role assignments authorize work inside this tenant.
Departments, locations, shift templates and instances, attendance, time-off,
and audit events carry a required `organizationId`. Server actions derive that
value from the signed session for creates and include it in every lookup,
aggregate, update guard, and relationship validation.

Department and location assignments live on `Membership`, not `User`, because
the same person can belong to different departments and locations in different
organizations. An identifier owned by another organization is treated as not
found and cannot be attached to a new or updated record.

## Migration and recovery

The first forward migration creates a deterministic `Default Organization` and
an active membership for every existing user. The tenant-scoping migration
then assigns existing business records to that organization and copies legacy
department and location assignments onto the default membership before
removing those columns from `User`.

Before applying the tenant-scoping migration, check for duplicate active
department or location names, case-insensitively, in the legacy dataset. The
migration adds per-organization unique indexes for those names and will stop
instead of silently choosing or deleting a duplicate. Resolve duplicates and
rerun the migration.

Deploy both schema migrations before application instances that require
`activeOrganizationId` begin serving traffic; existing JWTs will be rejected
and users will sign in again.

For recovery, restore the pre-migration database snapshot or roll the
application back while retaining the new tables. Do not drop the organization
tables after organization-scoped data or roles have been written. A destructive
rollback is safe only before tenant-owned data has been written. After that,
restore the pre-migration snapshot; rolling back the columns would discard the
organization boundary and membership-specific assignments.
