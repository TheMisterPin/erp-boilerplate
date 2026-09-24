import { headers } from "next/headers"

import {
  logServerEvent,
  type LogContext,
} from "@/lib/observability/log"

export { logServerEvent, type LogContext, type LogLevel } from "@/lib/observability/log"

export type ErrorReporter = {
  captureException(error: unknown, context: LogContext): void | Promise<void>
}

/**
 * The default adapter only emits a structured error event. Replace this binding
 * in a deployment integration (Sentry, Datadog, etc.) without coupling domain
 * code to a vendor SDK.
 */
export const errorReporter: ErrorReporter = {
  captureException(error, context) {
    logServerEvent("error", "server.error", {
      ...context,
      error,
    })
  },
}

export async function reportServerError(
  error: unknown,
  context: LogContext = {},
): Promise<void> {
  try {
    await errorReporter.captureException(error, context)
  } catch {
    // Error reporting must never turn an already-handled request failure into
    // another failure or risk logging the original exception unsafely.
  }
}

export function requestLogContext(requestHeaders: Headers): LogContext {
  const requestId = requestHeaders.get("x-request-id")
  return requestId ? { requestId } : {}
}

export async function currentRequestLogContext(): Promise<LogContext> {
  try {
    return requestLogContext(await headers())
  } catch {
    return {}
  }
}
