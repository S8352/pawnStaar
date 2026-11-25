export interface User {
  id: string
  name: string
  email: string
  avatar: string
  rating: number
  gamesAnalyzed: number
  ratingGain: number
  connectedAccounts: {
    chesscom?: string
    lichess?: string
  }
}

export interface Game {
  id: string
  date: string
  opponent: string
  opponentRating: number
  result: "Win" | "Loss" | "Draw"
  color: "White" | "Black"
  timeControl: string
  blunders: number
  mistakes: number
  inaccuracies: number
  pgn: string
}

export interface Puzzle {
  id: string
  position: string
  solution: string[]
  theme: string
  difficulty: number
  rating: number
}

export interface Lesson {
  id: string
  title: string
  description: string
  content: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  duration: number
  rating: number
  completed: boolean
}
