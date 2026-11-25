import { describe, expect, it } from 'vitest'

import { POLL } from '@/lib/wcc/config'
import { START_FEN } from '@/lib/wcc/fen'
import type { LichessRoundGame, LichessRoundSummary, ParsedGame, Ply } from '@/types/wcc'

import {
  cacheControlFor,
  deriveRoundState,
  hashVersion,
  isRoundFinished,
  mergeRoundGames,
  pollAfterFor,
} from '../round-state'

const NOW = 1_770_000_000_000

const round = (overrides: Partial<LichessRoundSummary> = {}): LichessRoundSummary => ({
  id: 'L3j03TZq',
  name: 'Game 1',
  slug: 'game-1',
  url: 'https://lichess.org/broadcast/wcc/game-1/L3j03TZq',
  ...overrides,
})

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

const jsonGame = (overrides: Partial<LichessRoundGame> = {}): LichessRoundGame => ({
  id: 'aaaaaaaa',
  name: 'Gukesh D - Sindarov, Javokhir',
  players: [{ name: 'Gukesh D' }, { name: 'Sindarov, Javokhir' }],
  status: '*',
  ...overrides,
})

describe('isRoundFinished', () => {
  it('is true when finishedAt is set', () => {
    expect(isRoundFinished(round({ finishedAt: NOW - 1000 }))).toBe(true)
  })

  it('is true when the finished flag is set', () => {
    expect(isRoundFinished(round({ finished: true }))).toBe(true)
  })

  it('is false when neither marker is present', () => {
    expect(isRoundFinished(round())).toBe(false)
  })
})

describe('deriveRoundState', () => {
  it('is finished when only finishedAt is set', () => {
    expect(deriveRoundState(round({ finishedAt: NOW - 1000 }), [], NOW)).toBe('finished')
  })

  it('is finished when only the finished flag is set', () => {
    expect(deriveRoundState(round({ finished: true }), [], NOW)).toBe('finished')
  })

  it('is upcoming when it starts in the future and no move has been played', () => {
    const state = deriveRoundState(round({ startsAt: NOW + 60_000 }), [{ plies: [], status: '*' }], NOW)
    expect(state).toBe('upcoming')
  })

  it('is live when Lichess flags it ongoing even though the published start is still ahead', () => {
    const state = deriveRoundState(
      round({ startsAt: NOW + 60_000, ongoing: true }),
      [{ plies: [], status: '*' }],
      NOW,
    )
    expect(state).toBe('live')
  })

  it('is finished rather than live when a round is flagged both ongoing and finished', () => {
    const state = deriveRoundState(round({ ongoing: true, finished: true }), [], NOW)
    expect(state).toBe('finished')
  })

  it('is live when a move has been played even though startsAt is in the future', () => {
    const state = deriveRoundState(
      round({ startsAt: NOW + 60_000 }),
      [{ plies: [ply(1)], status: '*' }],
      NOW,
    )
    expect(state).toBe('live')
  })

  it('is live when startsAt has passed and no move has been played yet', () => {
    expect(deriveRoundState(round({ startsAt: NOW - 60_000 }), [{ plies: [], status: '*' }], NOW)).toBe('live')
  })

  it('is live when there is no startsAt at all', () => {
    expect(deriveRoundState(round(), [], NOW)).toBe('live')
  })
})

describe('pollAfterFor', () => {
  it('stops polling a finished round', () => {
    expect(pollAfterFor('finished', [{ status: '1-0' }], round({ finished: true }))).toBe(0)
  })

  it('polls an upcoming round slowly', () => {
    expect(pollAfterFor('upcoming', [], round({ startsAt: NOW + 60_000 }))).toBe(POLL.upcomingMs)
  })

  it('polls a live round with a game in progress quickly', () => {
    expect(pollAfterFor('live', [{ status: '*' }], round())).toBe(POLL.liveMs)
  })

  it('backs off when every game is decided but the round is not flagged finished', () => {
    expect(pollAfterFor('live', [{ status: '1-0' }, { status: '1/2-1/2' }], round())).toBe(60_000)
  })

  it('keeps polling quickly when a decided round has already been flagged finished', () => {
    expect(pollAfterFor('live', [{ status: '1-0' }], round({ finished: true }))).toBe(POLL.liveMs)
  })

  it('keeps polling quickly when a live round has published no games yet', () => {
    expect(pollAfterFor('live', [], round())).toBe(POLL.liveMs)
  })
})

describe('cacheControlFor', () => {
  it('caches a finished round for an hour', () => {
    expect(cacheControlFor('finished')).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
  })

  it('caches an upcoming round for half a minute', () => {
    expect(cacheControlFor('upcoming')).toBe('public, s-maxage=30, stale-while-revalidate=60')
  })

  it('caches a live round for five seconds', () => {
    expect(cacheControlFor('live')).toBe('public, s-maxage=5, stale-while-revalidate=10')
  })
})

describe('mergeRoundGames', () => {
  it('matches a parsed game to the round game with the same id', () => {
    const games = mergeRoundGames([jsonGame({ id: 'bbbbbbbb' })], [
      parsed({ id: 'cccccccc' }),
      parsed({ id: 'bbbbbbbb', result: '1-0' }),
    ])

    expect(games).toHaveLength(2)
    expect(games[0].id).toBe('bbbbbbbb')
    expect(games[0].status).toBe('1-0')
  })

  it('falls back to the parsed game at the same index when it carries no id', () => {
    const games = mergeRoundGames(
      [jsonGame({ id: 'bbbbbbbb' }), jsonGame({ id: 'cccccccc', status: '1-0' })],
      [parsed({ id: null }), parsed({ id: null, result: '1-0' })],
    )

    expect(games).toHaveLength(2)
    expect(games[1].status).toBe('1-0')
    expect(games[1].players[0].name).toBe('Gukesh D')
  })

  it('normalises the Lichess draw status to PGN form', () => {
    const [game] = mergeRoundGames([jsonGame({ status: '½-½' })], [parsed({ id: 'aaaaaaaa' })])

    expect(game.status).toBe('1/2-1/2')
  })

  it('prefers the parsed result when it is terminal', () => {
    const [game] = mergeRoundGames([jsonGame({ status: '*' })], [parsed({ result: '0-1' })])

    expect(game.status).toBe('0-1')
  })

  it('uses the last ply fen as the current position', () => {
    const [game] = mergeRoundGames(
      [jsonGame({ fen: 'fen-from-json' })],
      [parsed({ plies: [ply(1), ply(2)] })],
    )

    expect(game.currentFen).toBe('fen-after-ply-2')
    expect(game.lastMove).toBe('e2e4')
  })

  it('falls back to the round json fen when no ply has been parsed', () => {
    const [game] = mergeRoundGames(
      [jsonGame({ fen: 'fen-from-json', lastMove: 'd2d4' })],
      [parsed({ plies: [] })],
    )

    expect(game.currentFen).toBe('fen-from-json')
    expect(game.lastMove).toBe('d2d4')
  })

  it('falls back to the initial fen when neither a ply nor the json has one', () => {
    const [game] = mergeRoundGames([jsonGame()], [parsed({ plies: [] })])

    expect(game.currentFen).toBe(START_FEN)
    expect(game.lastMove).toBeUndefined()
  })

  it('keeps players without a clock', () => {
    const [game] = mergeRoundGames(
      [jsonGame({ players: [{ name: 'Gukesh D' }, { name: 'Sindarov, Javokhir', clock: 3000 }] })],
      [parsed()],
    )

    expect(game.players[0].clock).toBeUndefined()
    expect(game.players[1].clock).toBe(3000)
  })

  it('fills a missing fide id from the pgn tags', () => {
    const [game] = mergeRoundGames(
      [jsonGame({ players: [{ name: 'Gukesh D' }, { name: 'Sindarov, Javokhir', fideId: 14205483 }] })],
      [parsed({ tags: { White: 'Gukesh D', WhiteFideId: '46616543', Black: 'Sindarov, Javokhir' } })],
    )

    expect(game.players[0].fideId).toBe(46616543)
    expect(game.players[1].fideId).toBe(14205483)
  })

  it('synthesises a game from the round json when the pgn has none', () => {
    const [game] = mergeRoundGames(
      [
        jsonGame({
          id: 'dddddddd',
          status: '½-½',
          fen: 'fen-from-json',
          players: [
            { name: 'Gukesh D', fideId: 46616543 },
            { name: 'Sindarov, Javokhir' },
          ],
        }),
      ],
      [],
    )

    expect(game.id).toBe('dddddddd')
    expect(game.plies).toEqual([])
    expect(game.tags).toEqual({
      White: 'Gukesh D',
      WhiteFideId: '46616543',
      Black: 'Sindarov, Javokhir',
    })
    expect(game.status).toBe('1/2-1/2')
    expect(game.currentFen).toBe('fen-from-json')
  })

  it('appends parsed games whose id is not in the round json', () => {
    const games = mergeRoundGames(
      [jsonGame({ id: 'bbbbbbbb' })],
      [parsed({ id: 'bbbbbbbb' }), parsed({ id: 'eeeeeeee', result: '1-0' })],
    )

    expect(games.map((game) => game.id)).toEqual(['bbbbbbbb', 'eeeeeeee'])
    expect(games[1].status).toBe('1-0')
  })
})

describe('hashVersion', () => {
  it('returns eight hex characters', () => {
    expect(hashVersion('1. e4 e5')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('is stable for the same input', () => {
    expect(hashVersion('1. e4 e5')).toBe(hashVersion('1. e4 e5'))
  })

  it('changes when the input changes', () => {
    expect(hashVersion('1. e4 e5')).not.toBe(hashVersion('1. e4 c5'))
  })

  it('hashes the empty string to the fnv-1a offset basis', () => {
    expect(hashVersion('')).toBe('811c9dc5')
  })
})
