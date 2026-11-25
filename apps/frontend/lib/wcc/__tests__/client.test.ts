import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RoundSnapshot, TourSnapshot } from '@/types/wcc'

import { fetchRoundSnapshot, fetchTourSnapshot, WccApiError } from '../client'

const stubFetch = (response: Response): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const json = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRoundSnapshot', () => {
  it('returns the snapshot our own route answered with', async () => {
    const snapshot = { version: 'deadbeef', games: [] } as unknown as RoundSnapshot
    const fetchMock = stubFetch(json(snapshot))

    await expect(fetchRoundSnapshot('L3j03TZq')).resolves.toEqual(snapshot)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/wcc/round/L3j03TZq')
  })

  it('forwards the abort signal', async () => {
    const fetchMock = stubFetch(json({}))
    const controller = new AbortController()

    await fetchRoundSnapshot('L3j03TZq', controller.signal)

    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBe(controller.signal)
  })

  it('maps a rate limit to a WccApiError carrying the retry window', async () => {
    stubFetch(
      json({ error: 'lichess_rate_limited', retryAfterSec: 60 }, { status: 429 }),
    )

    const error = await fetchRoundSnapshot('L3j03TZq').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(WccApiError)
    expect(error).toMatchObject({
      status: 429,
      code: 'lichess_rate_limited',
      retryAfterSec: 60,
    })
  })

  it('maps a not found to a WccApiError with no retry window', async () => {
    stubFetch(json({ error: 'not_found' }, { status: 404 }))

    const error = (await fetchRoundSnapshot('L3j03TZq').catch((err: unknown) => err)) as WccApiError

    expect(error.status).toBe(404)
    expect(error.code).toBe('not_found')
    expect(error.retryAfterSec).toBeUndefined()
  })

  it('maps an unreachable upstream to a WccApiError', async () => {
    stubFetch(json({ error: 'lichess_unavailable' }, { status: 502 }))

    const error = (await fetchRoundSnapshot('L3j03TZq').catch((err: unknown) => err)) as WccApiError

    expect(error.status).toBe(502)
    expect(error.code).toBe('lichess_unavailable')
  })

  it('falls back to an unknown code when the error body is not json', async () => {
    stubFetch(new Response('<html>502</html>', { status: 502 }))

    const error = (await fetchRoundSnapshot('L3j03TZq').catch((err: unknown) => err)) as WccApiError

    expect(error).toBeInstanceOf(WccApiError)
    expect(error.status).toBe(502)
    expect(error.code).toBe('unknown')
  })

  it('is an Error with a readable message', async () => {
    stubFetch(json({ error: 'not_found' }, { status: 404 }))

    const error = (await fetchRoundSnapshot('L3j03TZq').catch((err: unknown) => err)) as WccApiError

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('WccApiError')
    expect(error.message).toContain('not_found')
  })
})

describe('fetchTourSnapshot', () => {
  it('returns the tournament our own route answered with', async () => {
    const snapshot = { rounds: [], fetchedAt: 1 } as unknown as TourSnapshot
    const fetchMock = stubFetch(json(snapshot))

    await expect(fetchTourSnapshot('qfkdt8mn')).resolves.toEqual(snapshot)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/wcc/tour/qfkdt8mn')
  })

  it('maps a failure the same way', async () => {
    stubFetch(json({ error: 'not_found' }, { status: 404 }))

    await expect(fetchTourSnapshot('qfkdt8mn')).rejects.toBeInstanceOf(WccApiError)
  })
})
