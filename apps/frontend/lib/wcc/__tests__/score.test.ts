import { describe, expect, it } from 'vitest'

import type { GameResult, WccGame } from '@/types/wcc'

import { matchScore } from '../score'

const GUKESH = 46616543
const SINDAROV = 14205483

interface Side {
  name: string
  tagFideId?: string
  jsonFideId?: number
  fed?: string
}

const player = (side: Side) => ({
  name: side.name,
  ...(side.jsonFideId === undefined ? {} : { fideId: side.jsonFideId }),
  ...(side.fed === undefined ? {} : { fed: side.fed }),
})

const game = (
  white: Side,
  black: Side,
  status: GameResult,
): Pick<WccGame, 'tags' | 'players' | 'status'> => ({
  tags: {
    White: white.name,
    Black: black.name,
    ...(white.tagFideId === undefined ? {} : { WhiteFideId: white.tagFideId }),
    ...(black.tagFideId === undefined ? {} : { BlackFideId: black.tagFideId }),
  },
  players: [player(white), player(black)],
  status,
})

const gukesh = (name: string): Side => ({ name, tagFideId: String(GUKESH) })
const sindarov = (name: string): Side => ({ name, tagFideId: String(SINDAROV) })

describe('matchScore', () => {
  it('keys players by fide id across three different spellings of the same name', () => {
    const scores = matchScore([
      game(gukesh('Gukesh D'), sindarov('Sindarov, Javokhir'), '1-0'),
      game(sindarov('Sindarov J'), gukesh('Dommaraju, Gukesh'), '0-1'),
      game(gukesh('Gukesh Dommaraju'), sindarov('Javokhir Sindarov'), '1/2-1/2'),
    ])

    expect(scores).toEqual([
      {
        fideId: GUKESH,
        displayName: 'Gukesh Dommaraju',
        fed: 'IND',
        points: 2.5,
        wins: 2,
        draws: 1,
        losses: 0,
      },
      {
        fideId: SINDAROV,
        displayName: 'Javokhir Sindarov',
        fed: 'UZB',
        points: 0.5,
        wins: 0,
        draws: 1,
        losses: 2,
      },
    ])
  })

  it('ignores games that are still in progress', () => {
    const scores = matchScore([
      game(gukesh('Gukesh D'), sindarov('Sindarov, Javokhir'), '1-0'),
      game(sindarov('Sindarov, Javokhir'), gukesh('Gukesh D'), '*'),
    ])

    expect(scores.map((entry) => [entry.points, entry.wins, entry.draws, entry.losses])).toEqual([
      [1, 1, 0, 0],
      [0, 0, 0, 1],
    ])
  })

  it('falls back to the round json fide id when the pgn tag is missing', () => {
    const scores = matchScore([
      game(
        { name: 'Gukesh D', jsonFideId: GUKESH },
        { name: 'Sindarov, Javokhir', jsonFideId: SINDAROV },
        '1/2-1/2',
      ),
    ])

    expect(scores.map((entry) => entry.fideId)).toEqual([GUKESH, SINDAROV])
    expect(scores.every((entry) => entry.points === 0.5)).toBe(true)
  })

  it('skips a side that has no fide id anywhere', () => {
    const scores = matchScore([game(gukesh('Gukesh D'), { name: 'Unknown Challenger' }, '1-0')])

    expect(scores).toEqual([
      {
        fideId: GUKESH,
        displayName: 'Gukesh Dommaraju',
        fed: 'IND',
        points: 1,
        wins: 1,
        draws: 0,
        losses: 0,
      },
    ])
  })

  it('names unknown players from the tags and orders them after the championship players', () => {
    const scores = matchScore([
      game(
        { name: 'Praggnanandhaa R', tagFideId: '25059530', fed: 'IND' },
        gukesh('Gukesh D'),
        '1-0',
      ),
    ])

    expect(scores.map((entry) => [entry.fideId, entry.displayName, entry.fed])).toEqual([
      [GUKESH, 'Gukesh Dommaraju', 'IND'],
      [25059530, 'Praggnanandhaa R', 'IND'],
    ])
  })

  it('has no entries for an empty round', () => {
    expect(matchScore([])).toEqual([])
  })
})
