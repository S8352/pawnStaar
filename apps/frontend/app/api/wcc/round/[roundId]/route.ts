/**
 * `GET /api/wcc/round/:roundId` — one round's merged games and lifecycle state.
 *
 * The round id alone does not say which tournament it belongs to, so it is
 * resolved against the allow-listed tour's round list *before* anything is
 * fetched for it; the check on the snapshot that comes back then stands as
 * defence in depth.
 */
import { isAllowedRoundId } from '@/lib/wcc/allowed-rounds'
import { notFoundResponse, toErrorResponse } from '@/lib/wcc/api-errors'
import { ALLOWED_TOUR_IDS, LICHESS_ID_RE, REVALIDATE } from '@/lib/wcc/config'
import { cacheControlFor } from '@/lib/wcc/round-state'
import { getRoundSnapshot } from '@/lib/wcc/snapshot'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ roundId: string }> },
): Promise<Response> {
  const { roundId } = await ctx.params

  if (!LICHESS_ID_RE.test(roundId)) return notFoundResponse()

  try {
    if (!(await isAllowedRoundId(roundId))) return notFoundResponse()

    const snapshot = await getRoundSnapshot(roundId, { revalidate: REVALIDATE.roundLive })

    if (!ALLOWED_TOUR_IDS.includes(snapshot.tour.id)) return notFoundResponse()

    return Response.json(snapshot, {
      headers: { 'Cache-Control': cacheControlFor(snapshot.state) },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
