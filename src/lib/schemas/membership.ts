import { z } from "zod"

import { userEmailSchema } from "@/lib/schemas/user"

export const membershipRoleIdSchema = z.string().uuid("Select a valid role")

export const addMembershipSchema = z.object({
  email: userEmailSchema,
  roleId: membershipRoleIdSchema,
})

export const changeMembershipRoleSchema = z.object({
  membershipId: z.string().uuid("Invalid membership id"),
  roleId: membershipRoleIdSchema,
})

export const changeMembershipStatusSchema = z.object({
  membershipId: z.string().uuid("Invalid membership id"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

export const removeMembershipSchema = z.object({
  membershipId: z.string().uuid("Invalid membership id"),
})
