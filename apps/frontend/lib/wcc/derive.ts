/**
 * Values derived from parsed broadcast data: time controls, think time and
 * evaluation presentation. Pure functions, shared by server and browser.
 */
import type { Ply, TimeControl, TimeControlPhase } from '@/types/wcc'

/** Longest clock reading we accept, in ms (4 hours). */
const MAX_CLOCK_MS = 14_400_000

/** Centipawn range beyond which the win-percentage curve is flat enough. */
const MAX_EVAL_CP = 1000

/** Lichess's win-percentage curve constant. */
const WIN_PCT_K = 0.00368208

const MOVES_PHASE_RE = /^(\d+)\/(\d+)(?:\+(\d+))?$/
const BASE_INC_PHASE_RE = /^(\d+)\+(\d+)$/
const BASE_PHASE_RE = /^(\d+)$/

// Pieces of the human-written time controls broadcast operators type by hand.
// Whitespace is normalised to single spaces before any of these are applied.

/** Clause separator: `120'/40m + 30'/end, 30/move from move 41`. */
const PROSE_SPLIT_RE = /[+,;]/

/** Unit tokens, including the prime marks operators use for minutes. */
const MINUTE_UNIT_RE = /^(?:'|′|’|min|mins|minute|minutes)$/
const SECOND_UNIT_RE = /^(?:"|″|”|s|sec|secs|second|seconds)$/
const HOUR_UNIT_RE = /^(?:h|hr|hrs|hour|hours)$/

/** Base time with its unit and an optional `/40m`, `/ 40 moves` boundary. */
const PROSE_BASE_RE = /^(\d+) ?([a-z'′’"″”]+)(?: ?\/? ?(\d+) ?(?:moves?|m))?$/

/** A move boundary the wording splits into its own clause: `40 moves`. */
const PROSE_MOVES_RE = /^(\d+) ?moves?$/

/** Time added for the remainder: `30'/end`, `30 min / rest`. */
const PROSE_ADDED_RE = /^(\d+) ?([a-z'′’"″”]+) ?\/ ?([a-z ]+)$/

/** Denominators that mean "the remainder of the game". */
const PROSE_REST_RE = /^(?:the )?(?:end|rest|remainder|finish)(?: of(?: the)? game)?$/

/** Increment per move: `30/move from move 41`, `30 sec / move starting 41`. */
const PROSE_INC_RE = /^(\d+) ?([a-z'′’"″”]*) ?\/ ?(?:moves?|mv)\b ?(.*)$/

/** The tail of an increment clause: the move the increment starts from. */
const PROSE_FROM_MOVE_RE = /^(?:from|start|starts|starting|beginning)(?: (?:at|from|on|with))?(?: move)? (\d+)$/

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** Move number (1-based) that the given 1-based ply belongs to. */
const moveNumberOf = (ply: number): number => Math.ceil(ply / 2)

/**
 * Parses the PGN `TimeControl` grammar as Lichess emits it: phases separated by
 * `:`, each `moves/seconds+inc`, `seconds+inc` or `seconds`.
 *
 * Returns null for `-`, `?`, an absent tag or anything unrecognised.
 */
export function parseTimeControl(tag: string | undefined): TimeControl | null {
  if (!tag) return null

  const trimmed = tag.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '?') return null

  const phases: TimeControlPhase[] = []

  for (const raw of trimmed.split(':')) {
    const part = raw.trim()

    const withMoves = MOVES_PHASE_RE.exec(part)
    if (withMoves) {
      phases.push({
        moves: Number(withMoves[1]),
        baseMs: Number(withMoves[2]) * 1000,
        incMs: withMoves[3] === undefined ? 0 : Number(withMoves[3]) * 1000,
      })
      continue
    }

    const withIncrement = BASE_INC_PHASE_RE.exec(part)
    if (withIncrement) {
      phases.push({ baseMs: Number(withIncrement[1]) * 1000, incMs: Number(withIncrement[2]) * 1000 })
      continue
    }

    const baseOnly = BASE_PHASE_RE.exec(part)
    if (baseOnly) {
      phases.push({ baseMs: Number(baseOnly[1]) * 1000, incMs: 0 })
      continue
    }

    return null
  }

  return phases.length > 0 ? { phases } : null
}

/** Milliseconds in one of the recognised unit tokens, or null when unknown. */
function unitFactorMs(unit: string): number | null {
  if (MINUTE_UNIT_RE.test(unit)) return 60_000
  if (SECOND_UNIT_RE.test(unit)) return 1000
  if (HOUR_UNIT_RE.test(unit)) return 3_600_000

  return null
}

/**
 * `amount` in `unit` as milliseconds, or null when the unit is unrecognised or
 * the result is out of range. `fallbackFactorMs` applies when the wording left
 * the unit out, as `30/move` does; pass null where a unit is mandatory.
 */
function proseDurationMs(amount: string, unit: string, fallbackFactorMs: number | null): number | null {
  const factor = unit === '' ? fallbackFactorMs : unitFactorMs(unit)
  if (factor === null) return null

  const ms = Number(amount) * factor

  return Number.isSafeInteger(ms) && ms <= MAX_CLOCK_MS ? ms : null
}

/**
 * The move an increment clause starts from: 1 when the clause names no move,
 * null when it carries a tail that cannot be read as one.
 */
function proseFromMove(tail: string): number | null {
  const trimmed = tail.trim()
  if (trimmed === '') return 1

  const match = PROSE_FROM_MOVE_RE.exec(trimmed)
  if (!match) return null

  const move = Number(match[1])

  return move >= 1 ? move : null
}

/**
 * Parses the human-written time controls Lichess broadcasts actually carry, as
 * distinct from the PGN grammar `parseTimeControl` implements. The FIDE World
 * Championship 2026 feed sends `120'/40m + 30'/end, 30/move from move 41` as
 * the game's `TimeControl` tag and `120 min / 40 moves + 30 min / rest + 30 sec
 * / move starting 41` as the tour's `info.tc`, for the control 2024 sent as
 * `40/7200:1800+30`. Both wordings yield the same `TimeControl`, so nothing
 * downstream needs to know which form arrived.
 *
 * The wording is read structurally, not matched against those two literals: a
 * base time with its unit, an optional move boundary, an optional added time
 * for the rest, and an optional increment with the move it starts from, in
 * clauses separated by `+` or `,`.
 *
 * Returns null for anything that cannot be read with confidence — an
 * unrecognised unit, a clause that fits no slot, a repeated slot, or an
 * increment starting somewhere the phases cannot express. A missing control
 * shows as a missing control; a wrong one would silently mis-label every move.
 */
export function parseProseTimeControl(tag: string | undefined): TimeControl | null {
  if (!tag) return null

  const normalized = tag.trim().toLowerCase().replace(/\s+/g, ' ')
  if (normalized === '' || normalized === '-' || normalized === '?') return null

  let baseMs: number | null = null
  let boundaryMoves: number | null = null
  let addedMs: number | null = null
  let incMs = 0
  let fromMove = 1
  let sawIncrement = false

  for (const [index, rawClause] of normalized.split(PROSE_SPLIT_RE).entries()) {
    const clause = rawClause.trim()
    if (clause === '') return null

    const increment = PROSE_INC_RE.exec(clause)
    if (increment) {
      if (sawIncrement) return null

      const ms = proseDurationMs(increment[1], increment[2], 1000)
      const move = proseFromMove(increment[3])
      if (ms === null || move === null) return null

      incMs = ms
      fromMove = move
      sawIncrement = true
      continue
    }

    const added = PROSE_ADDED_RE.exec(clause)
    if (added && PROSE_REST_RE.test(added[3])) {
      if (addedMs !== null) return null

      const ms = proseDurationMs(added[1], added[2], null)
      if (ms === null) return null

      addedMs = ms
      continue
    }

    const boundary = PROSE_MOVES_RE.exec(clause)
    if (boundary) {
      if (baseMs === null || boundaryMoves !== null) return null

      const moves = Number(boundary[1])
      if (moves < 1) return null

      boundaryMoves = moves
      continue
    }

    const first = index === 0 ? PROSE_BASE_RE.exec(clause) : null
    if (first) {
      const ms = proseDurationMs(first[1], first[2], null)
      if (ms === null) return null

      if (first[3] !== undefined) {
        const moves = Number(first[3])
        if (moves < 1) return null

        boundaryMoves = moves
      }

      baseMs = ms
      continue
    }

    return null
  }

  if (baseMs === null) return null

  // A `TimeControl` says "increment from move N" by starting a phase there, so
  // the boundary the wording states has to be the move before it. Anything else
  // would need a phase this wording never described.
  if (fromMove > 1 && boundaryMoves !== fromMove - 1) return null

  const phases: TimeControlPhase[] = [
    {
      ...(boundaryMoves === null ? {} : { moves: boundaryMoves }),
      baseMs,
      incMs: fromMove > 1 ? 0 : incMs,
    },
  ]
  if (addedMs !== null || fromMove > 1) phases.push({ baseMs: addedMs ?? 0, incMs })

  return { phases }
}

/**
 * The time control for a game: the PGN grammar first, then the human-written
 * wordings, then whatever control the caller knows independently.
 *
 * UI code should call this rather than `parseTimeControl`, because which form a
 * broadcast carries is up to whoever typed the tag. The fallback stays an
 * argument so this module keeps reporting only what it actually parsed; pass
 * `FEATURED_TIME_CONTROL` from `@/lib/wcc/config` for the 2026 match.
 */
export function resolveTimeControl(
  tag: string | undefined,
  fallback?: TimeControl | null,
): TimeControl | null {
  return parseTimeControl(tag) ?? parseProseTimeControl(tag) ?? fallback ?? null
}

/** Increment in ms that applied to the move played at `ply`. */
export function incrementAtPly(tc: TimeControl | null, ply: number): number {
  if (!tc || tc.phases.length === 0) return 0

  const moveNumber = moveNumberOf(ply)
  let movesSoFar = 0

  for (const phase of tc.phases) {
    if (phase.moves === undefined) return phase.incMs
    movesSoFar += phase.moves
    if (moveNumber <= movesSoFar) return phase.incMs
  }

  return tc.phases[tc.phases.length - 1].incMs
}

/**
 * Base time added to a player's clock at a phase boundary around `moveNumber`,
 * or 0 when this move is not next to one.
 *
 * Completing the last move of a phase credits the next phase's base time — 30
 * minutes under `40/7200:1800+30` — so that colour's clock reads higher after
 * the boundary than before it. Which ply shows the jump is not fixed: the
 * bonus can land on the clock reported for the last move of the old phase or
 * on the first move of the new one, so both sides of the boundary count.
 * Boundaries come from the parsed phases' cumulative `moves` counts, so
 * three-phase and single-phase controls are handled by the same code.
 */
function phaseBonusMs(tc: TimeControl | null, moveNumber: number): number {
  if (!tc) return 0

  let movesSoFar = 0

  // The final phase has nothing after it, hence `length - 1`.
  for (let i = 0; i < tc.phases.length - 1; i++) {
    const { moves } = tc.phases[i]
    if (moves === undefined) break
    movesSoFar += moves
    if (movesSoFar === moveNumber || movesSoFar === moveNumber - 1) return tc.phases[i + 1].baseMs
  }

  return 0
}

/**
 * Time spent on the ply at `index`: the drop in that colour's clock since its
 * previous move, plus the increment credited for this move.
 *
 * The first two plies are measured against the phase base time, which needs a
 * known time control. Returns undefined when either clock is missing.
 *
 * At a time-control boundary the clock rises instead of falling, which a plain
 * subtraction would clamp to 0 — exactly the moves under the most pressure. So
 * when the measured interval touches a boundary and the clock did rise, the
 * new phase's base time is credited to the earlier reading first. Residual
 * ambiguity: a think time longer than the bonus itself would leave the
 * subtraction positive and go uncorrected, and any other rise at a boundary
 * (an arbiter adjustment, say) is attributed to the bonus. Both need a clock
 * that moved the wrong way, so neither can affect an ordinary move.
 */
export function thinkTimeMs(plies: Ply[], index: number, tc: TimeControl | null): number | undefined {
  const current = plies[index]
  if (!current) return undefined

  const previousRaw = index < 2 ? tc?.phases[0]?.baseMs : plies[index - 2]?.clockMs
  const currentRaw = current.clockMs
  if (previousRaw === undefined || currentRaw === undefined) return undefined

  const previous = clamp(previousRaw, 0, MAX_CLOCK_MS)
  const latest = clamp(currentRaw, 0, MAX_CLOCK_MS)
  const spent = previous - latest + incrementAtPly(tc, current.ply)

  if (spent >= 0) return spent

  return Math.max(0, spent + phaseBonusMs(tc, moveNumberOf(current.ply)))
}

export type Phase = 'no-increment' | 'increment' | 'single'

/** Which part of a multi-phase time control the given ply falls in. */
export function phaseFor(ply: number, tc: TimeControl | null): Phase {
  if (!tc || tc.phases.length <= 1) return 'single'

  const firstPhaseMoves = tc.phases[0].moves
  if (firstPhaseMoves === undefined) return 'increment'

  return moveNumberOf(ply) <= firstPhaseMoves ? 'no-increment' : 'increment'
}

/** White's win expectancy as a percentage, from an engine evaluation. */
export function winPct(evalCp?: number, evalMate?: number): number {
  if (evalMate !== undefined) {
    if (evalMate > 0) return 100
    if (evalMate < 0) return 0
    return 50
  }

  if (evalCp === undefined) return 50

  const cp = clamp(evalCp, -MAX_EVAL_CP, MAX_EVAL_CP)
  const pct = 50 + 50 * (2 / (1 + Math.exp(-WIN_PCT_K * cp)) - 1)

  return clamp(pct, 0, 100)
}

/** Human-readable evaluation: `#3`, `+0.35`, `-1.20`, `0.00` or an em dash. */
export function formatEval(evalCp?: number, evalMate?: number, decimals = 2): string {
  if (evalMate !== undefined) return `#${evalMate}`
  if (evalCp === undefined) return '—'

  const pawns = evalCp / 100
  const formatted = pawns.toFixed(decimals)

  return pawns > 0 ? `+${formatted}` : formatted
}
