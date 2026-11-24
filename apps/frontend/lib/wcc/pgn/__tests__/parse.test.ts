import { readFileSync } from 'node:fs'

import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'

import { gameIdFromUrl, parseGame, parseRoundPgn, splitPgnGames } from '../index'

const fixture = (name: string): string =>
  readFileSync(new URL(`../../__fixtures__/${name}`, import.meta.url), 'utf8')

const SNIPPET = fixture('wcc2024-game1-snippet.pgn')
const ZERO_MOVES = fixture('zero-moves.pgn')
const MALFORMED = fixture('malformed.pgn')

describe('parseRoundPgn', () => {
  it('splits a multi-game export into one entry per game', () => {
    expect(splitPgnGames(SNIPPET)).toHaveLength(2)
  })

  it('returns no games for empty input', () => {
    expect(splitPgnGames('   \n\n  ')).toEqual([])
  })

  it('reads the game id of each game from its GameURL tag', () => {
    expect(parseRoundPgn(SNIPPET).map((g) => g.id)).toEqual(['TAq3z9DR', 'airZH7mK'])
  })

  it('parses the tag section of the first game', () => {
    const [game] = parseRoundPgn(SNIPPET)
    expect(game.tags.White).toBe('Gukesh D')
    expect(game.tags.BlackFideId).toBe('8603677')
    expect(game.tags.TimeControl).toBe('40/7200:1800+30')
  })

  it('replays every ply of the first game', () => {
    const [game] = parseRoundPgn(SNIPPET)
    expect(game.plies).toHaveLength(24)
    expect(game.issues).toEqual([])
  })

  it('records san, uci and the resulting fen for the first ply', () => {
    const [game] = parseRoundPgn(SNIPPET)
    const chess = new Chess()
    chess.move('e4')

    expect(game.plies[0].san).toBe('e4')
    expect(game.plies[0].uci).toBe('e2e4')
    expect(game.plies[0].fen).toBe(chess.fen())
  })

  it('parses a black reply written without the "N..." move-number prefix', () => {
    // Ply 6 is written as bare `Nf6` in the fixture, with no `3...` prefix.
    const [game] = parseRoundPgn(SNIPPET)
    expect(game.plies[5].ply).toBe(6)
    expect(game.plies[5].san).toBe('Nf6')
    expect(game.plies[5].uci).toBe('g8f6')
  })

  it('converts a [%clk] annotation to milliseconds', () => {
    const [game] = parseRoundPgn(SNIPPET)
    expect(game.plies[0].clockMs).toBe(7_196_000)
  })

  it('converts a centipawn [%eval] annotation to centipawns', () => {
    const [game] = parseRoundPgn(SNIPPET)
    expect(game.plies[0].evalCp).toBe(18)
    expect(game.plies[0].evalMate).toBeUndefined()
  })

  it('converts a mate [%eval] annotation to a mate distance', () => {
    const [game] = parseRoundPgn(SNIPPET)
    expect(game.plies[22].san).toBe('dxc5')
    expect(game.plies[22].evalMate).toBe(3)
    expect(game.plies[22].evalCp).toBeUndefined()
  })

  it('keeps distinct clocks for repeated positions', () => {
    const [game] = parseRoundPgn(SNIPPET)
    // 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3 Nf6 revisits the same positions.
    expect(game.plies[4].san).toBe('Nf3')
    expect(game.plies[8].san).toBe('Nf3')
    expect(game.plies[4].clockMs).toBe(7_110_000)
    expect(game.plies[8].clockMs).toBe(6_970_000)
    expect(game.plies[5].clockMs).not.toBe(game.plies[9].clockMs)
  })

  it('reports an unfinished game as "*"', () => {
    expect(parseRoundPgn(SNIPPET)[0].result).toBe('*')
  })

  it('parses the short second game', () => {
    const second = parseRoundPgn(SNIPPET)[1]
    expect(second.tags.White).toBe('Player 3')
    expect(second.plies.map((p) => p.san)).toEqual(['d4', 'd5'])
    expect(second.plies[0].clockMs).toBe(1_800_000)
  })
})

describe('parseGame with no moves', () => {
  it('returns an empty ply list and no issues', () => {
    const game = parseGame(ZERO_MOVES)
    expect(game.plies).toEqual([])
    expect(game.issues).toEqual([])
    expect(game.result).toBe('*')
    expect(game.id).toBe('Zx8cVb2n')
  })
})

describe('parseRoundPgn with an illegal move', () => {
  it('keeps the legal prefix and reports the illegal ply', () => {
    const [game] = parseRoundPgn(MALFORMED)
    expect(game.plies).toHaveLength(6)
    expect(game.issues).toHaveLength(1)
    expect(game.issues[0].ply).toBe(7)
    expect(game.issues[0].code).toBe('illegal_move')
  })

  it('still parses the game that follows the malformed one', () => {
    const games = parseRoundPgn(MALFORMED)
    expect(games).toHaveLength(2)
    expect(games[1].plies.map((p) => p.san)).toEqual(['d4', 'd5', 'c4', 'e6'])
    expect(games[1].issues).toEqual([])
  })
})

describe('parseGame token handling', () => {
  it('skips variations and NAGs', () => {
    const game = parseGame(
      ['[White "A"]', '[Black "B"]', '', '1. e4 $1 e5 (1... c5 { Sicilian } 2. Nf3 (2. Nc3 d6) d6) 2. Nf3!? Nc6 *'].join(
        '\n',
      ),
    )
    expect(game.plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
    expect(game.issues).toEqual([])
  })

  it('skips ";" line comments', () => {
    const game = parseGame(
      ['[White "A"]', '[Black "B"]', '', '1. e4 e5 ; a trailing remark 1. Qh5', '2. Nf3 Nc6 *'].join('\n'),
    )
    expect(game.plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
  })

  it('reports missing player tags without discarding the game', () => {
    const game = parseGame(['[Event "X"]', '', '1. e4 e5 *'].join('\n'))
    expect(game.plies).toHaveLength(2)
    expect(game.issues).toEqual([{ ply: 0, code: 'bad_tags', detail: expect.any(String) }])
  })

  it('never throws for arbitrary input', () => {
    expect(() => parseGame('')).not.toThrow()
    expect(() => parseGame('not a pgn at all }{)(')).not.toThrow()
  })
})

describe('gameIdFromUrl', () => {
  it('returns the trailing 8-character id', () => {
    expect(
      gameIdFromUrl('https://lichess.org/broadcast/fide-world-championship-2024/game-1/G2R2lPcA/TAq3z9DR'),
    ).toBe('TAq3z9DR')
  })

  it('returns null for an absent url', () => {
    expect(gameIdFromUrl(undefined)).toBeNull()
  })

  it('returns null when the trailing segment is not a lichess id', () => {
    expect(gameIdFromUrl('https://lichess.org/broadcast/x/y/short')).toBeNull()
  })
})
