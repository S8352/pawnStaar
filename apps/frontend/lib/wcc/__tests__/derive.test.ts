import { describe, expect, it } from 'vitest'

import type { Ply } from '@/types/wcc'

import { formatEval, incrementAtPly, parseTimeControl, phaseFor, thinkTimeMs, winPct } from '../derive'

const CLASSICAL = parseTimeControl('40/7200:1800+30')
const RAPID = parseTimeControl('900+10')

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
