import { describe, expect, it } from 'vitest'

import { FEATURED_TIME_CONTROL } from '@/lib/wcc/config'
import type { Ply, TimeControl } from '@/types/wcc'

import {
  formatEval,
  incrementAtPly,
  parseProseTimeControl,
  parseTimeControl,
  phaseFor,
  resolveTimeControl,
  thinkTimeMs,
  winPct,
} from '../derive'

const CLASSICAL = parseTimeControl('40/7200:1800+30')
const RAPID = parseTimeControl('900+10')

/**
 * The two wordings the FIDE World Championship 2026 broadcast actually
 * publishes for the control `40/7200:1800+30` encodes: the `TimeControl` tag on
 * every 2026 game PGN, and the tour's own `info.tc`. Both read from the live
 * Lichess API on 2026-11-25; neither is the PGN grammar.
 */
const PROSE_PGN_TAG = "120'/40m + 30'/end, 30/move from move 41"
const PROSE_INFO_TC = '120 min / 40 moves + 30 min / rest + 30 sec / move starting 41'

const PROSE_PGN = parseProseTimeControl(PROSE_PGN_TAG)
const PROSE_INFO = parseProseTimeControl(PROSE_INFO_TC)

const CLASSICAL_PHASES = {
  phases: [
    { moves: 40, baseMs: 7_200_000, incMs: 0 },
    { baseMs: 1_800_000, incMs: 30_000 },
  ],
}

const ply = (n: number, clockMs?: number): Ply => ({
  ply: n,
  san: 'e4',
  uci: 'e2e4',
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  ...(clockMs === undefined ? {} : { clockMs }),
})

describe('parseTimeControl', () => {
  it('parses a two-phase classical time control', () => {
    expect(parseTimeControl('40/7200:1800+30')).toEqual({
      phases: [
        { moves: 40, baseMs: 7_200_000, incMs: 0 },
        { baseMs: 1_800_000, incMs: 30_000 },
      ],
    })
  })

  it('parses a single phase with an increment', () => {
    expect(parseTimeControl('900+10')).toEqual({ phases: [{ baseMs: 900_000, incMs: 10_000 }] })
  })

  it('parses a single phase without an increment', () => {
    expect(parseTimeControl('600')).toEqual({ phases: [{ baseMs: 600_000, incMs: 0 }] })
  })

  it('returns null for "-", "?", undefined and garbage', () => {
    expect(parseTimeControl('-')).toBeNull()
    expect(parseTimeControl('?')).toBeNull()
    expect(parseTimeControl(undefined)).toBeNull()
    expect(parseTimeControl('not a time control')).toBeNull()
  })

  it('stays strict: the wordings the 2026 broadcast sends are not the grammar', () => {
    expect(parseTimeControl(PROSE_PGN_TAG)).toBeNull()
    expect(parseTimeControl(PROSE_INFO_TC)).toBeNull()
  })
})

describe('parseProseTimeControl', () => {
  it('parses the TimeControl tag the 2026 broadcast sends', () => {
    expect(PROSE_PGN).toEqual(CLASSICAL_PHASES)
  })

  it('parses the tour info.tc wording for the same control', () => {
    expect(PROSE_INFO).toEqual(CLASSICAL_PHASES)
  })

  it('agrees with the standard grammar and with the published control', () => {
    expect(PROSE_PGN).toEqual(CLASSICAL)
    expect(PROSE_INFO).toEqual(CLASSICAL)
    expect(PROSE_PGN).toEqual(FEATURED_TIME_CONTROL)
  })

  it('reads the parts structurally, not as the two known literals', () => {
    expect(parseProseTimeControl("90'/40m + 30'/end, 30/move from move 41")).toEqual({
      phases: [
        { moves: 40, baseMs: 5_400_000, incMs: 0 },
        { baseMs: 1_800_000, incMs: 30_000 },
      ],
    })
    expect(parseProseTimeControl('100 min / 40 moves + 50 min / rest + 30 sec / move starting 41')).toEqual({
      phases: [
        { moves: 40, baseMs: 6_000_000, incMs: 0 },
        { baseMs: 3_000_000, incMs: 30_000 },
      ],
    })
    // The same slots, with the boundary split off into its own clause.
    expect(parseProseTimeControl('2 hours, 40 moves + 30 min / rest, 30 sec / move from 41')).toEqual(
      CLASSICAL_PHASES,
    )
  })

  it('accepts a bare base time and a whole-game increment', () => {
    expect(parseProseTimeControl('90 min')).toEqual({ phases: [{ baseMs: 5_400_000, incMs: 0 }] })
    expect(parseProseTimeControl('90 min + 30 sec / move')).toEqual({
      phases: [{ baseMs: 5_400_000, incMs: 30_000 }],
    })
  })

  it('returns null for wording it cannot interpret, rather than inventing phases', () => {
    expect(parseProseTimeControl('blitz')).toBeNull()
    expect(parseProseTimeControl('some time')).toBeNull()
    expect(parseProseTimeControl('')).toBeNull()
    expect(parseProseTimeControl(undefined)).toBeNull()
    expect(parseProseTimeControl('-')).toBeNull()
    expect(parseProseTimeControl('?')).toBeNull()
    expect(parseProseTimeControl('40 moves')).toBeNull()
    expect(parseProseTimeControl('120 minutes per player, sudden death')).toBeNull()
  })

  it('refuses to assume a unit it does not recognise or one the wording omits', () => {
    expect(parseProseTimeControl('120 furlongs / 40 moves + 30 min / rest')).toBeNull()
    expect(parseProseTimeControl('120 / 40 moves + 30 min / rest')).toBeNull()
    expect(parseProseTimeControl("120'/40m + 30 furlongs/end")).toBeNull()
  })

  it('returns null when the increment starts somewhere the phases cannot express', () => {
    expect(parseProseTimeControl("120'/40m + 30'/end, 30/move from move 31")).toBeNull()
    expect(parseProseTimeControl("120'/40m + 30'/end, 30/move from move 41 + 10/move")).toBeNull()
  })
})

describe('resolveTimeControl', () => {
  const FALLBACK: TimeControl = { phases: [{ baseMs: 1000, incMs: 0 }] }

  it('prefers the standard grammar over prose and over the fallback', () => {
    expect(resolveTimeControl('40/7200:1800+30', FALLBACK)).toEqual(CLASSICAL)
  })

  it('falls back to the prose wordings the broadcast sends', () => {
    expect(resolveTimeControl(PROSE_PGN_TAG, FALLBACK)).toEqual(CLASSICAL)
    expect(resolveTimeControl(PROSE_INFO_TC, FALLBACK)).toEqual(CLASSICAL)
  })

  it('falls back to the caller-supplied control when neither parse succeeds', () => {
    expect(resolveTimeControl('blitz', FALLBACK)).toBe(FALLBACK)
    expect(resolveTimeControl(undefined, FALLBACK)).toBe(FALLBACK)
  })

  it('returns null when nothing parses and no fallback is given', () => {
    expect(resolveTimeControl('blitz')).toBeNull()
    expect(resolveTimeControl(undefined)).toBeNull()
    expect(resolveTimeControl('blitz', null)).toBeNull()
  })
})

describe('incrementAtPly', () => {
  it('gives no increment inside the first classical phase', () => {
    expect(incrementAtPly(CLASSICAL, 80)).toBe(0)
  })

  it('gives the increment from the move after the first phase ends', () => {
    expect(incrementAtPly(CLASSICAL, 81)).toBe(30_000)
  })

  it('gives the same increment throughout a single-phase control', () => {
    expect(incrementAtPly(RAPID, 1)).toBe(10_000)
    expect(incrementAtPly(RAPID, 81)).toBe(10_000)
  })

  it('gives the same increments on the prose-parsed control the broadcast sends', () => {
    expect(incrementAtPly(PROSE_PGN, 80)).toBe(0)
    expect(incrementAtPly(PROSE_PGN, 81)).toBe(30_000)
    expect(incrementAtPly(PROSE_INFO, 80)).toBe(0)
    expect(incrementAtPly(PROSE_INFO, 81)).toBe(30_000)
  })

  it('gives no increment when the time control is unknown', () => {
    expect(incrementAtPly(null, 1)).toBe(0)
  })
})

describe('thinkTimeMs', () => {
  const opening = [ply(1, 7_196_000), ply(2, 7_185_000), ply(3, 7_187_000)]

  it('measures the first move against the phase base time', () => {
    expect(thinkTimeMs(opening, 0, CLASSICAL)).toBe(4_000)
    expect(thinkTimeMs(opening, 1, CLASSICAL)).toBe(15_000)
  })

  it('measures later moves against the same colour two plies earlier', () => {
    expect(thinkTimeMs(opening, 2, CLASSICAL)).toBe(9_000)
  })

  it('adds the increment that applied to the move', () => {
    const afterTimeControl = [ply(79, 600_000), ply(80, 500_000), ply(81, 580_000)]
    expect(thinkTimeMs(afterTimeControl, 2, CLASSICAL)).toBe(50_000)
  })

  it('credits the new phase base time when white crosses the time control', () => {
    // 40/7200:1800+30 adds 30 minutes once move 40 is complete, so white's
    // clock after move 41 (ply 81) reads higher than after move 40 (ply 79).
    // 0:05:00 + 30:00 bonus - 1:00 think + 0:30 increment = 0:34:30.
    const crossing = [ply(79, 300_000), ply(80, 250_000), ply(81, 2_070_000)]
    expect(thinkTimeMs(crossing, 2, CLASSICAL)).toBe(60_000)
  })

  it('credits the new phase base time on the prose-parsed control too', () => {
    // Production sends the prose wording, so the move-41 correction has to
    // fire against that parse, not only against the PGN grammar.
    const crossing = [ply(79, 300_000), ply(80, 250_000), ply(81, 2_070_000)]
    expect(thinkTimeMs(crossing, 2, PROSE_PGN)).toBe(60_000)
    expect(thinkTimeMs(crossing, 2, PROSE_INFO)).toBe(60_000)
  })

  it('credits the new phase base time when black crosses the time control', () => {
    const crossing = [ply(80, 300_000), ply(81, 2_070_000), ply(82, 2_070_000)]
    expect(thinkTimeMs(crossing, 2, CLASSICAL)).toBe(60_000)
  })

  it('credits the bonus whichever ply the broadcast reports it on', () => {
    // Some feeds show the bonus on the clock for move 40 itself (ply 79)
    // rather than on move 41. Move 40 is still in the no-increment phase.
    const crossing = [ply(77, 300_000), ply(78, 250_000), ply(79, 2_040_000)]
    expect(thinkTimeMs(crossing, 2, CLASSICAL)).toBe(60_000)
  })

  it('finds a three-phase boundary from the cumulative move counts', () => {
    const threePhase = parseTimeControl('40/7200:20/3600:900+30')
    // Phases end after moves 40 and 60, so ply 121 is white's move 61: the
    // first of the final phase, credited with its 15-minute base time.
    const crossing = [ply(119, 300_000), ply(120, 250_000), ply(121, 1_170_000)]
    expect(thinkTimeMs(crossing, 2, threePhase)).toBe(60_000)
  })

  it('leaves plies well inside the first phase unchanged', () => {
    expect(thinkTimeMs([ply(39, 600_000), ply(40, 500_000), ply(41, 540_000)], 2, CLASSICAL)).toBe(60_000)
    // A clock that rises mid-phase is not a time-control bonus.
    expect(thinkTimeMs([ply(39, 500_000), ply(40, 500_000), ply(41, 600_000)], 2, CLASSICAL)).toBe(0)
  })

  it('credits no bonus in a single-phase control', () => {
    const crossing = [ply(79, 300_000), ply(80, 250_000), ply(81, 2_070_000)]
    expect(thinkTimeMs(crossing, 2, RAPID)).toBe(0)
  })

  it('returns undefined when either clock of the same colour is missing', () => {
    expect(thinkTimeMs([ply(1), ply(2, 7_185_000), ply(3, 7_187_000)], 2, CLASSICAL)).toBeUndefined()
    expect(thinkTimeMs([ply(1, 7_196_000), ply(2, 7_185_000), ply(3)], 2, CLASSICAL)).toBeUndefined()
  })

  it('ignores a missing clock belonging to the other colour', () => {
    expect(thinkTimeMs([ply(1, 7_196_000), ply(2), ply(3, 7_187_000)], 2, CLASSICAL)).toBe(9_000)
  })

  it('returns undefined for the first move when the time control is unknown', () => {
    expect(thinkTimeMs(opening, 0, null)).toBeUndefined()
  })
})

describe('phaseFor', () => {
  it('reports a single phase when the control has one phase or is unknown', () => {
    expect(phaseFor(1, null)).toBe('single')
    expect(phaseFor(1, RAPID)).toBe('single')
  })

  it('reports the classical phases either side of the time control', () => {
    expect(phaseFor(1, CLASSICAL)).toBe('no-increment')
    expect(phaseFor(80, CLASSICAL)).toBe('no-increment')
    expect(phaseFor(81, CLASSICAL)).toBe('increment')
  })

  it('reports the same phases for the prose wording the broadcast sends', () => {
    expect(phaseFor(1, PROSE_PGN)).toBe('no-increment')
    expect(phaseFor(80, PROSE_PGN)).toBe('no-increment')
    expect(phaseFor(81, PROSE_PGN)).toBe('increment')
    expect(phaseFor(1, PROSE_INFO)).toBe('no-increment')
    expect(phaseFor(81, PROSE_INFO)).toBe('increment')
  })
})

describe('winPct', () => {
  it('is even at a zero evaluation', () => {
    expect(winPct(0)).toBe(50)
  })

  it('follows the lichess centipawn curve', () => {
    expect(winPct(200)).toBeCloseTo(67.6, 1)
    expect(winPct(500)).toBeCloseTo(86.3, 1)
  })

  it('clamps large centipawn values', () => {
    expect(winPct(5000)).toBe(winPct(1000))
    expect(winPct(-5000)).toBe(winPct(-1000))
  })

  it('saturates on mate', () => {
    expect(winPct(undefined, 3)).toBe(100)
    expect(winPct(undefined, -2)).toBe(0)
    expect(winPct(undefined, 0)).toBe(50)
  })

  it('is even when nothing is known', () => {
    expect(winPct()).toBe(50)
  })
})

describe('formatEval', () => {
  it('formats mate distances', () => {
    expect(formatEval(undefined, 3)).toBe('#3')
    expect(formatEval(undefined, -2)).toBe('#-2')
  })

  it('formats centipawns as signed pawns', () => {
    expect(formatEval(35)).toBe('+0.35')
    expect(formatEval(-120)).toBe('-1.20')
    expect(formatEval(0)).toBe('0.00')
  })

  it('honours the decimals argument', () => {
    expect(formatEval(150, undefined, 1)).toBe('+1.5')
  })

  it('renders an em dash when nothing is known', () => {
    expect(formatEval()).toBe('—')
  })
})
