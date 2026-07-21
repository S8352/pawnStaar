"use client"

import { useState } from "react"
import { GameImport } from "@/components/features/game-import"
import { GameList } from "@/components/features/game-list"
import { CharacterSelector } from "@/components/features/character-selector"

export default function AnalysisPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedCharacter, setSelectedCharacter] = useState<number>(2)  // Default to Ben Finegold

  const handleImportSuccess = () => {
    setRefreshKey(oldKey => oldKey + 1)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Chess Roasting Analysis</h1>
        <p className="text-gray-600">Get roasted by chess personalities while improving your game</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <CharacterSelector 
            selectedCharacter={selectedCharacter}
            onCharacterChange={setSelectedCharacter}
          />
          <GameImport onImportSuccess={handleImportSuccess} />
        </div>
        <div className="lg:col-span-3">
          <GameList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  )
}
