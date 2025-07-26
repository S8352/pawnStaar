import { SettingsForm } from "@/components/features/settings-form"

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Settings</h1>
        <p className="text-gray-600">Manage your profile</p>
      </div>

      <div>
        <SettingsForm />
      </div>
    </div>
  )
}
