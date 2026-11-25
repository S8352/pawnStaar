import { describe, expect, it } from 'vitest'

import type { Ply } from '@/types/wcc'

import { clocksAtPly, formatClock, remainingMs } from '../clock'

const ply = (n: number, san: string, clockMs?: number): Ply => ({
  ply: n,
  san,
  uci: 'e2e4',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ...(clockMs === undefined ? {} : { clockMs }),
})

// Odd plies are White's, so the `[%clk]` on ply 3 is White's second reading.
const PLIES: Ply[] = [
  ply(1, 'e4', 7_190_000),
  ply(2, 'e5', 7_185_000),
  ply(3, 'Nf3', 7_100_000),
]

describe('clocksAtPly', () => {
  it('reports no clocks before the first move', () => {
    expect(clocksAtPly(PLIES, 0)).toEqual({})
  })

  it("reports only white's clock after white's first move", () => {
    expect(clocksAtPly(PLIES, 1)).toEqual({ white: 7_190_000 })
  })

  it('reports both clocks once both have moved', () => {
    expect(clocksAtPly(PLIES, 2)).toEqual({ white: 7_190_000, black: 7_185_000 })
  })

  it("carries black's older reading forward past white's next move", () => {
    expect(clocksAtPly(PLIES, 3)).toEqual({ white: 7_100_000, black: 7_185_000 })
  })

  it('clamps a ply beyond the game to the last one', () => {
    expect(clocksAtPly(PLIES, 99)).toEqual({ white: 7_100_000, black: 7_185_000 })
  })

  it('reports no clocks for an empty game', () => {
    expect(clocksAtPly([], 0)).toEqual({})
  })

  it('falls back to the last reading a colour actually carries', () => {
    const missing = [ply(1, 'e4', 7_190_000), ply(2, 'e5', 7_185_000), ply(3, 'Nf3')]

    expect(clocksAtPly(missing, 3)).toEqual({ white: 7_190_000, black: 7_185_000 })
  })
})

describe('remainingMs', () => {
  it('returns the base time when no time has passed', () => {
    expect(remainingMs(60_000, 1_000, 1_000)).toBe(60_000)
  })

  it('subtracts the elapsed time', () => {
    expect(remainingMs(60_000, 1_000, 11_000)).toBe(50_000)
  })

  it('clamps at zero rather than going negative', () => {
    expect(remainingMs(60_000, 1_000, 100_000)).toBe(0)
  })
})

describe('formatClock', () => {
  it('shows placeholders for an unknown clock', () => {
    expect(formatClock(undefined)).toBe('--:--')
  })

  it('shows hours once there is an hour or more', () => {
    expect(formatClock(7_196_000)).toBe('1:59:56')
  })

  it('shows minutes and seconds below an hour', () => {
    expect(formatClock(95_100)).toBe('1:35')
  })

  it('floors to whole seconds rather than rounding up', () => {
    expect(formatClock(5_999)).toBe('0:05')
  })

  it('shows a flagged clock as zero', () => {
    expect(formatClock(0)).toBe('0:00')
  })

  it('clamps a negative clock to zero', () => {
    expect(formatClock(-5_000)).toBe('0:00')
  })
})
