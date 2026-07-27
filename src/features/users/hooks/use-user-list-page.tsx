"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { UseFormReturn } from "react-hook-form"

import { useModal } from "@/components/shared/modals"
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"
import { listManagedLocations } from "@/features/locations/actions/location-actions"
import {
  assignUserToLocation,
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "@/features/users/actions/user-actions"
import { AssignLocationForm } from "@/features/users/components/forms/assign-location-form"
import { UserForm } from "@/features/users/components/forms/user-form"
import { toUserTableRow } from "@/features/users/components/tables/user-table-columns"
import type { UserListPageProps } from "@/features/users/components/pages/user-list-page"
import type {
  AssignLocationFormValues,
  User,
  UserFormValues,
} from "@/features/users/types/user-types"

function toUserFormValues(user: User): Partial<UserFormValues> {
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    departmentId: user.departmentId ?? "",
    locationId: user.locationId ?? "",
    pictureUrl: user.pictureUrl ?? "",
    isActive: user.isActive,
  }
}

/** Page logic for members list — inject into `UserListPage`. */
export function useUserListPage(): UserListPageProps {
  const { run } = useError()
  const { me } = useAuth()
  const { openModal, closeModal, setDirty, confirm } = useModal()
  const [users, setUsers] = useState<User[]>([])
  const [managedCount, setManagedCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const canWrite = me ? can(me.role, Actions.users.write) : false
  const canAssignLocation =
    canWrite || (!!me && me.role === "USER" && managedCount > 0)

  const load = useCallback(async () => {
    const [data, managed] = await Promise.all([
      run(listUsers()),
      run(listManagedLocations()),
    ])
    setUsers(data ?? [])
    setManagedCount((managed ?? []).length)
    setLoaded(true)
  }, [run])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [data, managed] = await Promise.all([
        run(listUsers()),
        run(listManagedLocations()),
      ])
      if (cancelled) return
      setUsers(data ?? [])
      setManagedCount((managed ?? []).length)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const rows = useMemo(() => users.map(toUserTableRow), [users])

  const onCreate = useCallback(() => {
    let formId = ""
    formId = openModal({
      type: "form",
      title: "New member",
      size: "lg",
      component: (
        <UserForm
          onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
          onSubmit={async (
            values: UserFormValues,
            form: UseFormReturn<UserFormValues>,
          ) => {
            const data = await run(createUser(values), { form })
            if (data) {
              toast.success("Member created")
              closeModal(formId)
              await load()
            }
          }}
        />
      ),
    })
  }, [closeModal, load, openModal, run, setDirty])

  const onEdit = useCallback(
    (user: User) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: "Edit member",
        size: "lg",
        component: (
          <UserForm
            isEdit
            initialValues={toUserFormValues(user)}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: UserFormValues,
              form: UseFormReturn<UserFormValues>,
            ) => {
              const data = await run(
                updateUser({ ...values, id: user.id }),
                { form },
              )
              if (data) {
                toast.success("Member saved")
                closeModal(formId)
                await load()
              }
            }}
          />
        ),
      })
    },
    [closeModal, load, openModal, run, setDirty],
  )

  const onDelete = useCallback(
    async (user: User) => {
      const ok = await confirm({
        title: "Delete this member?",
        message: `${user.fullName} will be soft-deleted and marked inactive.`,
        variant: "destructive",
        confirmLabel: "Delete",
      })
      if (!ok) return
      const result = await run(deleteUser(user.id))
      if (result) {
        toast.success("Member deleted")
        await load()
      }
    },
    [confirm, load, run],
  )

  const onAssignLocation = useCallback(
    (user: User) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: `Assign location — ${user.fullName}`,
        size: "md",
        component: (
          <AssignLocationForm
            initialValues={{ locationId: user.locationId ?? "" }}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: AssignLocationFormValues,
              form: UseFormReturn<AssignLocationFormValues>,
            ) => {
              const data = await run(
                assignUserToLocation({
                  userId: user.id,
                  locationId: values.locationId,
                }),
                { form },
              )
              if (data) {
                toast.success(
                  data.locationName
                    ? `Assigned to ${data.locationName}`
                    : "Location cleared",
                )
                closeModal(formId)
                await load()
              }
            }}
          />
        ),
      })
    },
    [closeModal, load, openModal, run, setDirty],
  )

  return {
    loaded,
    users,
    rows,
    canWrite,
    canAssignLocation,
    onCreate,
    onEdit,
    onDelete,
    onAssignLocation,
  }
}
