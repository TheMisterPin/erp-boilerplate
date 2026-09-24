import type { ErrorDTO } from "@/features/errors/dto"
import type { ActionResult } from "@/features/errors/dto"
import {
  currentRequestLogContext,
  reportServerError,
} from "@/lib/observability/server"
import { ZodError } from "zod"

/**
 * Server-only error boundary utilities.
 * Do not import this module from client components.
 */

export class AppError extends Error {
  readonly dto: Omit<ErrorDTO, "fieldErrors">

  constructor(dto: Omit<ErrorDTO, "fieldErrors">) {
    super(dto.message)
    this.name = "AppError"
    this.dto = dto
  }
}

export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        ok: false,
        error: {
          kind: "validation",
          code: "VALIDATION_FAILED",
          message: "Please fix the highlighted fields.",
          fieldErrors: e.flatten().fieldErrors as Record<string, string[]>,
        },
      }
    }

    if (e instanceof AppError) {
      return { ok: false, error: e.dto }
    }

    await reportServerError(e, {
      ...(await currentRequestLogContext()),
      operation: "server_action",
    })
    return {
      ok: false,
      error: {
        kind: "internal",
        code: "INTERNAL",
        message: "Something went wrong.",
      },
    }
  }
}
