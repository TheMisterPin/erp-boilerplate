"use client"

import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import {
  buildAddMembershipFormFields,
  buildChangeMembershipRoleFormFields,
} from "@/features/organizations/components/forms/membership-form-fields"
import type {
  AddMembershipFormValues,
  ChangeMembershipRoleFormValues,
  OrganizationRoleOption,
} from "@/features/organizations/types/organization-types"

type AddMembershipFormProps = {
  roles: OrganizationRoleOption[]
  initialValues?: Partial<AddMembershipFormValues>
  onSubmit: (
    values: AddMembershipFormValues,
    form: UseFormReturn<AddMembershipFormValues>,
  ) => void | Promise<void>
  onDirtyChange?: (isDirty: boolean) => void
}

export function AddMembershipForm({
  roles,
  initialValues,
  onSubmit,
  onDirtyChange,
}: AddMembershipFormProps) {
  return (
    <DynamicForm<AddMembershipFormValues>
      fields={buildAddMembershipFormFields(roles)}
      layout={{ mode: LayoutMode.Single, columns: 2 }}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onDirtyChange={onDirtyChange}
      submitLabel="Add membership"
    />
  )
}

type ChangeMembershipRoleFormProps = {
  roles: OrganizationRoleOption[]
  initialValues: Partial<ChangeMembershipRoleFormValues>
  onSubmit: (
    values: ChangeMembershipRoleFormValues,
    form: UseFormReturn<ChangeMembershipRoleFormValues>,
  ) => void | Promise<void>
  onDirtyChange?: (isDirty: boolean) => void
}

export function ChangeMembershipRoleForm({
  roles,
  initialValues,
  onSubmit,
  onDirtyChange,
}: ChangeMembershipRoleFormProps) {
  return (
    <DynamicForm<ChangeMembershipRoleFormValues>
      fields={buildChangeMembershipRoleFormFields(roles)}
      layout={{ mode: LayoutMode.Single, columns: 2 }}
      isEdit
      initialValues={initialValues}
      onSubmit={onSubmit}
      onDirtyChange={onDirtyChange}
      submitLabel="Save role"
    />
  )
}
