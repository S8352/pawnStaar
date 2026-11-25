'use client'

import { useCallback, useState } from 'react'

import {
  type CursorState,
  cursorFirst,
  cursorLast,
  cursorNext,
  cursorPly,
  cursorPrev,
  cursorTo,
  initialCursor,
  isFollowingLive,
} from '@/lib/wcc/cursor'

/**
 * The board's position in a game that may still be growing.
 *
 * State is the viewer's *intent* (see `lib/wcc/cursor`), not a ply number, so
 * `ply` is derived on every render from the intent plus the current
 * `plyCount`. A move arriving therefore advances a viewer who is following
 * live without any effect firing, and leaves a viewer who has stepped back
 * exactly where they were.
 */
export function useMoveCursor(
  plyCount: number,
  initialPly?: number,
): {
  ply: number
  isFollowingLive: boolean
  setPly(ply: number): void
  first(): void
  prev(): void
  next(): void
  last(): void
} {
  const [state, setState] = useState<CursorState>(() => initialCursor(initialPly, plyCount))

  const setPly = useCallback(
    (ply: number) => setState(cursorTo(ply, plyCount)),
    [plyCount],
  )
  const first = useCallback(() => setState(cursorFirst()), [])
  const prev = useCallback(
    () => setState((current) => cursorPrev(current, plyCount)),
    [plyCount],
  )
  const next = useCallback(
    () => setState((current) => cursorNext(current, plyCount)),
    [plyCount],
  )
  const last = useCallback(() => setState(cursorLast()), [])

  return {
    ply: cursorPly(state, plyCount),
    isFollowingLive: isFollowingLive(state),
    setPly,
    first,
    prev,
    next,
    last,
  }
}
