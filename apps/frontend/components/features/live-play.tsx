"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChessboardWrapper as Chessboard } from "@/components/ui/chessboard"
import { Clock, Zap, Timer, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LivePlay() {
  const [selectedTimeControl, setSelectedTimeControl] = useState<string | null>(null)
  const [stake, setStake] = useState(100)
  const [isSearching, setIsSearching] = useState(false)
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [fen, setFen] = useState("start")
  const [turn, setTurn] = useState("w")
  const [gameOver, setGameOver] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      toast({ title: "Authentication Error", description: "Please log in to play." })
      return
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/${token}`)
    
    ws.onopen = () => {
      toast({ title: "Connected to live server" })
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case "challenge_received":
          toast({
            title: "Challenge Received",
            description: `${message.from} challenged you for ${message.stake} coins.`,
            action: (
              <Button onClick={() => acceptChallenge(message.game_id)}>
                Accept
              </Button>
            ),
          })
          break
        case "game_started":
          toast({ title: "Game Started!", description: `Your game for ${message.stake} coins has begun.` })
          setFen("start")
          setGameOver(false)
          break
        case "move_made":
          setFen(message.fen)
          setTurn(message.turn === "white" ? "w" : "b")
          break
        case "game_over":
          setGameOver(true)
          toast({
            title: "Game Over",
            description: `Winner: ${message.winner}. You won ${message.pot} coins!`,
          })
          break
        case "error":
          toast({ title: "Error", description: message.message, variant: "destructive" })
          break
      }
    }

    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [toast])

  const acceptChallenge = (gameId: string) => {
    socket?.send(JSON.stringify({ type: "accept_challenge", game_id: gameId }))
  }

  const timeControls = [
    {
      id: "bullet",
      name: "Bullet",
      time: "1+0",
      icon: Zap,
      description: "1 minute per player",
      players: 1247,
    },
    {
      id: "blitz",
      name: "Blitz",
      time: "3+2",
      icon: Timer,
      description: "3 minutes + 2 second increment",
      players: 2156,
    },
    {
      id: "rapid",
      name: "Rapid",
      time: "10+0",
      icon: Clock,
      description: "10 minutes per player",
      players: 892,
    },
  ]

  const handleFindOpponent = (timeControl: string) => {
    setSelectedTimeControl(timeControl)
    setIsSearching(true)
    
    // In a real app, you'd have a list of online users to challenge
    const opponentId = "opponent-user-id"; // Placeholder
    
    socket?.send(JSON.stringify({
      type: "challenge",
      opponent_id: opponentId,
      stake: stake,
      time_control: timeControl
    }))
  }

  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    if (gameOver) return
    
    socket?.send(JSON.stringify({
      type: "make_move",
      move: `${move.from}${move.to}${move.promotion || ""}`
    }))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Time Control</CardTitle>
            <CardDescription>Choose your preferred game speed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeControls.map((control) => (
                <div
                  key={control.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTimeControl === control.id
                      ? "border-pawn-accent bg-pawn-accent/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTimeControl(control.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-pawn-accent/10 p-2 rounded-lg">
                        <control.icon className="h-5 w-5 text-pawn-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-pawn-primary">
                          {control.name} ({control.time})
                        </h3>
                        <p className="text-sm text-gray-600">{control.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{control.players}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="stake">Stake (Coins)</Label>
                <Input 
                  id="stake" 
                  type="number" 
                  value={stake} 
                  onChange={(e) => setStake(parseInt(e.target.value, 10))}
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full bg-pawn-primary hover:bg-pawn-primary/90"
                disabled={!selectedTimeControl || isSearching}
                onClick={() => selectedTimeControl && handleFindOpponent(selectedTimeControl)}
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Finding Opponent...
                  </>
                ) : (
                  "Find Opponent"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Live Game</CardTitle>
            <CardDescription>Your game will appear here once matched</CardDescription>
          </CardHeader>
          <CardContent>
            <Chessboard 
              position={fen}
              onMove={handleMove}
              boardOrientation={turn === "w" ? "white" : "black"}
            />
            <div className="mt-4 flex justify-between items-center">
              <div className="text-center">
                <p className="text-sm text-gray-600">You</p>
                <p className="font-semibold">10:00</p>
              </div>
              <Badge variant="outline">{gameOver ? "Game Over" : `Turn: ${turn === "w" ? "White" : "Black"}`}</Badge>
              <div className="text-center">
                <p className="text-sm text-gray-600">Opponent</p>
                <p className="font-semibold">10:00</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
