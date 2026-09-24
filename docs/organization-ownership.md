# Organization ownership

Organizations are the tenant boundary. A user may have memberships in many
organizations, but each request resolves exactly one active organization from
the signed session. Both the organization and membership must be active.

The global `User.role` is reserved for platform-level operations.
Organization-scoped role assignments authorize work inside this tenant.
Business-record ownership plus scoped queries are added in issue #16; until
that migration lands, the active organization and its role are authoritative
for permissions but legacy business rows do not yet carry tenant ownership.

## Migration and recovery

The forward migration creates a deterministic `Default Organization` and an
active membership for every existing user. It does not delete or rewrite any
existing record. Deploy the schema migration before application instances that
require `activeOrganizationId` begin serving traffic; existing JWTs will be
rejected and users will sign in again.

For recovery, restore the pre-migration database snapshot or roll the
application back while retaining the new tables. Do not drop the organization
tables after organization-scoped data or roles have been written. A destructive
rollback is safe only before issues #13 and #16 are deployed, and consists of
dropping `Membership`, then `Organization`, then their two enum types.
