/**
 * How a finished game and a position are named.
 *
 * Both are pure string work pulled out of `LiveStage` so they can be tested
 * without a DOM: the score a player strip shows, and the move a board's
 * accessible label is described by.
 */
import type { GameResult, Ply } from '@/types/wcc'

/** The score one colour takes from a game, or undefined while it is running. */
export type ColorResult = '1' | '0' | '½'

/**
 * `game.status` read from one colour's side of the board.
 *
 * Which colour a player has alternates between games, so the result is always
 * looked up by colour rather than by a position in the players array.
 */
export function resultForColor(status: GameResult, color: 'white' | 'black'): ColorResult | undefined {
  switch (status) {
    case '1-0':
      return color === 'white' ? '1' : '0'
    case '0-1':
      return color === 'white' ? '0' : '1'
    case '1/2-1/2':
      return '½'
    default:
      return undefined
  }
}

/**
 * The move that produced the position at `ply`, as `12. Nxf6` or `12... Qd7`.
 *
 * Ply 0 is the position before the first move, and a ply the game has not
 * reached is named the same way: there is no move to point at, and the board
 * it labels will be showing the initial position.
 */
export function moveLabel(plies: Ply[], ply: number): string {
  const played = ply > 0 ? plies[ply - 1] : undefined
  if (!played) return 'start position'

  // `ply` is 1-based and odd plies are White's.
  const moveNumber = Math.ceil(played.ply / 2)
  const separator = played.ply % 2 === 1 ? '.' : '...'

  return `${moveNumber}${separator} ${played.san}`
}

/**
 * The move at `ply` as a sentence for a live region: `Move 24, White plays
 * Nxf6`.
 *
 * Spelled out rather than reusing `moveLabel`, because `12... Qd7` read aloud
 * is a string of punctuation. An empty string where there is no move to
 * announce, so a caller can assign it to a live region without clearing it.
 */
export function moveAnnouncement(plies: Ply[], ply: number): string {
  const played = ply > 0 ? plies[ply - 1] : undefined
  if (!played) return ''

  const moveNumber = Math.ceil(played.ply / 2)
  const colour = played.ply % 2 === 1 ? 'White' : 'Black'

  return `Move ${moveNumber}, ${colour} plays ${played.san}`
}
