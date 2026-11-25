/**
 * The `<title>` and description for a match page.
 *
 * Separate from the route so the wording is testable, and so the route's
 * `generateMetadata` can fall back to these with no arguments at all when the
 * Lichess fetch behind it fails — a page that renders without a title because
 * the upstream was down is worse than one with a generic title.
 */
import { VENUE_TIME_ZONE, WCC_PLAYERS, WCC_YEAR } from '@/lib/wcc/config'
import type { GameParam } from '@/lib/wcc/game-param'
import { formatInZone } from '@/lib/wcc/time'
import type { GameResult } from '@/types/wcc'

const BASE_DESCRIPTION = 'Live moves, clocks and evaluation from Lichess Broadcasts.'

/** `Gukesh Dommaraju vs Javokhir Sindarov`, in the published order. */
const matchup = (): string => WCC_PLAYERS.map((player) => player.displayName).join(' vs ')

/** What the segment is called in prose: `Game 7`, or `Tiebreaks`. */
export function gameParamLabel(target: GameParam): string {
  return target.kind === 'tiebreaks' ? 'Tiebreaks' : `Game ${target.number}`
}

/** `Game 7 · Gukesh Dommaraju vs Javokhir Sindarov · WCC 2026`. */
export function matchPageTitle(target?: GameParam): string {
  const lead = target === undefined ? 'Live' : gameParamLabel(target)

  return `${lead} · ${matchup()} · WCC ${WCC_YEAR}`
}

/**
 * The base description, plus the one fact a search result or a shared link
 * benefits from: how the game ended, or when it starts.
 *
 * The start time is always printed in the venue's zone, which is the same
 * string on the server and in every browser — a description formatted in the
 * viewer's own zone would differ from the one the crawler was served.
 */
export function matchPageDescription(known?: {
  result?: GameResult
  moveCount?: number
  startsAt?: number
}): string {
  const result = known?.result
  if (result !== undefined && result !== '*') {
    const score = result === '1/2-1/2' ? '½-½' : result
    const moves =
      known?.moveCount === undefined || known.moveCount <= 0
        ? ''
        : ` in ${known.moveCount} moves`

    return `${BASE_DESCRIPTION} Finished ${score}${moves}.`
  }

  if (known?.startsAt !== undefined) {
    const when = formatInZone(known.startsAt, VENUE_TIME_ZONE, { withDate: true })

    return `${BASE_DESCRIPTION} Starts ${when} at the venue.`
  }

  return BASE_DESCRIPTION
}
