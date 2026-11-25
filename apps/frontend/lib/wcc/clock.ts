/**
 * Clock readings and their presentation.
 *
 * A PGN `[%clk]` annotation records the clock of the player who just moved, so
 * the two sides are read off alternating plies: odd plies are White's, even
 * plies are Black's. Reading one colour's clock therefore means walking back
 * to that colour's most recent move, not taking the latest ply.
 */
import type { Ply } from '@/types/wcc'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3600

/** Shown when a clock is unknown rather than zero. */
const UNKNOWN_CLOCK = '--:--'

/**
 * Both clocks as they stood after `ply`: each colour's most recent reading at
 * or before it.
 *
 * A move whose `[%clk]` the broadcast dropped is skipped rather than reported
 * as unknown, so one missing annotation does not blank a clock that was
 * published a move earlier.
 */
export function clocksAtPly(plies: Ply[], ply: number): { white?: number; black?: number } {
  const clocks: { white?: number; black?: number } = {}
  const last = Math.min(ply, plies.length)

  for (let i = last - 1; i >= 0; i--) {
    const current = plies[i]
    if (current?.clockMs === undefined) continue

    // `ply` is 1-based and odd plies are White's, so index 0 is White.
    const colour = i % 2 === 0 ? 'white' : 'black'
    if (clocks[colour] === undefined) clocks[colour] = current.clockMs

    if (clocks.white !== undefined && clocks.black !== undefined) break
  }

  return clocks
}

/** What is left of `baseMs` at `now`, given it was read at `baseAt`. */
export function remainingMs(baseMs: number, baseAt: number, now: number): number {
  return Math.max(0, baseMs - (now - baseAt))
}

/**
 * A clock as `h:mm:ss` or `m:ss`, floored to whole seconds so the display
 * never shows a second the player has not yet spent. `undefined` reads as
 * `--:--`, which is not the same as a flagged `0:00`.
 */
export function formatClock(ms: number | undefined): string {
  if (ms === undefined) return UNKNOWN_CLOCK

  const total = Math.floor(Math.max(0, ms) / MS_PER_SECOND)
  const seconds = total % SECONDS_PER_MINUTE
  const minutes = Math.floor(total / SECONDS_PER_MINUTE) % SECONDS_PER_MINUTE
  const hours = Math.floor(total / SECONDS_PER_HOUR)
  const paddedSeconds = String(seconds).padStart(2, '0')

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`

  return `${minutes}:${paddedSeconds}`
}
