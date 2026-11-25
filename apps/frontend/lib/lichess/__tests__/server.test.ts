import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LichessError } from '@/lib/lichess/errors'
import { POLL, REVALIDATE } from '@/lib/wcc/config'

import {
  _resetRateLimitForTests,
  fetchRoundJson,
  fetchRoundPgn,
  fetchTour,
  lichessFetch,
} from '../server'

const TOUR_ID = 'qfkdt8mn'
const ROUND_ID = 'L3j03TZq'

const fetchMock = vi.fn<typeof fetch>()

vi.stubGlobal('fetch', fetchMock)

const urlOf = (call = 0): string => String(fetchMock.mock.calls[call][0])
const initOf = (call = 0): RequestInit => fetchMock.mock.calls[call][1] as RequestInit
const headersOf = (call = 0): Record<string, string> => initOf(call).headers as Record<string, string>

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

/** Resolves to the error a request rejected with, failing if it resolved. */
const rejection = async (promise: Promise<unknown>): Promise<LichessError> => {
  try {
    await promise
  } catch (error) {
    return error as LichessError
  }
  throw new Error('expected the Lichess request to reject')
}

beforeEach(() => {
  fetchMock.mockReset()
  _resetRateLimitForTests()
  vi.stubEnv('LICHESS_API_TOKEN', undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('lichessFetch', () => {
  it('asks Lichess for the path with the opt-in cache settings Next needs', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await lichessFetch('/api/broadcast/anything', { revalidate: 12, tags: ['wcc:test'] })

    expect(urlOf()).toBe('https://lichess.org/api/broadcast/anything')
    expect(initOf().cache).toBe('force-cache')
    expect(initOf().next).toEqual({ revalidate: 12, tags: ['wcc:test'] })
    expect(headersOf()['Accept']).toBe('application/json')
    expect(headersOf()['User-Agent']).toBe('pawnstaar-wcc/1.0 (+https://www.pawnstaar.com)')
  })

  it('sends no authorization header when no token is configured', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await lichessFetch('/api/broadcast/anything', { revalidate: 12 })

    expect(headersOf()['Authorization']).toBeUndefined()
  })

  it('sends a bearer token when one is configured', async () => {
    vi.stubEnv('LICHESS_API_TOKEN', 'lip_secret')
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await lichessFetch('/api/broadcast/anything', { revalidate: 12 })

    expect(headersOf()['Authorization']).toBe('Bearer lip_secret')
  })

  it('sends no authorization header for an empty token', async () => {
    vi.stubEnv('LICHESS_API_TOKEN', '')
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await lichessFetch('/api/broadcast/anything', { revalidate: 12 })

    expect(headersOf()['Authorization']).toBeUndefined()
  })

  it('throws a rate-limit error carrying the Retry-After seconds', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '30' } }))

    const error = await rejection(lichessFetch('/api/broadcast/anything', { revalidate: 12 }))

    expect(error).toBeInstanceOf(LichessError)
    expect(error.status).toBe(429)
    expect(error.retryAfterSec).toBe(30)
  })

  it('defaults the rate-limit window when Lichess sends no Retry-After', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }))

    const error = await rejection(lichessFetch('/api/broadcast/anything', { revalidate: 12 }))

    expect(error.retryAfterSec).toBe(POLL.rateLimitedSec)
  })

  it('short-circuits further requests while the rate-limit window is open', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '30' } }))

    await rejection(lichessFetch('/api/broadcast/anything', { revalidate: 12 }))
    const second = await rejection(lichessFetch('/api/broadcast/anything', { revalidate: 12 }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second.status).toBe(429)
    expect(second.retryAfterSec).toBeGreaterThan(0)
    expect(second.retryAfterSec).toBeLessThanOrEqual(30)
  })

  it('throws the upstream status for any other failure', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }))

    const error = await rejection(lichessFetch('/api/broadcast/anything', { revalidate: 12 }))

    expect(error).toBeInstanceOf(LichessError)
    expect(error.status).toBe(503)
    expect(error.retryAfterSec).toBeUndefined()
  })

  it('wraps a network or timeout failure as a status-zero error', async () => {
    fetchMock.mockRejectedValue(new Error('The operation was aborted due to timeout'))

    const error = await rejection(lichessFetch('/api/broadcast/anything', { revalidate: 12 }))

    expect(error).toBeInstanceOf(LichessError)
    expect(error.status).toBe(0)
    expect(error.message).toBe('The operation was aborted due to timeout')
  })
})

describe('fetchTour', () => {
  it('requests the broadcast tournament and tags it for revalidation', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ tour: { id: TOUR_ID }, rounds: [] }))

    const tour = await fetchTour(TOUR_ID)

    expect(urlOf()).toBe(`https://lichess.org/api/broadcast/${TOUR_ID}`)
    expect(initOf().next).toEqual({ revalidate: REVALIDATE.tour, tags: [`wcc:tour:${TOUR_ID}`] })
    expect(tour.tour.id).toBe(TOUR_ID)
  })
})

describe('fetchRoundJson', () => {
  it('requests the round through the id-only broadcast endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ round: { id: ROUND_ID }, tour: {}, games: [] }))

    const round = await fetchRoundJson(ROUND_ID, 5)

    expect(urlOf()).toBe(`https://lichess.org/api/broadcast/-/-/${ROUND_ID}`)
    expect(initOf().next).toEqual({ revalidate: 5, tags: [`wcc:round:${ROUND_ID}`] })
    expect(round.round.id).toBe(ROUND_ID)
  })
})

describe('fetchRoundPgn', () => {
  it('requests the pgn export with clocks and comments', async () => {
    fetchMock.mockResolvedValue(new Response('[Event "WCC"]\n\n1. e4 *', { status: 200 }))

    const pgn = await fetchRoundPgn(ROUND_ID, 5)

    expect(urlOf()).toBe(
      `https://lichess.org/api/broadcast/round/${ROUND_ID}.pgn?clocks=true&comments=true`,
    )
    expect(headersOf()['Accept']).toBe('application/x-chess-pgn')
    expect(initOf().next).toEqual({ revalidate: 5, tags: [`wcc:round:${ROUND_ID}:pgn`] })
    expect(pgn).toBe('[Event "WCC"]\n\n1. e4 *')
  })
})
