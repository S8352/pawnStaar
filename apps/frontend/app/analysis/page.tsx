import { GameImport } from "@/components/features/game-import"
import { GameList } from "@/components/features/game-list"
import { mockGames } from "@/lib/mock-data"

export default function AnalysisPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pawn-primary mb-2">Game Analysis</h1>
        <p className="text-gray-600">Import and analyze your chess games with AI-powered insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <GameImport />
        </div>
        <div className="lg:col-span-2">
          <GameList games={mockGames} />
        </div>
      </div>
    </div>
  )
}
