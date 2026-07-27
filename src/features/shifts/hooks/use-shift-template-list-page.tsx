"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { UseFormReturn } from "react-hook-form"

import { useModal } from "@/components/shared/modals"
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"
import {
  createShiftTemplate,
  deleteShiftTemplate,
  generateShiftInstances,
  listManagedLocations,
  listShiftTemplates,
  updateShiftTemplate,
} from "@/features/shifts/actions/shift-template-actions"
import { GenerateShiftForm } from "@/features/shifts/components/forms/generate-shift-form"
import { ShiftTemplateForm } from "@/features/shifts/components/forms/shift-template-form"
import type { ShiftTemplateListPageProps } from "@/features/shifts/components/pages/shift-template-list-page"
import { toShiftTemplateTableRow } from "@/features/shifts/components/tables/shift-template-table-columns"
import type {
  GenerateShiftFormValues,
  ShiftTemplate,
  ShiftTemplateFormValues,
} from "@/features/shifts/types/shift-types"

function toTemplateFormValues(
  template: ShiftTemplate,
): Partial<ShiftTemplateFormValues> {
  return {
    locationId: template.locationId,
    userId: template.userId,
    type: template.type,
    startTime: template.startTime,
    endTime: template.endTime,
    weekdays: template.weekdays.map(String),
    notes: template.notes ?? "",
    isActive: template.isActive,
  }
}

/** Page logic for shift templates — inject into `ShiftTemplateListPage`. */
export function useShiftTemplateListPage(): ShiftTemplateListPageProps {
  const { run } = useError()
  const { me } = useAuth()
  const { openModal, closeModal, setDirty, confirm } = useModal()
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [managedCount, setManagedCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const canWrite =
    !!me &&
    (can(me.role, Actions.shifts.write) || managedCount > 0)

  const load = useCallback(async () => {
    const [data, managed] = await Promise.all([
      run(listShiftTemplates()),
      run(listManagedLocations()),
    ])
    setTemplates(data ?? [])
    setManagedCount((managed ?? []).length)
    setLoaded(true)
  }, [run])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [data, managed] = await Promise.all([
        run(listShiftTemplates()),
        run(listManagedLocations()),
      ])
      if (cancelled) return
      setTemplates(data ?? [])
      setManagedCount((managed ?? []).length)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const rows = useMemo(
    () => templates.map(toShiftTemplateTableRow),
    [templates],
  )

  const onCreate = useCallback(() => {
    let formId = ""
    formId = openModal({
      type: "form",
      title: "New shift template",
      size: "lg",
      component: (
        <ShiftTemplateForm
          onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
          onSubmit={async (
            values: ShiftTemplateFormValues,
            form: UseFormReturn<ShiftTemplateFormValues>,
          ) => {
            const data = await run(createShiftTemplate(values), { form })
            if (data) {
              toast.success("Template created")
              closeModal(formId)
              await load()
            }
          }}
        />
      ),
    })
  }, [closeModal, load, openModal, run, setDirty])

  const onEdit = useCallback(
    (template: ShiftTemplate) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: "Edit shift template",
        size: "lg",
        component: (
          <ShiftTemplateForm
            isEdit
            initialValues={toTemplateFormValues(template)}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: ShiftTemplateFormValues,
              form: UseFormReturn<ShiftTemplateFormValues>,
            ) => {
              const data = await run(
                updateShiftTemplate({ ...values, id: template.id }),
                { form },
              )
              if (data) {
                toast.success("Template saved")
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
    async (template: ShiftTemplate) => {
      const ok = await confirm({
        title: "Delete this template?",
        message:
          "The template will be soft-deleted. Existing generated shifts are kept.",
        variant: "destructive",
        confirmLabel: "Delete",
      })
      if (!ok) return
      const result = await run(deleteShiftTemplate(template.id))
      if (result) {
        toast.success("Template deleted")
        await load()
      }
    },
    [confirm, load, run],
  )

  const onGenerate = useCallback(
    (template: ShiftTemplate) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: "Generate shifts",
        size: "md",
        component: (
          <GenerateShiftForm
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: GenerateShiftFormValues,
              form: UseFormReturn<GenerateShiftFormValues>,
            ) => {
              const data = await run(
                generateShiftInstances({
                  templateId: template.id,
                  from: values.from,
                  to: values.to,
                }),
                { form },
              )
              if (data) {
                toast.success(
                  data.created === 0
                    ? "No new shifts (duplicates skipped)"
                    : `Generated ${data.created} shift${data.created === 1 ? "" : "s"}`,
                )
                closeModal(formId)
              }
            }}
          />
        ),
      })
    },
    [closeModal, openModal, run, setDirty],
  )

  return {
    loaded,
    templates,
    rows,
    canWrite,
    onCreate,
    onEdit,
    onDelete,
    onGenerate,
  }
}
