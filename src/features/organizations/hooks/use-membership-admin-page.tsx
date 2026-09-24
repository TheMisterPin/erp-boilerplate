"use client"

import { useCallback, useMemo, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import { useModal } from "@/components/shared/modals"
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"
import {
  addMembership,
  changeMembershipRole,
  changeMembershipStatus,
  listOrganizationMemberships,
  listOrganizationRoles,
  removeMembership,
} from "@/features/organizations/actions/membership-actions"
import {
  AddMembershipForm,
  ChangeMembershipRoleForm,
} from "@/features/organizations/components/forms/membership-form"
import type { MembershipAdminPageProps } from "@/features/organizations/components/pages/membership-admin-page"
import { toMembershipTableRow } from "@/features/organizations/components/tables/membership-table-columns"
import type {
  AddMembershipFormValues,
  ChangeMembershipRoleFormValues,
  OrganizationMembership,
  OrganizationRoleOption,
} from "@/features/organizations/types/organization-types"
import { useSharedPageLoad } from "@/hooks/use-shared-page-load"

export function useMembershipAdminPage(): MembershipAdminPageProps {
  const { me } = useAuth()
  const { run } = useError()
  const { openModal, closeModal, setDirty, confirm } = useModal()
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [roles, setRoles] = useState<OrganizationRoleOption[]>([])
  const [loaded, setLoaded] = useState(false)

  const canRead = me ? can(me.role, Actions.memberships.read) : false
  const canWrite = me ? can(me.role, Actions.memberships.write) : false

  const load = useCallback(async () => {
    const [nextMemberships, nextRoles] = await Promise.all([
      run(listOrganizationMemberships()),
      run(listOrganizationRoles()),
    ])
    setMemberships(nextMemberships ?? [])
    setRoles(nextRoles ?? [])
    setLoaded(true)
  }, [run])

  useSharedPageLoad("organization-memberships", load)

  const rows = useMemo(
    () => memberships.map(toMembershipTableRow),
    [memberships],
  )

  const onAdd = useCallback(() => {
    if (roles.length === 0) return
    let formId = ""
    formId = openModal({
      type: "form",
      title: "Add organization membership",
      size: "md",
      component: (
        <AddMembershipForm
          roles={roles}
          initialValues={{ roleId: roles.find((role) => role.key === "OPERATOR")?.id ?? roles[0]?.id }}
          onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
          onSubmit={async (
            values: AddMembershipFormValues,
            form: UseFormReturn<AddMembershipFormValues>,
          ) => {
            const data = await run(addMembership(values), { form })
            if (data) {
              toast.success(`${data.fullName} added to this organization`)
              closeModal(formId)
              await load()
            }
          }}
        />
      ),
    })
  }, [closeModal, load, openModal, roles, run, setDirty])

  const onChangeRole = useCallback(
    (membership: OrganizationMembership) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: `Change role — ${membership.fullName}`,
        size: "sm",
        component: (
          <ChangeMembershipRoleForm
            roles={roles}
            initialValues={{ roleId: membership.roleId }}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: ChangeMembershipRoleFormValues,
              form: UseFormReturn<ChangeMembershipRoleFormValues>,
            ) => {
              const data = await run(
                changeMembershipRole({
                  membershipId: membership.id,
                  roleId: values.roleId,
                }),
                { form },
              )
              if (data) {
                toast.success(`${data.fullName}'s role was updated`)
                closeModal(formId)
                await load()
              }
            }}
          />
        ),
      })
    },
    [closeModal, load, openModal, roles, run, setDirty],
  )

  const onChangeStatus = useCallback(
    async (membership: OrganizationMembership) => {
      const nextStatus = membership.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
      const ok = await confirm({
        title:
          nextStatus === "ACTIVE"
            ? "Activate membership?"
            : "Deactivate membership?",
        message:
          nextStatus === "ACTIVE"
            ? `${membership.fullName} will regain access to this organization.`
            : `${membership.fullName} will lose access to this organization until reactivated.`,
        variant: nextStatus === "ACTIVE" ? "default" : "destructive",
        confirmLabel: nextStatus === "ACTIVE" ? "Activate" : "Deactivate",
      })
      if (!ok) return
      const data = await run(
        changeMembershipStatus({ membershipId: membership.id, status: nextStatus }),
      )
      if (data) {
        toast.success(
          nextStatus === "ACTIVE" ? "Membership activated" : "Membership deactivated",
        )
        await load()
      }
    },
    [confirm, load, run],
  )

  const onRemove = useCallback(
    async (membership: OrganizationMembership) => {
      const ok = await confirm({
        title: "Remove membership?",
        message: `${membership.fullName} will no longer belong to this organization. Their user account is not deleted.`,
        variant: "destructive",
        confirmLabel: "Remove",
      })
      if (!ok) return
      const removed = await run(removeMembership({ membershipId: membership.id }))
      if (removed) {
        toast.success("Membership removed")
        await load()
      }
    },
    [confirm, load, run],
  )

  return {
    loaded,
    canRead,
    canWrite,
    memberships,
    roles,
    rows,
    onAdd,
    onChangeRole,
    onChangeStatus,
    onRemove,
  }
}
