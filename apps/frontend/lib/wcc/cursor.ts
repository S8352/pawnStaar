/**
 * Where the board is looking, as pure data.
 *
 * A live game grows under the viewer, so the cursor stores *intent* rather
 * than a ply number: `pinnedPly === null` means "whatever the latest ply is",
 * and the displayed ply is derived from that plus the current `plyCount`. A
 * viewer following live therefore advances for free when a move arrives, and
 * one who has stepped back stays exactly where they are — no effect has to
 * chase `plyCount`, and no race can scroll the board out from under them.
 *
 * Ply 0 is the position before the first move.
 */

export interface CursorState {
  /** Pinned ply, or null while following the live position. */
  pinnedPly: number | null
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** The ply currently shown: the live ply while unpinned, else the pinned one. */
export function cursorPly(state: CursorState, plyCount: number): number {
  return state.pinnedPly === null ? plyCount : clamp(state.pinnedPly, 0, plyCount)
}

/** Whether the cursor tracks the latest ply rather than a fixed one. */
export function isFollowingLive(state: CursorState): boolean {
  return state.pinnedPly === null
}

/** Jump to the position before the first move. */
export function cursorFirst(): CursorState {
  return { pinnedPly: 0 }
}

/** Step one ply back from wherever the cursor currently points. */
export function cursorPrev(state: CursorState, plyCount: number): CursorState {
  return cursorTo(cursorPly(state, plyCount) - 1, plyCount)
}

/**
 * Step one ply forward. Landing on the latest ply unpins, so a viewer who
 * steps forward to the end resumes following the game rather than sticking to
 * the ply that happened to be last at that moment.
 */
export function cursorNext(state: CursorState, plyCount: number): CursorState {
  return cursorTo(cursorPly(state, plyCount) + 1, plyCount)
}

/** Resume following the live position. */
export function cursorLast(): CursorState {
  return { pinnedPly: null }
}

/** Point at a specific ply; the latest ply or beyond means "follow live". */
export function cursorTo(ply: number, plyCount: number): CursorState {
  return ply >= plyCount ? { pinnedPly: null } : { pinnedPly: clamp(ply, 0, plyCount) }
}

/**
 * The cursor a page starts with, given an optional `?ply=` from the URL. A
 * deep link to a ply the game has not reached follows live instead of pinning
 * an empty board.
 */
export function initialCursor(initialPly: number | undefined, plyCount: number): CursorState {
  return initialPly === undefined ? cursorLast() : cursorTo(initialPly, plyCount)
}
