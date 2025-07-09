"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Calendar, Clock, User, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Matches the backend `schemas.Game`
interface Game {
  id: number;
  user_id: string;
  pgn: string;
  created_at: string;
  analyzed_at: string | null;
  analysis_data: {
    blunders: number;
    mistakes: number;
    inaccuracies: number;
  } | null;
}

// Helper to parse PGN for display
const parsePgnData = (pgn: string) => {
  const headers = pgn.match(/\[(\w+)\s+"([^"]+)"\]/g) || [];
  const pgnData: { [key: string]: string } = {};
  headers.forEach(header => {
    const match = header.match(/\[(\w+)\s+"([^"]+)"\]/);
    if (match) {
      pgnData[match[1]] = match[2];
    }
  });

  const result = pgnData.Result || "N/A";
  const white = pgnData.White || "Unknown";
  const black = pgnData.Black || "Unknown";
  // This is a simplification. Real logic would depend on knowing the user's color.
  const opponent = pgnData.White?.includes("testuser") ? black : white; 

  return {
    result: result === "1-0" ? "Win" : result === "0-1" ? "Loss" : "Draw",
    opponent,
    opponentRating: pgnData.WhiteElo || pgnData.BlackElo || "N/A",
    date: pgnData.Date || "N/A",
    timeControl: pgnData.TimeControl || "N/A",
    color: pgnData.White?.includes("testuser") ? "White" : "Black",
  };
};


export function GameList({ refreshKey }: { refreshKey: number }) {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const fetchGames = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("Not authenticated")
      }
      const response = await fetch("http://localhost:8000/dashboard/games", {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "Failed to fetch games")
      setGames(data)
    } catch (error) {
      toast({
        title: "Error fetching games",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    fetchGames()
  }, [fetchGames, refreshKey])

  const getResultColor = (result: string) => {
    switch (result) {
      case "Win":
        return "bg-green-100 text-green-800"
      case "Loss":
        return "bg-red-100 text-red-800"
      case "Draw":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Games</CardTitle>
          <CardDescription>Your analyzed games with AI insights</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={fetchGames} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center">Loading games...</div>
        ) : games.length === 0 ? (
          <div className="text-center text-gray-500">No games imported yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => {
              const pgnData = parsePgnData(game.pgn);
              return (
                <Card key={game.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className={getResultColor(pgnData.result)}>{pgnData.result}</Badge>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                    <CardTitle className="pt-2">vs {pgnData.opponent} ({pgnData.opponentRating})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{pgnData.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{pgnData.timeControl}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Playing as {pgnData.color}</span>
                      </div>
                    </div>
                    {game.analysis_data && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-2">AI Analysis</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium text-red-600">{game.analysis_data.blunders}</span> Blunders</p>
                          <p><span className="font-medium text-orange-600">{game.analysis_data.mistakes}</span> Mistakes</p>
                          <p><span className="font-medium text-yellow-600">{game.analysis_data.inaccuracies}</span> Inaccuracies</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
