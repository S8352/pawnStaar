/**
 * What the one-line status banner says.
 *
 * Pulled out of the component so the wording can be tested without a DOM, and
 * so there is one place that decides which of "upcoming", "playing", "over" and
 * "cannot reach Lichess" wins when several could apply at once.
 *
 * `now` is passed in rather than read, because a countdown rendered from
 * `Date.now()` during SSR would not survive hydration: pass null until the
 * browser has a clock, and the banner simply omits the remaining time.
 */
import { formatCountdown } from '@/lib/wcc/time'
import type { GameResult, RoundConnectionStatus, RoundState, WccTransport } from '@/types/wcc'

export interface StatusTextInput {
  roundState: RoundState
  connection: RoundConnectionStatus
  transport: WccTransport
  /** Seconds left of a rate-limit window, from the round hook. */
  retryInSec: number | null
  error: { status: number; code: string } | null
  startsAt?: number
  result?: GameResult
  /** Full moves played, not plies. */
  moveCount?: number
  /** `Date.now()` once the browser has one, else null. */
  now: number | null
}

export interface StatusText {
  /** The sentence itself. */
  text: string
  /** Connection detail appended after a separator, when there is one. */
  suffix?: string
  /** Whether the suffix reports something going wrong. */
  suffixTone: 'muted' | 'warning'
  /** Whether the banner should offer a retry control. */
  showRetry: boolean
  /** Whether to note that the page fell back to polling. */
  polling: boolean
}

/** `1/2-1/2` is a fraction the eye has to decode; `½-½` is not. */
const resultText = (result: GameResult): string => (result === '1/2-1/2' ? '½-½' : result)

const finishedText = (result: GameResult | undefined, moveCount: number | undefined): string => {
  if (result === undefined || result === '*') return 'Finished'
  if (moveCount === undefined || moveCount <= 0) return `Finished · ${resultText(result)}`

  return `Finished · ${resultText(result)} in ${moveCount} moves`
}

const upcomingText = (startsAt: number | undefined, now: number | null): string => {
  if (startsAt === undefined || now === null) return 'Upcoming'

  return `Upcoming · starts in ${formatCountdown(startsAt - now)}`
}

/**
 * The connection detail for a live round: a rate limit first, because it is the
 * one the viewer can do nothing about and the only one with a number attached.
 */
const liveSuffix = (
  connection: RoundConnectionStatus,
  retryInSec: number | null,
): { suffix?: string; tone: 'muted' | 'warning' } => {
  if (retryInSec !== null) {
    return { suffix: `Lichess is busy, retrying in ${retryInSec} s`, tone: 'warning' }
  }

  if (connection === 'reconnecting') return { suffix: 'reconnecting…', tone: 'warning' }
  if (connection === 'connecting' || connection === 'idle') {
    return { suffix: 'connecting…', tone: 'muted' }
  }

  return { tone: 'muted' }
}

/** The banner's content for the round and connection it is given. */
export function statusText(input: StatusTextInput): StatusText {
  const { roundState, connection, transport, retryInSec, error, startsAt, result, moveCount, now } =
    input

  const polling = transport === 'poll'

  // A transport that has given up outranks the round's own state: a viewer
  // looking at a stalled board needs to be told the page stopped listening,
  // whatever the round itself was doing.
  if (connection === 'error') {
    return {
      text: 'Could not reach Lichess.',
      ...(error === null ? {} : { suffix: `error ${error.status}` }),
      suffixTone: 'warning',
      showRetry: true,
      polling,
    }
  }

  if (roundState === 'finished') {
    return {
      text: finishedText(result, moveCount),
      suffixTone: 'muted',
      showRetry: false,
      polling: false,
    }
  }

  if (roundState === 'upcoming') {
    return {
      text: upcomingText(startsAt, now),
      suffixTone: 'muted',
      showRetry: false,
      polling,
    }
  }

  const { suffix, tone } = liveSuffix(connection, retryInSec)

  return {
    text: 'Playing now',
    ...(suffix === undefined ? {} : { suffix }),
    suffixTone: tone,
    showRetry: false,
    polling,
  }
}
