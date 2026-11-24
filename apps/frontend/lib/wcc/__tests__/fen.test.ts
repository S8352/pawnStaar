import { describe, expect, it } from 'vitest'

import { START_FEN, lastMoveSquares, sideToMove } from '../fen'

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

describe('fen helpers', () => {
  it('exposes the standard starting position', () => {
    expect(START_FEN).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  })

  it('reports white to move at the start', () => {
    expect(sideToMove(START_FEN)).toBe('w')
  })

  it('reports black to move after 1. e4', () => {
    expect(sideToMove(AFTER_E4)).toBe('b')
  })

  it('splits a uci move into from/to squares', () => {
    expect(lastMoveSquares('e2e4')).toEqual({ from: 'e2', to: 'e4' })
  })

  it('ignores the promotion suffix of a uci move', () => {
    expect(lastMoveSquares('e7e8q')).toEqual({ from: 'e7', to: 'e8' })
  })

  it('returns undefined for an absent uci move', () => {
    expect(lastMoveSquares(undefined)).toBeUndefined()
  })

  it('returns undefined for a malformed uci move', () => {
    expect(lastMoveSquares('z9e4')).toBeUndefined()
  })
})
