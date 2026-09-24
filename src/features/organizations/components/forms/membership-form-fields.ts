import type { FieldDef } from "@/components/shared/forms/types"
import type {
  AddMembershipFormValues,
  ChangeMembershipRoleFormValues,
  OrganizationRoleOption,
} from "@/features/organizations/types/organization-types"
import {
  membershipRoleIdSchema,
} from "@/lib/schemas/membership"
import { userEmailSchema } from "@/lib/schemas/user"

type RoleOption = { label: string; value: string }

function roleOptions(roles: OrganizationRoleOption[]): RoleOption[] {
  return roles.map((role) => ({ label: role.name, value: role.id }))
}

export function buildAddMembershipFormFields(
  roles: OrganizationRoleOption[],
): FieldDef<AddMembershipFormValues>[] {
  return [
    {
      name: "email",
      type: "email",
      label: "Existing account email",
      placeholder: "person@example.com",
      description: "Create a user account first if this person has not signed up yet.",
      validation: userEmailSchema,
      colSpan: 2,
    },
    {
      name: "roleId",
      type: "select",
      label: "Organization role",
      placeholder: "Select a role",
      validation: membershipRoleIdSchema,
      options: roleOptions(roles),
      colSpan: 2,
    },
  ]
}

export function buildChangeMembershipRoleFormFields(
  roles: OrganizationRoleOption[],
): FieldDef<ChangeMembershipRoleFormValues>[] {
  return [
    {
      name: "roleId",
      type: "select",
      label: "Organization role",
      placeholder: "Select a role",
      validation: membershipRoleIdSchema,
      options: roleOptions(roles),
      colSpan: 2,
    },
  ]
}
