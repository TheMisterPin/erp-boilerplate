"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import { applyServerErrors } from "@/components/shared/forms/lib/apply-server-errors"
import { useModal } from "@/components/shared/modals"
import type { ActionResult, ErrorDTO, ErrorKind } from "@/features/errors/dto"
import { useErrorContext } from "@/features/errors/error-provider"

export type ErrorChannel = "modal" | "toast" | "silent"

/** Single encoding of presentation policy for known ErrorDTOs. */
export const DEFAULT_ERROR_CHANNELS: Record<ErrorKind, ErrorChannel> = {
  validation: "silent",
  auth: "modal",
  permission: "modal",
  conflict: "toast",
  not_found: "toast",
  network: "toast",
  internal: "toast",
}

export type HandleOverrides = Partial<Record<ErrorKind, ErrorChannel>>

export type RunOptions<TForm extends FieldValues = FieldValues> = {
  /** Prefer this over `form` when both are set. */
  onFieldErrors?: (fieldErrors: Record<string, string[]>) => void
  /** Auto-maps validation fieldErrors via applyServerErrors. */
  form?: UseFormReturn<TForm>
  overrides?: HandleOverrides
}

function channelTitle(kind: ErrorKind): string {
  switch (kind) {
    case "auth":
      return "Session expired"
    case "permission":
      return "Permission denied"
    case "validation":
      return "Validation error"
    case "conflict":
      return "Conflict"
    case "not_found":
      return "Not found"
    case "network":
      return "Network error"
    case "internal":
      return "Error"
  }
}

export function useError() {
  const { notify } = useModal()
  const router = useRouter()
  const { reportFatal } = useErrorContext()

  const handle = useCallback(
    (error: ErrorDTO, overrides?: HandleOverrides) => {
      const channel =
        overrides?.[error.kind] ?? DEFAULT_ERROR_CHANNELS[error.kind]

      if (channel === "silent") {
        return
      }

      if (channel === "toast") {
        toast.error(error.message)
        return
      }

      // modal
      notify({
        variant: "error",
        title: channelTitle(error.kind),
        message: error.message,
        onAcknowledge:
          error.code === "SESSION_EXPIRED"
            ? () => {
                router.push("/login")
              }
            : undefined,
      })
    },
    [notify, router],
  )

  const run = useCallback(
    async <T, TForm extends FieldValues = FieldValues>(
      action: Promise<ActionResult<T>>,
      opts?: RunOptions<TForm>,
    ): Promise<T | null> => {
      let result: ActionResult<T>

      try {
        result = await action
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        reportFatal(err)
        return null
      }

      if (result.ok) {
        return result.data
      }

      const { error } = result

      if (error.kind === "validation" && error.fieldErrors) {
        if (opts?.onFieldErrors) {
          opts.onFieldErrors(error.fieldErrors)
          return null
        }
        if (opts?.form) {
          applyServerErrors(opts.form, error.fieldErrors)
          return null
        }
      }

      handle(error, opts?.overrides)
      return null
    },
    [handle, reportFatal],
  )

  return { handle, run, reportFatal }
}
