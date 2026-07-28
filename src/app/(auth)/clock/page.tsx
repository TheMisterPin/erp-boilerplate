"use client"

import { ClockPage } from "@/features/attendance/components/pages/clock-page"
import { useClockPage } from "@/features/attendance/hooks/use-clock-page"

export default function ClockRoutePage() {
  const page = useClockPage()
  return <ClockPage {...page} />
}
