import { Area, AreaChart, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type KpiCardProps = {
  label: string
  value: number
  hint: string
  /** Last 7 days, oldest → newest. */
  trend: number[]
}

export function KpiCard({ label, value, hint, trend }: KpiCardProps) {
  const data = trend.map((v, index) => ({ index, v }))
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">
          {value}
        </div>
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
        <div className="mt-2 h-10" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--brand-accent)"
                strokeWidth={1.5}
                fill="var(--brand-accent)"
                fillOpacity={0.18}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
