import { describe, expect, it } from 'vitest'

import { mergeMatchGames } from '@/lib/wcc/match-games'
import { matchScore } from '@/lib/wcc/score'
import type { GameResult, WccGame } from '@/types/wcc'

const GUKESH = 46616543
const SINDAROV = 14205483

/** Only the fields `mergeMatchGames` and `matchScore` read. */
const game = (
  id: string | null,
  status: GameResult,
  whiteFideId = GUKESH,
  blackFideId = SINDAROV,
): WccGame =>
  ({
    id,
    status,
    tags: { WhiteFideId: String(whiteFideId), BlackFideId: String(blackFideId) },
    players: [{ name: 'White', fideId: whiteFideId }, { name: 'Black', fideId: blackFideId }],
    plies: [],
  }) as unknown as WccGame

describe('mergeMatchGames', () => {
  it('keeps one entry per game id', () => {
    const merged = mergeMatchGames([game('a', '1-0'), game('b', '0-1')], [game('a', '1-0')])

    expect(merged.map((g) => g.id)).toEqual(['a', 'b'])
  })

  it('lets the later list supersede an earlier copy in place', () => {
    const merged = mergeMatchGames(
      [game('a', '*'), game('b', '0-1')],
      [game('a', '1/2-1/2')],
    )

    expect(merged.map((g) => [g.id, g.status])).toEqual([
      ['a', '1/2-1/2'],
      ['b', '0-1'],
    ])
  })

  it('keeps games that carry no id, since they cannot be matched', () => {
    const merged = mergeMatchGames([game(null, '1-0')], [game(null, '0-1')])

    expect(merged.map((g) => g.status)).toEqual(['1-0', '0-1'])
  })

  it('accepts any number of lists, including none', () => {
    expect(mergeMatchGames()).toEqual([])
    expect(mergeMatchGames([], [game('a', '*')], []).map((g) => g.id)).toEqual(['a'])
  })

  it('does not double-count a round that arrives from both the server and the poll', () => {
    const finished = [game('g1', '1/2-1/2', SINDAROV, GUKESH)]
    const live = [game('g1', '1/2-1/2', SINDAROV, GUKESH), game('g2', '1-0')]

    const scores = matchScore(mergeMatchGames(finished, live))

    expect(scores.map((s) => [s.fideId, s.points])).toEqual([
      [GUKESH, 1.5],
      [SINDAROV, 0.5],
    ])
  })
})
