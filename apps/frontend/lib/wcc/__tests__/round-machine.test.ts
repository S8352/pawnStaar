import { describe, expect, it } from 'vitest'

import { BACKOFF_MS, POLL } from '@/lib/wcc/config'
import { START_FEN } from '@/lib/wcc/fen'
import type { ParsedGame, Ply, RoundSnapshot, WccGame, WccTransport } from '@/types/wcc'

import {
  initialRoundMachine,
  isRoundGone,
  isStartDue,
  nextDelayMs,
  reduceRound,
  type RoundMachineState,
} from '../round-machine'

const AT = 1_700_000_000_000

const ply = (n: number): Ply => ({ ply: n, san: 'e4', uci: `uci-${n}`, fen: `fen-${n}` })

const plies = (count: number): Ply[] => Array.from({ length: count }, (_, i) => ply(i + 1))

const game = (id: string | null, overrides: Partial<WccGame> = {}): WccGame => ({
  id,
  tags: { White: 'Gukesh D', Black: 'Sindarov, Javokhir' },
  initialFen: START_FEN,
  plies: [],
  result: '*',
  issues: [],
  pgn: '',
  players: [
    { name: 'Gukesh D', rating: 2787 },
    { name: 'Sindarov, Javokhir', rating: 2709 },
  ],
  status: '*',
  currentFen: START_FEN,
  ...overrides,
})

const parsed = (id: string | null, overrides: Partial<ParsedGame> = {}): ParsedGame => ({
  id,
  tags: { White: 'Gukesh D', Black: 'Sindarov, Javokhir' },
  initialFen: START_FEN,
  plies: [],
  result: '*',
  issues: [],
  pgn: '[White "Gukesh D"]',
  ...overrides,
})

const snapshot = (overrides: Partial<RoundSnapshot> = {}): RoundSnapshot => ({
  round: { id: 'L3j03TZq', name: 'Game 2', slug: 'game-2', url: 'https://lichess.org/r/L3j03TZq' },
  tour: {
    id: 'qfkdt8mn',
    name: 'FIDE World Chess Championship 2026',
    slug: 'fide-wcc-2026',
    url: 'https://lichess.org/broadcast/fide-wcc-2026/qfkdt8mn',
  },
  state: 'live',
  games: [game('aaaaaaaa')],
  version: 'v1',
  fetchedAt: AT,
  pollAfterMs: POLL.liveMs,
  ...overrides,
})

/** A machine that has taken a live snapshot and is about to connect. */
const started = (
  overrides: Partial<RoundSnapshot> = {},
  transport: WccTransport = 'stream',
): RoundMachineState =>
  reduceRound(initialRoundMachine(), {
    type: 'init',
    snapshot: snapshot(overrides),
    transport,
    now: AT,
  })

/** Applies `count` drops in a row. */
const dropped = (state: RoundMachineState, count: number): RoundMachineState =>
  Array.from({ length: count }).reduce<RoundMachineState>(
    (acc) => reduceRound(acc, { type: 'drop', now: AT }),
    state,
  )

/** Applies `count` tour-poll failures in a row. */
const tourFailed = (
  state: RoundMachineState,
  count: number,
  status = 502,
  code = 'lichess_unavailable',
): RoundMachineState =>
  Array.from({ length: count }).reduce<RoundMachineState>(
    (acc) => reduceRound(acc, { type: 'tour-failure', status, code }),
    state,
  )

describe('initialRoundMachine', () => {
  it('starts idle on the stream transport with nothing observed', () => {
    expect(initialRoundMachine()).toEqual({
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
    })
  })
})

describe('reduceRound: init', () => {
  it('seeds lastMoveObservedAt from the snapshot fetch time', () => {
    const state = started({ games: [game('aaaaaaaa'), game('bbbbbbbb')] })

    expect(state.lastMoveObservedAt).toEqual({ aaaaaaaa: AT, bbbbbbbb: AT })
  })

  it('keys nothing for a game the PGN gave no id', () => {
    const state = started({ games: [game(null)] })

    expect(state.lastMoveObservedAt).toEqual({})
  })

  it('takes the games, the version and the fetch time off the snapshot', () => {
    const games = [game('aaaaaaaa', { plies: plies(4) })]

    const state = started({ games, version: 'v9' })

    expect(state.games).toEqual(games)
    expect(state.version).toBe('v9')
    expect(state.lastUpdatedAt).toBe(AT)
  })

  it('treats a live round as connecting', () => {
    expect(started({ state: 'live' }).status).toBe('connecting')
  })

  it('maps an upcoming round to upcoming', () => {
    expect(started({ state: 'upcoming' }).status).toBe('upcoming')
  })

  it('maps a finished round to finished', () => {
    expect(started({ state: 'finished' }).status).toBe('finished')
  })

  it('dates the round from the snapshot fetch, not from the clock', () => {
    const state = reduceRound(initialRoundMachine(), {
      type: 'init',
      snapshot: snapshot({ fetchedAt: AT - 20_000 }),
      transport: 'stream',
      now: AT,
    })

    expect(state.lastUpdatedAt).toBe(AT - 20_000)
    expect(state.lastMoveObservedAt).toEqual({ aaaaaaaa: AT - 20_000 })
  })

  it('takes the transport it is given', () => {
    expect(started({}, 'poll').transport).toBe('poll')
  })
})

describe('reduceRound: game', () => {
  it('bumps lastMoveObservedAt when the ply count grows', () => {
    const state = started({ games: [game('aaaaaaaa', { plies: plies(10) })] })

    const next = reduceRound(state, {
      type: 'game',
      game: parsed('aaaaaaaa', { plies: plies(11) }),
      now: AT + 5000,
    })

    expect(next.lastMoveObservedAt.aaaaaaaa).toBe(AT + 5000)
  })

  it('leaves lastMoveObservedAt alone when the ply count is unchanged', () => {
    const state = started({ games: [game('aaaaaaaa', { plies: plies(10) })] })

    const next = reduceRound(state, {
      type: 'game',
      game: parsed('aaaaaaaa', { plies: plies(10) }),
      now: AT + 5000,
    })

    expect(next.lastMoveObservedAt.aaaaaaaa).toBe(AT)
  })

  it('replaces the game it matches and keeps its players', () => {
    const state = started({ games: [game('aaaaaaaa'), game('bbbbbbbb')] })

    const next = reduceRound(state, {
      type: 'game',
      game: parsed('bbbbbbbb', { plies: plies(2), result: '1-0' }),
      now: AT + 1,
    })

    expect(next.games).toHaveLength(2)
    expect(next.games[1].id).toBe('bbbbbbbb')
    expect(next.games[1].plies).toHaveLength(2)
    expect(next.games[1].status).toBe('1-0')
    expect(next.games[1].players).toEqual(state.games[1].players)
    expect(next.games[0]).toBe(state.games[0])
  })

  it('appends a game it has never seen', () => {
    const state = started({ games: [game('aaaaaaaa')] })

    const next = reduceRound(state, {
      type: 'game',
      game: parsed('cccccccc', { plies: plies(1) }),
      now: AT + 1,
    })

    expect(next.games.map((g) => g.id)).toEqual(['aaaaaaaa', 'cccccccc'])
    expect(next.lastMoveObservedAt.cccccccc).toBe(AT + 1)
  })

  it('goes live and clears the failure ladder', () => {
    const state = dropped(started(), 2)

    const next = reduceRound(state, { type: 'game', game: parsed('aaaaaaaa'), now: AT + 1 })

    expect(next.status).toBe('live')
    expect(next.consecutiveFailures).toBe(0)
    expect(next.backoffIndex).toBe(0)
    expect(next.lastUpdatedAt).toBe(AT + 1)
  })

  it('stays live once every game is decided', () => {
    const state = started({ games: [game('aaaaaaaa')] })

    const next = reduceRound(state, {
      type: 'game',
      game: parsed('aaaaaaaa', { plies: plies(60), result: '1/2-1/2' }),
      now: AT + 1,
    })

    expect(next.status).toBe('live')
  })

  it('rolls the board back when the frame is shorter than the one on screen', () => {
    // An arbiter correcting the board sends a game with fewer plies than the
    // last frame. Every frame is a complete replacement, so the shorter game
    // wins — but losing moves is not observing a move.
    const state = started({ games: [game('aaaaaaaa', { plies: plies(10) })] })

    const next = reduceRound(state, {
      type: 'game',
      game: parsed('aaaaaaaa', { plies: plies(8) }),
      now: AT + 5000,
    })

    expect(next.games[0].plies).toHaveLength(8)
    expect(next.games[0].currentFen).toBe('fen-8')
    expect(next.lastMoveObservedAt.aaaaaaaa).toBe(AT)
    expect(next.status).toBe('live')
    expect(next.lastUpdatedAt).toBe(AT + 5000)
  })
})

describe('reduceRound: snapshot', () => {
  it('keeps the games it already has when the version is unchanged', () => {
    const state = started({ games: [game('aaaaaaaa', { plies: plies(4) })] })

    const next = reduceRound(state, {
      type: 'snapshot',
      snapshot: snapshot({ games: [game('aaaaaaaa', { plies: plies(9) })], version: 'v1' }),
      now: AT + 5000,
    })

    expect(next.lastUpdatedAt).toBe(AT + 5000)
    expect(next.games).toBe(state.games)
    expect(next.version).toBe('v1')
    expect(next.lastMoveObservedAt).toEqual({ aaaaaaaa: AT })
  })

  it('still recomputes the status when the version is unchanged', () => {
    // A classical game thinks for minutes at a time, so poll after poll comes
    // back on the same version. If that path skipped the status the machine
    // would sit on `connecting` for the rest of the game, and `nextDelayMs`
    // would never schedule another poll.
    const next = reduceRound(started(), {
      type: 'snapshot',
      snapshot: snapshot({ state: 'live', version: 'v1' }),
      now: AT + 5000,
    })

    expect(next.status).toBe('live')
  })

  it('reports a round that finished without its PGN changing', () => {
    // The last move is already in the PGN when Lichess flips the round to
    // finished, so the version this arrives on is the one already on screen.
    const next = reduceRound(started(), {
      type: 'snapshot',
      snapshot: snapshot({ state: 'finished', version: 'v1' }),
      now: AT + 5000,
    })

    expect(next.status).toBe('finished')
    expect(next.version).toBe('v1')
  })

  it('does not call an unchanged version a move', () => {
    const state = started({ games: [game('aaaaaaaa', { plies: plies(4) })] })

    const next = reduceRound(state, {
      type: 'snapshot',
      snapshot: snapshot({ state: 'finished', version: 'v1' }),
      now: AT + 5000,
    })

    expect(next.lastMoveObservedAt).toEqual({ aaaaaaaa: AT })
  })

  it('replaces the games and bumps the ones that grew', () => {
    const state = started({
      games: [game('aaaaaaaa', { plies: plies(4) }), game('bbbbbbbb', { plies: plies(7) })],
    })

    const fresh = [game('aaaaaaaa', { plies: plies(5) }), game('bbbbbbbb', { plies: plies(7) })]
    const next = reduceRound(state, {
      type: 'snapshot',
      snapshot: snapshot({ games: fresh, version: 'v2' }),
      now: AT + 5000,
    })

    expect(next.games).toEqual(fresh)
    expect(next.version).toBe('v2')
    expect(next.lastMoveObservedAt).toEqual({ aaaaaaaa: AT + 5000, bbbbbbbb: AT })
  })

  it('goes live rather than connecting for a live round', () => {
    const next = reduceRound(started(), {
      type: 'snapshot',
      snapshot: snapshot({ state: 'live', version: 'v2' }),
      now: AT + 1,
    })

    expect(next.status).toBe('live')
  })

  it('reports a finished round as finished', () => {
    const next = reduceRound(started(), {
      type: 'snapshot',
      snapshot: snapshot({ state: 'finished', version: 'v2' }),
      now: AT + 1,
    })

    expect(next.status).toBe('finished')
  })

  it('clears the failure ladder, the rate limit and the error', () => {
    const state = reduceRound(dropped(started({}, 'poll'), 2), {
      type: 'failure',
      status: 500,
      code: 'upstream',
      now: AT,
    })

    const next = reduceRound(state, {
      type: 'snapshot',
      snapshot: snapshot({ version: 'v2' }),
      now: AT + 1,
    })

    expect(next.consecutiveFailures).toBe(0)
    expect(next.backoffIndex).toBe(0)
    expect(next.error).toBeNull()
    expect(next.retryUntil).toBeNull()
  })
})

describe('reduceRound: the round summary', () => {
  it('takes the summary off the initial snapshot', () => {
    expect(started().round).toEqual(snapshot().round)
  })

  it('takes the fresh summary off a poll that brought new moves', () => {
    const round = { ...snapshot().round, ongoing: true, startsAt: AT - 60_000 }

    const next = reduceRound(started(), {
      type: 'snapshot',
      snapshot: snapshot({ round, version: 'v2' }),
      now: AT + 1,
    })

    expect(next.round).toEqual(round)
  })

  it('takes the fresh summary off a poll on the version already on screen', () => {
    // The games did not change but the round around them did: this is how a
    // finished round first announces itself to a polling client.
    const round = { ...snapshot().round, finished: true, finishedAt: AT + 1 }

    const next = reduceRound(started(), {
      type: 'snapshot',
      snapshot: snapshot({ round, state: 'finished', version: 'v1' }),
      now: AT + 1,
    })

    expect(next.round).toEqual(round)
  })
})

describe('reduceRound: connected', () => {
  it('goes live and clears the failure ladder', () => {
    const next = reduceRound(dropped(started(), 2), { type: 'connected' })

    expect(next.status).toBe('live')
    expect(next.consecutiveFailures).toBe(0)
    expect(next.backoffIndex).toBe(0)
    expect(next.retryUntil).toBeNull()
  })
})

describe('reduceRound: connecting', () => {
  it('reports connecting', () => {
    const next = reduceRound(dropped(started(), 1), { type: 'connecting' })

    expect(next.status).toBe('connecting')
    expect(next.backoffIndex).toBe(0)
  })

  it('is a no-op when it is already connecting', () => {
    const state = started()

    expect(reduceRound(state, { type: 'connecting' })).toBe(state)
  })
})

describe('reduceRound: drop', () => {
  it('reconnects on the first rung of the ladder', () => {
    const next = dropped(started(), 1)

    expect(next.status).toBe('reconnecting')
    expect(next.consecutiveFailures).toBe(1)
    expect(next.backoffIndex).toBe(0)
    expect(nextDelayMs(next, AT, () => 0.5)).toBe(BACKOFF_MS[0])
  })

  it('climbs one rung per drop', () => {
    expect(dropped(started(), 2).backoffIndex).toBe(1)
    expect(dropped(started(), 3).backoffIndex).toBe(2)
    expect(dropped(started(), 4).backoffIndex).toBe(3)
  })

  it('stays on the last rung once the ladder runs out', () => {
    const next = dropped(started(), 9)

    expect(next.backoffIndex).toBe(BACKOFF_MS.length - 1)
    expect(nextDelayMs(next, AT, () => 0.5)).toBe(BACKOFF_MS[BACKOFF_MS.length - 1])
  })

  it('gives up on the stream after three failures and polls instead', () => {
    expect(dropped(started(), 2).transport).toBe('stream')
    expect(dropped(started(), POLL.streamFailuresBeforePoll).transport).toBe('poll')
  })

  it('leaves a polling machine polling', () => {
    expect(dropped(started({}, 'poll'), 4).transport).toBe('poll')
  })
})

describe('reduceRound: rate-limited', () => {
  it('holds off until the window passes and switches to polling', () => {
    const next = reduceRound(started(), { type: 'rate-limited', retryAfterSec: 30, now: AT })

    expect(next.status).toBe('reconnecting')
    expect(next.transport).toBe('poll')
    expect(next.retryUntil).toBe(AT + 30_000)
    expect(nextDelayMs(next, AT + 5_000)).toBe(25_000)
  })

  it('falls back to the ladder once the window has passed', () => {
    const next = reduceRound(started(), { type: 'rate-limited', retryAfterSec: 30, now: AT })

    expect(nextDelayMs(next, AT + 30_000, () => 0.5)).toBe(BACKOFF_MS[0])
  })

  it('spends the window on the attempt that dropped', () => {
    // The attempt the window was waiting for has now been made and failed, so
    // the window is gone: leaving it set would show a countdown that never
    // counts and re-render once a second for the life of the page.
    const limited = reduceRound(started(), { type: 'rate-limited', retryAfterSec: 30, now: AT })

    const next = reduceRound(limited, { type: 'drop', now: AT + 30_000 })

    expect(next.retryUntil).toBeNull()
    expect(nextDelayMs(next, AT + 30_000, () => 0.5)).toBe(BACKOFF_MS[0])
  })

  it('spends the window on the attempt that failed', () => {
    const limited = reduceRound(started({}, 'poll'), {
      type: 'rate-limited',
      retryAfterSec: 30,
      now: AT,
    })

    const next = reduceRound(limited, {
      type: 'failure',
      status: 502,
      code: 'lichess_unavailable',
      now: AT + 30_000,
    })

    expect(next.retryUntil).toBeNull()
  })
})

describe('reduceRound: failure', () => {
  it('records the error and reconnects', () => {
    const next = reduceRound(started({}, 'poll'), {
      type: 'failure',
      status: 502,
      code: 'lichess_unavailable',
      now: AT,
    })

    expect(next.status).toBe('reconnecting')
    expect(next.error).toEqual({ status: 502, code: 'lichess_unavailable' })
    expect(next.consecutiveFailures).toBe(1)
  })

  it('reports an error after five failures in a row but keeps retrying', () => {
    const state = Array.from({ length: 5 }).reduce<RoundMachineState>(
      (acc) => reduceRound(acc, { type: 'failure', status: 502, code: 'upstream', now: AT }),
      started({}, 'poll'),
    )

    expect(state.status).toBe('error')
    expect(state.consecutiveFailures).toBe(5)
    expect(nextDelayMs(state, AT, () => 0.5)).toBe(BACKOFF_MS[BACKOFF_MS.length - 1])
  })

  it('gives up immediately on a round that does not exist', () => {
    const next = reduceRound(started({}, 'poll'), {
      type: 'failure',
      status: 404,
      code: 'not_found',
      now: AT,
    })

    expect(next.status).toBe('error')
    expect(next.error).toEqual({ status: 404, code: 'not_found' })
    expect(nextDelayMs(next, AT)).toBeNull()
  })
})

describe('reduceRound: round-state', () => {
  it('finishes the round', () => {
    expect(reduceRound(started(), { type: 'round-state', state: 'finished' }).status).toBe(
      'finished',
    )
  })

  it('connects an upcoming round once it goes live', () => {
    const state = started({ state: 'upcoming' })

    expect(reduceRound(state, { type: 'round-state', state: 'live' }).status).toBe('connecting')
  })

  it('does not interrupt a live stream', () => {
    const state = reduceRound(started(), { type: 'connected' })

    expect(reduceRound(state, { type: 'round-state', state: 'live' })).toBe(state)
  })

  it('reports a round that is still upcoming', () => {
    const state = started({ state: 'upcoming' })

    expect(reduceRound(state, { type: 'round-state', state: 'upcoming' }).status).toBe('upcoming')
  })

  it('stops the retry countdown when the round ends', () => {
    const limited = reduceRound(started(), { type: 'rate-limited', retryAfterSec: 30, now: AT })

    const next = reduceRound(limited, { type: 'round-state', state: 'finished' })

    expect(next.status).toBe('finished')
    expect(next.retryUntil).toBeNull()
    expect(nextDelayMs(next, AT)).toBeNull()
  })
})

describe('reduceRound: tour-failure', () => {
  it('says nothing about a single tour hiccup', () => {
    const next = tourFailed(started({ state: 'upcoming' }), 1)

    expect(next.status).toBe('upcoming')
    expect(next.error).toBeNull()
  })

  it('surfaces an error once the tour keeps failing', () => {
    const next = tourFailed(started({ state: 'upcoming' }), 3)

    expect(next.error).toEqual({ status: 502, code: 'lichess_unavailable' })
  })

  it('does not open a stream on a round that has not started', () => {
    const next = tourFailed(started({ state: 'upcoming' }), 5)

    expect(next.status).toBe('upcoming')
    expect(nextDelayMs(next, AT)).toBe(POLL.upcomingMs)
  })

  it('leaves the round backoff ladder and the transport alone', () => {
    const next = tourFailed(started({ state: 'upcoming' }), 4)

    expect(next.consecutiveFailures).toBe(0)
    expect(next.backoffIndex).toBe(0)
    expect(next.transport).toBe('stream')
    expect(next.retryUntil).toBeNull()
  })

  it('keeps asking even when the tour route itself is gone', () => {
    // A 404 is final for the round route, which has nothing else to say. The
    // tour route is only how an upcoming round hears that it started, and the
    // start time is knowable without it.
    const next = tourFailed(started({ state: 'upcoming' }), 3, 404, 'not_found')

    expect(isRoundGone(next)).toBe(false)
    expect(nextDelayMs(next, AT)).toBe(POLL.upcomingMs)
  })

  it('forgets the failures once the tour answers again', () => {
    const failing = tourFailed(started({ state: 'upcoming' }), 3)

    const next = reduceRound(failing, { type: 'round-state', state: 'upcoming' })

    expect(next.tourFailures).toBe(0)
    expect(next.error).toBeNull()
  })
})

describe('isRoundGone', () => {
  it('is true once the round route says the round does not exist', () => {
    const next = reduceRound(started({}, 'poll'), {
      type: 'failure',
      status: 404,
      code: 'not_found',
      now: AT,
    })

    expect(isRoundGone(next)).toBe(true)
  })

  it('is false while the round is merely reconnecting', () => {
    expect(isRoundGone(dropped(started(), 2))).toBe(false)
  })
})

describe('isStartDue', () => {
  it('is false for a round with no announced start', () => {
    expect(isStartDue(started().round, AT)).toBe(false)
  })

  it('is false well before the announced start', () => {
    const round = { ...snapshot().round, startsAt: AT + POLL.streamOpenBeforeStartMs + 1000 }

    expect(isStartDue(round, AT)).toBe(false)
  })

  it('is true inside the stream-open window', () => {
    const round = { ...snapshot().round, startsAt: AT + POLL.streamOpenBeforeStartMs }

    expect(isStartDue(round, AT)).toBe(true)
  })

  it('is false when there is no round summary at all', () => {
    expect(isStartDue(null, AT)).toBe(false)
  })
})

describe('nextDelayMs', () => {
  it('waits for nothing once the round is finished', () => {
    expect(nextDelayMs(started({ state: 'finished' }), AT)).toBeNull()
  })

  it('waits the upcoming interval before asking the tour again', () => {
    expect(nextDelayMs(started({ state: 'upcoming' }), AT)).toBe(POLL.upcomingMs)
  })

  it('waits the live interval between polls', () => {
    const state = reduceRound(started({}, 'poll'), {
      type: 'snapshot',
      snapshot: snapshot({ version: 'v2' }),
      now: AT,
    })

    expect(nextDelayMs(state, AT)).toBe(POLL.liveMs)
  })

  it('leaves the waiting to the stream itself', () => {
    expect(nextDelayMs(started(), AT)).toBeNull()
    expect(nextDelayMs(reduceRound(started(), { type: 'connected' }), AT)).toBeNull()
  })

  it('keeps a poll loop alive whatever status it is in', () => {
    // A poll loop that stops is a board that stops. Nothing but a finished or
    // missing round may return null here, or one unanticipated status silently
    // ends the broadcast.
    expect(nextDelayMs(started({}, 'poll'), AT)).toBe(POLL.liveMs)
    expect(nextDelayMs({ ...started({}, 'poll'), status: 'idle' }, AT)).toBe(POLL.liveMs)
  })

  it('jitters the backoff by a fifth either way', () => {
    const state = dropped(started(), 1)

    expect(nextDelayMs(state, AT, () => 0)).toBe(BACKOFF_MS[0] * 0.8)
    expect(nextDelayMs(state, AT, () => 1)).toBe(BACKOFF_MS[0] * 1.2)
  })

  it('does nothing at all while the machine is idle', () => {
    expect(nextDelayMs(initialRoundMachine(), AT)).toBeNull()
  })
})

describe('the poll loop over a classical game', () => {
  /** Polls `count` times, each answering on the version already on screen. */
  const polled = (
    state: RoundMachineState,
    count: number,
    overrides: Partial<RoundSnapshot> = {},
  ): RoundMachineState =>
    Array.from({ length: count }).reduce<RoundMachineState>(
      (acc, _, i) =>
        reduceRound(acc, {
          type: 'snapshot',
          snapshot: snapshot({ version: acc.version ?? 'v1', ...overrides }),
          now: AT + (i + 1) * POLL.liveMs,
        }),
      state,
    )

  it('keeps asking across a long think', () => {
    // Observed on the live route: four consecutive responses carrying an
    // identical version while the players thought. Every one of them has to
    // leave a next poll scheduled.
    let state = started({}, 'poll')

    for (let i = 1; i <= 4; i += 1) {
      state = polled(state, 1)
      expect(nextDelayMs(state, AT + i * POLL.liveMs)).toBe(POLL.liveMs)
    }

    expect(state.status).toBe('live')
  })

  it('stops the moment the round is over, PGN unchanged or not', () => {
    const state = polled(started({}, 'poll'), 4)

    const over = reduceRound(state, {
      type: 'snapshot',
      snapshot: snapshot({ state: 'finished', version: 'v1' }),
      now: AT + 5 * POLL.liveMs,
    })

    expect(over.status).toBe('finished')
    expect(nextDelayMs(over, AT + 5 * POLL.liveMs)).toBeNull()
  })
})
