"use client"

import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import { profileFormFields } from "@/features/profile/components/forms/profile-form-fields"
import type { ProfileFormValues } from "@/features/profile/types/profile-types"

export type ProfileFormProps = {
  initialValues: Partial<ProfileFormValues>
  onSubmit: (
    values: ProfileFormValues,
    form: UseFormReturn<ProfileFormValues>,
  ) => void | Promise<void>
}

export function ProfileForm({
  initialValues,
  onSubmit,
}: ProfileFormProps) {
  return (
    <DynamicForm<ProfileFormValues>
      fields={profileFormFields}
      layout={{ mode: LayoutMode.Single, columns: 2 }}
      isEdit
      initialValues={initialValues}
      onSubmit={onSubmit}
      submitLabel="Save profile"
    />
  )
}
