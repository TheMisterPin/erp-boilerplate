// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, expect, it, vi } from "vitest"

import { CommandCenterPage } from "@/features/dashboard/components/pages/command-center-page"
import type { CommandCenterData } from "@/features/dashboard/types/dashboard-types"

afterEach(cleanup)

// recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub)

const mockData: CommandCenterData = {
  scope: "org",
  labels: {
    clockedIn: "Clocked in now",
    shiftsToday: "Shifts today",
    pendingTimeOff: "Pending time-off",
    lateCheckIns: "Late check-ins today",
  },
  kpis: {
    clockedIn: { value: 12, trend: [8, 9, 10, 11, 12, 10, 12], hint: "75% of 16 staff" },
    shiftsToday: { value: 14, trend: [10, 12, 14, 14, 13, 0, 0], hint: "68 scheduled this week" },
    pendingTimeOff: { value: 3, trend: [0, 1, 1, 0, 1, 0, 0], hint: "3 new this week" },
    lateCheckIns: { value: 2, trend: [1, 0, 2, 1, 0, 0, 2], hint: "6 this week" },
  },
  coverage: [
    { day: "Mon", date: "2026-09-21", scheduled: 14, minimum: 10 },
    { day: "Tue", date: "2026-09-22", scheduled: 13, minimum: 10 },
    { day: "Wed", date: "2026-09-23", scheduled: 15, minimum: 10 },
    { day: "Thu", date: "2026-09-24", scheduled: 12, minimum: 10 },
    { day: "Fri", date: "2026-09-25", scheduled: 11, minimum: 10 },
    { day: "Sat", date: "2026-09-26", scheduled: 4, minimum: 6 },
    { day: "Sun", date: "2026-09-27", scheduled: 3, minimum: 6 },
  ],
  attention: [
    {
      id: "req-1",
      userName: "Jordan Davis",
      type: "TIME_OFF",
      startDate: new Date(2026, 9, 17, 12).toISOString(),
      endDate: new Date(2026, 9, 19, 12).toISOString(),
      note: "Family trip",
      createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    },
  ],
  activity: [
    {
      id: "act-1",
      title: "Jordan Davis clocked in — Downtown",
      detail: null,
      timestamp: new Date(Date.now() - 12 * 60_000).toISOString(),
      kind: "check-in",
    },
  ],
}

const noop = () => {}

it("renders the skeleton while loading", () => {
  render(
    <CommandCenterPage
      data={null}
      loaded={false}
      onApprove={noop}
      onReject={noop}
      onRetry={noop}
    />,
  )
  expect(screen.getByLabelText("Loading dashboard")).toBeInTheDocument()
})

it("renders KPIs, coverage, attention queue, and activity", () => {
  const onApprove = vi.fn()
  render(
    <CommandCenterPage
      data={mockData}
      loaded={true}
      onApprove={onApprove}
      onReject={noop}
      onRetry={noop}
    />,
  )

  expect(screen.getByText("Command Center")).toBeInTheDocument()
  expect(screen.getByText("Organization")).toBeInTheDocument()
  expect(screen.getByText("Clocked in now")).toBeInTheDocument()
  expect(screen.getByText("75% of 16 staff")).toBeInTheDocument()
  expect(screen.getByText("Shift coverage this week")).toBeInTheDocument()
  expect(screen.getByText("Jordan Davis")).toBeInTheDocument()
  expect(
    screen.getByRole("button", { name: "Approve request from Jordan Davis" }),
  ).toBeInTheDocument()
  expect(
    screen.getByText("Jordan Davis clocked in — Downtown"),
  ).toBeInTheDocument()
})

it("shows an empty state when there is nothing to review", () => {
  render(
    <CommandCenterPage
      data={{ ...mockData, attention: [] }}
      loaded={true}
      onApprove={noop}
      onReject={noop}
      onRetry={noop}
    />,
  )
  expect(screen.getByText("All caught up")).toBeInTheDocument()
})

it("offers a retry when loading failed", () => {
  const onRetry = vi.fn()
  render(
    <CommandCenterPage
      data={null}
      loaded={true}
      onApprove={noop}
      onReject={noop}
      onRetry={onRetry}
    />,
  )
  screen.getByRole("button", { name: "Retry" }).click()
  expect(onRetry).toHaveBeenCalledOnce()
})
