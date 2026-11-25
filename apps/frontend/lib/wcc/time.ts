/**
 * Wall-clock presentation: start times in a named zone and countdowns to them.
 *
 * Every function takes the instant as an argument rather than reading
 * `Date.now()`, so the same code renders on the server and in the browser and
 * stays testable. The zone is always explicit too: a start time shown without
 * saying which zone it is in is the one mistake this module exists to prevent.
 */

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000

/**
 * `15:00`, or `25 Nov, 15:00` with `withDate`, in `timeZone`.
 *
 * `en-GB` fixes the 24-hour clock and the day-before-month order regardless of
 * the viewer's locale, because the surrounding copy is written that way.
 */
export function formatInZone(
  ms: number,
  timeZone: string,
  opts?: { withDate?: boolean },
): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    ...(opts?.withDate && { day: 'numeric', month: 'short' }),
  }).format(new Date(ms))
}

/** The viewer's own IANA zone, or `UTC` where the runtime will not say. */
export function viewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/**
 * Time left before a start, as `1d 3h 20m`, `3h 20m 05s` or `20m 05s`.
 *
 * Seconds are dropped a day out, where they are noise, and zero-padded closer
 * in so the text does not change width as it ticks.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'starting now'

  const days = Math.floor(ms / MS_PER_DAY)
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR)
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE)
  const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND)
  const paddedSeconds = String(seconds).padStart(2, '0')

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${paddedSeconds}s`

  return `${minutes}m ${paddedSeconds}s`
}

/** Zones offered alongside the venue's, covering most of this audience. */
export const QUICK_ZONES = [
  { label: 'IST', timeZone: 'Asia/Kolkata' },
  { label: 'US East', timeZone: 'America/New_York' },
] as const
