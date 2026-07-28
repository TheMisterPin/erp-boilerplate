import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import bcrypt from "bcryptjs"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL is not set")
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

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

/** Seed templates + dated instances for every active location in the DB. */
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
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: "asc" },
  })

  if (users.length === 0) {
    console.log("No users found — skipped shift seed")
    return { templates: 0, instances: 0 }
  }

  const from = parseDateOnly(new Date())
  const to = addUtcDays(from, 13)

  let templatesCreated = 0
  let instancesCreated = 0

  for (const [locationIndex, location] of locations.entries()) {
    let assignees = users.filter((user) => user.locationId === location.id)

    // Ensure each location has at least two assignees for variety
    if (assignees.length === 0) {
      const fallback = users[locationIndex % users.length]
      await prisma.user.update({
        where: { id: fallback.id },
        data: { locationId: location.id },
      })
      assignees = [fallback]
    }

    while (assignees.length < Math.min(2, users.length)) {
      const candidate = users.find(
        (user) => !assignees.some((a) => a.id === user.id),
      )
      if (!candidate) break
      await prisma.user.update({
        where: { id: candidate.id },
        data: { locationId: location.id },
      })
      assignees.push(candidate)
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

        const existing = await prisma.shiftInstance.findFirst({
          where: {
            deletedAt: null,
            userId: assignee.id,
            date: cursor,
            startTime: template.startTime,
            endTime: template.endTime,
          },
          select: { id: true },
        })
        if (existing) continue

        await prisma.shiftInstance.create({
          data: {
            templateId: template.id,
            locationId: location.id,
            userId: assignee.id,
            date: cursor,
            type: template.type,
            startTime: template.startTime,
            endTime: template.endTime,
            status: "SCHEDULED",
            notes: template.notes,
          },
        })
        instancesCreated += 1
      }
    }
  }

  return { templates: templatesCreated, instances: instancesCreated }
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

  const admin = await upsertUser({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN",
    password: "password123",
    departmentId: engineering.id,
  })

  const hq = await ensureLocation({
    name: "Headquarters",
    description: "Main office",
    managerId: admin.id,
    minimumStaff: 3,
  })
  const warehouse = await ensureLocation({
    name: "Warehouse",
    description: "Fulfillment and inventory",
    minimumStaff: 2,
  })
  await ensureLocation({
    name: "Remote",
    description: "Distributed / remote workforce",
    minimumStaff: 1,
  })

  await upsertUser({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN",
    password: "password123",
    departmentId: engineering.id,
    locationId: hq.id,
  })

  const demo = await upsertUser({
    email: "user@example.com",
    firstName: "Demo",
    lastName: "User",
    role: "USER",
    password: "password123",
    departmentId: operations.id,
    locationId: hq.id,
  })

  const manager = await upsertUser({
    email: "manager@example.com",
    firstName: "Site",
    lastName: "Manager",
    role: "USER",
    password: "password123",
    departmentId: operations.id,
    locationId: warehouse.id,
  })

  await upsertUser({
    email: "alex@example.com",
    firstName: "Alex",
    lastName: "Rivera",
    role: "USER",
    password: "password123",
    departmentId: operations.id,
    locationId: warehouse.id,
  })

  await upsertUser({
    email: "sam@example.com",
    firstName: "Sam",
    lastName: "Chen",
    role: "USER",
    password: "password123",
    departmentId: engineering.id,
    locationId: hq.id,
  })

  await prisma.location.update({
    where: { id: warehouse.id },
    data: { managerId: manager.id },
  })

  // Keep demo user as a second HQ assignee for morning/afternoon coverage
  void demo

  const shifts = await seedShiftsFromLocations()

  console.log(
    "Seeded users, departments, locations, and shifts from DB locations:",
    shifts,
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
