import type { Role } from "@/generated/prisma/client"

/** Permission strings granted by the role matrix. */
export type Permission =
  | "users:read"
  | "users:write"
  | "departments:read"
  | "departments:write"
  | "locations:read"
  | "locations:write"
  | "shifts:read"
  | "shifts:write"
  | "logging:read"
  | "timeOff:read"
  | "timeOff:write"

/** Typed action object — maps a stable id to a matrix permission. */
export type AppAction = {
  readonly id: string
  readonly permission: Permission
}

/** Role → permission strings. Safe for client and server. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: [
    "users:read",
    "users:write",
    "departments:read",
    "departments:write",
    "locations:read",
    "locations:write",
    "shifts:read",
    "shifts:write",
    "logging:read",
    "timeOff:read",
    "timeOff:write",
  ],
  USER: [
    "users:read",
    "departments:read",
    "locations:read",
    "shifts:read",
    "timeOff:read",
    "timeOff:write",
  ],
}

/** Catalog of app actions. Prefer these over raw permission strings. */
export const Actions = {
  users: {
    read: { id: "users.read", permission: "users:read" },
    write: { id: "users.write", permission: "users:write" },
  },
  departments: {
    read: { id: "departments.read", permission: "departments:read" },
    write: { id: "departments.write", permission: "departments:write" },
  },
  locations: {
    read: { id: "locations.read", permission: "locations:read" },
    write: { id: "locations.write", permission: "locations:write" },
  },
  shifts: {
    read: { id: "shifts.read", permission: "shifts:read" },
    write: { id: "shifts.write", permission: "shifts:write" },
  },
  logging: {
    read: { id: "logging.read", permission: "logging:read" },
  },
  timeOff: {
    read: { id: "timeOff.read", permission: "timeOff:read" },
    write: { id: "timeOff.write", permission: "timeOff:write" },
  },
} as const satisfies Record<string, Record<string, AppAction>>

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission)
}

/** Client/UI gate — same matrix as `authorize` on the server. */
export function can(role: Role, action: AppAction): boolean {
  return hasPermission(role, action.permission)
}
