# Organization roles and system roles

Authorization has two separate scopes:

- `User.role` is a system-level account role. It is reserved for platform-wide
  operations such as creating or disabling organizations and is never used to
  authorize an organization's business data.
- `OrganizationRole` and `RoleAssignment` authorize work inside the active
  organization. Every authenticated request resolves the selected membership,
  its assignment, and the assigned role from the database.

The seeded organization roles are Admin, Manager, Operator, and Viewer. Their
stored permission strings are filtered through the typed `Actions` catalog;
unknown strings grant nothing. Missing, deleted, inactive, or cross-organization
assignments also grant nothing.

The migration preserves current behavior by assigning legacy system Admin users
to the organization Admin role and legacy User accounts to Operator. Operator's
initial permission set matches the old User matrix. Seed/bootstrap logic always
creates the role catalog before assigning the first organization administrator.

Business server actions authorize against the active membership's stored grants.
Client gates use the same typed role defaults for presentation only; the server
check remains authoritative.
