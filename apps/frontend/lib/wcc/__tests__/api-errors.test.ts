import { describe, expect, it } from 'vitest'

import { LichessError } from '@/lib/lichess/errors'
import { POLL } from '@/lib/wcc/config'

import { notFoundResponse, toErrorResponse } from '../api-errors'

describe('toErrorResponse', () => {
  it('passes a rate limit through with its Retry-After window', async () => {
    const res = toErrorResponse(new LichessError(429, 30))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=55')
    expect(await res.json()).toEqual({ error: 'lichess_rate_limited', retryAfterSec: 30 })
  })

  it('falls back to the configured window for a rate limit with no seconds', async () => {
    const res = toErrorResponse(new LichessError(429))

    expect(res.headers.get('Retry-After')).toBe(String(POLL.rateLimitedSec))
    expect(await res.json()).toEqual({
      error: 'lichess_rate_limited',
      retryAfterSec: POLL.rateLimitedSec,
    })
  })

  it('passes an upstream 404 through as a cacheable not found', async () => {
    const res = toErrorResponse(new LichessError(404))

    expect(res.status).toBe(404)
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60')
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('reports an unauthorized upstream as a bad gateway', async () => {
    const res = toErrorResponse(new LichessError(401))

    expect(res.status).toBe(502)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ error: 'lichess_auth' })
  })

  it('reports a forbidden upstream as a bad gateway', async () => {
    const res = toErrorResponse(new LichessError(403))

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'lichess_auth' })
  })

  it('reports any other upstream failure as unavailable', async () => {
    const res = toErrorResponse(new LichessError(503))

    expect(res.status).toBe(502)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ error: 'lichess_unavailable' })
  })

  it('reports a non-Lichess error as unavailable too', async () => {
    const res = toErrorResponse(new TypeError('boom'))

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'lichess_unavailable' })
  })

  it('answers with json', () => {
    expect(toErrorResponse(new LichessError(503)).headers.get('Content-Type')).toBe(
      'application/json',
    )
  })
})

describe('notFoundResponse', () => {
  it('is a long-lived cacheable 404', async () => {
    const res = notFoundResponse()

    expect(res.status).toBe(404)
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600')
    expect(await res.json()).toEqual({ error: 'not_found' })
  })
})
