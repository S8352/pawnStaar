"use client"

import { useState } from "react"

import { GameImport } from "@/components/features/game-import"
import { GameList } from "@/components/features/game-list"
import { CharacterSelector } from "@/components/features/character-selector"
import { PageHeader } from "@/components/ui/page-header"

export default function AnalysisPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedCharacter, setSelectedCharacter] = useState<number>(2) // Default to Ben Finegold

  const handleImportSuccess = () => {
    setRefreshKey((oldKey) => oldKey + 1)
  }

  return (
    <div className="container mx-auto container-padding py-10">
      {/*
        "Chess Roasting Analysis" appeared nowhere in the marketing copy, so it
        landed on a first-time visitor with no explanation. The title now says
        what the page does and the description introduces the personality angle.
      */}
      <PageHeader
        eyebrow="Analysis"
        title="Your games, read back to you"
        description="Import a game and get it analysed in the voice of a chess personality — the mistake, the pattern behind it, and what to do instead."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-1">
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
