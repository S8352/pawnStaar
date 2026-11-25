import { describe, expect, it } from 'vitest'

import { parseGameParam } from '@/lib/wcc/game-param'

describe('parseGameParam', () => {
  it('reads a game number', () => {
    expect(parseGameParam('game-1')).toEqual({ kind: 'game', number: 1 })
    expect(parseGameParam('game-14')).toEqual({ kind: 'game', number: 14 })
  })

  it('reads the tiebreaks segment', () => {
    expect(parseGameParam('tiebreaks')).toEqual({ kind: 'tiebreaks' })
  })

  it('refuses a game number no round can answer to', () => {
    expect(parseGameParam('game-0')).toBeNull()
    expect(parseGameParam('game-99999999999999999999')).toBeNull()
  })

  it('refuses anything that is not one of the two shapes', () => {
    for (const segment of [
      '',
      'game',
      'game-',
      'game-1a',
      'Game-1',
      'game-1/../../etc',
      'tiebreak',
      'Tiebreaks',
      '1',
      'game--1',
      'game-1 ',
    ]) {
      expect(parseGameParam(segment), segment).toBeNull()
    }
  })

  it('accepts a game number far past the schedule, for the round lookup to refuse', () => {
    expect(parseGameParam('game-99')).toEqual({ kind: 'game', number: 99 })
  })
})
