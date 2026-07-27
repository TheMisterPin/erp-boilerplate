/** Public location shape returned by server actions. */
export type Location = {
  id: string
  name: string
  description?: string | null
  managerId?: string | null
  managerName?: string | null
  minimumStaff: number
  staffCount: number
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

/** Form values for create / update. */
export type LocationFormValues = {
  name: string
  description?: string
  managerId?: string
  minimumStaff?: number
  isActive?: boolean
}
