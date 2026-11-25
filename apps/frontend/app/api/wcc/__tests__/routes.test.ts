import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LichessError } from '@/lib/lichess/errors'
import { fetchRoundJson, fetchRoundPgn } from '@/lib/lichess/server'
import { FEATURED_TOUR_ID, REVALIDATE } from '@/lib/wcc/config'
import { getRoundSnapshot, getTourSnapshot } from '@/lib/wcc/snapshot'
import type { LichessRoundResponse, RoundSnapshot, TourSnapshot } from '@/types/wcc'

import { GET as pgnGet } from '../round/[roundId]/pgn/route'
import { GET as roundGet } from '../round/[roundId]/route'
import { GET as tourGet } from '../tour/[tourId]/route'

vi.mock('@/lib/wcc/snapshot', () => ({
  getTourSnapshot: vi.fn(),
  getRoundSnapshot: vi.fn(),
}))

vi.mock('@/lib/lichess/server', () => ({
  fetchRoundJson: vi.fn(),
  fetchRoundPgn: vi.fn(),
}))

const ROUND_ID = 'L3j03TZq'

const request = (): Request => new Request('http://x')

const roundParams = (roundId: string) => ({ params: Promise.resolve({ roundId }) })
const tourParams = (tourId: string) => ({ params: Promise.resolve({ tourId }) })

const ROUND: RoundSnapshot['round'] = {
  id: ROUND_ID,
  name: 'Game 1',
  slug: 'game-1',
  url: `https://lichess.org/broadcast/wcc/game-1/${ROUND_ID}`,
}

const roundSnapshot = (overrides: Partial<RoundSnapshot> = {}): RoundSnapshot => ({
  round: ROUND,
  tour: {
    id: FEATURED_TOUR_ID,
    name: 'FIDE World Chess Championship 2026',
    slug: 'fide-world-chess-championship-2026',
    url: `https://lichess.org/broadcast/fide-world-chess-championship-2026/${FEATURED_TOUR_ID}`,
  },
  state: 'live',
  games: [],
  version: 'deadbeef',
  fetchedAt: 1_770_000_000_000,
  pollAfterMs: 5000,
  ...overrides,
})

const tourSnapshot = (): TourSnapshot => ({
  tour: {
    id: FEATURED_TOUR_ID,
    name: 'FIDE World Chess Championship 2026',
    slug: 'fide-world-chess-championship-2026',
    url: `https://lichess.org/broadcast/fide-world-chess-championship-2026/${FEATURED_TOUR_ID}`,
  },
  rounds: [ROUND],
  fetchedAt: 1_770_000_000_000,
})

const roundJson = (
  round: Partial<LichessRoundResponse['round']> = {},
  tourId = FEATURED_TOUR_ID,
): LichessRoundResponse => ({
  round: { ...ROUND, ...round },
  tour: {
    id: tourId,
    name: 'FIDE World Chess Championship 2026',
    slug: 'fide-world-chess-championship-2026',
    url: `https://lichess.org/broadcast/fide-world-chess-championship-2026/${tourId}`,
  },
  games: [],
})

beforeEach(() => {
  vi.mocked(getTourSnapshot).mockReset()
  vi.mocked(getRoundSnapshot).mockReset()
  vi.mocked(fetchRoundJson).mockReset()
  vi.mocked(fetchRoundPgn).mockReset()
})

describe('GET /api/wcc/tour/[tourId]', () => {
  it('answers with the tour snapshot', async () => {
    vi.mocked(getTourSnapshot).mockResolvedValue(tourSnapshot())

    const res = await tourGet(request(), tourParams(FEATURED_TOUR_ID))

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=300')
    expect(getTourSnapshot).toHaveBeenCalledWith(FEATURED_TOUR_ID, { revalidate: REVALIDATE.tour })
    await expect(res.json()).resolves.toMatchObject({ tour: { id: FEATURED_TOUR_ID } })
  })

  it('refuses a malformed tour id without calling Lichess', async () => {
    const res = await tourGet(request(), tourParams('nope'))

    expect(res.status).toBe(404)
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600')
    expect(getTourSnapshot).not.toHaveBeenCalled()
  })

  it('refuses a well-formed tour id that is not on the allow-list', async () => {
    const res = await tourGet(request(), tourParams('aaaaaaaa'))

    expect(res.status).toBe(404)
    expect(getTourSnapshot).not.toHaveBeenCalled()
  })

  it('passes an upstream rate limit on to the client', async () => {
    vi.mocked(getTourSnapshot).mockRejectedValue(new LichessError(429, 60))

    const res = await tourGet(request(), tourParams(FEATURED_TOUR_ID))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
  })
})

describe('GET /api/wcc/round/[roundId]', () => {
  it('answers with the round snapshot and the cache policy for its state', async () => {
    vi.mocked(getRoundSnapshot).mockResolvedValue(roundSnapshot())

    const res = await roundGet(request(), roundParams(ROUND_ID))

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=5, stale-while-revalidate=10')
    expect(getRoundSnapshot).toHaveBeenCalledWith(ROUND_ID, { revalidate: REVALIDATE.roundLive })
    await expect(res.json()).resolves.toMatchObject({ version: 'deadbeef' })
  })

  it('caches a finished round for an hour', async () => {
    vi.mocked(getRoundSnapshot).mockResolvedValue(roundSnapshot({ state: 'finished', pollAfterMs: 0 }))

    const res = await roundGet(request(), roundParams(ROUND_ID))

    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
  })

  it('refuses a malformed round id without calling Lichess', async () => {
    const res = await roundGet(request(), roundParams('nope'))

    expect(res.status).toBe(404)
    expect(getRoundSnapshot).not.toHaveBeenCalled()
  })

  it('refuses a round that belongs to another tournament', async () => {
    vi.mocked(getRoundSnapshot).mockResolvedValue(
      roundSnapshot({ tour: { ...roundSnapshot().tour, id: 'zzzzzzzz' } }),
    )

    const res = await roundGet(request(), roundParams(ROUND_ID))

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'not_found' })
  })

  it('passes an upstream rate limit on to the client', async () => {
    vi.mocked(getRoundSnapshot).mockRejectedValue(new LichessError(429, 60))

    const res = await roundGet(request(), roundParams(ROUND_ID))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    await expect(res.json()).resolves.toEqual({ error: 'lichess_rate_limited', retryAfterSec: 60 })
  })
})

describe('GET /api/wcc/round/[roundId]/pgn', () => {
  it('serves the round pgn as a download', async () => {
    vi.mocked(fetchRoundJson).mockResolvedValue(roundJson())
    vi.mocked(fetchRoundPgn).mockResolvedValue('[Event "WCC"]\n\n1. e4 *')

    const res = await pgnGet(request(), roundParams(ROUND_ID))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/x-chess-pgn; charset=utf-8')
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="wcc2026-game-1.pgn"')
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=5, stale-while-revalidate=10')
    expect(fetchRoundPgn).toHaveBeenCalledWith(ROUND_ID, REVALIDATE.roundLive)
    await expect(res.text()).resolves.toBe('[Event "WCC"]\n\n1. e4 *')
  })

  it('caches a finished round pgn for much longer', async () => {
    vi.mocked(fetchRoundJson).mockResolvedValue(roundJson({ finished: true }))
    vi.mocked(fetchRoundPgn).mockResolvedValue('[Event "WCC"]\n\n1. e4 1-0')

    const res = await pgnGet(request(), roundParams(ROUND_ID))

    expect(fetchRoundPgn).toHaveBeenCalledWith(ROUND_ID, REVALIDATE.roundFinished)
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
  })

  it('refuses a round that belongs to another tournament', async () => {
    vi.mocked(fetchRoundJson).mockResolvedValue(roundJson({}, 'zzzzzzzz'))

    const res = await pgnGet(request(), roundParams(ROUND_ID))

    expect(res.status).toBe(404)
    expect(fetchRoundPgn).not.toHaveBeenCalled()
  })

  it('refuses a malformed round id without calling Lichess', async () => {
    const res = await pgnGet(request(), roundParams('nope'))

    expect(res.status).toBe(404)
    expect(fetchRoundJson).not.toHaveBeenCalled()
  })
})
