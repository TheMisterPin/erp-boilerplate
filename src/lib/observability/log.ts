const REDACTED = "[REDACTED]"
const SENSITIVE_KEY = /authorization|cookie|credential|password|secret|token|api[-_]?key/i
const CONNECTION_STRING = /\b(?:postgres(?:ql)?|mysql|mongodb):\/\/\S+/gi

export type LogLevel = "debug" | "info" | "warn" | "error"
export type LogContext = Record<string, unknown>

function redactString(value: string): string {
  return value.replace(CONNECTION_STRING, REDACTED)
}

export function redactForLog(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY.test(key)) return REDACTED
  if (typeof value === "string") return redactString(value)
  if (value instanceof Error) return { name: value.name }
  if (Array.isArray(value)) return value.map((item) => redactForLog(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactForLog(entryValue, entryKey),
      ]),
    )
  }
  return value
}

export function logServerEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {},
): void {
  const safeContext = redactForLog(context) as LogContext
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeContext,
  })
  console[level](payload)
}
