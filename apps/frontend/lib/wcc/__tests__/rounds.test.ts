import { describe, expect, it, vi } from 'vitest'

import type { LichessRoundSummary, TourSnapshot } from '@/types/wcc'

import { gameNumberOf, pickCurrentRound, resolveGameRound, tiebreakRounds } from '../rounds'

vi.mock('@/lib/wcc/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wcc/config')>()
  return {
    ...actual,
    ROUND_OVERRIDES: {
      oddname1: { gameNumber: 14 },
      tiebrk01: { tiebreak: true },
    } satisfies typeof actual.ROUND_OVERRIDES,
  }
})

const NOW = 1_770_000_000_000

const round = (overrides: Partial<LichessRoundSummary> = {}): LichessRoundSummary => ({
  id: 'L3j03TZq',
  name: 'Game 1',
  slug: 'game-1',
  url: 'https://lichess.org/broadcast/wcc/game-1/L3j03TZq',
  ...overrides,
})

const snapshot = (rounds: LichessRoundSummary[]): TourSnapshot => ({
  tour: {
    id: 'qfkdt8mn',
    name: 'FIDE World Chess Championship 2026',
    slug: 'fide-world-chess-championship-2026',
    url: 'https://lichess.org/broadcast/fide-world-chess-championship-2026/qfkdt8mn',
  },
  rounds,
  fetchedAt: NOW,
})

describe('gameNumberOf', () => {
  it('reads the game number out of the round name', () => {
    expect(gameNumberOf(round({ name: 'Game 7' }))).toBe(7)
  })

  it('has no game number for a round that is not named Game N', () => {
    expect(gameNumberOf(round({ name: 'Tiebreak 1' }))).toBeUndefined()
  })

  it('prefers an explicit override over the round name', () => {
    expect(gameNumberOf(round({ id: 'oddname1', name: 'Opening ceremony' }))).toBe(14)
  })
})

describe('resolveGameRound', () => {
  it('finds the round for a game number', () => {
    const tour = snapshot([round({ id: 'aaaaaaaa', name: 'Game 1' }), round({ id: 'bbbbbbbb', name: 'Game 2' })])

    expect(resolveGameRound(tour, 2)?.id).toBe('bbbbbbbb')
  })

  it('returns nothing for a game number that is not broadcast', () => {
    expect(resolveGameRound(snapshot([round({ name: 'Game 1' })]), 9)).toBeUndefined()
  })
})

describe('tiebreakRounds', () => {
  it('picks up a round named Tiebreak 1', () => {
    const tour = snapshot([round({ id: 'aaaaaaaa', name: 'Game 1' }), round({ id: 'bbbbbbbb', name: 'Tiebreak 1' })])

    expect(tiebreakRounds(tour).map((entry) => entry.id)).toEqual(['bbbbbbbb'])
  })

  it('picks up a round flagged as a tiebreak by an override', () => {
    const tour = snapshot([round({ id: 'tiebrk01', name: 'Game 15' }), round({ id: 'aaaaaaaa', name: 'Game 1' })])

    expect(tiebreakRounds(tour).map((entry) => entry.id)).toEqual(['tiebrk01'])
  })

  it('leaves out a round whose game number comes from an override', () => {
    const tour = snapshot([round({ id: 'oddname1', name: 'Opening ceremony' })])

    expect(tiebreakRounds(tour)).toEqual([])
  })
})

describe('pickCurrentRound', () => {
  it('prefers the round Lichess reports as ongoing', () => {
    const tour = snapshot([
      round({ id: 'aaaaaaaa', finished: true }),
      round({ id: 'bbbbbbbb', ongoing: true }),
      round({ id: 'cccccccc', startsAt: NOW + 10_000 }),
    ])

    expect(pickCurrentRound(tour, NOW)?.id).toBe('bbbbbbbb')
  })

  it('falls back to the earliest unfinished round that is still to start', () => {
    const tour = snapshot([
      round({ id: 'aaaaaaaa', startsAt: NOW + 90_000 }),
      round({ id: 'bbbbbbbb', startsAt: NOW + 30_000 }),
      round({ id: 'cccccccc', startsAt: NOW - 30_000, finished: true }),
    ])

    expect(pickCurrentRound(tour, NOW)?.id).toBe('bbbbbbbb')
  })

  it('falls back to the last finished round when the tournament is over', () => {
    const tour = snapshot([
      round({ id: 'aaaaaaaa', finished: true }),
      round({ id: 'bbbbbbbb', finishedAt: NOW - 1000 }),
    ])

    expect(pickCurrentRound(tour, NOW)?.id).toBe('bbbbbbbb')
  })

  it('falls back to the first round when nothing is flagged at all', () => {
    const tour = snapshot([round({ id: 'aaaaaaaa' }), round({ id: 'bbbbbbbb' })])

    expect(pickCurrentRound(tour, NOW)?.id).toBe('aaaaaaaa')
  })

  it('returns nothing for a tournament with no rounds', () => {
    expect(pickCurrentRound(snapshot([]), NOW)).toBeUndefined()
  })
})
