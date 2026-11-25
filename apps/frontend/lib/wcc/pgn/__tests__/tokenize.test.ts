import { describe, expect, it } from 'vitest'

import { parseGame, parseRoundPgn, tokenizeMovetext } from '../index'

/** SAN texts in token order, ignoring comments and results. */
const sans = (movetext: string): string[] =>
  tokenizeMovetext(movetext).flatMap((token) => (token.kind === 'san' ? [token.text] : []))

const game = (movetext: string): string =>
  ['[White "A"]', '[Black "B"]', '', movetext].join('\n')

/**
 * A bare `$` used to spin forever: `WORD_BREAK_RE` treats it as a break but
 * only `$\d+` was ever consumed, so the word scan made no progress. Each test
 * carries a short timeout so a regression fails instead of wedging the run.
 */
describe('tokenizeMovetext with a bare "$"', () => {
  it('returns when the movetext ends with a bare "$"', () => {
    expect(sans('1. e4 e5 2. Nf3 $')).toEqual(['e4', 'e5', 'Nf3'])
  }, 1000)

  it('returns when a bare "$" sits between two moves', () => {
    expect(sans('1. e4 $ e5')).toEqual(['e4', 'e5'])
  }, 1000)

  it('drops a "$" that is not followed by digits', () => {
    expect(sans('1. e4 $x e5')).toEqual(['e4', 'x', 'e5'])
  }, 1000)

  it('still consumes well-formed NAGs', () => {
    expect(sans('1. e4 $1 e5 $13')).toEqual(['e4', 'e5'])
  }, 1000)

  it('advances past every stray character', () => {
    for (const stray of ['$', '#', '+', '=', '/', '\\', '"', '|', '@']) {
      expect(tokenizeMovetext(`1. e4 ${stray}`)[0]).toEqual({ kind: 'san', text: 'e4', ply: 1 })
    }
  }, 1000)
})

describe('parseGame with a bare "$"', () => {
  it('parses a game whose movetext ends mid-NAG', () => {
    const parsed = parseGame(game('1. e4 { [%clk 1:59:56] } e5 2. Nf3 $'))
    expect(parsed.plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3'])
    expect(parsed.issues).toEqual([])
    expect(parsed.plies[0].clockMs).toBe(7_196_000)
  }, 1000)

  it('parses a game with a bare "$" in the middle of the movetext', () => {
    const parsed = parseGame(game('1. e4 $ e5 *'))
    expect(parsed.plies.map((p) => p.san)).toEqual(['e4', 'e5'])
    expect(parsed.issues).toEqual([])
    expect(parsed.result).toBe('*')
  }, 1000)

  it('keeps the legal prefix when a "$" is followed by a non-digit', () => {
    const parsed = parseGame(game('1. e4 e5 2. Nf3 $x'))
    expect(parsed.plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3'])
    expect(parsed.issues).toHaveLength(1)
    expect(parsed.issues[0].code).toBe('illegal_move')
  }, 1000)

  it('parses a round whose last chunk is cut off mid-NAG', () => {
    const games = parseRoundPgn(game('1. d4 d5 2. c4 $'))
    expect(games).toHaveLength(1)
    expect(games[0].plies.map((p) => p.san)).toEqual(['d4', 'd5', 'c4'])
    expect(games[0].issues).toEqual([])
  }, 1000)
})
