/**
 * Browser client for this app's own `/api/wcc/*` routes.
 *
 * The routes already normalise every upstream failure into
 * `{ error, retryAfterSec? }`, so this layer only has to turn that body back
 * into something the round state machine can branch on.
 *
 * Browser-safe: relative URLs and the global `fetch`, nothing server-only.
 */
import type { RoundSnapshot, TourSnapshot } from '@/types/wcc'

/** A non-OK answer from one of our own routes. */
export class WccApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public retryAfterSec?: number,
  ) {
    super(`wcc api ${status}: ${code}`)
    this.name = 'WccApiError'
  }
}

interface ErrorBody {
  error?: unknown
  retryAfterSec?: unknown
}

const errorFrom = async (res: Response): Promise<WccApiError> => {
  const body: ErrorBody | null = await res.json().catch(() => null)
  const code = typeof body?.error === 'string' ? body.error : 'unknown'
  const retryAfterSec = typeof body?.retryAfterSec === 'number' ? body.retryAfterSec : undefined

  return new WccApiError(res.status, code, retryAfterSec)
}

const getJson = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  const res = await fetch(path, { signal, headers: { Accept: 'application/json' } })

  if (!res.ok) throw await errorFrom(res)

  return (await res.json()) as T
}

/** One round's merged games and lifecycle state. */
export function fetchRoundSnapshot(roundId: string, signal?: AbortSignal): Promise<RoundSnapshot> {
  return getJson<RoundSnapshot>(`/api/wcc/round/${roundId}`, signal)
}

/** The broadcast tournament and its round list. */
export function fetchTourSnapshot(tourId: string, signal?: AbortSignal): Promise<TourSnapshot> {
  return getJson<TourSnapshot>(`/api/wcc/tour/${tourId}`, signal)
}
