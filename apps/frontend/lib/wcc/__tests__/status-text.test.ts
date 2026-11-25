import { describe, expect, it } from 'vitest'

import { statusText, type StatusTextInput } from '@/lib/wcc/status-text'

const base: StatusTextInput = {
  roundState: 'live',
  connection: 'live',
  transport: 'stream',
  retryInSec: null,
  error: null,
  now: 1_000_000,
}

const text = (over: Partial<StatusTextInput>) => statusText({ ...base, ...over })

describe('statusText', () => {
  it('counts down to an upcoming round', () => {
    expect(
      text({ roundState: 'upcoming', connection: 'upcoming', startsAt: 1_000_000 + 3_725_000 }),
    ).toMatchObject({ text: 'Upcoming · starts in 1h 2m 05s' })
  })

  it('omits the remaining time until the browser has a clock', () => {
    expect(
      text({ roundState: 'upcoming', connection: 'upcoming', startsAt: 2_000_000, now: null }),
    ).toMatchObject({ text: 'Upcoming' })
  })

  it('omits the remaining time when no start was announced', () => {
    expect(text({ roundState: 'upcoming', connection: 'upcoming' })).toMatchObject({
      text: 'Upcoming',
    })
  })

  it('reports a finished round with its result and length', () => {
    expect(
      text({
        roundState: 'finished',
        connection: 'finished',
        result: '1/2-1/2',
        moveCount: 38,
      }),
    ).toMatchObject({ text: 'Finished · ½-½ in 38 moves', showRetry: false })
  })

  it('still reports a finished round whose result never arrived', () => {
    expect(text({ roundState: 'finished', connection: 'finished' })).toMatchObject({
      text: 'Finished',
    })
    expect(text({ roundState: 'finished', connection: 'finished', result: '*' })).toMatchObject({
      text: 'Finished',
    })
  })

  it('drops the move count when there is none', () => {
    expect(
      text({ roundState: 'finished', connection: 'finished', result: '1-0', moveCount: 0 }),
    ).toMatchObject({ text: 'Finished · 1-0' })
  })

  it('says a live round is being played', () => {
    const live = text({})
    expect(live.text).toBe('Playing now')
    expect(live.suffix).toBeUndefined()
  })

  it('appends the connection state while the transport is coming up', () => {
    expect(text({ connection: 'connecting' })).toMatchObject({
      suffix: 'connecting…',
      suffixTone: 'muted',
    })
    expect(text({ connection: 'reconnecting' })).toMatchObject({
      suffix: 'reconnecting…',
      suffixTone: 'warning',
    })
  })

  it('prefers the rate-limit countdown over the reconnect wording', () => {
    expect(text({ connection: 'reconnecting', retryInSec: 42 })).toMatchObject({
      text: 'Playing now',
      suffix: 'Lichess is busy, retrying in 42 s',
      suffixTone: 'warning',
    })
  })

  it('offers a retry when the transport has given up, whatever the round was doing', () => {
    for (const roundState of ['upcoming', 'live', 'finished'] as const) {
      expect(
        text({ roundState, connection: 'error', error: { status: 503, code: 'upstream' } }),
      ).toMatchObject({
        text: 'Could not reach Lichess.',
        suffix: 'error 503',
        showRetry: true,
      })
    }
  })

  it('notes the polling fallback except on a round with nothing left to poll', () => {
    expect(text({ transport: 'poll' }).polling).toBe(true)
    expect(text({ transport: 'poll', roundState: 'upcoming', connection: 'upcoming' }).polling).toBe(
      true,
    )
    expect(
      text({ transport: 'poll', roundState: 'finished', connection: 'finished' }).polling,
    ).toBe(false)
  })
})
