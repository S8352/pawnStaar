/**
 * Every game of the match in one list, for the match score.
 *
 * A round snapshot only covers its own round, so the score needs the finished
 * rounds fetched on the server merged with whatever the live round currently
 * holds. The live round is fetched again in the browser, so the same game
 * arrives from two sources and has to be reconciled rather than counted twice.
 */
import type { WccGame } from '@/types/wcc'

/**
 * Concatenates the lists, keeping one entry per game id — the last list wins,
 * so a freshly polled round supersedes the snapshot the page was rendered
 * from, in the position the game first appeared in.
 *
 * Games whose PGN carried no `GameURL` have no id to match on and are kept as
 * they are: dropping them would lose a result, and merging them by position
 * across rounds would invent one.
 */
export function mergeMatchGames(...lists: WccGame[][]): WccGame[] {
  const positionById = new Map<string, number>()
  const merged: WccGame[] = []

  for (const list of lists) {
    for (const game of list) {
      if (game.id === null) {
        merged.push(game)
        continue
      }

      const position = positionById.get(game.id)

      if (position === undefined) {
        positionById.set(game.id, merged.length)
        merged.push(game)
      } else {
        merged[position] = game
      }
    }
  }

  return merged
}
