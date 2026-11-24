/**
 * Browser-safe configuration for the WCC 2026 live broadcast.
 *
 * No secrets and no server-only imports: this module is bundled into the client
 * as well as used during SSR.
 */

/** Lichess broadcast tournament id for the FIDE World Championship 2026. */
export const FEATURED_TOUR_ID = 'qfkdt8mn'

/** Tournament ids this feature is allowed to fetch. */
export const ALLOWED_TOUR_IDS: readonly string[] = [FEATURED_TOUR_ID]

export const WCC_YEAR = 2026

export const LICHESS_BASE_URL = 'https://lichess.org'

/** Lichess ids (tournaments, rounds, games) are 8 alphanumeric characters. */
export const LICHESS_ID_RE = /^[A-Za-z0-9]{8}$/

/** Matches round names like `Game 7`, capturing the game number. */
export const GAME_ROUND_NAME_RE = /^Game (\d+)$/

/** Polling cadence. */
export const POLL = {
  liveMs: 5000, // placeholder, not calibrated
  upcomingMs: 60000, // placeholder, not calibrated
  maxBackoffMs: 30000, // placeholder, not calibrated
  rateLimitedSec: 60, // placeholder, not calibrated
  streamFailuresBeforePoll: 3, // placeholder, not calibrated
  streamOpenBeforeStartMs: 5 * 60 * 1000, // placeholder, not calibrated
} as const

/** Reconnect backoff ladder in ms. placeholder, not calibrated */
export const BACKOFF_MS: readonly number[] = [2000, 4000, 8000, 30000]

/** Next.js revalidate windows in seconds. */
export const REVALIDATE = {
  tour: 60, // placeholder, not calibrated
  page: 15, // placeholder, not calibrated
  roundLive: 5, // placeholder, not calibrated
  roundFinished: 86400, // placeholder, not calibrated
} as const

/** Broadcast delay in minutes imposed by the organisers, if any is announced. */
export const ANTI_CHEAT_DELAY_MIN: number | null = null

/** Per-round corrections for rounds whose names do not follow `Game N`. */
export const ROUND_OVERRIDES: Record<string, { gameNumber?: number; tiebreak?: boolean }> = {}

export const WCC_PLAYERS: readonly { fideId: number; displayName: string; fed: string }[] = [
  { fideId: 46616543, displayName: 'Gukesh Dommaraju', fed: 'IND' },
  { fideId: 14205483, displayName: 'Javokhir Sindarov', fed: 'UZB' },
]

export const OFFICIAL_LINKS = {
  fide: 'https://worldchampionship.fide.com/',
  regulations: 'https://worldchampionship.fide.com/regulations',
  lichess: 'https://lichess.org/broadcast/fide-world-chess-championship-2026/qfkdt8mn',
} as const

export const VENUE_TIME_ZONE = 'Europe/Zurich'
