/**
 * Turns upstream Lichess failures into the JSON error responses the
 * `/api/wcc/*` handlers return, with cache headers that stop a bad upstream
 * from being hammered or a good one from being masked.
 */
import { LichessError } from '@/lib/lichess/errors'
import { POLL } from '@/lib/wcc/config'

const NOT_FOUND_BODY = { error: 'not_found' } as const

const jsonResponse = (
  status: number,
  body: unknown,
  cacheControl: string,
  extraHeaders?: Record<string, string>,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
      ...extraHeaders,
    },
  })

/** Maps any thrown value to a client-facing response. */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof LichessError) {
    if (err.status === 429) {
      const retryAfterSec = err.retryAfterSec ?? POLL.rateLimitedSec
      return jsonResponse(
        429,
        { error: 'lichess_rate_limited', retryAfterSec },
        'public, s-maxage=55',
        { 'Retry-After': String(retryAfterSec) },
      )
    }

    if (err.status === 404) return jsonResponse(404, NOT_FOUND_BODY, 'public, s-maxage=60')

    if (err.status === 401 || err.status === 403) {
      return jsonResponse(502, { error: 'lichess_auth' }, 'no-store')
    }
  }

  return jsonResponse(502, { error: 'lichess_unavailable' }, 'no-store')
}

/** A 404 for ids this feature refuses to proxy; safe to cache for a long time. */
export function notFoundResponse(): Response {
  return jsonResponse(404, NOT_FOUND_BODY, 'public, s-maxage=3600')
}
