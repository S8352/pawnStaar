import { describe, expect, it } from 'vitest'

import { gameHref, tiebreaksHref, wccHref, withPly, yearHref } from '../routes'

describe('wcc route helpers', () => {
  it('links the hub', () => {
    expect(wccHref()).toBe('/wcc')
  })

  it('links a match year', () => {
    expect(yearHref(2026)).toBe('/wcc/2026')
  })

  it('links a game within a year', () => {
    expect(gameHref(2026, 7)).toBe('/wcc/2026/game-7')
  })

  it('links the tiebreaks of a year', () => {
    expect(tiebreaksHref(2026)).toBe('/wcc/2026/tiebreaks')
  })
})

describe('withPly', () => {
  it('appends the ply to a bare path', () => {
    expect(withPly(gameHref(2026, 7), 24)).toBe('/wcc/2026/game-7?ply=24')
  })

  it('appends the starting position', () => {
    expect(withPly('/wcc/2026/game-7', 0)).toBe('/wcc/2026/game-7?ply=0')
  })

  it('joins onto a path that already carries a query', () => {
    expect(withPly('/wcc/2026/game-7?utm_source=x', 24)).toBe(
      '/wcc/2026/game-7?utm_source=x&ply=24',
    )
  })
})
