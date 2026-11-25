import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRoundJson, fetchRoundPgn, fetchTour } from '@/lib/lichess/server'
import { POLL, REVALIDATE } from '@/lib/wcc/config'
import type { LichessRoundResponse, LichessTourResponse } from '@/types/wcc'

import { getRoundSnapshot, getTourSnapshot, pickCurrentRound } from '../snapshot'

vi.mock('@/lib/lichess/server', () => ({
  fetchTour: vi.fn(),
  fetchRoundJson: vi.fn(),
  fetchRoundPgn: vi.fn(),
}))

const TOUR_ID = 'qfkdt8mn'
const ROUND_ID = 'L3j03TZq'
const GAME_ID = 'bbbbbbbb'

const PGN = `[Event "FIDE World Chess Championship 2026"]
[White "Gukesh D"]
[Black "Sindarov, Javokhir"]
[Result "*"]
[WhiteFideId "46616543"]
[BlackFideId "14205483"]
[GameURL "https://lichess.org/${GAME_ID}"]

1. e4 e5 *
`

const tourResponse = (): LichessTourResponse => ({
  tour: {
    id: TOUR_ID,
    name: 'FIDE World Chess Championship 2026',
    slug: 'fide-world-chess-championship-2026',
    url: `https://lichess.org/broadcast/fide-world-chess-championship-2026/${TOUR_ID}`,
    info: { location: 'Zurich, Switzerland' },
  },
  rounds: [
    {
      id: ROUND_ID,
      name: 'Game 1',
      slug: 'game-1',
      url: `https://lichess.org/broadcast/fide-world-chess-championship-2026/game-1/${ROUND_ID}`,
      ongoing: true,
    },
  ],
})

const roundResponse = (round: Partial<LichessRoundResponse['round']> = {}): LichessRoundResponse => ({
  round: { ...tourResponse().rounds[0], ...round },
  tour: tourResponse().tour,
  games: [
    {
      id: GAME_ID,
      name: 'Gukesh D - Sindarov, Javokhir',
      players: [
        { name: 'Gukesh D', clock: 7_200_000 },
        { name: 'Sindarov, Javokhir', clock: 7_190_000 },
      ],
      status: '*',
    },
  ],
})

beforeEach(() => {
  vi.mocked(fetchTour).mockReset()
  vi.mocked(fetchRoundJson).mockReset()
  vi.mocked(fetchRoundPgn).mockReset()
})

describe('getTourSnapshot', () => {
  it('returns the tournament with its rounds and a fetch timestamp', async () => {
    vi.mocked(fetchTour).mockResolvedValue(tourResponse())

    const snapshot = await getTourSnapshot(TOUR_ID)

    expect(fetchTour).toHaveBeenCalledWith(TOUR_ID, REVALIDATE.tour)
    expect(snapshot.tour.id).toBe(TOUR_ID)
    expect(snapshot.rounds).toHaveLength(1)
    expect(snapshot.fetchedAt).toBeGreaterThan(0)
  })

  it('passes a caller-supplied revalidate window through', async () => {
    vi.mocked(fetchTour).mockResolvedValue(tourResponse())

    await getTourSnapshot(TOUR_ID, { revalidate: 120 })

    expect(fetchTour).toHaveBeenCalledWith(TOUR_ID, 120)
  })
})

describe('getRoundSnapshot', () => {
  it('composes the round json and the pgn into one live snapshot', async () => {
    vi.mocked(fetchRoundJson).mockResolvedValue(roundResponse())
    vi.mocked(fetchRoundPgn).mockResolvedValue(PGN)

    const snapshot = await getRoundSnapshot(ROUND_ID)

    expect(fetchRoundJson).toHaveBeenCalledWith(ROUND_ID, REVALIDATE.roundLive)
    expect(fetchRoundPgn).toHaveBeenCalledWith(ROUND_ID, REVALIDATE.roundLive)
    expect(snapshot.state).toBe('live')
    expect(snapshot.pollAfterMs).toBe(POLL.liveMs)
    expect(snapshot.version).toMatch(/^[0-9a-f]{8}$/)
    expect(snapshot.games).toHaveLength(1)
    expect(snapshot.games[0].id).toBe(GAME_ID)
    expect(snapshot.games[0].plies).toHaveLength(2)
    expect(snapshot.games[0].players[0].clock).toBe(7_200_000)
    expect(snapshot.games[0].players[0].fideId).toBe(46616543)
  })

  it('narrows the tour down to the fields the page needs', async () => {
    vi.mocked(fetchRoundJson).mockResolvedValue(roundResponse())
    vi.mocked(fetchRoundPgn).mockResolvedValue(PGN)

    const snapshot = await getRoundSnapshot(ROUND_ID)

    expect(snapshot.tour).toEqual({
      id: TOUR_ID,
      name: 'FIDE World Chess Championship 2026',
      slug: 'fide-world-chess-championship-2026',
      url: `https://lichess.org/broadcast/fide-world-chess-championship-2026/${TOUR_ID}`,
      info: { location: 'Zurich, Switzerland' },
    })
  })

  it('caches the pgn of a finished round for much longer', async () => {
    vi.mocked(fetchRoundJson).mockResolvedValue(
      roundResponse({ ongoing: false, finished: true, finishedAt: 1_770_020_000_000 }),
    )
    vi.mocked(fetchRoundPgn).mockResolvedValue(PGN)

    const snapshot = await getRoundSnapshot(ROUND_ID)

    expect(fetchRoundPgn).toHaveBeenCalledWith(ROUND_ID, REVALIDATE.roundFinished)
    expect(snapshot.state).toBe('finished')
    expect(snapshot.pollAfterMs).toBe(0)
  })

  it('uses the caller revalidate window for both calls on an unfinished round', async () => {
    vi.mocked(fetchRoundJson).mockResolvedValue(roundResponse())
    vi.mocked(fetchRoundPgn).mockResolvedValue(PGN)

    await getRoundSnapshot(ROUND_ID, { revalidate: 30 })

    expect(fetchRoundJson).toHaveBeenCalledWith(ROUND_ID, 30)
    expect(fetchRoundPgn).toHaveBeenCalledWith(ROUND_ID, 30)
  })
})

describe('snapshot re-exports', () => {
  it('exposes the pure round helpers for client callers', () => {
    expect(typeof pickCurrentRound).toBe('function')
  })
})
