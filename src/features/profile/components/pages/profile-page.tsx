"use client"

import Link from "next/link"
import { ArrowRight, CalendarDays, Clock, Plus } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "@/features/profile/components/forms/profile-form"
import type {
  Profile,
  ProfileFormValues,
} from "@/features/profile/types/profile-types"
import {
  SHIFT_TYPE_META,
  type ShiftInstance,
} from "@/features/shifts/types/shift-types"
import type {
  TimeOffRequest,
  TimeOffStatus,
} from "@/features/time-off/types/time-off-types"

export type ProfilePageProps = {
  loaded: boolean
  tab: string
  onTabChange: (tab: string) => void
  profile: Profile | null
  onSaveProfile: (
    values: ProfileFormValues,
    form: UseFormReturn<ProfileFormValues>,
  ) => Promise<void>
  upcomingShifts: ShiftInstance[]
  ownRequests: TimeOffRequest[]
  onRequestTimeOff: () => void
  onCallInSick: () => void
  onCancelRequest: (request: TimeOffRequest) => void
}

const STATUS_LABELS: Record<TimeOffStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return "—"
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function statusVariant(status: TimeOffStatus) {
  if (status === "APPROVED") return "success" as const
  if (status === "PENDING") return "warning" as const
  if (status === "REJECTED") return "error" as const
  return "neutral" as const
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 rounded-lg border p-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}

function ProfilePanel({
  profile,
  onSaveProfile,
}: Pick<ProfilePageProps, "profile" | "onSaveProfile">) {
  if (!profile) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Your profile is unavailable.
      </p>
    )
  }

  const details = [
    ["Email", profile.email],
    ["Role", profile.role === "ADMIN" ? "Admin" : "User"],
    ["Department", profile.departmentName ?? "Not assigned"],
    ["Location", profile.locationName ?? "Not assigned"],
  ]

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t pt-6">
        <h2 className="mb-4 text-base font-semibold">Personal details</h2>
        <ProfileForm
          initialValues={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            pictureUrl: profile.pictureUrl ?? "",
            password: "",
          }}
          onSubmit={onSaveProfile}
        />
      </div>
    </div>
  )
}

function ShiftsPanel({
  upcomingShifts,
}: Pick<ProfilePageProps, "upcomingShifts">) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Your next scheduled shifts.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/team/my-shifts">
            Full schedule
            <ArrowRight />
          </Link>
        </Button>
      </div>
      {upcomingShifts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No upcoming shifts.
        </p>
      ) : (
        <ul className="space-y-3">
          {upcomingShifts.map((shift) => (
            <li
              key={shift.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <p className="font-medium">
                  {SHIFT_TYPE_META[shift.type].label}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {formatDateOnly(shift.date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {shift.startTime}–{shift.endTime}
                  </span>
                </div>
              </div>
              <Badge variant="secondary">
                {shift.locationName ?? "No location"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LeavePanel({
  ownRequests,
  onRequestTimeOff,
  onCallInSick,
  onCancelRequest,
}: Pick<
  ProfilePageProps,
  | "ownRequests"
  | "onRequestTimeOff"
  | "onCallInSick"
  | "onCancelRequest"
>) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Review your leave requests and their status.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onCallInSick}>
            Call in sick
          </Button>
          <Button size="sm" onClick={onRequestTimeOff}>
            <Plus />
            Request time off
          </Button>
        </div>
      </div>
      {ownRequests.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No leave requests yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {ownRequests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {request.type === "SICK" ? "Sick leave" : "Time off"}
                  </p>
                  <Badge variant={statusVariant(request.status)}>
                    {STATUS_LABELS[request.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateOnly(request.startDate)}
                  {request.endDate === request.startDate
                    ? ""
                    : ` – ${formatDateOnly(request.endDate)}`}
                </p>
                {request.note ? (
                  <p className="text-sm text-muted-foreground">{request.note}</p>
                ) : null}
              </div>
              {request.status === "PENDING" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancelRequest(request)}
                >
                  Cancel
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Stateless profile hub — state, actions, and modals are owned by its hook. */
export function ProfilePage({
  loaded,
  tab,
  onTabChange,
  profile,
  onSaveProfile,
  upcomingShifts,
  ownRequests,
  onRequestTimeOff,
  onCallInSick,
  onCancelRequest,
}: ProfilePageProps) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your details, schedule, and leave.
        </p>
      </header>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="profile" disabled={!loaded}>
            Profile
          </TabsTrigger>
          <TabsTrigger value="shifts" disabled={!loaded}>
            Shifts
          </TabsTrigger>
          <TabsTrigger value="leave" disabled={!loaded}>
            Leave
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          <TabsContent value="profile" className="mt-0">
            {loaded ? (
              <ProfilePanel
                profile={profile}
                onSaveProfile={onSaveProfile}
              />
            ) : (
              <ProfileSkeleton />
            )}
          </TabsContent>
          <TabsContent value="shifts" className="mt-0">
            {loaded ? (
              <ShiftsPanel upcomingShifts={upcomingShifts} />
            ) : (
              <ListSkeleton />
            )}
          </TabsContent>
          <TabsContent value="leave" className="mt-0">
            {loaded ? (
              <LeavePanel
                ownRequests={ownRequests}
                onRequestTimeOff={onRequestTimeOff}
                onCallInSick={onCallInSick}
                onCancelRequest={onCancelRequest}
              />
            ) : (
              <ListSkeleton />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
