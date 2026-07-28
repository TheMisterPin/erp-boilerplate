"use client"

import { TablePageViewport } from "@/components/shared/table"
import { LocationListPage } from "@/features/locations/components/pages/location-list-page"
import { useLocationListPage } from "@/features/locations/hooks/use-location-list-page"

export default function OrganizationLocationsPage() {
  const page = useLocationListPage()

  return (
    <TablePageViewport>
      <LocationListPage {...page} />
    </TablePageViewport>
  )
}
