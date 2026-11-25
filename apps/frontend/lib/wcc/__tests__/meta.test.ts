import { describe, expect, it } from 'vitest'

import { gameParamLabel, matchPageDescription, matchPageTitle } from '@/lib/wcc/meta'

const BASE = 'Live moves, clocks and evaluation from Lichess Broadcasts.'

describe('gameParamLabel', () => {
  it('names both segment shapes', () => {
    expect(gameParamLabel({ kind: 'game', number: 7 })).toBe('Game 7')
    expect(gameParamLabel({ kind: 'tiebreaks' })).toBe('Tiebreaks')
  })
})

describe('matchPageTitle', () => {
  it('names the game, the players and the match', () => {
    expect(matchPageTitle({ kind: 'game', number: 2 })).toBe(
      'Game 2 · Gukesh Dommaraju vs Javokhir Sindarov · WCC 2026',
    )
  })

  it('names the tiebreak day', () => {
    expect(matchPageTitle({ kind: 'tiebreaks' })).toBe(
      'Tiebreaks · Gukesh Dommaraju vs Javokhir Sindarov · WCC 2026',
    )
  })

  it('still produces a title when the fetch behind it failed', () => {
    expect(matchPageTitle()).toBe('Live · Gukesh Dommaraju vs Javokhir Sindarov · WCC 2026')
  })
})

describe('matchPageDescription', () => {
  it('is the base sentence when nothing is known', () => {
    expect(matchPageDescription()).toBe(BASE)
    expect(matchPageDescription({})).toBe(BASE)
    expect(matchPageDescription({ result: '*' })).toBe(BASE)
  })

  it('adds the result of a finished game', () => {
    expect(matchPageDescription({ result: '1/2-1/2', moveCount: 38 })).toBe(
      `${BASE} Finished ½-½ in 38 moves.`,
    )
    expect(matchPageDescription({ result: '1-0' })).toBe(`${BASE} Finished 1-0.`)
  })

  it('adds the venue start time of a game not yet played, in the venue zone', () => {
    // 2026-11-11T18:00:00Z is 19:00 in Europe/Zurich.
    expect(matchPageDescription({ startsAt: Date.UTC(2026, 10, 11, 18, 0) })).toBe(
      `${BASE} Starts 11 Nov, 19:00 at the venue.`,
    )
  })

  it('prefers the result over the start time', () => {
    expect(
      matchPageDescription({ result: '0-1', moveCount: 41, startsAt: Date.UTC(2026, 10, 11, 18) }),
    ).toBe(`${BASE} Finished 0-1 in 41 moves.`)
  })
})
