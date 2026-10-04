import { randomUUID } from "node:crypto"

import bcrypt from "bcryptjs"

import type { OrganizationRoleKey, Prisma, PrismaClient } from "@/generated/prisma/client"
import { ROLE_PERMISSIONS } from "@/features/auth/permissions"
import {
  addUtcDays,
  parseDateOnly,
  startOfDay,
} from "@/features/dashboard/lib/dates"
import { shouldEnsureDemoData } from "@/features/demo/should-ensure-demo-data"

const DEPARTMENTS = [
  { name: "Engineering", description: "Product engineering and platform" },
  { name: "Operations", description: "Business operations and support" },
  { name: "People", description: "HR and workplace experience" },
] as const

const LOCATIONS = [
  { name: "Headquarters", description: "Main office", minimumStaff: 3 },
  { name: "Warehouse", description: "Fulfillment and inventory", minimumStaff: 2 },
  { name: "Remote", description: "Distributed workforce", minimumStaff: 1 },
] as const

const ROSTER: Array<{
  email: string
  firstName: string
  lastName: string
  role: OrganizationRoleKey
  location: (typeof LOCATIONS)[number]["name"]
  department: (typeof DEPARTMENTS)[number]["name"]
}> = [
  { email: "maya.chen@example.com", firstName: "Maya", lastName: "Chen", role: "MANAGER", location: "Warehouse", department: "Operations" },
  { email: "luis.ortega@example.com", firstName: "Luis", lastName: "Ortega", role: "OPERATOR", location: "Headquarters", department: "Engineering" },
  { email: "priya.shah@example.com", firstName: "Priya", lastName: "Shah", role: "OPERATOR", location: "Headquarters", department: "Engineering" },
  { email: "jonah.blake@example.com", firstName: "Jonah", lastName: "Blake", role: "OPERATOR", location: "Warehouse", department: "Operations" },
  { email: "elena.vasquez@example.com", firstName: "Elena", lastName: "Vasquez", role: "OPERATOR", location: "Warehouse", department: "Operations" },
  { email: "chris.nguyen@example.com", firstName: "Chris", lastName: "Nguyen", role: "OPERATOR", location: "Remote", department: "People" },
  { email: "amira.hassan@example.com", firstName: "Amira", lastName: "Hassan", role: "VIEWER", location: "Headquarters", department: "People" },
  { email: "samir.patel@example.com", firstName: "Samir", lastName: "Patel", role: "OPERATOR", location: "Remote", department: "Engineering" },
]

const PRESETS = [
  { type: "MORNING" as const, startTime: "06:00", endTime: "14:00", weekdays: [1, 2, 3, 4, 5] },
  { type: "AFTERNOON" as const, startTime: "14:00", endTime: "22:00", weekdays: [1, 2, 3, 4, 5] },
  { type: "FULL_DAY" as const, startTime: "08:00", endTime: "17:00", weekdays: [1, 2, 3, 4, 5] },
  { type: "NIGHT" as const, startTime: "22:00", endTime: "06:00", weekdays: [0, 1, 2, 3, 4, 5, 6] },
]

const TIME_OFF_SAMPLES = [
  { status: "PENDING" as const, type: "TIME_OFF" as const, start: 2, end: 4, note: "Family travel — school break", createdDaysAgo: 1 },
  { status: "PENDING" as const, type: "SICK" as const, start: 0, end: 1, note: "Medical appointment in the morning", createdDaysAgo: 0 },
  { status: "PENDING" as const, type: "TIME_OFF" as const, start: 10, end: 12, note: "Out of town for a wedding", createdDaysAgo: 2 },
  { status: "APPROVED" as const, type: "TIME_OFF" as const, start: -4, end: -2, note: "Moved apartments", createdDaysAgo: 6 },
  { status: "APPROVED" as const, type: "SICK" as const, start: 6, end: 7, note: "Procedure and recovery day", createdDaysAgo: 4 },
  { status: "REJECTED" as const, type: "TIME_OFF" as const, start: 8, end: 9, note: "Festival weekend", createdDaysAgo: 5 },
]

type Member = {
  userId: string
  locationId: string | null
  departmentId: string | null
  role: OrganizationRoleKey | null
  email: string
  fullName: string
}

const inflight = new Map<string, Promise<void>>()

function shiftWindow(now = new Date()) {
  const today = parseDateOnly(now)
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1))
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 2, 0))
  return { from, today, to }
}

function localDayFromUtc(utcMidnight: Date): Date {
  return new Date(
    utcMidnight.getUTCFullYear(),
    utcMidnight.getUTCMonth(),
    utcMidnight.getUTCDate(),
  )
}

function combineLocal(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map((part) => Number(part))
  const result = new Date(day)
  result.setHours(hours || 0, minutes || 0, 0, 0)
  return result
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function timeOnLocalDay(day: Date, hours: number, minutes: number): Date {
  const result = new Date(day)
  result.setHours(hours, minutes, 0, 0)
  return result
}

async function demoPasswordHash(): Promise<string> {
  const configured = process.env.SEED_PASSWORD
  const secret =
    configured && configured.length >= 12
      ? configured
      : randomUUID() + randomUUID()
  return bcrypt.hash(secret, 10)
}

async function isFresh(
  db: PrismaClient,
  organizationId: string,
  now: Date,
): Promise<boolean> {
  const today = parseDateOnly(now)
  const todayStart = startOfDay(now)
  const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const [departments, locations, members, shiftsToday, pending, openClocks, activity] =
    await Promise.all([
      db.department.count({ where: { organizationId, deletedAt: null } }),
      db.location.count({ where: { organizationId, deletedAt: null, isActive: true } }),
      db.membership.count({
        where: { organizationId, status: "ACTIVE", user: { deletedAt: null, isActive: true } },
      }),
      db.shiftInstance.count({
        where: { organizationId, deletedAt: null, date: today, status: { not: "CANCELLED" } },
      }),
      db.timeOffRequest.count({
        where: { organizationId, deletedAt: null, status: "PENDING" },
      }),
      db.shiftAttendance.count({
        where: { organizationId, checkOutAt: null, checkInAt: { gte: todayStart } },
      }),
      db.userActivity.count({
        where: { organizationId, timestamp: { gte: recent } },
      }),
    ])

  return (
    departments >= 3 &&
    locations >= 3 &&
    members >= 6 &&
    shiftsToday >= 2 &&
    pending >= 2 &&
    openClocks >= 2 &&
    activity >= 3
  )
}

async function ensureRoles(db: PrismaClient, organizationId: string) {
  const existing = await db.organizationRole.findMany({
    where: { organizationId, deletedAt: null },
    select: { key: true },
  })
  const have = new Set(existing.map((role) => role.key))
  const missing = (Object.entries(ROLE_PERMISSIONS) as Array<
    [OrganizationRoleKey, readonly string[]]
  >).filter(([key]) => !have.has(key))
  if (missing.length === 0) return
  await db.organizationRole.createMany({
    data: missing.map(([key, permissions]) => ({
      organizationId,
      key,
      name: key.charAt(0) + key.slice(1).toLowerCase(),
      permissions: [...permissions],
    })),
  })
}

async function ensureDepartments(db: PrismaClient, organizationId: string) {
  const existing = await db.department.findMany({
    where: { organizationId, deletedAt: null },
  })
  const byName = new Map(existing.map((row) => [row.name, row]))
  for (const spec of DEPARTMENTS) {
    const found = byName.get(spec.name)
    if (found) continue
    const created = await db.department.create({
      data: { organizationId, name: spec.name, description: spec.description, isActive: true },
    })
    byName.set(spec.name, created)
  }
  return byName
}

async function ensureLocations(db: PrismaClient, organizationId: string) {
  const existing = await db.location.findMany({
    where: { organizationId, deletedAt: null },
  })
  const byName = new Map(existing.map((row) => [row.name, row]))
  for (const spec of LOCATIONS) {
    const found = byName.get(spec.name)
    if (found) {
      if (found.minimumStaff === 0) {
        const updated = await db.location.update({
          where: { id: found.id },
          data: { minimumStaff: spec.minimumStaff, isActive: true },
        })
        byName.set(spec.name, updated)
      }
      continue
    }
    const created = await db.location.create({
      data: {
        organizationId,
        name: spec.name,
        description: spec.description,
        minimumStaff: spec.minimumStaff,
        isActive: true,
      },
    })
    byName.set(spec.name, created)
  }
  return byName
}

async function ensureRoster(
  db: PrismaClient,
  organizationId: string,
  departments: Map<string, { id: string }>,
  locations: Map<string, { id: string }>,
) {
  const memberCount = await db.membership.count({
    where: { organizationId, status: "ACTIVE" },
  })
  if (memberCount >= 6) return

  const password = await demoPasswordHash()
  const roles = await db.organizationRole.findMany({
    where: { organizationId, deletedAt: null, isActive: true },
  })
  const roleByKey = new Map(roles.map((role) => [role.key, role.id]))

  for (const person of ROSTER) {
    const user = await db.user.upsert({
      where: { email: person.email },
      update: { isActive: true, deletedAt: null },
      create: {
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: `${person.firstName} ${person.lastName}`,
        password,
        role: "USER",
        isActive: true,
        isVerified: true,
      },
    })
    const departmentId = departments.get(person.department)?.id ?? null
    const locationId = locations.get(person.location)?.id ?? null
    const membership = await db.membership.upsert({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      update: {
        status: "ACTIVE",
        departmentId: departmentId ?? undefined,
        locationId: locationId ?? undefined,
      },
      create: {
        organizationId,
        userId: user.id,
        status: "ACTIVE",
        departmentId,
        locationId,
      },
    })
    const roleId = roleByKey.get(person.role)
    if (!roleId) continue
    await db.roleAssignment.upsert({
      where: { membershipId: membership.id },
      update: { roleId, deletedAt: null },
      create: { membershipId: membership.id, roleId },
    })
  }
}

async function ensureCurrentUserPlacement(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  departments: Map<string, { id: string }>,
  locations: Map<string, { id: string }>,
) {
  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  })
  if (!membership) return
  await db.membership.update({
    where: { id: membership.id },
    data: {
      departmentId: membership.departmentId ?? departments.get("Operations")?.id ?? null,
      locationId: membership.locationId ?? locations.get("Headquarters")?.id ?? null,
    },
  })
}

async function ensureManagers(
  db: PrismaClient,
  organizationId: string,
  currentUserId: string,
  locations: Map<string, { id: string; managerId: string | null }>,
) {
  const members = await loadMembers(db, organizationId)
  const hq = locations.get("Headquarters")
  const warehouse = locations.get("Warehouse")
  const manager = members.find((member) => member.role === "MANAGER") ?? members.find((member) => member.userId === currentUserId)
  if (hq && !hq.managerId) {
    await db.location.update({
      where: { id: hq.id },
      data: { managerId: currentUserId },
    })
  }
  if (warehouse && !warehouse.managerId && manager) {
    await db.location.update({
      where: { id: warehouse.id },
      data: { managerId: manager.userId },
    })
  }
}

async function loadMembers(db: PrismaClient, organizationId: string): Promise<Member[]> {
  const rows = await db.membership.findMany({
    where: { organizationId, status: "ACTIVE", user: { deletedAt: null, isActive: true } },
    select: {
      userId: true,
      locationId: true,
      departmentId: true,
      user: { select: { email: true, fullName: true } },
      roleAssignment: { select: { deletedAt: true, role: { select: { key: true } } } },
    },
  })
  return rows.map((row) => ({
    userId: row.userId,
    locationId: row.locationId,
    departmentId: row.departmentId,
    email: row.user.email,
    fullName: row.user.fullName,
    role:
      row.roleAssignment && !row.roleAssignment.deletedAt
        ? row.roleAssignment.role.key
        : null,
  }))
}

async function ensureShifts(
  db: PrismaClient,
  organizationId: string,
  members: Member[],
  locations: Map<string, { id: string; name: string }>,
  now: Date,
) {
  const placed = members.filter((member) => member.locationId)
  if (placed.length === 0) return

  const { from, today, to } = shiftWindow(now)
  const templates = await db.shiftTemplate.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, userId: true, locationId: true, type: true, startTime: true, endTime: true, weekdays: true, notes: true },
  })
  const templateByUser = new Map(templates.map((template) => [template.userId, template]))

  for (const [index, member] of placed.entries()) {
    if (templateByUser.has(member.userId) || !member.locationId) continue
    const preset = PRESETS[index % PRESETS.length]
    const locationName = [...locations.values()].find((location) => location.id === member.locationId)?.name ?? "site"
    const created = await db.shiftTemplate.create({
      data: {
        organizationId,
        locationId: member.locationId,
        userId: member.userId,
        type: preset.type,
        startTime: preset.startTime,
        endTime: preset.endTime,
        weekdays: preset.weekdays,
        notes: `${preset.type[0]}${preset.type.slice(1).toLowerCase()} coverage at ${locationName}`,
        isActive: true,
      },
      select: { id: true, userId: true, locationId: true, type: true, startTime: true, endTime: true, weekdays: true, notes: true },
    })
    templateByUser.set(member.userId, created)
  }

  const existing = await db.shiftInstance.findMany({
    where: { organizationId, deletedAt: null, date: { gte: from, lte: to } },
    select: { userId: true, date: true },
  })
  const have = new Set(existing.map((row) => `${row.userId}:${row.date.toISOString()}`))
  const warehouseIds = new Set(
    [...locations.values()].filter((location) => location.name === "Warehouse").map((location) => location.id),
  )

  const rows: Prisma.ShiftInstanceCreateManyInput[] = []
  for (const member of placed) {
    const template = templateByUser.get(member.userId)
    if (!template || !member.locationId) continue
    const weekdays = new Set(template.weekdays)
    const coversEveryDay = warehouseIds.has(member.locationId)
    for (let cursor = new Date(from); cursor.getTime() <= to.getTime(); cursor = addUtcDays(cursor, 1)) {
      const isToday = cursor.getTime() === today.getTime()
      if (!isToday && !coversEveryDay && !weekdays.has(cursor.getUTCDay())) continue
      const key = `${member.userId}:${cursor.toISOString()}`
      if (have.has(key)) continue
      have.add(key)
      rows.push({
        organizationId,
        templateId: template.id,
        locationId: member.locationId,
        userId: member.userId,
        date: new Date(cursor),
        type: template.type,
        startTime: template.startTime,
        endTime: template.endTime,
        status: cursor.getTime() < today.getTime() ? "COMPLETED" : "SCHEDULED",
        notes: template.notes,
      })
    }
  }

  for (let i = 0; i < rows.length; i += 200) {
    await db.shiftInstance.createMany({ data: rows.slice(i, i + 200) })
  }
}

async function ensureAttendance(db: PrismaClient, organizationId: string, now: Date) {
  const today = parseDateOnly(now)
  const historyFrom = addUtcDays(today, -10)
  const shifts = await db.shiftInstance.findMany({
    where: {
      organizationId,
      deletedAt: null,
      date: { gte: historyFrom, lte: today },
      status: { not: "CANCELLED" },
    },
    select: { id: true, userId: true, locationId: true, date: true, startTime: true, endTime: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })
  if (shifts.length === 0) return

  const existing = await db.shiftAttendance.findMany({
    where: { shiftInstanceId: { in: shifts.map((shift) => shift.id) } },
    select: { shiftInstanceId: true },
  })
  const attended = new Set(existing.map((row) => row.shiftInstanceId))

  const activities: Prisma.UserActivityCreateManyInput[] = []
  const attendances: Prisma.ShiftAttendanceCreateManyInput[] = []
  const openUserIds = new Set<string>()

  for (const shift of shifts) {
    if (attended.has(shift.id)) continue
    const isToday = shift.date.getTime() === today.getTime()
    if (!isToday && shift.id.charCodeAt(0) % 11 === 0) continue

    const day = localDayFromUtc(shift.date)
    const plannedStart = combineLocal(day, shift.startTime)
    let plannedEnd = combineLocal(day, shift.endTime)
    if (plannedEnd.getTime() <= plannedStart.getTime()) {
      plannedEnd = new Date(plannedEnd.getTime() + 24 * 60 * 60 * 1000)
    }

    if (isToday) {
      if (plannedStart.getTime() > now.getTime() - 15 * 60_000) continue
      if (openUserIds.size >= 3) continue
      if (openUserIds.has(shift.userId)) continue
      const checkInAt = new Date(plannedStart.getTime() + 18 * 60_000)
      if (checkInAt.getTime() > now.getTime()) continue
      const checkInActivityId = randomUUID()
      activities.push({
        id: checkInActivityId,
        organizationId,
        userId: shift.userId,
        timestamp: checkInAt,
        activity: "SHIFT_CHECK_IN",
        activityData: { seeded: true, shiftInstanceId: shift.id, locationId: shift.locationId },
      })
      attendances.push({
        organizationId,
        userId: shift.userId,
        shiftInstanceId: shift.id,
        locationId: shift.locationId,
        checkInAt,
        checkInActivityId,
      })
      openUserIds.add(shift.userId)
      continue
    }

    const late = shift.id.charCodeAt(shift.id.length - 1) % 4 === 0
    const checkInAt = new Date(plannedStart.getTime() + (late ? 22 : 3) * 60_000)
    const checkOutAt = new Date(plannedEnd.getTime() + (late ? 10 : -5) * 60_000)
    const safeOut = checkOutAt.getTime() > checkInAt.getTime()
      ? checkOutAt
      : new Date(checkInAt.getTime() + 6 * 60 * 60 * 1000)
    const minutes = Math.max(0, Math.floor((safeOut.getTime() - checkInAt.getTime()) / 60_000))
    const checkInActivityId = randomUUID()
    const checkOutActivityId = randomUUID()
    activities.push(
      {
        id: checkInActivityId,
        organizationId,
        userId: shift.userId,
        timestamp: checkInAt,
        activity: "SHIFT_CHECK_IN",
        activityData: { seeded: true, shiftInstanceId: shift.id, locationId: shift.locationId },
      },
      {
        id: checkOutActivityId,
        organizationId,
        userId: shift.userId,
        timestamp: safeOut,
        activity: "SHIFT_CHECK_OUT",
        activityData: { seeded: true, shiftInstanceId: shift.id, durationMinutes: minutes },
      },
    )
    attendances.push({
      organizationId,
      userId: shift.userId,
      shiftInstanceId: shift.id,
      locationId: shift.locationId,
      checkInAt,
      checkOutAt: safeOut,
      durationMinutes: minutes,
      checkInActivityId,
      checkOutActivityId,
    })
  }

  if (openUserIds.size < 2) {
    const todayShifts = shifts.filter((shift) => shift.date.getTime() === today.getTime() && !attended.has(shift.id))
    for (const shift of todayShifts) {
      if (openUserIds.size >= 3) break
      if (openUserIds.has(shift.userId)) continue
      if (attendances.some((row) => row.shiftInstanceId === shift.id)) continue
      const checkInAt = new Date(now.getTime() - (70 - openUserIds.size * 15) * 60_000)
      const start = new Date(now.getTime() - 100 * 60_000)
      const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
      await db.shiftInstance.update({
        where: { id: shift.id },
        data: { startTime, status: "SCHEDULED" },
      })
      const checkInActivityId = randomUUID()
      activities.push({
        id: checkInActivityId,
        organizationId,
        userId: shift.userId,
        timestamp: checkInAt,
        activity: "SHIFT_CHECK_IN",
        activityData: { seeded: true, shiftInstanceId: shift.id, locationId: shift.locationId },
      })
      attendances.push({
        organizationId,
        userId: shift.userId,
        shiftInstanceId: shift.id,
        locationId: shift.locationId,
        checkInAt,
        checkInActivityId,
      })
      openUserIds.add(shift.userId)
    }
  }

  if (activities.length > 0) {
    await db.userActivity.createMany({ data: activities })
  }
  if (attendances.length > 0) {
    await db.shiftAttendance.createMany({ data: attendances })
  }
}

async function ensureTimeOff(
  db: PrismaClient,
  organizationId: string,
  members: Member[],
  reviewerId: string,
  now: Date,
) {
  const today = parseDateOnly(now)
  const operators = members.filter((member) => member.role === "OPERATOR")
  const requesters = operators.length > 0 ? operators : members
  if (requesters.length === 0) return

  const existing = await db.timeOffRequest.findMany({
    where: { organizationId, deletedAt: null },
    select: { note: true, status: true },
  })
  const notes = new Set(existing.map((row) => row.note))
  let pending = existing.filter((row) => row.status === "PENDING").length

  const rows: Prisma.TimeOffRequestCreateManyInput[] = []
  const activities: Prisma.UserActivityCreateManyInput[] = []

  for (const [index, sample] of TIME_OFF_SAMPLES.entries()) {
    if (notes.has(sample.note)) continue
    if (sample.status === "PENDING" && pending >= 3) continue
    const requester = requesters[index % requesters.length]
    const startDate = addUtcDays(today, sample.start)
    const endDate = addUtcDays(today, sample.end)
    const createdAt = timeOnLocalDay(addDaysLocal(now, -sample.createdDaysAgo), 9 + index, 15)
    rows.push({
      organizationId,
      userId: requester.userId,
      type: sample.type,
      status: sample.status,
      startDate,
      endDate,
      note: sample.note,
      createdAt,
      reviewedById: sample.status === "PENDING" ? null : reviewerId,
      reviewedAt: sample.status === "PENDING" ? null : timeOnLocalDay(addDaysLocal(now, -sample.createdDaysAgo + 1), 11, 0),
      reviewNote: sample.status === "APPROVED" ? "Approved — coverage is set." : sample.status === "REJECTED" ? "Need coverage on that shift." : null,
    })
    activities.push({
      organizationId,
      userId: requester.userId,
      timestamp: createdAt,
      activity: "TIME_OFF_REQUEST",
      activityData: { seeded: true, note: sample.note, type: sample.type },
    })
    if (sample.status === "APPROVED" || sample.status === "REJECTED") {
      activities.push({
        organizationId,
        userId: reviewerId,
        timestamp: timeOnLocalDay(addDaysLocal(now, -sample.createdDaysAgo + 1), 11, 5),
        activity: sample.status === "APPROVED" ? "TIME_OFF_APPROVE" : "TIME_OFF_REJECT",
        activityData: { seeded: true, note: sample.note },
      })
    }
    notes.add(sample.note)
    if (sample.status === "PENDING") pending += 1
  }

  if (pending < 2 && requesters[0]) {
    const extraNote = "Can someone cover the late floor shift?"
    if (!notes.has(extraNote)) {
      const createdAt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
      rows.push({
        organizationId,
        userId: requesters[0].userId,
        type: "TIME_OFF",
        status: "PENDING",
        startDate: addUtcDays(today, 1),
        endDate: addUtcDays(today, 1),
        note: extraNote,
        createdAt,
      })
      activities.push({
        organizationId,
        userId: requesters[0].userId,
        timestamp: createdAt,
        activity: "TIME_OFF_REQUEST",
        activityData: { seeded: true, note: extraNote },
      })
    }
  }

  if (rows.length > 0) await db.timeOffRequest.createMany({ data: rows })
  if (activities.length > 0) await db.userActivity.createMany({ data: activities })
}

function addDaysLocal(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

async function fillDemoData(
  db: PrismaClient,
  input: { organizationId: string; userId: string },
) {
  const now = new Date()
  if (await isFresh(db, input.organizationId, now)) return

  await ensureRoles(db, input.organizationId)
  const departments = await ensureDepartments(db, input.organizationId)
  const locations = await ensureLocations(db, input.organizationId)
  await ensureRoster(db, input.organizationId, departments, locations)
  await ensureCurrentUserPlacement(db, input.organizationId, input.userId, departments, locations)
  await ensureManagers(db, input.organizationId, input.userId, locations)
  const members = await loadMembers(db, input.organizationId)
  await ensureShifts(db, input.organizationId, members, locations, now)
  await ensureAttendance(db, input.organizationId, now)
  await ensureTimeOff(db, input.organizationId, members, input.userId, now)
}

export async function ensureDemoData(
  db: PrismaClient,
  input: { organizationId: string; userId: string; force?: boolean },
): Promise<void> {
  if (!input.force && !shouldEnsureDemoData()) return

  const existing = inflight.get(input.organizationId)
  if (existing) {
    await existing
    return
  }

  const run = fillDemoData(db, input).finally(() => {
    inflight.delete(input.organizationId)
  })
  inflight.set(input.organizationId, run)
  await run
}
