/**
 * The `[game]` URL segment: `game-7` or `tiebreaks`, and nothing else.
 *
 * Kept separate from `rounds.ts` because this is about the *URL*, not about the
 * tournament: it turns an untrusted path segment into a game number, which is
 * then resolved against the allow-listed tour. A round id never comes from the
 * URL, so `getRoundSnapshot` is never reachable with a visitor-chosen id.
 */

/** Matches `game-7`, capturing the number, exactly as the route spells it. */
const GAME_SEGMENT_RE = /^game-(\d+)$/

/** The literal segment for the tiebreak day. */
const TIEBREAKS_SEGMENT = 'tiebreaks'

export type GameParam = { kind: 'game'; number: number } | { kind: 'tiebreaks' }

/**
 * Reads the segment, or null when it names nothing this route can serve.
 *
 * Game zero and anything past the safe-integer range are refused rather than
 * passed on: no round can answer to them, and `Number` would quietly turn the
 * latter into a float.
 */
export function parseGameParam(segment: string): GameParam | null {
  if (segment === TIEBREAKS_SEGMENT) return { kind: 'tiebreaks' }

  const match = GAME_SEGMENT_RE.exec(segment)
  if (match === null) return null

  const number = Number(match[1])

  return Number.isSafeInteger(number) && number >= 1 ? { kind: 'game', number } : null
}
