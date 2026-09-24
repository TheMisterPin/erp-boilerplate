import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { CoverageDay } from "@/features/dashboard/types/dashboard-types"

const chartConfig = {
  scheduled: {
    label: "Scheduled",
    color: "var(--brand-accent)",
  },
  minimum: {
    label: "Minimum staff",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

export type CoverageChartProps = {
  data: CoverageDay[]
}

export function CoverageChart({ data }: CoverageChartProps) {
  const showMinimum = data.some((d) => d.minimum != null)
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Shift coverage this week</CardTitle>
        <CardDescription>
          {showMinimum
            ? "Scheduled headcount vs minimum staffing, Mon–Sun"
            : "Scheduled headcount, Mon–Sun"}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart data={data} barGap={3}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="scheduled"
              fill="var(--color-scheduled)"
              radius={[4, 4, 0, 0]}
            />
            {showMinimum && (
              <Bar
                dataKey="minimum"
                fill="var(--color-minimum)"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
