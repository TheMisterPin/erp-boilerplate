import type { AppSession } from "@/features/auth/session"
import { AppError } from "@/features/errors/server"
import { prisma } from "@/lib/db"

/** ADMIN always; otherwise user must manage the location. */
export async function assertCanWriteShiftsAtLocation(
  session: AppSession,
  locationId: string,
): Promise<void> {
  if (session.role === "ADMIN") return

  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    select: { managerId: true },
  })
  if (!location || location.managerId !== session.userId) {
    throw new AppError({
      kind: "permission",
      code: "FORBIDDEN",
      message: "You do not have permission to manage shifts at that location.",
    })
  }
}

export async function listManagedLocationIds(
  session: AppSession,
): Promise<string[]> {
  if (session.role === "ADMIN") {
    const rows = await prisma.location.findMany({
      where: { deletedAt: null },
      select: { id: true },
    })
    return rows.map((row) => row.id)
  }

  const rows = await prisma.location.findMany({
    where: { deletedAt: null, managerId: session.userId },
    select: { id: true },
  })
  return rows.map((row) => row.id)
}

/** Parse a calendar Date (local) into UTC midnight for storage. */
export function parseDateOnly(value: Date | string): Date {
  if (typeof value === "string") {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }
  return new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
  )
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function formatLocalDateOnly(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function weekdaysFromForm(values: string[]): number[] {
  return values.map((value) => Number.parseInt(value, 10))
}

export function weekdaysToForm(values: number[]): string[] {
  return values.map(String)
}
