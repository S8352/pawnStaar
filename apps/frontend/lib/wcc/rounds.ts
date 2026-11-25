/**
 * Locating rounds inside a tournament: which round is game N, which rounds are
 * tiebreaks, and which one a visitor should land on.
 *
 * Pure and browser-safe; `snapshot.ts` re-exports these so server callers can
 * reach them from one place.
 */
import { GAME_ROUND_NAME_RE, ROUND_OVERRIDES } from '@/lib/wcc/config'
import type { LichessRoundSummary, TourSnapshot } from '@/types/wcc'

import { isRoundFinished } from './round-state'

type ScheduledRound = LichessRoundSummary & { startsAt: number }

/**
 * Classical game number a round covers, from `ROUND_OVERRIDES` if the round is
 * corrected there and otherwise from a `Game N` round name.
 */
export function gameNumberOf(round: LichessRoundSummary): number | undefined {
  const override = ROUND_OVERRIDES[round.id]?.gameNumber
  if (override !== undefined) return override

  const match = GAME_ROUND_NAME_RE.exec(round.name)
  return match === null ? undefined : Number(match[1])
}

/** The round broadcasting classical game `n`, if the tournament has one. */
export function resolveGameRound(tour: TourSnapshot, n: number): LichessRoundSummary | undefined {
  return tour.rounds.find((round) => gameNumberOf(round) === n)
}

/** Rounds that are not one of the classical games: tiebreaks and extras. */
export function tiebreakRounds(tour: TourSnapshot): LichessRoundSummary[] {
  return tour.rounds.filter(
    (round) => ROUND_OVERRIDES[round.id]?.tiebreak === true || gameNumberOf(round) === undefined,
  )
}

/**
 * The round a visitor should see: whatever is ongoing, else the next one due,
 * else the most recently finished one.
 */
export function pickCurrentRound(tour: TourSnapshot, now: number): LichessRoundSummary | undefined {
  const ongoing = tour.rounds.find((round) => round.ongoing === true)
  if (ongoing) return ongoing

  const [next] = tour.rounds
    .filter(
      (round): round is ScheduledRound =>
        round.startsAt !== undefined && round.startsAt > now && !isRoundFinished(round),
    )
    .sort((a, b) => a.startsAt - b.startsAt)
  if (next) return next

  const lastFinished = [...tour.rounds].reverse().find(isRoundFinished)
  if (lastFinished) return lastFinished

  return tour.rounds[0]
}
