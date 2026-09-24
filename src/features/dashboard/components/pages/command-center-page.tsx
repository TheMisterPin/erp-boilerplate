import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityFeed } from "@/features/dashboard/components/activity-feed"
import { AttentionQueue } from "@/features/dashboard/components/attention-queue"
import { CoverageChart } from "@/features/dashboard/components/coverage-chart"
import { KpiCard } from "@/features/dashboard/components/kpi-card"
import type {
  AttentionItem,
  CommandCenterData,
  DashboardScope,
} from "@/features/dashboard/types/dashboard-types"

export type CommandCenterPageProps = {
  data: CommandCenterData | null
  loaded: boolean
  onApprove: (item: AttentionItem) => void
  onReject: (item: AttentionItem) => void
  onRetry: () => void
}

const SCOPE_LABELS: Record<DashboardScope, string> = {
  org: "Organization",
  team: "Your locations",
  self: "Personal",
}

function CommandCenterSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading dashboard">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="pb-1">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-80 lg:col-span-3" />
        <Skeleton className="h-80 lg:col-span-2" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

/**
 * Stateless Command Center view. All state and handlers come from
 * `useCommandCenterPage`; this component only renders props.
 */
export function CommandCenterPage({
  data,
  loaded,
  onApprove,
  onReject,
  onRetry,
}: CommandCenterPageProps) {
  if (!loaded) {
    return (
      <div className="h-full min-h-0 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <CommandCenterSkeleton />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-full min-h-0 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 py-24 text-center">
          <p className="text-lg font-medium">Couldn&apos;t load the dashboard</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Something went wrong while fetching the latest numbers. Your data
            is safe — try again.
          </p>
          <Button onClick={onRetry}>Retry</Button>
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Command Center
            </h1>
            <p className="text-muted-foreground text-sm">{today}</p>
          </div>
          <Badge variant="outline">{SCOPE_LABELS[data.scope]}</Badge>
        </header>

        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Key metrics"
        >
          <KpiCard
            label={data.labels.clockedIn}
            value={data.kpis.clockedIn.value}
            hint={data.kpis.clockedIn.hint}
            trend={data.kpis.clockedIn.trend}
          />
          <KpiCard
            label={data.labels.shiftsToday}
            value={data.kpis.shiftsToday.value}
            hint={data.kpis.shiftsToday.hint}
            trend={data.kpis.shiftsToday.trend}
          />
          <KpiCard
            label={data.labels.pendingTimeOff}
            value={data.kpis.pendingTimeOff.value}
            hint={data.kpis.pendingTimeOff.hint}
            trend={data.kpis.pendingTimeOff.trend}
          />
          <KpiCard
            label={data.labels.lateCheckIns}
            value={data.kpis.lateCheckIns.value}
            hint={data.kpis.lateCheckIns.hint}
            trend={data.kpis.lateCheckIns.trend}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="min-w-0 lg:col-span-3">
            <CoverageChart data={data.coverage} />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <AttentionQueue
              items={data.attention}
              onApprove={onApprove}
              onReject={onReject}
            />
          </div>
        </section>

        <ActivityFeed items={data.activity} />
      </div>
    </div>
  )
}
