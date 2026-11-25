import 'server-only'

/**
 * Server-side Lichess broadcast client.
 *
 * Every request opts into the Next.js data cache explicitly: Next 15 treats
 * `fetch` caching as opt-in, and a request carrying an `Authorization` header is
 * only cached when `cache: 'force-cache'` is set alongside `next.revalidate`.
 *
 * A module-level circuit breaker keeps a 429 from turning into a storm: once
 * Lichess rate limits us, further calls fail locally until the window closes.
 */
import { LICHESS_BASE_URL, REVALIDATE } from '@/lib/wcc/config'
import type { LichessRoundResponse, LichessTourResponse } from '@/types/wcc'

import { LichessError, retryAfterFrom } from './errors'

const USER_AGENT = 'pawnstaar-wcc/1.0 (+https://www.pawnstaar.com)'
const JSON_ACCEPT = 'application/json'
const PGN_ACCEPT = 'application/x-chess-pgn'
const TIMEOUT_MS = 10_000

const MISSING_TOKEN_WARNING =
  'LICHESS_API_TOKEN is not set; Lichess calls are unauthenticated and heavily rate limited'

/**
 * Longest the breaker may stay latched, in seconds.
 *
 * Lichess itself asks for 60 seconds, but the API sits behind Cloudflare and an
 * edge or WAF 429 can carry a far larger `Retry-After` — hours, or a delay some
 * intermediary expresses in milliseconds (`60000`). Latching on that value
 * verbatim would fail every `/api/wcc/*` request on this instance until the
 * process restarts, so the window is capped at a few minutes: long enough to
 * respect a genuine rate limit, short enough to self-heal.
 */
const MAX_RATE_LIMIT_SEC = 300

/** Epoch ms until which Lichess has asked us to stop calling. */
let rateLimitedUntil = 0

let warnedAboutMissingToken = false

export interface LichessFetchOptions {
  revalidate: number
  tags?: string[]
  accept?: string
}

/** Clears the circuit breaker so each test starts from a clean slate. */
export function _resetRateLimitForTests(): void {
  rateLimitedUntil = 0
}

/** The configured token, warning once per process when there is none. */
function apiToken(): string | undefined {
  const token = process.env.LICHESS_API_TOKEN

  if (typeof token === 'string' && token !== '') return token

  if (!warnedAboutMissingToken && process.env.NODE_ENV !== 'test') {
    warnedAboutMissingToken = true
    console.warn(MISSING_TOKEN_WARNING)
  }

  return undefined
}

/** One cached, rate-limit-aware request against the Lichess API. */
export async function lichessFetch(path: string, opts: LichessFetchOptions): Promise<Response> {
  const remainingMs = rateLimitedUntil - Date.now()
  if (remainingMs > 0) {
    throw new LichessError(
      429,
      Math.ceil(remainingMs / 1000),
      'Lichess rate limit window is still open',
    )
  }

  const headers: Record<string, string> = {
    Accept: opts.accept ?? JSON_ACCEPT,
    'User-Agent': USER_AGENT,
  }

  const token = apiToken()
  if (token !== undefined) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${LICHESS_BASE_URL}${path}`, {
      headers,
      cache: 'force-cache',
      next: { revalidate: opts.revalidate, tags: opts.tags },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    throw new LichessError(0, undefined, error instanceof Error ? error.message : String(error))
  }

  if (res.status === 429) {
    // Clamped once, so the latched window and the figure handed to clients can
    // never disagree, and neither can exceed the ceiling.
    const retryAfterSec = Math.min(retryAfterFrom(res), MAX_RATE_LIMIT_SEC)
    rateLimitedUntil = Date.now() + retryAfterSec * 1000

    // Once per latch, not once per short-circuited call. The clamped seconds
    // only: no token, and no header echoed back wholesale.
    console.warn(`Lichess rate limited this instance; pausing calls for ${retryAfterSec}s`)

    throw new LichessError(429, retryAfterSec)
  }

  if (!res.ok) throw new LichessError(res.status)

  return res
}

/** The broadcast tournament with its rounds. */
export async function fetchTour(
  tourId: string,
  revalidate: number = REVALIDATE.tour,
): Promise<LichessTourResponse> {
  const res = await lichessFetch(`/api/broadcast/${tourId}`, {
    revalidate,
    tags: [`wcc:tour:${tourId}`],
  })

  return (await res.json()) as LichessTourResponse
}

/** One round's players, clocks and current positions. */
export async function fetchRoundJson(
  roundId: string,
  revalidate: number,
): Promise<LichessRoundResponse> {
  const res = await lichessFetch(`/api/broadcast/-/-/${roundId}`, {
    revalidate,
    tags: [`wcc:round:${roundId}`],
  })

  return (await res.json()) as LichessRoundResponse
}

/** One round's full PGN export, with clock and comment annotations. */
export async function fetchRoundPgn(roundId: string, revalidate: number): Promise<string> {
  const res = await lichessFetch(`/api/broadcast/round/${roundId}.pgn?clocks=true&comments=true`, {
    revalidate,
    tags: [`wcc:round:${roundId}:pgn`],
    accept: PGN_ACCEPT,
  })

  return res.text()
}
