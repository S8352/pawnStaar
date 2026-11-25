/**
 * The round connection as a pure state machine.
 *
 * Everything the live hub has to decide while a round is on air — whether to
 * stream or poll, how long to wait before trying again, when a game last
 * actually moved, when to stop trying altogether — is decided here rather than
 * inside a React effect, so it can be tested without a browser. The hooks in
 * `hooks/use-wcc-round.ts` only wire transports and timers to it.
 *
 * Pure and browser-safe: no React, no timers, no clock of its own. Every event
 * that cares about time carries the `now` it happened at.
 */
import { BACKOFF_MS, POLL } from '@/lib/wcc/config'
import type {
  LichessRoundSummary,
  ParsedGame,
  RoundConnectionStatus,
  RoundSnapshot,
  RoundState,
  WccGame,
  WccTransport,
} from '@/types/wcc'

import { mergeParsedIntoGame } from './merge-live'

/** Consecutive poll failures before the round is reported as broken. */
const FAILURES_BEFORE_ERROR = 5

/**
 * Consecutive tour-poll failures before an upcoming round admits it is blind.
 * At `POLL.upcomingMs` apiece this is a few minutes of hearing nothing.
 */
const TOUR_FAILURES_BEFORE_ERROR = 3

/** Fraction of the backoff the jitter may add or subtract. */
const JITTER = 0.2

export interface RoundMachineState {
  status: RoundConnectionStatus
  transport: WccTransport
  /** The freshest round summary seen, so `startsAt` and `ongoing` stay current. */
  round: LichessRoundSummary | null
  games: WccGame[]
  version: string | null
  consecutiveFailures: number
  /** Consecutive failures of the tour poll, which is a different loop. */
  tourFailures: number
  backoffIndex: number
  /** Epoch ms the rate limit expires at, while one is in force. */
  retryUntil: number | null
  lastUpdatedAt: number | null
  lastMoveObservedAt: Record<string, number>
  error: { status: number; code: string } | null
}

export type RoundMachineEvent =
  | { type: 'init'; snapshot: RoundSnapshot; transport: WccTransport; now: number }
  | { type: 'connecting' }
  | { type: 'connected' }
  /** One complete game off the PGN stream. */
  | { type: 'game'; game: ParsedGame; now: number }
  /** A fresh snapshot off our own round route. */
  | { type: 'snapshot'; snapshot: RoundSnapshot; now: number }
  | { type: 'drop'; now: number }
  | { type: 'rate-limited'; retryAfterSec: number; now: number }
  | { type: 'failure'; status: number; code: string; now: number }
  /** The round's lifecycle as the tour route or a start-time timer sees it. */
  | { type: 'round-state'; state: RoundState }
  /** A tour poll that did not answer. Reported, never acted on. */
  | { type: 'tour-failure'; status: number; code: string }

export function initialRoundMachine(): RoundMachineState {
  return {
    status: 'idle',
    transport: 'stream',
    round: null,
    games: [],
    version: null,
    consecutiveFailures: 0,
    tourFailures: 0,
    backoffIndex: 0,
    retryUntil: null,
    lastUpdatedAt: null,
    lastMoveObservedAt: {},
    error: null,
  }
}

/**
 * Connection status implied by a round's lifecycle state. A live round means
 * different things to the two data paths, so the caller says what live looks
 * like: a snapshot has already arrived (`live`), a fresh init has not
 * (`connecting`).
 */
const statusFor = (state: RoundState, live: RoundConnectionStatus): RoundConnectionStatus => {
  switch (state) {
    case 'upcoming':
      return 'upcoming'
    case 'finished':
      return 'finished'
    default:
      return live
  }
}

/** Seeds every identified game's last-move time from one timestamp. */
const observedAt = (games: WccGame[], at: number): Record<string, number> => {
  const observed: Record<string, number> = {}

  for (const game of games) {
    if (game.id !== null) observed[game.id] = at
  }

  return observed
}

const plyCount = (game: WccGame | undefined): number => game?.plies.length ?? 0

/** What a round-trip that worked clears: the retry ladder and the last error. */
const recovered = {
  consecutiveFailures: 0,
  tourFailures: 0,
  backoffIndex: 0,
  retryUntil: null,
  error: null,
} as const

/**
 * Books one failed attempt and puts the machine on the next rung of the
 * backoff ladder.
 *
 * The first failure uses rung 0, so the ladder tracks the failure count rather
 * than being incremented from its own previous value.
 */
const stumble = (state: RoundMachineState): Pick<
  RoundMachineState,
  'consecutiveFailures' | 'backoffIndex' | 'transport' | 'retryUntil'
> => {
  const consecutiveFailures = state.consecutiveFailures + 1

  return {
    consecutiveFailures,
    backoffIndex: Math.min(consecutiveFailures - 1, BACKOFF_MS.length - 1),
    // The attempt the rate-limit window was holding back has now been made,
    // and failed. Leaving the window set would strand a countdown that never
    // counts down and a re-render every second for the life of the page.
    retryUntil: null,
    // A stream that keeps dying is not worth reopening: poll for the rest of
    // the session instead.
    transport:
      state.transport === 'stream' && consecutiveFailures >= POLL.streamFailuresBeforePoll
        ? 'poll'
        : state.transport,
  }
}

export function reduceRound(
  state: RoundMachineState,
  event: RoundMachineEvent,
): RoundMachineState {
  switch (event.type) {
    case 'init': {
      const { snapshot, transport } = event

      // The snapshot was fetched on the server, possibly some seconds ago, so
      // it dates itself: `fetchedAt`, not the clock this event was built with.
      return {
        ...initialRoundMachine(),
        status: statusFor(snapshot.state, 'connecting'),
        transport,
        round: snapshot.round,
        games: snapshot.games,
        version: snapshot.version,
        lastUpdatedAt: snapshot.fetchedAt,
        lastMoveObservedAt: observedAt(snapshot.games, snapshot.fetchedAt),
      }
    }

    case 'connecting':
      return state.status === 'connecting' ? state : { ...state, status: 'connecting' }

    case 'connected':
      return { ...state, ...recovered, status: 'live' }

    case 'game': {
      const index = state.games.findIndex((game) => game.id === event.game.id)
      const existing = index === -1 ? undefined : state.games[index]
      const merged = mergeParsedIntoGame(existing, event.game)

      const games =
        index === -1
          ? [...state.games, merged]
          : state.games.map((game, i) => (i === index ? merged : game))

      // Lichess re-sends a game's full PGN on any change — a clock tick or a
      // corrected tag as much as a move — so only a longer game is a new move.
      const moved =
        merged.id !== null && merged.plies.length > plyCount(existing) ? merged.id : null

      return {
        ...state,
        ...recovered,
        // The stream closing is what ends a round, not the last game being
        // decided, so a finished board does not change the status here.
        status: 'live',
        games,
        lastUpdatedAt: event.now,
        lastMoveObservedAt:
          moved === null
            ? state.lastMoveObservedAt
            : { ...state.lastMoveObservedAt, [moved]: event.now },
      }
    }

    case 'snapshot': {
      const { snapshot } = event

      // Same version means the same PGN, so the games on screen are already it
      // and keep their identity — but everything around them still moves. A
      // classical game thinks for minutes between moves, and the move that ends
      // a round is already in the PGN when Lichess flips the round to finished,
      // so this is the ordinary path, not the quiet one: the status and the
      // round summary are recomputed here exactly as below. Only the moves, and
      // therefore `lastMoveObservedAt`, are left alone.
      if (snapshot.version === state.version) {
        return {
          ...state,
          ...recovered,
          status: statusFor(snapshot.state, 'live'),
          round: snapshot.round,
          lastUpdatedAt: event.now,
        }
      }

      const lastMoveObservedAt = { ...state.lastMoveObservedAt }
      for (const game of snapshot.games) {
        const before = state.games.find((previous) => previous.id === game.id)
        if (game.id !== null && game.plies.length > plyCount(before)) {
          lastMoveObservedAt[game.id] = event.now
        }
      }

      return {
        ...state,
        ...recovered,
        status: statusFor(snapshot.state, 'live'),
        round: snapshot.round,
        games: snapshot.games,
        version: snapshot.version,
        lastUpdatedAt: event.now,
        lastMoveObservedAt,
      }
    }

    case 'drop':
      return { ...state, ...stumble(state), status: 'reconnecting' }

    case 'rate-limited':
      return {
        ...state,
        // Whichever path was rate limited, polling our own cached route is the
        // gentler way back in.
        transport: 'poll',
        status: 'reconnecting',
        retryUntil: event.now + event.retryAfterSec * 1000,
      }

    case 'failure': {
      const next = stumble(state)
      // A round that does not exist will not start existing: that one is final.
      const fatal = event.status === 404
      const exhausted = next.consecutiveFailures >= FAILURES_BEFORE_ERROR

      return {
        ...state,
        ...next,
        status: fatal || exhausted ? 'error' : 'reconnecting',
        error: { status: event.status, code: event.code },
      }
    }

    case 'round-state': {
      // Something answered for the round's lifecycle, so whatever the tour poll
      // was failing with is behind us. Safe to clear the error here because the
      // only path that reports through this event is the tour poll: while a
      // round is actually running it is the stream or the round poll that
      // reports, and neither dispatches `round-state`.
      const base =
        state.tourFailures === 0 && state.error === null
          ? state
          : { ...state, tourFailures: 0, error: null }

      if (event.state === 'finished') {
        // Nothing is left to attempt, so no retry window may outlive the round:
        // a stale one keeps a countdown on screen and a clock ticking behind it.
        return base.status === 'finished' && base.retryUntil === null
          ? base
          : { ...base, status: 'finished', retryUntil: null }
      }

      if (event.state === 'upcoming') {
        return base.status === 'upcoming' ? base : { ...base, status: 'upcoming' }
      }

      // A round going live only matters to a machine that was waiting for it;
      // one already streaming must not be interrupted.
      return base.status === 'upcoming' ? { ...base, status: 'connecting' } : base
    }

    case 'tour-failure': {
      const tourFailures = state.tourFailures + 1

      // One tour hiccup is not worth reporting: an upcoming round has nothing on
      // screen to spoil. A tour route that keeps failing is, because it is the
      // only thing that reports a round starting, and staying silent there is a
      // countdown running over a game already in progress.
      //
      // Reported without touching `status`, which would flip the hook's
      // lifecycle and open a stream on a round that has not started, and
      // without touching the round's own failure ladder or transport, which
      // belong to a different loop.
      return tourFailures < TOUR_FAILURES_BEFORE_ERROR
        ? { ...state, tourFailures }
        : { ...state, tourFailures, error: { status: event.status, code: event.code } }
    }

    default:
      return state
  }
}

/**
 * Whether the round itself is gone for good: our own round route answered 404
 * and the machine gave up on it.
 *
 * Deliberately narrower than "the last error was a 404". A 404 from the *tour*
 * route is a different thing entirely — that route is only how an upcoming
 * round hears that it started — and must not stop the round.
 */
export function isRoundGone(state: RoundMachineState): boolean {
  return state.status === 'error' && state.error?.status === 404
}

/**
 * Whether a round's announced start has arrived, by the local clock alone.
 *
 * The tour route is the only thing that *reports* an upcoming round going live,
 * so a caller that waits for it has handed a failing network the power to keep a
 * countdown running over a game already being played. The start time needs no
 * network.
 */
export function isStartDue(round: LichessRoundSummary | null, now: number): boolean {
  const startsAt = round?.startsAt

  return startsAt != null && startsAt - POLL.streamOpenBeforeStartMs <= now
}

/** Backoff rung, spread by ±20% so reconnects do not arrive in lockstep. */
const withJitter = (base: number, random: () => number): number =>
  Math.round(base * (1 - JITTER + 2 * JITTER * random()))

/**
 * How long to wait before the next attempt, or `null` when there is nothing to
 * wait for: the round is over, the round is gone, or an open stream is itself
 * the wait.
 */
export function nextDelayMs(
  state: RoundMachineState,
  now: number,
  random: () => number = Math.random,
): number | null {
  if (state.status === 'finished') return null
  if (isRoundGone(state)) return null

  if (state.retryUntil !== null && state.retryUntil > now) return state.retryUntil - now

  if (state.status === 'upcoming') return POLL.upcomingMs

  if (state.status === 'reconnecting' || state.status === 'error') {
    return withJitter(BACKOFF_MS[Math.min(state.backoffIndex, BACKOFF_MS.length - 1)], random)
  }

  // Deliberately not conditioned on the status. A poll loop that stops is a
  // board that stops, silently and with nothing on screen to say so, and the
  // only two statuses allowed to stop it are the ones handled above. Anything
  // else — `connecting` held over by a poll that brought no new moves, or a
  // status a later change introduces — keeps asking.
  if (state.transport === 'poll') return POLL.liveMs

  // A stream delivers on its own schedule, and a first stream is opened as soon
  // as the caller gets here.
  return null
}
