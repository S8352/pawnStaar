/**
 * `GET /api/wcc/round/:roundId/pgn` — the round's PGN export as a download.
 *
 * The round JSON is fetched first for two reasons: it says which tournament the
 * round belongs to, and it supplies the slug the downloaded file is named after.
 */
import { fetchRoundJson, fetchRoundPgn } from '@/lib/lichess/server'
import { notFoundResponse, toErrorResponse } from '@/lib/wcc/api-errors'
import { ALLOWED_TOUR_IDS, LICHESS_ID_RE, REVALIDATE, WCC_YEAR } from '@/lib/wcc/config'
import { cacheControlFor, deriveRoundState, isRoundFinished } from '@/lib/wcc/round-state'

/** The round JSON is only needed for the allow-list check and the file name. */
const ROUND_JSON_REVALIDATE_SEC = 60

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ roundId: string }> },
): Promise<Response> {
  const { roundId } = await ctx.params

  if (!LICHESS_ID_RE.test(roundId)) return notFoundResponse()

  try {
    const { round, tour } = await fetchRoundJson(roundId, ROUND_JSON_REVALIDATE_SEC)

    if (!ALLOWED_TOUR_IDS.includes(tour.id)) return notFoundResponse()

    const pgn = await fetchRoundPgn(
      roundId,
      isRoundFinished(round) ? REVALIDATE.roundFinished : REVALIDATE.roundLive,
    )

    return new Response(pgn, {
      headers: {
        'Content-Type': 'application/x-chess-pgn; charset=utf-8',
        'Content-Disposition': `attachment; filename="wcc${WCC_YEAR}-${round.slug}.pgn"`,
        'Cache-Control': cacheControlFor(deriveRoundState(round, [], Date.now())),
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
