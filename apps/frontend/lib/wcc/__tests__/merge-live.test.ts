import { describe, expect, it } from 'vitest'

import { START_FEN } from '@/lib/wcc/fen'
import type { LichessPlayer, ParsedGame, Ply, WccGame } from '@/types/wcc'

import { mergeParsedIntoGame } from '../merge-live'

const ply = (n: number, overrides: Partial<Ply> = {}): Ply => ({
  ply: n,
  san: 'e4',
  uci: 'e2e4',
  fen: `fen-after-ply-${n}`,
  ...overrides,
})

const parsed = (overrides: Partial<ParsedGame> = {}): ParsedGame => ({
  id: 'aaaaaaaa',
  tags: { White: 'Gukesh D', Black: 'Sindarov, Javokhir' },
  initialFen: START_FEN,
  plies: [],
  result: '*',
  issues: [],
  pgn: '[White "Gukesh D"]',
  ...overrides,
})

const players = (
  white: Partial<LichessPlayer> = {},
  black: Partial<LichessPlayer> = {},
): [LichessPlayer, LichessPlayer] => [
  { name: 'Gukesh D', title: 'GM', rating: 2787, ...white },
  { name: 'Sindarov, Javokhir', title: 'GM', rating: 2709, ...black },
]

const existing = (overrides: Partial<WccGame> = {}): WccGame => ({
  ...parsed(),
  players: players(),
  status: '*',
  currentFen: START_FEN,
  ...overrides,
})

describe('mergeParsedIntoGame', () => {
  it('keeps the players of the game it replaces', () => {
    const merged = mergeParsedIntoGame(existing(), parsed({ plies: [ply(1)] }))

    expect(merged.players).toEqual(players())
  })

  it('takes moves, tags and pgn from the incoming frame', () => {
    const frame = parsed({ plies: [ply(1), ply(2)], pgn: '[White "Gukesh D"]\n\n1. e4 e5' })

    const merged = mergeParsedIntoGame(existing(), frame)

    expect(merged.plies).toEqual(frame.plies)
    expect(merged.pgn).toBe(frame.pgn)
    expect(merged.tags).toEqual(frame.tags)
  })

  it('reads the current position off the last ply', () => {
    const merged = mergeParsedIntoGame(existing(), parsed({ plies: [ply(1), ply(2)] }))

    expect(merged.currentFen).toBe('fen-after-ply-2')
    expect(merged.lastMove).toBe('e2e4')
  })

  it('keeps the last known position when the frame has no moves', () => {
    const before = existing({ currentFen: 'fen-after-ply-9', lastMove: 'g1f3' })

    const merged = mergeParsedIntoGame(before, parsed({ plies: [] }))

    expect(merged.currentFen).toBe('fen-after-ply-9')
    expect(merged.lastMove).toBe('g1f3')
  })

  it('falls back to the initial position with no moves anywhere', () => {
    const merged = mergeParsedIntoGame(undefined, parsed({ plies: [] }))

    expect(merged.currentFen).toBe(START_FEN)
    expect(merged.lastMove).toBeUndefined()
  })

  it('takes a decided result from the frame', () => {
    const merged = mergeParsedIntoGame(existing(), parsed({ result: '1-0', plies: [ply(1)] }))

    expect(merged.status).toBe('1-0')
  })

  it('keeps the known result when the frame is still undecided', () => {
    const merged = mergeParsedIntoGame(existing({ status: '1/2-1/2' }), parsed({ result: '*' }))

    expect(merged.status).toBe('1/2-1/2')
  })

  it('synthesises players from the tags for a game it has not seen before', () => {
    const merged = mergeParsedIntoGame(
      undefined,
      parsed({
        tags: {
          White: 'Gukesh D',
          Black: 'Sindarov, Javokhir',
          WhiteFideId: '46616543',
          BlackFideId: '14205483',
        },
      }),
    )

    expect(merged.players).toEqual([
      { name: 'Gukesh D', fideId: 46616543 },
      { name: 'Sindarov, Javokhir', fideId: 14205483 },
    ])
  })

  it('leaves the fide id off a synthesised player whose tag is unusable', () => {
    const merged = mergeParsedIntoGame(
      undefined,
      parsed({ tags: { White: 'Gukesh D', Black: 'Sindarov, Javokhir', WhiteFideId: 'n/a' } }),
    )

    expect(merged.players[0]).toEqual({ name: 'Gukesh D' })
  })

  it('borrows a fide id from the tags for a player who has none', () => {
    const before = existing({ players: players({ fideId: undefined }, { fideId: 14205483 }) })

    const merged = mergeParsedIntoGame(before, parsed({ tags: { WhiteFideId: '46616543' } }))

    expect(merged.players[0].fideId).toBe(46616543)
    expect(merged.players[1].fideId).toBe(14205483)
  })
})
