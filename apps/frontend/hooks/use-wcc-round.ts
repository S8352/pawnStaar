'use client'

/**
 * Live view of one broadcast round.
 *
 * The decisions all live in `lib/wcc/round-machine.ts`; this hook is the wiring
 * around it. One effect owns the whole lifecycle — the PGN stream, the poll
 * fallback, the tour poll that waits for an upcoming round to start — so there
 * is exactly one place where a transport is opened and exactly one place where
 * it is torn down.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import { useNow } from '@/hooks/use-now'
import { WccApiError, fetchRoundSnapshot, fetchTourSnapshot } from '@/lib/wcc/client'
import { POLL } from '@/lib/wcc/config'
import {
  initialRoundMachine,
  nextDelayMs,
  reduceRound,
  type RoundMachineEvent,
  type RoundMachineState,
} from '@/lib/wcc/round-machine'
import { isRoundFinished } from '@/lib/wcc/round-state'
import { openRoundStream, type RoundStream } from '@/lib/wcc/stream'
import type {
  LichessRoundSummary,
  RoundConnectionStatus,
  RoundSnapshot,
  RoundState,
  WccGame,
  WccTransport,
} from '@/types/wcc'

export interface UseWccRoundOptions {
  initialData: RoundSnapshot
  tourId: string
  transport?: WccTransport
}

export interface UseWccRoundResult {
  round: LichessRoundSummary
  tour: RoundSnapshot['tour']
  games: WccGame[]
  state: RoundState
  status: RoundConnectionStatus
  transport: WccTransport
  error: RoundMachineState['error']
  /** Seconds left of a rate-limit window, for a countdown. */
  retryInSec: number | null
  lastUpdatedAt: number | null
  lastMoveObservedAt: Record<string, number>
  refresh(): void
}

/** What this deployment streams with unless the caller overrides it. */
const configuredTransport = (): WccTransport =>
  process.env.NEXT_PUBLIC_WCC_TRANSPORT === 'poll' ? 'poll' : 'stream'

/** Which transport, if any, the effect should be running right now. */
type Lifecycle = 'off' | 'upcoming' | 'round'

const lifecycleOf = (state: RoundMachineState): Lifecycle => {
  // A finished round has nothing left to say, and a round that 404s never will.
  if (state.status === 'finished' || state.error?.status === 404) return 'off'
  if (state.status === 'upcoming') return 'upcoming'

  return 'round'
}

/**
 * Whether the next attempt owes a wait before it may be made. A fresh effect
 * run otherwise acts at once: it only starts because something external said so
 * — a mount, a tab coming back, the network returning, a manual refresh.
 */
const owesWait = (state: RoundMachineState, now: number): boolean =>
  state.status === 'reconnecting' ||
  state.status === 'error' ||
  (state.retryUntil !== null && state.retryUntil > now)

/** The round's lifecycle as the tour's round list reports it. */
const roundStateOf = (round: LichessRoundSummary, now: number): RoundState => {
  if (isRoundFinished(round)) return 'finished'
  if (round.ongoing === true) return 'live'

  // Open the stream a little before the announced start: the first moves
  // sometimes beat the `ongoing` flag.
  if (round.startsAt !== undefined && round.startsAt - POLL.streamOpenBeforeStartMs <= now) {
    return 'live'
  }

  return 'upcoming'
}

export function useWccRound({
  initialData,
  tourId,
  transport,
}: UseWccRoundOptions): UseWccRoundResult {
  const roundId = initialData.round.id

  const [machine, dispatch] = useReducer(reduceRound, null, () =>
    reduceRound(initialRoundMachine(), {
      type: 'init',
      snapshot: initialData,
      transport: transport ?? configuredTransport(),
      // The snapshot dates itself, so initialising from it is hydration-safe.
      now: initialData.fetchedAt,
    }),
  )

  const latest = useRef(machine)
  useEffect(() => {
    latest.current = machine
  })

  /**
   * Dispatches and advances the local mirror in one step, so a handler that has
   * to schedule the next attempt can read the state its own event produced
   * rather than the one React has not committed yet. Sound because
   * `reduceRound` is pure: React arrives at exactly the same state.
   */
  const apply = useCallback((event: RoundMachineEvent): void => {
    latest.current = reduceRound(latest.current, event)
    dispatch(event)
  }, [])

  // Bumped to re-run the lifecycle effect: a manual refresh, a tab coming back,
  // the network returning.
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

  const lifecycle = lifecycleOf(machine)
  const mode = machine.transport

  useEffect(() => {
    // A hidden tab holds no stream and runs no timers; `visibilitychange`
    // brings this effect straight back.
    if (lifecycle === 'off' || document.hidden) return

    const controller = new AbortController()
    let stream: RoundStream | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const scheduleNext = (): void => {
      if (stopped) return

      const delay = nextDelayMs(latest.current, Date.now())
      if (delay === null) return

      timer = setTimeout(attempt, Math.max(0, delay))
    }

    const pollRound = async (): Promise<void> => {
      try {
        const snapshot = await fetchRoundSnapshot(roundId, controller.signal)
        if (!stopped) apply({ type: 'snapshot', snapshot, now: Date.now() })
      } catch (error) {
        if (stopped || controller.signal.aborted) return

        const now = Date.now()
        if (error instanceof WccApiError && error.status === 429) {
          apply({
            type: 'rate-limited',
            retryAfterSec: error.retryAfterSec ?? POLL.rateLimitedSec,
            now,
          })
        } else if (error instanceof WccApiError) {
          apply({ type: 'failure', status: error.status, code: error.code, now })
        } else {
          // No response at all: offline, DNS, a dropped connection.
          apply({ type: 'failure', status: 0, code: 'network', now })
        }
      }

      scheduleNext()
    }

    const pollTour = async (): Promise<void> => {
      try {
        const { rounds } = await fetchTourSnapshot(tourId, controller.signal)
        const summary = rounds.find((round) => round.id === roundId)

        if (!stopped && summary !== undefined) {
          apply({ type: 'round-state', state: roundStateOf(summary, Date.now()) })
        }
      } catch {
        // An upcoming round has nothing on screen to spoil, so a tour hiccup is
        // not worth reporting as a round error: ask again next interval.
      }

      scheduleNext()
    }

    const attempt = (): void => {
      timer = undefined
      if (stopped) return

      if (lifecycle === 'upcoming') {
        void pollTour()
        return
      }

      if (mode === 'poll') {
        void pollRound()
        return
      }

      stream = openRoundStream(roundId, {
        onConnect: () => {
          if (!stopped) apply({ type: 'connected' })
        },
        onGame: (game) => {
          if (!stopped) apply({ type: 'game', game, now: Date.now() })
        },
        onDrop: () => {
          if (stopped) return
          apply({ type: 'drop', now: Date.now() })
          scheduleNext()
        },
        onRateLimited: (retryAfterSec) => {
          if (stopped) return
          apply({ type: 'rate-limited', retryAfterSec, now: Date.now() })
          scheduleNext()
        },
      })
    }

    if (owesWait(latest.current, Date.now())) scheduleNext()
    else attempt()

    return () => {
      stopped = true
      controller.abort()
      stream?.close()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [apply, lifecycle, mode, roundId, tourId, tick])

  const now = useNow(machine.retryUntil === null ? null : 1000)
  const retryInSec =
    machine.retryUntil === null || now === null
      ? null
      : Math.max(0, Math.ceil((machine.retryUntil - now) / 1000))

  const state: RoundState =
    machine.status === 'finished' ? 'finished' : machine.status === 'upcoming' ? 'upcoming' : 'live'

  return {
    round: initialData.round,
    tour: initialData.tour,
    games: machine.games,
    state,
    status: machine.status,
    transport: machine.transport,
    error: machine.error,
    retryInSec,
    lastUpdatedAt: machine.lastUpdatedAt,
    lastMoveObservedAt: machine.lastMoveObservedAt,
    refresh,
  }
}
