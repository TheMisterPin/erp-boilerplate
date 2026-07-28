import Link from "next/link"

const demos = [
  {
    href: "/clock",
    title: "Time clock",
    description:
      "Kiosk check-in/out — requires today’s shift; warns when early or late",
  },
  {
    href: "/team/members",
    title: "Members",
    description: "List-page CRUD — forms, modals, RBAC, and useError().run()",
  },
  {
    href: "/team/activity",
    title: "Activity",
    description: "Audit trail — logActivity helper + read-only ADMIN list",
  },
  {
    href: "/team/shift-templates",
    title: "Shift templates",
    description:
      "Reusable templates + generate dated instances (Admin / location manager)",
  },
  {
    href: "/team/my-shifts",
    title: "My shifts",
    description: "Calendar schedule — own shifts or managed-location coverage",
  },
  {
    href: "/organization/departments",
    title: "Departments",
    description: "Organization vertical with the same list CRUD pattern",
  },
  {
    href: "/organization/locations",
    title: "Locations",
    description: "Org vertical with manager select + list CRUD",
  },
] as const

export default function Home() {
  return (
    <div className="h-full min-h-0 overflow-y-auto p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-9 tracking-tight">
            Components Playground
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            ERP UI boilerplate. Use the demos below as the reference pattern when
            adding a new feature vertical with the agent.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {demos.map((demo) => (
            <li key={demo.href}>
              <Link
                href={demo.href}
                className="hover:bg-muted/50 block rounded-lg border p-4 transition-colors"
              >
                <span className="font-medium">{demo.title}</span>
                <p className="text-muted-foreground mt-1 text-sm">
                  {demo.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
