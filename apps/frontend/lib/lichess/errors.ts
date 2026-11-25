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
 * Lichess sends a delta in seconds. A header that is absent or unparsable (an
 * HTTP-date, say) falls back to the configured rate-limit window, but a header
 * that is present and reads as zero means zero: treating it as unparsable would
 * turn "retry now" into a full-length outage. Negative deltas, which no sane
 * intermediary sends, are floored at zero for the same reason.
 */
export function retryAfterFrom(res: Response): number {
  const header = res.headers.get('Retry-After')
  if (header === null) return POLL.rateLimitedSec

  const seconds = Number.parseInt(header.trim(), 10)
  if (!Number.isFinite(seconds)) return POLL.rateLimitedSec

  return Math.max(seconds, 0)
}
