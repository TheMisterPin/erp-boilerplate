import Link from "next/link"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  Hexagon,
  Shield,
  Timer,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Command Center",
    description:
      "KPIs, coverage, pending approvals, and recent activity. Numbers follow the viewer: the whole organization, managed locations, or their own shifts.",
    iconClass: "bg-accent-muted text-primary",
  },
  {
    icon: Users,
    title: "Team",
    description:
      "Member records, shift templates, and a schedule calendar. Managers generate shifts for the locations they run.",
    iconClass: "bg-info-surface text-info",
  },
  {
    icon: Timer,
    title: "Time clock",
    description:
      "A kiosk at /clock for check-in and check-out. Punches land on the same activity trail as the rest of the app.",
    iconClass: "bg-success-surface text-success",
  },
  {
    icon: CalendarDays,
    title: "Time off",
    description:
      "People request leave or sick time from their profile. Approving a request cancels the shifts that overlap it.",
    iconClass: "bg-warning-surface text-warning",
  },
  {
    icon: Building2,
    title: "Organization",
    description:
      "Departments and locations, with a manager on each location. Location scope is what limits a manager’s team view.",
    iconClass: "bg-accent-muted text-primary",
  },
  {
    icon: Shield,
    title: "Roles and audit",
    description:
      "Admin, manager, operator, and viewer. Cookie sessions, a permission matrix, and an activity log for privileged changes.",
    iconClass: "bg-info-surface text-info",
  },
] as const

const STATS = [
  { value: "4 roles", label: "Admin through viewer" },
  { value: "3 scopes", label: "Org, locations, personal" },
  { value: "Kiosk", label: "Clock without the full app" },
  { value: "Audit log", label: "Privileged changes recorded" },
] as const

function BrandMark() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-accent-muted text-primary">
        <Hexagon className="size-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-tight">ERP Boilerplate</span>
    </span>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-svh overflow-y-auto bg-background text-foreground">
      <nav className="sticky top-0 z-10 border-b border-border-subtle bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandMark />
          <Button asChild size="sm">
            <Link href="/login">
              Sign in
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-14 text-center">
        <p className="text-muted-foreground mb-4 text-sm font-medium">
          Workforce operations
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-tight">
          Staff, schedules, and time off in one system
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-relaxed">
          Managers work from the Command Center. Everyone else uses a schedule,
          a profile, and a kiosk clock. Roles decide who can approve, edit, and
          read the audit log.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/login">
              Sign in
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/clock">Open the time clock</Link>
          </Button>
        </div>
      </section>

      <section className="border-y border-border-subtle bg-surface-1">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-6 py-8 md:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="px-4 py-2 text-center">
              <div className="text-lg font-semibold">{value}</div>
              <div className="text-muted-foreground mt-1 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            What the app already covers
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            The same list, form, and modal patterns run every screen below.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, iconClass }) => (
            <article
              key={title}
              className="rounded-xl border border-border-subtle bg-card p-6"
            >
              <div
                className={`mb-4 inline-flex size-10 items-center justify-center rounded-md ${iconClass}`}
              >
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border-subtle bg-surface-1">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Two ways in
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            Office work stays in the signed-in app. The clock stays on a
            terminal.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-border-subtle bg-background p-6">
              <p className="text-primary text-xs font-medium tracking-wide uppercase">
                Signed in
              </p>
              <h3 className="mt-3 text-lg font-semibold">Desk for managers and staff</h3>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                {[
                  "Command Center with coverage and an approval queue",
                  "Members, departments, and locations",
                  "Shift templates and the schedule calendar",
                  "Time-off inbox and profile requests",
                  "Activity log for admins",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="link" className="mt-4 h-auto px-0">
                <Link href="/login">
                  Sign in to the app
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </article>
            <article className="rounded-xl border border-border-subtle bg-background p-6">
              <p className="text-xs font-medium tracking-wide text-success uppercase">
                Kiosk
              </p>
              <h3 className="mt-3 text-lg font-semibold">Clock on a shared terminal</h3>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                {[
                  "Sign in on the page, then check in or out",
                  "No sidebar and no other routes on that screen",
                  "Punches recorded as user activity",
                  "Return to the app when the shift is done",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="link" className="mt-4 h-auto px-0 text-success">
                <Link href="/clock">
                  Open the time clock
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Sign in to open the Command Center
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm">
          After sign-in you land on today’s coverage, approvals, and activity.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/login">
            Sign in
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>

      <footer className="border-t border-border-subtle bg-surface-1">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <BrandMark />
          <p className="text-muted-foreground text-sm">
            Internal operations app
          </p>
        </div>
      </footer>
    </div>
  )
}
