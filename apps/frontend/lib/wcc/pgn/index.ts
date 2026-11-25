/**
 * Public entry point of the WCC PGN parser.
 */
import { START_FEN } from '@/lib/wcc/fen'
import type { ParsedGame } from '@/types/wcc'

import { parseGame } from './parse-game'
import { splitPgnGames } from './split'

/** Parses every game in a round's PGN export or stream chunk. */
export function parseRoundPgn(raw: string): ParsedGame[] {
  return splitPgnGames(raw).map((pgn) => {
    try {
      return parseGame(pgn)
    } catch (error) {
      return {
        id: null,
        tags: {},
        initialFen: START_FEN,
        plies: [],
        result: '*' as const,
        issues: [
          {
            ply: 0,
            code: 'unknown' as const,
            detail: error instanceof Error ? error.message : String(error),
          },
        ],
        pgn,
      }
    }
  })
}

export { parseAnnotations } from './annotations'
export type { PlyAnnotations } from './annotations'
export { gameIdFromUrl, parseGame } from './parse-game'
export { splitPgnGames } from './split'
export { parseTags, splitTagsAndMovetext, tokenizeMovetext } from './tokenize'
export type { PgnToken } from './tokenize'
