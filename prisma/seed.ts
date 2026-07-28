import "dotenv/config"
import { faker } from "@faker-js/faker"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

import { Prisma, PrismaClient } from "../src/generated/prisma/client"

/** Stable seed so re-runs keep the same fake names/emails. */
faker.seed(42)

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL is not set")
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const DEFAULT_PASSWORD = "password123"

type ShiftPreset = {
  type: "MORNING" | "AFTERNOON" | "NIGHT" | "FULL_DAY"
  startTime: string
  endTime: string
  weekdays: number[]
}

const SHIFT_PRESETS: ShiftPreset[] = [
  {
    type: "MORNING",
    startTime: "06:00",
    endTime: "14:00",
    weekdays: [1, 2, 3, 4, 5],
  },
  {
    type: "AFTERNOON",
    startTime: "14:00",
    endTime: "22:00",
    weekdays: [1, 2, 3, 4, 5],
  },
  {
    type: "FULL_DAY",
    startTime: "08:00",
    endTime: "17:00",
    weekdays: [1, 2, 3, 4, 5],
  },
  {
    type: "NIGHT",
    startTime: "22:00",
    endTime: "06:00",
    weekdays: [1, 2, 3, 4, 5],
  },
]

function parseDateOnly(value: Date): Date {
  return new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
  )
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Inclusive range: first day of previous month → last day of next month. */
function shiftSeedRange(now = new Date()): { from: Date; to: Date; today: Date } {
  const today = parseDateOnly(now)
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1))
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 2, 0))
  return { from, to, today }
}

function combineLocalDateAndTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map((part) => Number(part))
  const result = new Date(day)
  result.setHours(hours || 0, minutes || 0, 0, 0)
  return result
}

function durationMinutes(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000))
}

async function upsertUser(input: {
  email: string
  firstName: string
  lastName: string
  role: "ADMIN" | "USER"
  password: string
  departmentId?: string | null
  locationId?: string | null
}) {
  const password = await bcrypt.hash(input.password, 10)
  const fullName = `${input.firstName} ${input.lastName}`

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      fullName,
      role: input.role,
      password,
      isActive: true,
      deletedAt: null,
      departmentId: input.departmentId ?? null,
      locationId: input.locationId ?? null,
    },
    create: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName,
      role: input.role,
      password,
      isActive: true,
      departmentId: input.departmentId ?? null,
      locationId: input.locationId ?? null,
    },
  })
}

async function ensureDepartment(input: {
  name: string
  description: string
}) {
  const existing = await prisma.department.findFirst({
    where: { name: input.name, deletedAt: null },
  })
  if (existing) {
    return prisma.department.update({
      where: { id: existing.id },
      data: {
        description: input.description,
        isActive: true,
        deletedAt: null,
      },
    })
  }
  return prisma.department.create({
    data: {
      name: input.name,
      description: input.description,
      isActive: true,
    },
  })
}

async function ensureLocation(input: {
  name: string
  description: string
  managerId?: string | null
  minimumStaff?: number
}) {
  const existing = await prisma.location.findFirst({
    where: { name: input.name, deletedAt: null },
  })
  if (existing) {
    return prisma.location.update({
      where: { id: existing.id },
      data: {
        description: input.description,
        managerId: input.managerId ?? null,
        minimumStaff: input.minimumStaff ?? existing.minimumStaff,
        isActive: true,
        deletedAt: null,
      },
    })
  }
  return prisma.location.create({
    data: {
      name: input.name,
      description: input.description,
      managerId: input.managerId ?? null,
      minimumStaff: input.minimumStaff ?? 0,
      isActive: true,
    },
  })
}

type SeedUserSpec = {
  email: string
  role: "ADMIN" | "USER"
  /** When set, use fixed names (demo logins). Otherwise Faker. */
  firstName?: string
  lastName?: string
}

/**
 * 10 users: stable demo emails for login docs + Faker names/emails for the rest.
 */
function buildUserSpecs(): SeedUserSpec[] {
  const fixed: SeedUserSpec[] = [
    {
      email: "admin@example.com",
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
    },
    { email: "user@example.com", role: "USER" },
    { email: "manager@example.com", role: "USER" },
  ]

  const generated: SeedUserSpec[] = Array.from({ length: 7 }, () => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const email = faker.internet
      .email({ firstName, lastName, provider: "example.com" })
      .toLowerCase()
    return { email, role: "USER" as const, firstName, lastName }
  })

  return [...fixed, ...generated]
}

async function seedUsers(input: {
  departmentIds: string[]
  locationIds: string[]
}) {
  const specs = buildUserSpecs()
  const users = []

  for (const [index, spec] of specs.entries()) {
    const firstName = spec.firstName ?? faker.person.firstName()
    const lastName = spec.lastName ?? faker.person.lastName()
    const departmentId =
      input.departmentIds[index % input.departmentIds.length] ?? null
    const locationId =
      spec.email === "admin@example.com" || spec.email === "user@example.com"
        ? input.locationIds[0]
        : spec.email === "manager@example.com"
          ? input.locationIds[1]
          : input.locationIds[index % input.locationIds.length]

    const user = await upsertUser({
      email: spec.email,
      firstName,
      lastName,
      role: spec.role,
      password: DEFAULT_PASSWORD,
      departmentId,
      locationId,
    })
    users.push(user)
  }

  return users
}

/** Seed templates + dated instances across previous / current / next month. */
async function seedShiftsFromLocations() {
  const locations = await prisma.location.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
  })

  if (locations.length === 0) {
    console.log("No locations found — skipped shift seed")
    return { templates: 0, instances: 0 }
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true, role: "USER" },
    orderBy: { createdAt: "asc" },
  })

  if (users.length === 0) {
    console.log("No users found — skipped shift seed")
    return { templates: 0, instances: 0 }
  }

  const { from, to, today } = shiftSeedRange()

  let templatesCreated = 0
  let instancesCreated = 0

  for (const [locationIndex, location] of locations.entries()) {
    let assignees = users.filter((user) => user.locationId === location.id)

    if (assignees.length === 0) {
      const fallback = users[locationIndex % users.length]
      await prisma.user.update({
        where: { id: fallback.id },
        data: { locationId: location.id },
      })
      assignees = [{ ...fallback, locationId: location.id }]
    }

    // Aim for 2–3 people per location for realistic coverage
    const targetCount = Math.min(3, users.length)
    while (assignees.length < targetCount) {
      const candidate = users.find(
        (user) => !assignees.some((a) => a.id === user.id),
      )
      if (!candidate) break
      await prisma.user.update({
        where: { id: candidate.id },
        data: { locationId: location.id },
      })
      assignees.push({ ...candidate, locationId: location.id })
    }

    for (const [assigneeIndex, assignee] of assignees.entries()) {
      const preset = SHIFT_PRESETS[assigneeIndex % SHIFT_PRESETS.length]

      let template = await prisma.shiftTemplate.findFirst({
        where: {
          deletedAt: null,
          locationId: location.id,
          userId: assignee.id,
          type: preset.type,
          startTime: preset.startTime,
          endTime: preset.endTime,
        },
      })

      if (!template) {
        template = await prisma.shiftTemplate.create({
          data: {
            locationId: location.id,
            userId: assignee.id,
            type: preset.type,
            startTime: preset.startTime,
            endTime: preset.endTime,
            weekdays: preset.weekdays,
            notes: `Seeded ${preset.type.toLowerCase()} at ${location.name}`,
            isActive: true,
          },
        })
        templatesCreated += 1
      } else {
        template = await prisma.shiftTemplate.update({
          where: { id: template.id },
          data: {
            weekdays: preset.weekdays,
            notes: `Seeded ${preset.type.toLowerCase()} at ${location.name}`,
            isActive: true,
            deletedAt: null,
          },
        })
      }

      const weekdaySet = new Set(template.weekdays)
      for (
        let cursor = new Date(from);
        cursor.getTime() <= to.getTime();
        cursor = addUtcDays(cursor, 1)
      ) {
        if (!weekdaySet.has(cursor.getUTCDay())) continue

        const isPast = cursor.getTime() < today.getTime()
        const status = isPast ? "COMPLETED" : "SCHEDULED"

        const existing = await prisma.shiftInstance.findFirst({
          where: {
            deletedAt: null,
            userId: assignee.id,
            date: cursor,
            startTime: template.startTime,
            endTime: template.endTime,
          },
        })

        if (existing) {
          if (existing.status !== status) {
            await prisma.shiftInstance.update({
              where: { id: existing.id },
              data: { status, deletedAt: null },
            })
          }
          continue
        }

        await prisma.shiftInstance.create({
          data: {
            templateId: template.id,
            locationId: location.id,
            userId: assignee.id,
            date: cursor,
            type: template.type,
            startTime: template.startTime,
            endTime: template.endTime,
            status,
            notes: template.notes,
          },
        })
        instancesCreated += 1
      }
    }
  }

  return { templates: templatesCreated, instances: instancesCreated }
}

/**
 * Attendance for past scheduled/completed shifts: check-in/out + activity rows.
 * Skips shifts that already have attendance.
 */
async function seedAttendanceLog() {
  const { today } = shiftSeedRange()

  const pastShifts = await prisma.shiftInstance.findMany({
    where: {
      deletedAt: null,
      date: { lt: today },
      status: { not: "CANCELLED" },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })

  let created = 0
  let skipped = 0

  for (const shift of pastShifts) {
    const existing = await prisma.shiftAttendance.findFirst({
      where: { shiftInstanceId: shift.id },
      select: { id: true },
    })
    if (existing) {
      skipped += 1
      continue
    }

    // ~8% no-shows — leave no attendance row
    if (faker.number.float({ min: 0, max: 1 }) < 0.08) {
      skipped += 1
      continue
    }

    const dayLocal = new Date(
      shift.date.getUTCFullYear(),
      shift.date.getUTCMonth(),
      shift.date.getUTCDate(),
    )

    const plannedStart = combineLocalDateAndTime(dayLocal, shift.startTime)
    let plannedEnd = combineLocalDateAndTime(dayLocal, shift.endTime)
    // Overnight shifts (e.g. 22:00–06:00)
    if (plannedEnd.getTime() <= plannedStart.getTime()) {
      plannedEnd = new Date(plannedEnd.getTime() + 24 * 60 * 60 * 1000)
    }

    const checkInOffset = faker.number.int({ min: -20, max: 35 })
    const checkOutOffset = faker.number.int({ min: -25, max: 20 })

    const checkInAt = new Date(
      plannedStart.getTime() + checkInOffset * 60_000,
    )
    let checkOutAt = new Date(plannedEnd.getTime() + checkOutOffset * 60_000)
    if (checkOutAt.getTime() <= checkInAt.getTime()) {
      checkOutAt = new Date(checkInAt.getTime() + 6 * 60 * 60 * 1000)
    }

    const minutes = durationMinutes(checkInAt, checkOutAt)

    const checkInActivity = await prisma.userActivity.create({
      data: {
        userId: shift.userId,
        timestamp: checkInAt,
        activity: "SHIFT_CHECK_IN",
        activityData: {
          seeded: true,
          shiftInstanceId: shift.id,
          locationId: shift.locationId,
          checkInAt: checkInAt.toISOString(),
          minutesFromStart: checkInOffset,
        },
      },
    })

    const checkOutActivity = await prisma.userActivity.create({
      data: {
        userId: shift.userId,
        timestamp: checkOutAt,
        activity: "SHIFT_CHECK_OUT",
        activityData: {
          seeded: true,
          shiftInstanceId: shift.id,
          locationId: shift.locationId,
          checkInAt: checkInAt.toISOString(),
          checkOutAt: checkOutAt.toISOString(),
          durationMinutes: minutes,
        },
      },
    })

    await prisma.shiftAttendance.create({
      data: {
        userId: shift.userId,
        shiftInstanceId: shift.id,
        locationId: shift.locationId,
        checkInAt,
        checkOutAt,
        durationMinutes: minutes,
        checkInActivityId: checkInActivity.id,
        checkOutActivityId: checkOutActivity.id,
      },
    })

    created += 1
  }

  return { created, skipped, considered: pastShifts.length }
}

type ActivitySeedRow = {
  userId: string
  timestamp: Date
  activity:
    | "LOGIN"
    | "LOGOUT"
    | "REGISTER"
    | "VERIFY"
    | "SHIFT_TEMPLATE_CREATE"
    | "SHIFT_TEMPLATE_UPDATE"
    | "SHIFT_TEMPLATE_GENERATE"
    | "SHIFT_INSTANCE_CREATE"
    | "SHIFT_INSTANCE_UPDATE"
    | "SHIFT_INSTANCE_DELETE"
  activityData: Prisma.InputJsonValue
}

/**
 * Broader audit trail beyond clock punches — logins, register/verify,
 * and admin shift-management events over the same month window.
 */
async function seedActivityLog() {
  const already = await prisma.userActivity.count({
    where: {
      activityData: {
        path: ["seedCategory"],
        equals: "audit",
      },
    },
  })
  if (already > 0) {
    return { created: 0, skipped: already }
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, email: true, role: true, fullName: true },
  })
  const admin = users.find((user) => user.role === "ADMIN")
  const { from, to, today } = shiftSeedRange()

  const rows: ActivitySeedRow[] = []

  for (const user of users) {
    // Account lifecycle near the start of the window
    const registerAt = addUtcDays(
      from,
      faker.number.int({ min: 0, max: 5 }),
    )
    registerAt.setUTCHours(
      faker.number.int({ min: 8, max: 18 }),
      faker.number.int({ min: 0, max: 59 }),
      0,
      0,
    )
    rows.push({
      userId: user.id,
      timestamp: registerAt,
      activity: "REGISTER",
      activityData: {
        seeded: true,
        seedCategory: "audit",
        email: user.email,
      },
    })

    if (faker.datatype.boolean({ probability: 0.85 })) {
      const verifyAt = new Date(
        registerAt.getTime() +
          faker.number.int({ min: 30, max: 48 * 60 }) * 60_000,
      )
      rows.push({
        userId: admin?.id ?? user.id,
        timestamp: verifyAt,
        activity: "VERIFY",
        activityData: {
          seeded: true,
          seedCategory: "audit",
          verifiedUserId: user.id,
          verifiedEmail: user.email,
        },
      })
    }

    // LOGIN / LOGOUT on random weekdays in the past window
    for (
      let cursor = new Date(from);
      cursor.getTime() < today.getTime();
      cursor = addUtcDays(cursor, 1)
    ) {
      const weekday = cursor.getUTCDay()
      if (weekday === 0 || weekday === 6) continue
      if (faker.number.float({ min: 0, max: 1 }) > 0.55) continue

      const loginHour = faker.number.int({ min: 5, max: 10 })
      const loginAt = new Date(cursor)
      loginAt.setUTCHours(
        loginHour,
        faker.number.int({ min: 0, max: 59 }),
        0,
        0,
      )

      const logoutAt = new Date(loginAt)
      logoutAt.setUTCHours(
        faker.number.int({ min: Math.max(loginHour + 6, 14), max: 23 }),
        faker.number.int({ min: 0, max: 59 }),
        0,
        0,
      )

      rows.push({
        userId: user.id,
        timestamp: loginAt,
        activity: "LOGIN",
        activityData: {
          seeded: true,
          seedCategory: "audit",
          method: "password",
        },
      })
      rows.push({
        userId: user.id,
        timestamp: logoutAt,
        activity: "LOGOUT",
        activityData: {
          seeded: true,
          seedCategory: "audit",
        },
      })
    }
  }

  // Admin shift-management noise across the window
  if (admin) {
    const adminActions = [
      "SHIFT_TEMPLATE_CREATE",
      "SHIFT_TEMPLATE_UPDATE",
      "SHIFT_TEMPLATE_GENERATE",
      "SHIFT_INSTANCE_CREATE",
      "SHIFT_INSTANCE_UPDATE",
      "SHIFT_INSTANCE_DELETE",
    ] as const

    for (let i = 0; i < 40; i += 1) {
      const dayOffset = faker.number.int({
        min: 0,
        max: Math.max(
          0,
          Math.floor((to.getTime() - from.getTime()) / 86_400_000),
        ),
      })
      const at = addUtcDays(from, dayOffset)
      if (at.getTime() > today.getTime()) continue
      at.setUTCHours(
        faker.number.int({ min: 9, max: 17 }),
        faker.number.int({ min: 0, max: 59 }),
        0,
        0,
      )

      const activity = faker.helpers.arrayElement(adminActions)
      rows.push({
        userId: admin.id,
        timestamp: at,
        activity,
        activityData: {
          seeded: true,
          seedCategory: "audit",
          note: faker.helpers.arrayElement([
            "Seeded schedule change",
            "Coverage adjustment",
            "Generated from template",
            "Corrected assignee",
          ]),
        },
      })
    }
  }

  // Newest-looking first not required; insert in chronological batches
  rows.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const chunkSize = 200
  let created = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const result = await prisma.userActivity.createMany({
      data: chunk.map((row) => ({
        userId: row.userId,
        timestamp: row.timestamp,
        activity: row.activity,
        activityData: row.activityData,
      })),
    })
    created += result.count
  }

  return { created, skipped: 0 }
}

async function main() {
  const engineering = await ensureDepartment({
    name: "Engineering",
    description: "Product engineering and platform",
  })
  const operations = await ensureDepartment({
    name: "Operations",
    description: "Business operations and support",
  })
  const people = await ensureDepartment({
    name: "People",
    description: "HR and workplace experience",
  })

  // Bootstrap locations (managers assigned after users exist)
  const hq = await ensureLocation({
    name: "Headquarters",
    description: "Main office",
    minimumStaff: 3,
  })
  const warehouse = await ensureLocation({
    name: "Warehouse",
    description: "Fulfillment and inventory",
    minimumStaff: 2,
  })
  const remote = await ensureLocation({
    name: "Remote",
    description: "Distributed / remote workforce",
    minimumStaff: 1,
  })

  const users = await seedUsers({
    departmentIds: [engineering.id, operations.id, people.id],
    locationIds: [hq.id, warehouse.id, remote.id],
  })

  const admin = users.find((user) => user.email === "admin@example.com")
  const manager = users.find((user) => user.email === "manager@example.com")

  await prisma.location.update({
    where: { id: hq.id },
    data: { managerId: admin?.id ?? null },
  })
  await prisma.location.update({
    where: { id: warehouse.id },
    data: { managerId: manager?.id ?? null },
  })
  // Leave Remote without a manager for the "without manager" demo tab

  const shifts = await seedShiftsFromLocations()
  const attendance = await seedAttendanceLog()
  const activities = await seedActivityLog()

  console.log("Seed complete")
  console.log(`  users: ${users.length} (password: ${DEFAULT_PASSWORD})`)
  console.log(
    `  demo logins: admin@example.com, user@example.com, manager@example.com`,
  )
  console.log(`  shifts: +${shifts.templates} templates, +${shifts.instances} instances`)
  console.log(
    `  attendance: +${attendance.created} records (${attendance.skipped} skipped of ${attendance.considered} past shifts)`,
  )
  console.log(
    activities.skipped > 0 && activities.created === 0
      ? `  activity audit: skipped (already had ${activities.skipped} seeded rows)`
      : `  activity audit: +${activities.created} records`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
