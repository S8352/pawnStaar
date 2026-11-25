/**
 * How the match header names the two players and prints their numbers.
 *
 * The score comes from `matchScore`, which only lists players who have appeared
 * in a decided game — before game 1 is over that list is empty, and the header
 * still has to show both names on nought. So the published line-up is the
 * skeleton and the score is laid over it, keyed by FIDE id: the PGN spells the
 * champion "Gukesh D" and the tour metadata "Gukesh Dommaraju", and matching on
 * either spelling would silently split one player into two.
 */
import { WCC_PLAYERS } from '@/lib/wcc/config'
import type { PlayerScore } from '@/lib/wcc/score'
import type { WccGame } from '@/types/wcc'

export interface MatchHeaderPlayer {
  fideId: number
  displayName: string
  /** Last word of the display name, for the strip that has no room for both. */
  surname: string
  fed?: string
  points: number
  rating?: number
}

/** Points to one decimal: a half point is the unit this match is scored in. */
export function formatPoints(points: number): string {
  return points.toFixed(1)
}

/**
 * The name a 44px strip has room for.
 *
 * The last whitespace-separated word, which is the family name for both players
 * in this match and for the overwhelming majority of FIDE entries. A
 * comma-first spelling ("Sindarov, Javokhir") is read before the comma instead,
 * because there the family name leads.
 */
export function surnameOf(displayName: string): string {
  const trimmed = displayName.trim()
  if (trimmed === '') return trimmed

  const [beforeComma] = trimmed.split(',')
  if (beforeComma !== trimmed && beforeComma.trim() !== '') return beforeComma.trim()

  const words = trimmed.split(/\s+/)

  return words[words.length - 1]
}

/**
 * The rating a game reports for one player, by FIDE id.
 *
 * Which colour a player has alternates between games, so the id is matched
 * against both seats rather than assumed. The round JSON is preferred and the
 * PGN `Elo` tags stand in where it carries no rating.
 */
export function ratingFor(
  game: Pick<WccGame, 'players' | 'tags'> | undefined,
  fideId: number,
): number | undefined {
  if (game === undefined) return undefined

  const sides = [
    { player: game.players[0], idTag: 'WhiteFideId', eloTag: 'WhiteElo' },
    { player: game.players[1], idTag: 'BlackFideId', eloTag: 'BlackElo' },
  ] as const

  for (const { player, idTag, eloTag } of sides) {
    const taggedId = Number.parseInt(game.tags[idTag] ?? '', 10)
    if (player.fideId !== fideId && taggedId !== fideId) continue

    if (player.rating !== undefined) return player.rating

    const elo = Number.parseInt(game.tags[eloTag] ?? '', 10)
    if (Number.isFinite(elo) && elo > 0) return elo
  }

  return undefined
}

/**
 * The header's two rows: the published line-up in its published order, each
 * row carrying whatever the score and the current game know about that player.
 *
 * A scored player who is not in the published line-up is appended rather than
 * dropped — if the match is ever played by someone other than who was
 * announced, the header should say so instead of quietly showing nobody.
 */
export function matchHeaderPlayers(
  scores: PlayerScore[],
  game?: Pick<WccGame, 'players' | 'tags'>,
): MatchHeaderPlayer[] {
  const rowFor = (
    fideId: number,
    displayName: string,
    fed: string | undefined,
    points: number,
  ): MatchHeaderPlayer => {
    const rating = ratingFor(game, fideId)

    return {
      fideId,
      displayName,
      surname: surnameOf(displayName),
      ...(fed === undefined ? {} : { fed }),
      points,
      ...(rating === undefined ? {} : { rating }),
    }
  }

  const listed = WCC_PLAYERS.map((player) => {
    const score = scores.find((entry) => entry.fideId === player.fideId)

    return rowFor(player.fideId, player.displayName, player.fed, score?.points ?? 0)
  })

  const unlisted = scores
    .filter((score) => !WCC_PLAYERS.some((player) => player.fideId === score.fideId))
    .map((score) => rowFor(score.fideId, score.displayName, score.fed, score.points))

  return [...listed, ...unlisted]
}
