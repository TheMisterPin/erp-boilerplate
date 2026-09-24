/**
 * Command Center dashboard DTOs.
 * Everything here crosses the server-action boundary, so keep it serializable.
 */

/** How the dashboard numbers were scoped for the current viewer. */
export type DashboardScope = "org" | "team" | "self"

export type KpiDatum = {
  /** Big number shown on the card. */
  value: number
  /** Last 7 days, oldest → newest, feeding the sparkline. */
  trend: number[]
  /** Small caption under the value, e.g. "72% of staff". */
  hint: string
}

export type CommandCenterKpis = {
  clockedIn: KpiDatum
  shiftsToday: KpiDatum
  pendingTimeOff: KpiDatum
  lateCheckIns: KpiDatum
}

export type CoverageDay = {
  /** Short label, e.g. "Mon". */
  day: string
  /** ISO date, used by the chart tooltip. */
  date: string
  scheduled: number
  /**
   * Sum of location minimumStaff for the scope.
   * Null when the scope has no staffing target (personal view).
   */
  minimum: number | null
}

export type AttentionItem = {
  id: string
  userName: string
  type: "TIME_OFF" | "SICK"
  startDate: string
  endDate: string
  note: string | null
  createdAt: string
}

export type FeedItem = {
  id: string
  title: string
  detail: string | null
  timestamp: string
  kind: "check-in" | "check-out" | "time-off" | "shift" | "member" | "system"
}

export type CommandCenterData = {
  scope: DashboardScope
  /** KPI labels adapt to the resolved scope ("Shifts today" vs "Your shifts today"). */
  labels: {
    clockedIn: string
    shiftsToday: string
    pendingTimeOff: string
    lateCheckIns: string
  }
  kpis: CommandCenterKpis
  coverage: CoverageDay[]
  attention: AttentionItem[]
  activity: FeedItem[]
}
