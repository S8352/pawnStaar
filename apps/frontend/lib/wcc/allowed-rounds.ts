import 'server-only'

/**
 * Admission check for the round routes.
 *
 * A round id does not say which tournament it belongs to, so the only way to
 * refuse a foreign round is to look it up. Doing that *after* fetching the
 * round would mean paying for it first: a public round id from another
 * broadcast costs two upstream calls and a full PGN replay per request, none of
 * it shared between ids, and enough of them trip the fetch layer's breaker and
 * take the real round down with them.
 *
 * The tour snapshot already lists every valid round id and is cached at
 * `REVALIDATE.tour` behind a single shared cache key, so this check costs
 * nothing new per id and an unknown id is refused before anything is fetched.
 */
import { ALLOWED_TOUR_IDS, REVALIDATE } from '@/lib/wcc/config'
import { getTourSnapshot } from '@/lib/wcc/snapshot'

/**
 * Whether an allow-listed tournament broadcasts this round.
 *
 * Iterates the allow-list rather than assuming one entry, so adding a tour to
 * `ALLOWED_TOUR_IDS` cannot silently leave its rounds unreachable. With today's
 * single entry that is one cached call.
 */
export async function isAllowedRoundId(roundId: string): Promise<boolean> {
  for (const tourId of ALLOWED_TOUR_IDS) {
    const { rounds } = await getTourSnapshot(tourId, { revalidate: REVALIDATE.tour })

    if (rounds.some((round) => round.id === roundId)) return true
  }

  return false
}
