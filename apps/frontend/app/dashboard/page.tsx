import { redirect } from "next/navigation"
import { ProfileHeader } from "@/components/features/profile-header"
import { DashboardTabs } from "@/components/features/dashboard-tabs"
import { mockUser } from "@/lib/mock-data"

// Mock auth check - replace with real auth
function checkAuth() {
  // For demo purposes, we'll assume user is logged in
  return true
}

export default function DashboardPage() {
  if (!checkAuth()) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProfileHeader user={mockUser} />
      <div className="mt-8">
        <DashboardTabs />
      </div>
    </div>
  )
}
