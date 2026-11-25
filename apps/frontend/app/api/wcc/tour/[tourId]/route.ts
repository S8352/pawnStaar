/**
 * `GET /api/wcc/tour/:tourId` — the broadcast tournament and its round list.
 *
 * Cached rather than dynamic: the round list changes rarely, and the handler is
 * the shared origin for every client that needs it.
 */
import { notFoundResponse, toErrorResponse } from '@/lib/wcc/api-errors'
import { ALLOWED_TOUR_IDS, LICHESS_ID_RE, REVALIDATE } from '@/lib/wcc/config'
import { getTourSnapshot } from '@/lib/wcc/snapshot'

const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ tourId: string }> },
): Promise<Response> {
  const { tourId } = await ctx.params

  if (!LICHESS_ID_RE.test(tourId) || !ALLOWED_TOUR_IDS.includes(tourId)) return notFoundResponse()

  try {
    const snapshot = await getTourSnapshot(tourId, { revalidate: REVALIDATE.tour })

    return Response.json(snapshot, { headers: { 'Cache-Control': CACHE_CONTROL } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
