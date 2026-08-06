"use client"

import { ProfilePage } from "@/features/profile/components/pages/profile-page"
import { useProfilePage } from "@/features/profile/hooks/use-profile-page"

export default function ProfileRoute() {
  const page = useProfilePage()

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <ProfilePage {...page} />
    </div>
  )
}
