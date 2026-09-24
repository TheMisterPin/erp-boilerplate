import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createTestPrismaClient,
  resetTestDatabase,
} from "../support/test-database"
import {
  createTenantFixture,
  expectIsolationError,
  type TenantFixture,
} from "../support/tenant-isolation"

const mocks = vi.hoisted(() => {
  const database = { client: null as Record<PropertyKey, unknown> | null }
  const prisma = new Proxy(
    {},
    {
      get(_target, property) {
        const client = database.client
        if (!client) throw new Error("Test database has not been initialized.")
        const value = Reflect.get(client, property)
        return typeof value === "function" ? value.bind(client) : value
      },
    },
  )

  return {
    authorize: vi.fn(),
    requireSession: vi.fn(),
    logActivity: vi.fn(),
    database,
    prisma,
  }
})

vi.mock("@/features/auth/session", () => ({
  authorize: mocks.authorize,
  requireSession: mocks.requireSession,
}))
vi.mock("@/features/logging/server", () => ({ logActivity: mocks.logActivity }))
vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }))

import { listAttendances } from "@/features/attendance/actions/attendance-actions"
import {
  deleteDepartment,
  listDepartments,
} from "@/features/departments/actions/department-actions"
import { listActivities } from "@/features/logging/actions/activity-actions"
import {
  createLocation,
  deleteLocation,
  listLocations,
} from "@/features/locations/actions/location-actions"
import {
  changeMembershipStatus,
  listOrganizationMemberships,
  listOrganizationRoles,
} from "@/features/organizations/actions/membership-actions"
import {
  deleteShiftInstance,
  listShiftInstances,
} from "@/features/shifts/actions/shift-instance-actions"
import {
  createShiftTemplate,
  deleteShiftTemplate,
  listShiftTemplates,
} from "@/features/shifts/actions/shift-template-actions"
import {
  cancelTimeOffRequest,
  listTimeOffRequests,
} from "@/features/time-off/actions/time-off-actions"
import {
  assignUserToLocation,
  deleteUser,
  listUsers,
  updateUser,
} from "@/features/users/actions/user-actions"

const prisma = createTestPrismaClient()

type TenantRecords = {
  departmentId: string
  locationId: string
  shiftTemplateId: string
  shiftInstanceId: string
  timeOffRequestId: string
}

function useTenant(tenant: TenantFixture): void {
  mocks.authorize.mockResolvedValue(tenant.session)
  mocks.requireSession.mockResolvedValue(tenant.session)
}

async function createTenantRecords(tenant: TenantFixture): Promise<TenantRecords> {
  const department = await prisma.department.create({
    data: {
      organizationId: tenant.organizationId,
      name: "Warehouse",
    },
  })
  const location = await prisma.location.create({
    data: {
      organizationId: tenant.organizationId,
      name: "Central depot",
    },
  })
  const shiftTemplate = await prisma.shiftTemplate.create({
    data: {
      organizationId: tenant.organizationId,
      locationId: location.id,
      userId: tenant.userId,
      type: "MORNING",
      startTime: "09:00",
      endTime: "17:00",
      weekdays: [1],
    },
  })
  const shiftInstance = await prisma.shiftInstance.create({
    data: {
      organizationId: tenant.organizationId,
      locationId: location.id,
      userId: tenant.userId,
      templateId: shiftTemplate.id,
      date: new Date("2030-01-07T00:00:00.000Z"),
      type: "MORNING",
      startTime: "09:00",
      endTime: "17:00",
    },
  })
  const timeOffRequest = await prisma.timeOffRequest.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      type: "TIME_OFF",
      startDate: new Date("2030-02-01T00:00:00.000Z"),
      endDate: new Date("2030-02-02T00:00:00.000Z"),
    },
  })
  await prisma.shiftAttendance.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      shiftInstanceId: shiftInstance.id,
      locationId: location.id,
      checkInAt: new Date("2030-01-07T09:00:00.000Z"),
    },
  })
  await prisma.userActivity.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      activity: "SHIFT_CHECK_IN",
    },
  })

  return {
    departmentId: department.id,
    locationId: location.id,
    shiftTemplateId: shiftTemplate.id,
    shiftInstanceId: shiftInstance.id,
    timeOffRequestId: timeOffRequest.id,
  }
}

beforeEach(async () => {
  await resetTestDatabase(prisma)
  mocks.database.client = prisma as unknown as Record<PropertyKey, unknown>
  mocks.authorize.mockReset()
  mocks.requireSession.mockReset()
  mocks.logActivity.mockReset()
  mocks.logActivity.mockResolvedValue("audit-event-id")
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("tenant-isolation matrix", () => {
  it("keeps every list and enumeration action inside the active organization", async () => {
    const primary = await createTenantFixture(prisma, {
      email: "primary-admin@example.test",
      slug: "shared-operations-primary",
    })
    const foreign = await createTenantFixture(prisma, {
      email: "foreign-admin@example.test",
      slug: "shared-operations-foreign",
    })
    await createTenantRecords(primary)
    await createTenantRecords(foreign)
    useTenant(primary)

    const [
      departments,
      locations,
      users,
      templates,
      instances,
      timeOff,
      attendances,
      activities,
      memberships,
      roles,
    ] = await Promise.all([
      listDepartments(),
      listLocations(),
      listUsers(),
      listShiftTemplates(),
      listShiftInstances(),
      listTimeOffRequests(),
      listAttendances(),
      listActivities(),
      listOrganizationMemberships(),
      listOrganizationRoles(),
    ])

    expect(departments).toMatchObject({ ok: true, data: [{ name: "Warehouse" }] })
    expect(locations).toMatchObject({ ok: true, data: [{ name: "Central depot" }] })
    expect(users).toMatchObject({ ok: true, data: [{ id: primary.userId }] })
    expect(templates).toMatchObject({ ok: true, data: [{ userId: primary.userId }] })
    expect(instances).toMatchObject({ ok: true, data: [{ userId: primary.userId }] })
    expect(timeOff).toMatchObject({ ok: true, data: [{ userId: primary.userId }] })
    expect(attendances).toMatchObject({ ok: true, data: [{ userId: primary.userId }] })
    expect(activities).toMatchObject({ ok: true, data: [{ userId: primary.userId }] })
    expect(memberships).toMatchObject({ ok: true, data: [{ userId: primary.userId }] })
    expect(roles).toMatchObject({ ok: true, data: [{ key: "ADMIN" }] })

    for (const result of [
      departments,
      locations,
      users,
      templates,
      instances,
      timeOff,
      attendances,
      activities,
      memberships,
      roles,
    ]) {
      expect(result).toMatchObject({ ok: true, data: expect.any(Array) })
      if (!result.ok) {
        throw new Error(`Expected a successful scoped result, got ${result.error.code}.`)
      }
      expect(result.data).toHaveLength(1)
    }
  })

  it("rejects updates and deletes addressed to records owned by another organization", async () => {
    const primary = await createTenantFixture(prisma, {
      email: "primary-admin@example.test",
      slug: "shared-operations-primary",
    })
    const foreign = await createTenantFixture(prisma, {
      email: "foreign-admin@example.test",
      slug: "shared-operations-foreign",
    })
    const foreignRecords = await createTenantRecords(foreign)
    useTenant(primary)

    await expectIsolationError(deleteDepartment(foreignRecords.departmentId), "DEPARTMENT_NOT_FOUND")
    await expectIsolationError(deleteLocation(foreignRecords.locationId), "LOCATION_NOT_FOUND")
    await expectIsolationError(deleteUser(foreign.userId), "USER_NOT_FOUND")
    await expectIsolationError(
      deleteShiftTemplate(foreignRecords.shiftTemplateId),
      "SHIFT_TEMPLATE_NOT_FOUND",
    )
    await expectIsolationError(
      deleteShiftInstance(foreignRecords.shiftInstanceId),
      "SHIFT_INSTANCE_NOT_FOUND",
    )
    await expectIsolationError(
      cancelTimeOffRequest(foreignRecords.timeOffRequestId),
      "TIME_OFF_REQUEST_NOT_FOUND",
    )
    await expectIsolationError(
      changeMembershipStatus({ membershipId: foreign.membershipId, status: "INACTIVE" }),
      "MEMBERSHIP_NOT_FOUND",
    )

    expect(await prisma.department.findUnique({ where: { id: foreignRecords.departmentId } }))
      .toMatchObject({ deletedAt: null })
    expect(await prisma.location.findUnique({ where: { id: foreignRecords.locationId } }))
      .toMatchObject({ deletedAt: null })
    expect(await prisma.membership.findUnique({ where: { id: foreign.membershipId } }))
      .toMatchObject({ status: "ACTIVE" })
  })

  it("rejects foreign relation identifiers instead of attaching cross-tenant records", async () => {
    const primary = await createTenantFixture(prisma, {
      email: "primary-admin@example.test",
      slug: "shared-operations-primary",
    })
    const foreign = await createTenantFixture(prisma, {
      email: "foreign-admin@example.test",
      slug: "shared-operations-foreign",
    })
    const primaryRecords = await createTenantRecords(primary)
    const foreignRecords = await createTenantRecords(foreign)
    useTenant(primary)

    await expectIsolationError(
      createLocation({
        name: "Invalid manager assignment",
        description: "",
        managerId: foreign.userId,
      }),
      "USER_NOT_FOUND",
    )
    await expectIsolationError(
      updateUser({
        id: primary.userId,
        email: primary.session.email,
        firstName: "Primary",
        lastName: "Administrator",
        role: "ADMIN",
        password: "",
        departmentId: foreignRecords.departmentId,
        locationId: primaryRecords.locationId,
        pictureUrl: "",
      }),
      "DEPARTMENT_NOT_FOUND",
    )
    await expectIsolationError(
      assignUserToLocation({
        userId: primary.userId,
        locationId: foreignRecords.locationId,
      }),
      "LOCATION_NOT_FOUND",
    )
    await expectIsolationError(
      createShiftTemplate({
        locationId: primaryRecords.locationId,
        userId: foreign.userId,
        type: "MORNING",
        startTime: "09:00",
        endTime: "17:00",
        weekdays: ["1"],
        notes: "",
      }),
      "USER_NOT_FOUND",
    )

    expect(await prisma.location.findMany({ where: { organizationId: primary.organizationId } }))
      .toHaveLength(1)
    expect(await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: primary.organizationId,
          userId: primary.userId,
        },
      },
    })).toMatchObject({ locationId: null })
  })
})
