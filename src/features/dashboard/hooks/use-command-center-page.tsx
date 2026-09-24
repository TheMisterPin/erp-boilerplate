"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"

import { useModal } from "@/components/shared/modals"
import { useError } from "@/features/errors"
import { useSharedPageLoad } from "@/hooks/use-shared-page-load"
import { getCommandCenterData } from "@/features/dashboard/actions/dashboard-actions"
import {
  approveTimeOffRequest,
  rejectTimeOffRequest,
} from "@/features/time-off/actions/time-off-actions"
import { TimeOffReviewForm } from "@/features/time-off/components/forms"
import type { AttentionItem } from "@/features/dashboard/types/dashboard-types"
import type { CommandCenterPageProps } from "@/features/dashboard/components/pages/command-center-page"

/**
 * Page orchestration for the Command Center home page.
 * Owns loading, reload, and the approve/reject review modals.
 * The view itself stays stateless.
 */
export function useCommandCenterPage(): CommandCenterPageProps {
  const { run } = useError()
  const { openModal, closeModal, setDirty } = useModal()
  const [data, setData] = useState<CommandCenterPageProps["data"]>(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    const result = await run(getCommandCenterData())
    setData(result ?? null)
    setLoaded(true)
  }, [run])

  useSharedPageLoad("command-center", load)

  const review = useCallback(
    (item: AttentionItem, approve: boolean) => {
      const action = approve ? approveTimeOffRequest : rejectTimeOffRequest
      let formId = ""
      formId = openModal({
        type: "form",
        title: `${approve ? "Approve" : "Reject"} request — ${item.userName}`,
        component: (
          <TimeOffReviewForm
            submitLabel={approve ? "Approve request" : "Reject request"}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (values, form) => {
              const result = await run(action({ id: item.id, ...values }), { form })
              if (result) {
                toast.success(
                  approve ? "Time-off request approved" : "Time-off request rejected",
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

  const onApprove = useCallback(
    (item: AttentionItem) => review(item, true),
    [review],
  )
  const onReject = useCallback(
    (item: AttentionItem) => review(item, false),
    [review],
  )

  return { data, loaded, onApprove, onReject, onRetry: load }
}
