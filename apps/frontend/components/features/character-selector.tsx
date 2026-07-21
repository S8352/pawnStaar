"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, MessageSquare } from "lucide-react"

interface Character {
  id: number;
  name: string;
  description: string;
  sample_roast: string;
  tone: string;
  intensity: number;
}

interface CharacterSelectorProps {
  selectedCharacter: number;
  onCharacterChange: (characterId: number) => void;
}

export function CharacterSelector({ selectedCharacter, onCharacterChange }: CharacterSelectorProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch('http://localhost:8000/analysis/characters')
        const data = await response.json()
        setCharacters(data)
      } catch (error) {
        console.error('Failed to fetch characters:', error)
        // Fallback data if API fails
        setCharacters([
          {
            id: 1,
            name: "Hikaru Nakamura",
            description: "confident commentary with intensity 4/5",
            sample_roast: "There was literally mate in 2 and you missed it. Chat, can we get some F's?",
            tone: "confident",
            intensity: 4
          },
          {
            id: 2,
            name: "Ben Finegold",
            description: "sarcastic commentary with intensity 3/5",
            sample_roast: "Oh no, no, no. That's not how you play chess. That's how you lose chess.",
            tone: "sarcastic",
            intensity: 3
          },
          {
            id: 3,
            name: "Magnus Carlsen",
            description: "strategic commentary with intensity 2/5",
            sample_roast: "That move doesn't make sense from a positional standpoint.",
            tone: "strategic",
            intensity: 2
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchCharacters()
  }, [])

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 4) return "bg-red-500"
    if (intensity >= 3) return "bg-orange-500"
    if (intensity >= 2) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case 'confident':
        return <Zap className="h-4 w-4 text-yellow-500" />
      case 'sarcastic':
        return <MessageSquare className="h-4 w-4 text-orange-500" />
      case 'strategic':
        return <Users className="h-4 w-4 text-blue-500" />
      default:
        return <Users className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-pawn-accent" />
            Choose Your Roasting Coach
          </CardTitle>
          <CardDescription>
            Loading chess personalities...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading characters...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-pawn-accent" />
          Choose Your Roasting Coach
        </CardTitle>
        <CardDescription>
          Select a chess personality to roast your games
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {characters.map((character) => (
          <div
            key={character.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedCharacter === character.id
                ? 'border-pawn-primary bg-pawn-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onCharacterChange(character.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getToneIcon(character.tone)}
                  <h3 className="font-semibold text-lg">{character.name}</h3>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getIntensityColor(character.intensity)}`}></div>
                    <span className="text-xs text-gray-500">{character.intensity}/5</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{character.description}</p>
                <div className="p-2 bg-gray-50 rounded text-sm italic">
                  "{character.sample_roast}"
                </div>
              </div>
              <div className="ml-4">
                {selectedCharacter === character.id ? (
                  <Badge className="bg-pawn-primary">Selected</Badge>
                ) : (
                  <Button size="sm" variant="outline">
                    Select
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

