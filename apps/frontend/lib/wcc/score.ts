/**
 * Match score for a World Championship match: a FIDE-id keyed tally that is
 * immune to the name spellings drifting between rounds.
 */
import { WCC_PLAYERS } from '@/lib/wcc/config'
import type { GameResult, WccGame } from '@/types/wcc'

export interface PlayerScore {
  fideId: number
  displayName: string
  fed?: string
  points: number
  wins: number
  draws: number
  losses: number
}

type Side = 0 | 1

type Outcome = 'win' | 'draw' | 'loss'

const UNRANKED = Number.MAX_SAFE_INTEGER

const parseFideId = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

const outcomeFor = (status: GameResult, side: Side): Outcome | undefined => {
  if (status === '1/2-1/2') return 'draw'
  if (status === '1-0') return side === 0 ? 'win' : 'loss'
  if (status === '0-1') return side === 0 ? 'loss' : 'win'
  return undefined
}

/** Where a player sits in the published match line-up, or last if unlisted. */
const seedOf = (fideId: number): number => {
  const index = WCC_PLAYERS.findIndex((player) => player.fideId === fideId)
  return index === -1 ? UNRANKED : index
}

/**
 * Tallies points, wins, draws and losses per player.
 *
 * Each side is identified by its FIDE id: the PGN tag first, then the round
 * JSON. A side with no id anywhere is left out of that game's tally. Games that
 * are still in progress contribute nothing.
 */
export function matchScore(games: Pick<WccGame, 'tags' | 'players' | 'status'>[]): PlayerScore[] {
  const scores = new Map<number, PlayerScore>()

  const entryFor = (fideId: number, name: string, fed: string | undefined): PlayerScore => {
    const existing = scores.get(fideId)
    if (existing) return existing

    const known = WCC_PLAYERS.find((player) => player.fideId === fideId)
    const resolvedFed = known?.fed ?? fed
    const entry: PlayerScore = {
      fideId,
      displayName: known?.displayName ?? name,
      ...(resolvedFed === undefined ? {} : { fed: resolvedFed }),
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    }
    scores.set(fideId, entry)

    return entry
  }

  for (const game of games) {
    const sides: Side[] = [0, 1]

    for (const side of sides) {
      const outcome = outcomeFor(game.status, side)
      if (outcome === undefined) continue

      const tagKey = side === 0 ? 'WhiteFideId' : 'BlackFideId'
      const fideId = parseFideId(game.tags[tagKey]) ?? game.players[side].fideId
      if (fideId === undefined) continue

      const nameKey = side === 0 ? 'White' : 'Black'
      const entry = entryFor(fideId, game.tags[nameKey] ?? game.players[side].name, game.players[side].fed)

      if (outcome === 'win') {
        entry.points += 1
        entry.wins += 1
      } else if (outcome === 'draw') {
        entry.points += 0.5
        entry.draws += 1
      } else {
        entry.losses += 1
      }
    }
  }

  return [...scores.values()].sort((a, b) => seedOf(a.fideId) - seedOf(b.fideId))
}
