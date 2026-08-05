import { LivePlay } from "@/components/features/live-play"
import { PageHeader } from "@/components/ui/page-header"

export default function LivePage() {
  return (
    <div className="container mx-auto container-padding py-10">
      <PageHeader
        eyebrow="Play"
        title="Live chess"
        description="Play rated games against opponents worldwide. Two slow games are worth more than fifteen fast ones."
      />
      <LivePlay />
    </div>
  )
}
