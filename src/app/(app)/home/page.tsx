"use client"

import { CommandCenterPage } from "@/features/dashboard/components/pages/command-center-page"
import { useCommandCenterPage } from "@/features/dashboard/hooks/use-command-center-page"

export default function Home() {
  const page = useCommandCenterPage()
  return <CommandCenterPage {...page} />
}
