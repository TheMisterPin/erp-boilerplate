"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { useModal } from "@/components/shared/modals"
import { useError } from "@/features/errors"
import {
  approveTimeOffRequest,
  listTimeOffRequests,
  rejectTimeOffRequest,
} from "@/features/time-off/actions/time-off-actions"
import { TimeOffReviewForm } from "@/features/time-off/components/forms"
import type { TimeOffListPageProps } from "@/features/time-off/components/pages/time-off-list-page"
import { toTimeOffTableRow } from "@/features/time-off/components/tables/time-off-table-columns"
import type {
  TimeOffRequest,
  TimeOffReviewFormValues,
} from "@/features/time-off/types/time-off-types"

export function useTimeOffListPage(): TimeOffListPageProps {
  const { run } = useError()
  const { openModal, closeModal, setDirty } = useModal()
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    const data = await run(listTimeOffRequests())
    setRequests(data ?? [])
    setLoaded(true)
  }, [run])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const data = await run(listTimeOffRequests())
      if (!cancelled) {
        setRequests(data ?? [])
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const rows = useMemo(() => requests.map(toTimeOffTableRow), [requests])

  const onApprove = useCallback(
    (request: TimeOffRequest) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: `Approve ${request.userName ?? "time-off request"}`,
        component: (
          <TimeOffReviewForm
            submitLabel="Approve request"
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (values, form) => {
              const data = await run(
                approveTimeOffRequest({ id: request.id, ...values }),
                { form },
              )
              if (data) {
                toast.success("Time-off request approved")
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

  const onReject = useCallback(
    (request: TimeOffRequest) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: `Reject ${request.userName ?? "time-off request"}`,
        component: (
          <TimeOffReviewForm
            submitLabel="Reject request"
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: TimeOffReviewFormValues,
              form,
            ) => {
              const data = await run(
                rejectTimeOffRequest({ id: request.id, ...values }),
                { form },
              )
              if (data) {
                toast.success("Time-off request rejected")
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
    requests,
    rows,
    onApprove,
    onReject,
  }
}
