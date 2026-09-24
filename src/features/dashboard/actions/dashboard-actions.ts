"use server"

import type { Prisma } from "@/generated/prisma/client"
import { requireSession } from "@/features/auth/session"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { getCheckInTiming } from "@/features/attendance/lib/check-in-timing"
import { listTimeOffRequests } from "@/features/time-off/actions/time-off-actions"
import { listActivities } from "@/features/logging/actions/activity-actions"
import { listManagedLocationIds } from "@/features/shifts/actions/shift-access"
import { prisma } from "@/lib/db"
import type { ActionResult } from "@/features/errors/dto"
import type {
  AttentionItem,
  CommandCenterData,
  CoverageDay,
  DashboardScope,
  FeedItem,
  KpiDatum,
} from "@/features/dashboard/types/dashboard-types"

/* ------------------------------------------------------------------ */
/* Date helpers (server-local, consistent with the rest of the app)    */
/* ------------------------------------------------------------------ */

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

/** Monday of the week containing `d`. */
function startOfWeekMonday(d: Date): Date {
  const c = startOfDay(d)
  return addDays(c, -((c.getDay() + 6) % 7))
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

/* ------------------------------------------------------------------ */
/* Activity feed labels                                                */
/* ------------------------------------------------------------------ */

const ACTIVITY_LABELS: Record<string, { verb: string; kind: FeedItem["kind"] }> = {
  LOGIN: { verb: "signed in", kind: "system" },
  LOGOUT: { verb: "signed out", kind: "system" },
  REGISTER: { verb: "registered", kind: "member" },
  VERIFY: { verb: "was verified", kind: "member" },
  UNVERIFY: { verb: "was unverified", kind: "member" },
  SHIFT_TEMPLATE_CREATE: { verb: "created a shift template", kind: "shift" },
  SHIFT_TEMPLATE_UPDATE: { verb: "updated a shift template", kind: "shift" },
  SHIFT_TEMPLATE_DELETE: { verb: "deleted a shift template", kind: "shift" },
  SHIFT_TEMPLATE_GENERATE: { verb: "generated shifts", kind: "shift" },
  SHIFT_INSTANCE_CREATE: { verb: "created a shift", kind: "shift" },
  SHIFT_INSTANCE_UPDATE: { verb: "updated a shift", kind: "shift" },
  SHIFT_INSTANCE_DELETE: { verb: "deleted a shift", kind: "shift" },
  SHIFT_CHECK_IN: { verb: "clocked in", kind: "check-in" },
  SHIFT_CHECK_OUT: { verb: "clocked out", kind: "check-out" },
  PROFILE_UPDATE: { verb: "updated their profile", kind: "member" },
  TIME_OFF_REQUEST: { verb: "requested time off", kind: "time-off" },
  TIME_OFF_APPROVE: { verb: "approved a time-off request", kind: "time-off" },
  TIME_OFF_REJECT: { verb: "rejected a time-off request", kind: "time-off" },
  TIME_OFF_CANCEL: { verb: "cancelled a time-off request", kind: "time-off" },
}

function humanizeActivity(activity: string): { verb: string; kind: FeedItem["kind"] } {
  const known = ACTIVITY_LABELS[activity]
  if (known) return known
  return {
    verb: activity.toLowerCase().replace(/_/g, " "),
    kind: "system",
  }
}

/* ------------------------------------------------------------------ */
/* Main action                                                         */
/* ------------------------------------------------------------------ */

/**
 * Aggregated Command Center data for the home landing page.
 *
 * Scoping mirrors the attendance list scope: ADMIN sees the whole
 * organization, location managers see their managed locations, everyone
 * else sees their own data. The time-off queue and audit feed reuse the
 * existing scoped list actions so visibility rules stay in one place.
 */
export async function getCommandCenterData(): Promise<ActionResult<CommandCenterData>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()

    const managedIds =
      session.role === "ADMIN" ? [] : await listManagedLocationIds(session)
    const scope: DashboardScope =
      session.role === "ADMIN" ? "org" : managedIds.length > 0 ? "team" : "self"

    const scopedWhere: Prisma.ShiftAttendanceWhereInput =
      scope === "org"
        ? { organizationId: session.activeOrganizationId }
        : scope === "team"
          ? { organizationId: session.activeOrganizationId, locationId: { in: managedIds } }
          : { organizationId: session.activeOrganizationId, userId: session.userId }
    const instanceWhere: Prisma.ShiftInstanceWhereInput =
      scope === "org"
        ? { organizationId: session.activeOrganizationId }
        : scope === "team"
          ? { organizationId: session.activeOrganizationId, locationId: { in: managedIds } }
          : { organizationId: session.activeOrganizationId, userId: session.userId }

    const now = new Date()
    const today = startOfDay(now)
    const sevenDaysAgo = addDays(today, -6)
    const weekStart = startOfWeekMonday(now)
    const weekEnd = addDays(weekStart, 7)
    const last7Keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(today, i - 6)))

    const [recentAttendance, instances, locations, staffCount] = await Promise.all([
      prisma.shiftAttendance.findMany({
        where: { ...scopedWhere, checkInAt: { gte: sevenDaysAgo } },
        select: {
          checkInAt: true,
          checkOutAt: true,
          userId: true,
          user: { select: { fullName: true } },
          location: { select: { name: true } },
          shiftInstance: { select: { startTime: true } },
        },
        orderBy: { checkInAt: "desc" },
      }),
      prisma.shiftInstance.findMany({
        where: {
          ...instanceWhere,
          date: { gte: sevenDaysAgo, lt: weekEnd },
          status: "SCHEDULED",
          deletedAt: null,
        },
        select: { date: true },
      }),
      scope === "self"
        ? Promise.resolve([])
        : prisma.location.findMany({
            where: {
              deletedAt: null,
              isActive: true,
              organizationId: session.activeOrganizationId,
              ...(scope === "team" ? { id: { in: managedIds } } : {}),
            },
            select: { minimumStaff: true },
          }),
      scope === "self"
        ? Promise.resolve(1)
        : prisma.membership.count({
            where: {
              organizationId: session.activeOrganizationId,
              status: "ACTIVE",
              user: { deletedAt: null, isActive: true },
              ...(scope === "team" ? { locationId: { in: managedIds } } : {}),
            },
          }),
    ])

    /* ---- KPI: clocked in now ------------------------------------ */
    const clockedInNow = recentAttendance.filter(
      (a) => a.checkInAt >= today && a.checkOutAt == null,
    ).length
    const activeByDay = last7Keys.map(
      (key) =>
        new Set(
          recentAttendance
            .filter((a) => dayKey(a.checkInAt) === key)
            .map((a) => a.userId),
        ).size,
    )

    /* ---- KPI: shifts today -------------------------------------- */
    const shiftsByDay = last7Keys.map(
      (key) => instances.filter((s) => dayKey(s.date) === key).length,
    )
    const shiftsToday = shiftsByDay[6] ?? 0
    const shiftsThisWeek = instances.filter(
      (s) => s.date >= weekStart && s.date < weekEnd,
    ).length

    /* ---- KPI: late check-ins ------------------------------------ */
    const lateByDay = last7Keys.map(
      (key) =>
        recentAttendance.filter((a) => {
          if (dayKey(a.checkInAt) !== key) return false
          const startTime = a.shiftInstance?.startTime
          if (!startTime) return false
          return getCheckInTiming(startTime, a.checkInAt).status === "late"
        }).length,
    )
    const lateToday = lateByDay[6] ?? 0
    const lateThisWeek = lateByDay.reduce((sum, n) => sum + n, 0)

    /* ---- Time-off: pending queue + trend -------------------------- */
    const timeOffResult = await listTimeOffRequests()
    if (!timeOffResult.ok) {
      throw new AppError({
        kind: timeOffResult.error.kind,
        code: timeOffResult.error.code,
        message: timeOffResult.error.message,
      })
    }
    const requests = timeOffResult.data
    const pending = requests.filter((r) => r.status === "PENDING")
    const newByDay = last7Keys.map(
      (key) =>
        requests.filter(
          (r) => r.createdAt >= sevenDaysAgo && dayKey(r.createdAt) === key,
        ).length,
    )
    const attention: AttentionItem[] = pending
      .filter((r) => r.canReview)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        userName: r.userName ?? "Unknown member",
        type: r.type,
        startDate: r.startDate,
        endDate: r.endDate,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      }))

    /* ---- Coverage chart: scheduled vs minimum, Mon–Sun ------------ */
    const minimumTotal =
      scope === "self" ? null : locations.reduce((sum, l) => sum + l.minimumStaff, 0)
    const coverage: CoverageDay[] = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const key = dayKey(day)
      return {
        day: WEEKDAY_LABELS[i] ?? key,
        date: key,
        scheduled: instances.filter((s) => dayKey(s.date) === key).length,
        minimum: minimumTotal,
      }
    })

    /* ---- Activity feed -------------------------------------------- */
    let activity: FeedItem[]
    if (scope === "org") {
      const activitiesResult = await listActivities()
      if (!activitiesResult.ok) {
        throw new AppError({
          kind: activitiesResult.error.kind,
          code: activitiesResult.error.code,
          message: activitiesResult.error.message,
        })
      }
      activity = activitiesResult.data.slice(0, 8).map((row) => {
        const { verb, kind } = humanizeActivity(row.activity)
        return {
          id: row.id,
          title: `${row.userFullName} ${verb}`,
          detail: null,
          timestamp: row.timestamp.toISOString(),
          kind,
        }
      })
    } else {
      activity = recentAttendance.slice(0, 8).map((a) => {
        const clockedOut = a.checkOutAt != null
        const location = a.location?.name ? ` — ${a.location.name}` : ""
        return {
          id: `${a.userId}-${a.checkInAt.toISOString()}`,
          title: `${a.user?.fullName ?? "Someone"} ${clockedOut ? "clocked out" : "clocked in"}${location}`,
          detail: null,
          timestamp: (clockedOut ? a.checkOutAt : a.checkInAt)?.toISOString() ?? "",
          kind: clockedOut ? ("check-out" as const) : ("check-in" as const),
        }
      })
    }

    /* ---- Labels + hints adapt to scope ----------------------------- */
    const labels =
      scope === "self"
        ? {
            clockedIn: "You're clocked in",
            shiftsToday: "Your shifts today",
            pendingTimeOff: "Your pending requests",
            lateCheckIns: "Your late check-ins",
          }
        : {
            clockedIn: "Clocked in now",
            shiftsToday: "Shifts today",
            pendingTimeOff: "Pending time-off",
            lateCheckIns: "Late check-ins today",
          }

    const kpi = (
      value: number,
      trend: number[],
      hint: string,
    ): KpiDatum => ({ value, trend, hint })

    return {
      scope,
      labels,
      kpis: {
        clockedIn: kpi(
          scope === "self" ? (clockedInNow > 0 ? 1 : 0) : clockedInNow,
          activeByDay,
          scope === "self"
            ? clockedInNow > 0
              ? "On the clock"
              : "Not clocked in"
            : staffCount > 0
              ? `${Math.round((clockedInNow / staffCount) * 100)}% of ${staffCount} staff`
              : "No active staff",
        ),
        shiftsToday: kpi(
          shiftsToday,
          shiftsByDay,
          `${shiftsThisWeek} scheduled this week`,
        ),
        pendingTimeOff: kpi(
          pending.length,
          newByDay,
          `${newByDay.reduce((sum, n) => sum + n, 0)} new this week`,
        ),
        lateCheckIns: kpi(lateToday, lateByDay, `${lateThisWeek} this week`),
      },
      coverage,
      attention,
      activity,
    }
  })
}
