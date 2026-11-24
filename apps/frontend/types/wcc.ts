/**
 * Shared types for the WCC 2026 live broadcast feature.
 *
 * Pure type declarations: no runtime values, no React, no Next, so these are
 * safe to import from both the server snapshot path and the browser stream path.
 */

// ---------------------------------------------------------------------------
// Lichess raw shapes (fields as the API returns them; optional where omitted)
// ---------------------------------------------------------------------------

export interface LichessTourInfo {
  format?: string
  tc?: string
  fideTC?: string
  location?: string
  timeZone?: string
  players?: string
  website?: string
  regulations?: string
  standings?: string
}

export interface LichessTour {
  id: string
  name: string
  slug: string
  info?: LichessTourInfo
  tier?: number
  dates?: [number, number?]
  url: string
  image?: string
  createdAt?: number
}

export interface LichessRoundSummary {
  id: string
  name: string
  slug: string
  startsAt?: number
  startsAfterPrevious?: boolean
  finished?: boolean
  finishedAt?: number
  ongoing?: boolean
  url: string
}

export interface LichessTourResponse {
  tour: LichessTour
  rounds: LichessRoundSummary[]
}

export interface LichessPlayer {
  name: string
  title?: string
  rating?: number
  fideId?: number
  fed?: string
  clock?: number
}

export type LichessGameStatus = '*' | '1-0' | '0-1' | '½-½'

export interface LichessRoundGame {
  id: string
  name: string
  fen?: string
  players: [LichessPlayer, LichessPlayer]
  lastMove?: string
  status: LichessGameStatus
  thinkTime?: number
}

export interface LichessRoundResponse {
  round: LichessRoundSummary
  tour: LichessTour
  study?: { writeable: boolean }
  games: LichessRoundGame[]
}

// ---------------------------------------------------------------------------
// Parsed PGN
// ---------------------------------------------------------------------------

export type PgnTags = Record<string, string>

export type GameResult = '*' | '1-0' | '0-1' | '1/2-1/2'

export interface Ply {
  ply: number
  san: string
  uci: string
  fen: string
  clockMs?: number
  evalCp?: number
  evalMate?: number
  comment?: string
}

export interface ParseIssue {
  ply: number
  code: 'illegal_move' | 'bad_tags' | 'unknown'
  detail: string
}

export interface ParsedGame {
  id: string | null
  tags: PgnTags
  initialFen: string
  plies: Ply[]
  result: GameResult
  issues: ParseIssue[]
  pgn: string
}

// ---------------------------------------------------------------------------
// Composed
// ---------------------------------------------------------------------------

export type RoundState = 'upcoming' | 'live' | 'finished'

export interface WccGame extends ParsedGame {
  players: [LichessPlayer, LichessPlayer]
  status: GameResult
  currentFen: string
  lastMove?: string
}

export interface RoundSnapshot {
  round: LichessRoundSummary
  tour: Pick<LichessTour, 'id' | 'name' | 'slug' | 'url' | 'info'>
  state: RoundState
  games: WccGame[]
  version: string
  fetchedAt: number
  pollAfterMs: number
}

export interface TourSnapshot {
  tour: LichessTour
  rounds: LichessRoundSummary[]
  fetchedAt: number
}

export type RoundConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'upcoming'
  | 'live'
  | 'reconnecting'
  | 'finished'
  | 'error'

export type WccTransport = 'stream' | 'poll'

// ---------------------------------------------------------------------------
// Time control
// ---------------------------------------------------------------------------

export interface TimeControlPhase {
  moves?: number
  baseMs: number
  incMs: number
}

export interface TimeControl {
  phases: TimeControlPhase[]
}
