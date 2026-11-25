import 'server-only'

/**
 * Composes one server-side view of a broadcast: the round JSON for players,
 * clocks and ids, the PGN export for moves, and the lifecycle state that
 * follows from both.
 */
import { fetchRoundJson, fetchRoundPgn, fetchTour } from '@/lib/lichess/server'
import { REVALIDATE } from '@/lib/wcc/config'
import { parseRoundPgn } from '@/lib/wcc/pgn'
import type { RoundSnapshot, TourSnapshot } from '@/types/wcc'

import { deriveRoundState, hashVersion, mergeRoundGames, pollAfterFor } from './round-state'

/** The tournament and its round list. */
export async function getTourSnapshot(
  tourId: string,
  opts?: { revalidate?: number },
): Promise<TourSnapshot> {
  const { tour, rounds } = await fetchTour(tourId, opts?.revalidate ?? REVALIDATE.tour)

  return { tour, rounds, fetchedAt: Date.now() }
}

/** One round, ready to render: merged games, lifecycle state and poll hint. */
export async function getRoundSnapshot(
  roundId: string,
  opts?: { revalidate?: number },
): Promise<RoundSnapshot> {
  const revalidate = opts?.revalidate ?? REVALIDATE.roundLive
  const { round, tour, games: roundGames } = await fetchRoundJson(roundId, revalidate)

  // The round JSON alone decides how long the PGN is worth caching: a finished
  // round's moves never change again.
  const provisionalState = deriveRoundState(round, [], Date.now())
  const pgnRevalidate = provisionalState === 'finished' ? REVALIDATE.roundFinished : revalidate

  const pgn = await fetchRoundPgn(roundId, pgnRevalidate)
  const games = mergeRoundGames(roundGames, parseRoundPgn(pgn))

  const fetchedAt = Date.now()
  const state = deriveRoundState(round, games, fetchedAt)

  return {
    round,
    tour: { id: tour.id, name: tour.name, slug: tour.slug, url: tour.url, info: tour.info },
    state,
    games,
    version: hashVersion(pgn),
    fetchedAt,
    pollAfterMs: pollAfterFor(state, games, round),
  }
}

export { gameNumberOf, pickCurrentRound, resolveGameRound, tiebreakRounds } from './rounds'
