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
 * Time spent on the ply at `index`: the drop in that colour's clock since its
 * previous move, plus the increment credited for this move.
 *
 * The first two plies are measured against the phase base time, which needs a
 * known time control. Returns undefined when either clock is missing.
 */
export function thinkTimeMs(plies: Ply[], index: number, tc: TimeControl | null): number | undefined {
  const current = plies[index]
  if (!current) return undefined

  const previousRaw = index < 2 ? tc?.phases[0]?.baseMs : plies[index - 2]?.clockMs
  const currentRaw = current.clockMs
  if (previousRaw === undefined || currentRaw === undefined) return undefined

  const previous = clamp(previousRaw, 0, MAX_CLOCK_MS)
  const latest = clamp(currentRaw, 0, MAX_CLOCK_MS)

  return Math.max(0, previous - latest + incrementAtPly(tc, current.ply))
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
