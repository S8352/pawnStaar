import { describe, expect, it } from 'vitest'

import { roundPills } from '@/lib/wcc/round-pills'
import type { GameResult, LichessRoundSummary, WccGame } from '@/types/wcc'

const round = (
  id: string,
  name: string,
  extra: Partial<LichessRoundSummary> = {},
): LichessRoundSummary => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  url: `https://lichess.org/broadcast/x/${id}`,
  ...extra,
})

const game = (status: GameResult): WccGame => ({ status }) as unknown as WccGame

describe('roundPills', () => {
  it('labels game rounds from the round name, not from their position', () => {
    const pills = roundPills({
      // Deliberately out of order: the label must track the name.
      rounds: [round('b', 'Game 2'), round('a', 'Game 1')],
      activeRoundId: 'a',
      year: 2026,
    })

    expect(pills.map((p) => [p.label, p.href])).toEqual([
      ['G2', '/wcc/2026/game-2'],
      ['G1', '/wcc/2026/game-1'],
    ])
  })

  it('marks exactly the active round', () => {
    const pills = roundPills({
      rounds: [round('a', 'Game 1'), round('b', 'Game 2')],
      activeRoundId: 'b',
      year: 2026,
    })

    expect(pills.map((p) => p.active)).toEqual([false, true])
  })

  it('reports each round state from the flags Lichess sets', () => {
    const pills = roundPills({
      rounds: [
        round('a', 'Game 1', { finished: true }),
        round('b', 'Game 2', { ongoing: true }),
        round('c', 'Game 3', { startsAt: 1_795_701_600_000 }),
      ],
      activeRoundId: 'b',
      year: 2026,
    })

    expect(pills.map((p) => p.state)).toEqual(['finished', 'ongoing', 'upcoming'])
  })

  it('treats a finishedAt with no finished flag as finished', () => {
    const [pill] = roundPills({
      rounds: [round('a', 'Game 1', { finishedAt: 1_795_542_064_354 })],
      activeRoundId: 'a',
      year: 2026,
    })

    expect(pill.state).toBe('finished')
  })

  it('shows a result glyph only for a finished round whose game is loaded', () => {
    const pills = roundPills({
      rounds: [
        round('a', 'Game 1', { finished: true }),
        round('b', 'Game 2', { finished: true }),
        round('c', 'Game 3', { finished: true }),
        round('d', 'Game 4', { finished: true }),
        round('e', 'Game 5', { ongoing: true }),
      ],
      activeRoundId: 'e',
      year: 2026,
      games: {
        a: game('1-0'),
        b: game('0-1'),
        c: game('1/2-1/2'),
        e: game('*'),
      },
    })

    expect(pills.map((p) => p.result)).toEqual(['1-0', '0-1', '½', undefined, undefined])
  })

  it('carries a start time only for an upcoming round', () => {
    const pills = roundPills({
      rounds: [
        round('a', 'Game 1', { startsAt: 1, finished: true }),
        round('b', 'Game 2', { startsAt: 2, ongoing: true }),
        round('c', 'Game 3', { startsAt: 3 }),
      ],
      activeRoundId: 'a',
      year: 2026,
    })

    expect(pills.map((p) => p.startsAt)).toEqual([undefined, undefined, 3])
  })

  it('omits the tiebreak pill when the tournament has no tiebreak round', () => {
    const pills = roundPills({
      rounds: [round('a', 'Game 1'), round('b', 'Game 2')],
      activeRoundId: 'a',
      year: 2026,
    })

    expect(pills.map((p) => p.label)).toEqual(['G1', 'G2'])
  })

  it('collapses every non-game round into one tiebreak pill', () => {
    const pills = roundPills({
      rounds: [
        round('a', 'Game 1', { finished: true }),
        round('tb1', 'Tiebreak rapid', { startsAt: 20 }),
        round('tb2', 'Tiebreak blitz', { startsAt: 10 }),
      ],
      activeRoundId: 'a',
      year: 2026,
    })

    expect(pills).toHaveLength(2)
    expect(pills[1]).toMatchObject({
      key: 'tiebreaks',
      label: 'TB',
      href: '/wcc/2026/tiebreaks',
      state: 'upcoming',
      active: false,
      startsAt: 10,
      title: 'Tiebreaks',
    })
  })

  it('calls the tiebreak pill live while any of its rounds is, and active for any of them', () => {
    const [, tb] = roundPills({
      rounds: [
        round('a', 'Game 1', { finished: true }),
        round('tb1', 'Tiebreak rapid', { finished: true }),
        round('tb2', 'Tiebreak blitz', { ongoing: true }),
      ],
      activeRoundId: 'tb2',
      year: 2026,
    })

    expect(tb.state).toBe('ongoing')
    expect(tb.active).toBe(true)
  })

  it('calls the tiebreak pill finished only once all of its rounds are', () => {
    const [tb] = roundPills({
      rounds: [round('tb1', 'Tiebreak rapid', { finished: true }), round('tb2', 'Tiebreak blitz')],
      activeRoundId: 'tb1',
      year: 2026,
    })

    expect(tb.state).toBe('upcoming')
  })
})
