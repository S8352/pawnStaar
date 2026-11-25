import { describe, expect, it } from 'vitest'

import type { Ply } from '@/types/wcc'

import { moveAnnouncement, moveLabel, resultForColor } from '../results'

const ply = (n: number, san: string): Ply => ({
  ply: n,
  san,
  uci: 'e2e4',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
})

// Odd plies are White's, so ply 2 is Black's reply to move 1.
const PLIES: Ply[] = [ply(1, 'e4'), ply(2, 'c5'), ply(3, 'Nf3'), ply(4, 'd6')]

describe('resultForColor', () => {
  it('gives white the point and black nothing on 1-0', () => {
    expect(resultForColor('1-0', 'white')).toBe('1')
    expect(resultForColor('1-0', 'black')).toBe('0')
  })

  it('gives black the point and white nothing on 0-1', () => {
    expect(resultForColor('0-1', 'white')).toBe('0')
    expect(resultForColor('0-1', 'black')).toBe('1')
  })

  it('gives both a half on a draw', () => {
    expect(resultForColor('1/2-1/2', 'white')).toBe('½')
    expect(resultForColor('1/2-1/2', 'black')).toBe('½')
  })

  it('reports no result while the game is unfinished', () => {
    expect(resultForColor('*', 'white')).toBeUndefined()
    expect(resultForColor('*', 'black')).toBeUndefined()
  })
})

describe('moveLabel', () => {
  it('names the position before the first move', () => {
    expect(moveLabel(PLIES, 0)).toBe('start position')
  })

  it("writes white's move with a full stop", () => {
    expect(moveLabel(PLIES, 1)).toBe('1. e4')
    expect(moveLabel(PLIES, 3)).toBe('2. Nf3')
  })

  it("writes black's move with an ellipsis", () => {
    expect(moveLabel(PLIES, 2)).toBe('1... c5')
    expect(moveLabel(PLIES, 4)).toBe('2... d6')
  })

  it('falls back to the start position for a ply the game has not reached', () => {
    expect(moveLabel(PLIES, 99)).toBe('start position')
  })

  it('falls back to the start position for an empty game', () => {
    expect(moveLabel([], 1)).toBe('start position')
  })
})

describe('moveAnnouncement', () => {
  it("spells out white's move for a live region", () => {
    expect(moveAnnouncement(PLIES, 1)).toBe('Move 1, White plays e4')
    expect(moveAnnouncement(PLIES, 3)).toBe('Move 2, White plays Nf3')
  })

  it("spells out black's move for a live region", () => {
    expect(moveAnnouncement(PLIES, 2)).toBe('Move 1, Black plays c5')
    expect(moveAnnouncement(PLIES, 4)).toBe('Move 2, Black plays d6')
  })

  it('has nothing to announce before the first move', () => {
    expect(moveAnnouncement(PLIES, 0)).toBe('')
  })

  it('has nothing to announce for a ply the game has not reached', () => {
    expect(moveAnnouncement(PLIES, 99)).toBe('')
  })
})
