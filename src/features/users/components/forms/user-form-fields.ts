import type { FieldDef } from "@/components/shared/forms/types"
import type { UserFormValues } from "@/features/users/types/user-types"
import {
  userDepartmentIdSchema,
  userEmailSchema,
  userFirstNameSchema,
  userIsActiveSchema,
  userLastNameSchema,
  userLocationIdSchema,
  userPasswordOptionalSchema,
  userPasswordSchema,
  userPictureUrlSchema,
  userRoleSchema,
} from "@/lib/schemas/user"

export type SelectOption = { label: string; value: string }

const noneOption: SelectOption = { label: "None", value: "" }

type BuildUserFormFieldsOptions = {
  departmentOptions?: SelectOption[]
  locationOptions?: SelectOption[]
}

function buildBaseFields(
  departmentOptions: SelectOption[],
  locationOptions: SelectOption[],
): FieldDef<UserFormValues>[] {
  return [
    {
      name: "email",
      type: "text",
      label: "Email",
      placeholder: "you@example.com",
      validation: userEmailSchema,
      canEdit: false,
    },
    {
      name: "firstName",
      type: "text",
      label: "First name",
      placeholder: "Ada",
      validation: userFirstNameSchema,
    },
    {
      name: "lastName",
      type: "text",
      label: "Last name",
      placeholder: "Lovelace",
      validation: userLastNameSchema,
    },
    {
      name: "role",
      type: "select",
      label: "Role",
      placeholder: "Select a role",
      validation: userRoleSchema,
      options: [
        { label: "Admin", value: "ADMIN" },
        { label: "Manager", value: "MANAGER" },
        { label: "Operator", value: "OPERATOR" },
        { label: "Viewer", value: "VIEWER" },
      ],
    },
    {
      name: "departmentId",
      type: "select",
      label: "Department",
      placeholder: "Select a department",
      validation: userDepartmentIdSchema,
      options: [noneOption, ...departmentOptions],
    },
    {
      name: "locationId",
      type: "select",
      label: "Location",
      placeholder: "Select a location",
      validation: userLocationIdSchema,
      options: [noneOption, ...locationOptions],
    },
    {
      name: "pictureUrl",
      type: "text",
      label: "Picture URL",
      placeholder: "https://…",
      validation: userPictureUrlSchema,
    },
    {
      name: "isActive",
      type: "switch",
      label: "Active",
      validation: userIsActiveSchema,
      defaultValue: true,
    },
  ]
}

const createPasswordField: FieldDef<UserFormValues> = {
  name: "password",
  type: "text",
  label: "Password",
  placeholder: "Min. 8 characters",
  validation: userPasswordSchema,
}

const editPasswordField: FieldDef<UserFormValues> = {
  name: "password",
  type: "text",
  label: "New password",
  placeholder: "Leave blank to keep current",
  validation: userPasswordOptionalSchema,
}

export function buildCreateUserFormFields(
  options: BuildUserFormFieldsOptions = {},
): FieldDef<UserFormValues>[] {
  const base = buildBaseFields(
    options.departmentOptions ?? [],
    options.locationOptions ?? [],
  )
  return [...base.slice(0, 4), createPasswordField, ...base.slice(4)]
}

export function buildEditUserFormFields(
  options: BuildUserFormFieldsOptions = {},
): FieldDef<UserFormValues>[] {
  const base = buildBaseFields(
    options.departmentOptions ?? [],
    options.locationOptions ?? [],
  )
  return [...base.slice(0, 4), editPasswordField, ...base.slice(4)]
}

/** @deprecated Prefer buildCreateUserFormFields via UserForm */
export const createUserFormFields = buildCreateUserFormFields()

/** @deprecated Prefer buildEditUserFormFields via UserForm */
export const editUserFormFields = buildEditUserFormFields()

/** @deprecated Prefer createUserFormFields / editUserFormFields via UserForm */
export const userFormFields = createUserFormFields
