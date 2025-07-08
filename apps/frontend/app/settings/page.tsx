import { SettingsForm } from "@/components/features/settings-form"
import { SubscriptionCard } from "@/components/features/subscription-card"

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pawn-primary mb-2">Settings</h1>
        <p className="text-gray-600">Manage your profile and subscription</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <SettingsForm />
        </div>
        <div>
          <SubscriptionCard />
        </div>
      </div>
    </div>
  )
}
