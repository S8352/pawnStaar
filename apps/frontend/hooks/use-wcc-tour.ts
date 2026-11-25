'use client'

/**
 * The broadcast tournament and its round list, kept current.
 *
 * Rounds change slowly — a start time moves, a round is flagged finished — so
 * this is a plain minute-scale poll of our own cached tour route, with the same
 * timer and abort discipline as the round hook: self-rescheduling timeouts,
 * nothing running behind a hidden tab.
 */
import { useCallback, useEffect, useState } from 'react'

import { fetchTourSnapshot } from '@/lib/wcc/client'
import type { LichessRoundSummary, LichessTour, TourSnapshot } from '@/types/wcc'

const DEFAULT_POLL_MS = 60_000

export function useWccTour(
  tourId: string,
  opts: { initialData: TourSnapshot; pollMs?: number },
): { tour: LichessTour; rounds: LichessRoundSummary[]; fetchedAt: number; refresh(): void } {
  const { initialData, pollMs = DEFAULT_POLL_MS } = opts

  const [snapshot, setSnapshot] = useState(initialData)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)

    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [refresh])

  useEffect(() => {
    if (document.hidden) return

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const later = (): void => {
      timer = setTimeout(() => void run(), pollMs)
    }

    const run = async (): Promise<void> => {
      timer = undefined

      try {
        const next = await fetchTourSnapshot(tourId, controller.signal)
        if (!stopped) setSnapshot(next)
      } catch {
        // Keep the round list we already have and ask again next interval.
      }

      if (!stopped) later()
    }

    // The snapshot rendered on the server is fresh, so the first refetch waits a
    // whole interval; a refresh, a reconnect or a tab coming back asks at once.
    if (tick === 0) later()
    else void run()

    return () => {
      stopped = true
      controller.abort()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [pollMs, tick, tourId])

  return {
    tour: snapshot.tour,
    rounds: snapshot.rounds,
    fetchedAt: snapshot.fetchedAt,
    refresh,
  }
}
