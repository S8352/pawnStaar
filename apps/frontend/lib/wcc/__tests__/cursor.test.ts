import { describe, expect, it } from 'vitest'

import {
  cursorFirst,
  cursorLast,
  cursorNext,
  cursorPly,
  cursorPrev,
  cursorTo,
  initialCursor,
  isFollowingLive,
} from '../cursor'

describe('cursorPly', () => {
  it('follows the live ply while unpinned', () => {
    expect(cursorPly({ pinnedPly: null }, 24)).toBe(24)
  })

  it('reports the pinned ply while pinned', () => {
    expect(cursorPly({ pinnedPly: 7 }, 24)).toBe(7)
  })

  it('clamps a pinned ply above the ply count', () => {
    expect(cursorPly({ pinnedPly: 99 }, 24)).toBe(24)
  })

  it('clamps a negative pinned ply to the starting position', () => {
    expect(cursorPly({ pinnedPly: -3 }, 24)).toBe(0)
  })
})

describe('isFollowingLive', () => {
  it('is true while unpinned', () => {
    expect(isFollowingLive({ pinnedPly: null })).toBe(true)
  })

  it('is false while pinned, even on the last ply', () => {
    expect(isFollowingLive({ pinnedPly: 24 })).toBe(false)
  })
})

describe('cursor navigation', () => {
  it('pins the starting position', () => {
    expect(cursorFirst()).toEqual({ pinnedPly: 0 })
  })

  it('unpins on last', () => {
    expect(cursorLast()).toEqual({ pinnedPly: null })
  })

  it('steps back from live to the ply before it', () => {
    expect(cursorPrev({ pinnedPly: null }, 24)).toEqual({ pinnedPly: 23 })
  })

  it('does not step back past the starting position', () => {
    expect(cursorPrev({ pinnedPly: 0 }, 24)).toEqual({ pinnedPly: 0 })
  })

  it('steps forward while pinned', () => {
    expect(cursorNext({ pinnedPly: 7 }, 24)).toEqual({ pinnedPly: 8 })
  })

  it('unpins when stepping forward reaches the live ply', () => {
    expect(cursorNext({ pinnedPly: 23 }, 24)).toEqual({ pinnedPly: null })
  })

  it('stays unpinned when stepping forward from live', () => {
    expect(cursorNext({ pinnedPly: null }, 24)).toEqual({ pinnedPly: null })
  })
})

describe('cursorTo', () => {
  it('pins the starting position', () => {
    expect(cursorTo(0, 24)).toEqual({ pinnedPly: 0 })
  })

  it('unpins for the live ply', () => {
    expect(cursorTo(24, 24)).toEqual({ pinnedPly: null })
  })

  it('unpins for a ply beyond the live ply', () => {
    expect(cursorTo(99, 24)).toEqual({ pinnedPly: null })
  })

  it('clamps a negative ply to the starting position', () => {
    expect(cursorTo(-5, 24)).toEqual({ pinnedPly: 0 })
  })
})

describe('a growing game', () => {
  it('advances the ply of an unpinned cursor', () => {
    const state = cursorLast()

    expect(cursorPly(state, 24)).toBe(24)
    expect(cursorPly(state, 25)).toBe(25)
  })

  it('leaves a pinned cursor where it is', () => {
    const state = cursorTo(12, 24)

    expect(cursorPly(state, 24)).toBe(12)
    expect(cursorPly(state, 25)).toBe(12)
  })
})

describe('initialCursor', () => {
  it('pins the requested ply', () => {
    expect(initialCursor(5, 10)).toEqual({ pinnedPly: 5 })
  })

  it('follows live when no ply was requested', () => {
    expect(initialCursor(undefined, 10)).toEqual({ pinnedPly: null })
  })

  it('follows live when the requested ply is beyond the game', () => {
    expect(initialCursor(40, 10)).toEqual({ pinnedPly: null })
  })
})
