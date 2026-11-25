/**
 * Error shape for Lichess requests.
 *
 * Deliberately free of `server-only` so route handlers, the snapshot layer and
 * the error mapper can all narrow on the same class.
 */
import { POLL } from '@/lib/wcc/config'

export class LichessError extends Error {
  constructor(
    public status: number,
    public retryAfterSec?: number,
    message?: string,
  ) {
    super(message ?? `Lichess request failed with status ${status}`)
    this.name = 'LichessError'
  }
}

/**
 * Seconds to wait from a rate-limited response, from the `Retry-After` header.
 *
 * Lichess sends a delta in seconds; anything missing or unparsable falls back to
 * the configured rate-limit window.
 */
export function retryAfterFrom(res: Response): number {
  const header = res.headers.get('Retry-After')
  if (header === null) return POLL.rateLimitedSec

  const seconds = Number.parseInt(header.trim(), 10)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : POLL.rateLimitedSec
}
