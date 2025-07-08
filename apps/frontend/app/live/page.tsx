import { LivePlay } from "@/components/features/live-play"

export default function LivePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pawn-primary mb-2">Live Chess</h1>
        <p className="text-gray-600">Play live games against opponents worldwide</p>
      </div>

      <LivePlay />
    </div>
  )
}
