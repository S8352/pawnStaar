import { describe, expect, it } from 'vitest'

import { WCC_PLAYERS } from '@/lib/wcc/config'
import {
  formatPoints,
  matchHeaderPlayers,
  ratingFor,
  surnameOf,
} from '@/lib/wcc/match-presentation'
import type { PlayerScore } from '@/lib/wcc/score'
import type { WccGame } from '@/types/wcc'

const GUKESH = WCC_PLAYERS[0].fideId
const SINDAROV = WCC_PLAYERS[1].fideId

/** Game 1: Sindarov had White. Game 2: Gukesh had White. */
const game1 = {
  players: [
    { name: 'Sindarov, Javokhir', rating: 2782, fideId: SINDAROV, fed: 'UZB' },
    { name: 'Gukesh D', rating: 2710, fideId: GUKESH, fed: 'IND' },
  ],
  tags: {
    White: 'Sindarov, Javokhir',
    Black: 'Gukesh D',
    WhiteFideId: String(SINDAROV),
    BlackFideId: String(GUKESH),
    WhiteElo: '2782',
    BlackElo: '2710',
  },
} satisfies Pick<WccGame, 'players' | 'tags'>

const score = (fideId: number, points: number): PlayerScore => ({
  fideId,
  displayName: 'ignored',
  points,
  wins: 0,
  draws: 0,
  losses: 0,
})

describe('formatPoints', () => {
  it('prints half points', () => {
    expect(formatPoints(0)).toBe('0.0')
    expect(formatPoints(0.5)).toBe('0.5')
    expect(formatPoints(7)).toBe('7.0')
  })
})

describe('surnameOf', () => {
  it('takes the last word', () => {
    expect(surnameOf('Gukesh Dommaraju')).toBe('Dommaraju')
    expect(surnameOf('Javokhir Sindarov')).toBe('Sindarov')
  })

  it('takes the leading name of a comma-first spelling', () => {
    expect(surnameOf('Sindarov, Javokhir')).toBe('Sindarov')
  })

  it('survives odd input', () => {
    expect(surnameOf('')).toBe('')
    expect(surnameOf('  Carlsen  ')).toBe('Carlsen')
    expect(surnameOf(', Javokhir')).toBe('Javokhir')
  })
})

describe('ratingFor', () => {
  it('finds a rating whichever colour the player had', () => {
    expect(ratingFor(game1, GUKESH)).toBe(2710)
    expect(ratingFor(game1, SINDAROV)).toBe(2782)
  })

  it('falls back to the PGN Elo tag when the round JSON has no rating', () => {
    const noRatings = {
      players: [{ name: 'Sindarov, Javokhir' }, { name: 'Gukesh D' }],
      tags: game1.tags,
    } satisfies Pick<WccGame, 'players' | 'tags'>

    expect(ratingFor(noRatings, GUKESH)).toBe(2710)
  })

  it('has nothing to report without a game, or for a player not in it', () => {
    expect(ratingFor(undefined, GUKESH)).toBeUndefined()
    expect(ratingFor(game1, 1)).toBeUndefined()
  })
})

describe('matchHeaderPlayers', () => {
  it('shows both players on nought before any game is decided', () => {
    const rows = matchHeaderPlayers([])

    expect(rows.map((r) => [r.displayName, r.points])).toEqual([
      ['Gukesh Dommaraju', 0],
      ['Javokhir Sindarov', 0],
    ])
  })

  it('keeps the published order whatever order the score arrives in', () => {
    const rows = matchHeaderPlayers([score(SINDAROV, 0.5), score(GUKESH, 0.5)])

    expect(rows.map((r) => r.fideId)).toEqual([GUKESH, SINDAROV])
    expect(rows.map((r) => r.points)).toEqual([0.5, 0.5])
  })

  it('carries the federation and the surname of each published player', () => {
    const rows = matchHeaderPlayers([], game1)

    expect(rows[0]).toMatchObject({ fed: 'IND', surname: 'Dommaraju', rating: 2710 })
    expect(rows[1]).toMatchObject({ fed: 'UZB', surname: 'Sindarov', rating: 2782 })
  })

  it('appends a scored player the published line-up does not list', () => {
    const rows = matchHeaderPlayers([
      { fideId: 1503014, displayName: 'Carlsen, Magnus', points: 1, wins: 1, draws: 0, losses: 0 },
    ])

    expect(rows).toHaveLength(3)
    expect(rows[2]).toMatchObject({ displayName: 'Carlsen, Magnus', surname: 'Carlsen', points: 1 })
  })
})
