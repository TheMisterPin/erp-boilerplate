"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import type { UseFormReturn } from "react-hook-form"

import { applyServerErrors } from "@/components/shared/forms/lib/apply-server-errors"
import { useModal } from "@/components/shared/modals"
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"
import { useSharedPageLoad } from "@/hooks/use-shared-page-load"
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "@/features/departments/actions/department-actions"
import { DepartmentForm } from "@/features/departments/components/forms/department-form"
import type { DepartmentListPageProps } from "@/features/departments/components/pages/department-list-page"
import { toDepartmentTableRow } from "@/features/departments/components/tables/department-table-columns"
import type {
  Department,
  DepartmentFormValues,
} from "@/features/departments/types/department-types"

function toDepartmentFormValues(
  department: Department,
): Partial<DepartmentFormValues> {
  return {
    name: department.name,
    description: department.description ?? "",
    isActive: department.isActive,
  }
}

/** Page logic for departments list — inject into `DepartmentListPage`. */
export function useDepartmentListPage(): DepartmentListPageProps {
  const { run } = useError()
  const { me } = useAuth()
  const { openModal, closeModal, setDirty, confirm } = useModal()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loaded, setLoaded] = useState(false)

  const canWrite = me ? can(me.role, Actions.departments.write) : false

  const load = useCallback(async () => {
    const data = await run(listDepartments())
    setDepartments(data ?? [])
    setLoaded(true)
  }, [run])

  useSharedPageLoad("departments", load)

  const rows = useMemo(
    () => departments.map(toDepartmentTableRow),
    [departments],
  )

  const onCreate = useCallback(() => {
    let formId = ""
    formId = openModal({
      type: "form",
      title: "New department",
      size: "lg",
      component: (
        <DepartmentForm
          onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
          onSubmit={async (
            values: DepartmentFormValues,
            form: UseFormReturn<DepartmentFormValues>,
          ) => {
            const data = await run(createDepartment(values), {
              onFieldErrors: (fe) => applyServerErrors(form, fe),
            })
            if (data) {
              toast.success("Department created")
              closeModal(formId)
              await load()
            }
          }}
        />
      ),
    })
  }, [closeModal, load, openModal, run, setDirty])

  const onEdit = useCallback(
    (department: Department) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: "Edit department",
        size: "lg",
        component: (
          <DepartmentForm
            isEdit
            initialValues={toDepartmentFormValues(department)}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: DepartmentFormValues,
              form: UseFormReturn<DepartmentFormValues>,
            ) => {
              const data = await run(
                updateDepartment({ ...values, id: department.id }),
                {
                  onFieldErrors: (fe) => applyServerErrors(form, fe),
                },
              )
              if (data) {
                toast.success("Department saved")
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
    async (department: Department) => {
      const ok = await confirm({
        title: "Delete this department?",
        message: `${department.name} will be soft-deleted and marked inactive.`,
        variant: "destructive",
        confirmLabel: "Delete",
      })
      if (!ok) return
      const result = await run(deleteDepartment(department.id))
      if (result) {
        toast.success("Department deleted")
        await load()
      }
    },
    [confirm, load, run],
  )

  return {
    loaded,
    departments,
    rows,
    canWrite,
    onCreate,
    onEdit,
    onDelete,
  }
}
