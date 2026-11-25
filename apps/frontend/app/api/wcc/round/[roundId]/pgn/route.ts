/**
 * `GET /api/wcc/round/:roundId/pgn` — the round's PGN export as a download.
 *
 * The id is resolved against the allow-listed tour's round list first, so a
 * foreign round id never reaches the (expensive) PGN export. The round JSON is
 * then fetched for two reasons: it confirms which tournament the round belongs
 * to, and it supplies the slug the downloaded file is named after.
 */
import { fetchRoundJson, fetchRoundPgn } from '@/lib/lichess/server'
import { isAllowedRoundId } from '@/lib/wcc/allowed-rounds'
import { notFoundResponse, toErrorResponse } from '@/lib/wcc/api-errors'
import { ALLOWED_TOUR_IDS, LICHESS_ID_RE, REVALIDATE, WCC_YEAR } from '@/lib/wcc/config'
import { cacheControlFor, deriveRoundState, isRoundFinished } from '@/lib/wcc/round-state'

/** The round JSON is only needed for the allow-list check and the file name. */
const ROUND_JSON_REVALIDATE_SEC = 60

/** Everything outside this class is replaced before the slug reaches a header. */
const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9-]+/g

/**
 * A slug safe to interpolate into `Content-Disposition`.
 *
 * The slug is upstream-controlled, and a response header is the wrong place to
 * trust it: one quote would close `filename="…"` and inject a second parameter.
 * Lichess slugs are tame today, so the conservative class costs nothing; an
 * exotic slug degrades to the round id, which the route has already validated.
 */
const safeFileSlug = (slug: string, roundId: string): string => {
  const cleaned = slug.replace(UNSAFE_FILENAME_CHARS, '-').replace(/^-+|-+$/g, '')

  return cleaned === '' ? roundId : cleaned
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ roundId: string }> },
): Promise<Response> {
  const { roundId } = await ctx.params

  if (!LICHESS_ID_RE.test(roundId)) return notFoundResponse()

  try {
    if (!(await isAllowedRoundId(roundId))) return notFoundResponse()

    const { round, tour } = await fetchRoundJson(roundId, ROUND_JSON_REVALIDATE_SEC)

    if (!ALLOWED_TOUR_IDS.includes(tour.id)) return notFoundResponse()

    const pgn = await fetchRoundPgn(
      roundId,
      isRoundFinished(round) ? REVALIDATE.roundFinished : REVALIDATE.roundLive,
    )

    const fileName = `wcc${WCC_YEAR}-${safeFileSlug(round.slug, roundId)}.pgn`

    return new Response(pgn, {
      headers: {
        'Content-Type': 'application/x-chess-pgn; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': cacheControlFor(deriveRoundState(round, [], Date.now())),
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
