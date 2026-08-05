import { SettingsForm } from "@/components/features/settings-form"
import { PageHeader } from "@/components/ui/page-header"

export default function SettingsPage() {
  return (
    <div className="container mx-auto container-padding py-10">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile, and the chess accounts games are imported from."
      />
      <div className="max-w-2xl">
        <SettingsForm />
      </div>
    </div>
  )
}
