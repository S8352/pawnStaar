import { redirect } from "next/navigation"

import { ProfileHeader } from "@/components/features/profile-header"
import { DashboardTabs } from "@/components/features/dashboard-tabs"
import { mockUser } from "@/lib/mock-data"

/*
  NOTE: this returns true unconditionally, so a logged-out visitor reaches the
  dashboard and is shown mock data as though it were their own. That is an auth
  gap rather than a design one and is deliberately left for the session work —
  flagged here so it is not mistaken for intentional demo behaviour.
*/
function checkAuth() {
  return true
}

export default function DashboardPage() {
  if (!checkAuth()) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto container-padding py-10">
      <ProfileHeader user={mockUser} />
      <div className="mt-10">
        <DashboardTabs />
      </div>
    </div>
  )
}
