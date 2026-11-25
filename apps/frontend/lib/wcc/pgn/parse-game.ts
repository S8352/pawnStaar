/**
 * Replays one game's movetext with chess.js to produce a `ParsedGame`.
 *
 * The replay steps through one SAN at a time rather than handing the whole
 * game to chess.js's `loadPgn`, for two reasons: annotations are keyed by ply
 * rather than by position, which is what the UI indexes by; and stopping at the
 * first illegal move keeps the legal prefix of a truncated or malformed game
 * instead of losing all of it.
 */
import { Chess } from 'chess.js'

import { LICHESS_ID_RE } from '@/lib/wcc/config'
import { START_FEN } from '@/lib/wcc/fen'
import type { GameResult, ParseIssue, ParsedGame, PgnTags, Ply } from '@/types/wcc'

import { parseAnnotations } from './annotations'
import { parseTags, splitTagsAndMovetext, tokenizeMovetext } from './tokenize'

const RESULTS: readonly GameResult[] = ['*', '1-0', '0-1', '1/2-1/2']

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Last path segment of a Lichess game URL, when it looks like a Lichess id.
 *
 * Defined here rather than in `index.ts` so `parseGame` can use it without a
 * circular import; `index.ts` re-exports it as the public entry point.
 */
export function gameIdFromUrl(url: string | undefined): string | null {
  if (!url) return null
  const segments = url.split(/[?#]/)[0].split('/')
  const last = segments[segments.length - 1]
  if (!last) return null
  return LICHESS_ID_RE.test(last) ? last : null
}

export function parseGame(pgn: string): ParsedGame {
  const issues: ParseIssue[] = []
  const plies: Ply[] = []
  let tags: PgnTags = {}
  let initialFen = START_FEN
  let result: GameResult = '*'

  try {
    const { tagSection, movetext } = splitTagsAndMovetext(pgn)
    tags = parseTags(tagSection)

    if (!tags.White || !tags.Black) {
      issues.push({ ply: 0, code: 'bad_tags', detail: 'missing White and/or Black tag' })
    }

    if (tags.SetUp === '1' && tags.FEN) initialFen = tags.FEN

    const tokens = tokenizeMovetext(movetext)

    const commentsByPly = new Map<number, string>()
    let resultToken: GameResult | undefined

    for (const token of tokens) {
      if (token.kind === 'comment') {
        const existing = commentsByPly.get(token.ply)
        commentsByPly.set(token.ply, existing === undefined ? token.text : `${existing} ${token.text}`)
      } else if (token.kind === 'result') {
        resultToken = token.text
      }
    }

    result = RESULTS.find((candidate) => candidate === tags.Result) ?? resultToken ?? '*'

    const chess = new Chess(initialFen)

    for (const token of tokens) {
      if (token.kind !== 'san') continue
      try {
        const move = chess.move(token.text)
        plies.push({
          ply: token.ply,
          san: move.san,
          uci: `${move.from}${move.to}${move.promotion ?? ''}`,
          fen: move.after,
          ...parseAnnotations(commentsByPly.get(token.ply) ?? ''),
        })
      } catch (error) {
        issues.push({
          ply: token.ply,
          code: 'illegal_move',
          detail: `${token.text}: ${messageOf(error)}`,
        })
        // Everything after an illegal move is unreplayable; keep what we have.
        break
      }
    }
  } catch (error) {
    issues.push({ ply: 0, code: 'unknown', detail: messageOf(error) })
  }

  return {
    id: gameIdFromUrl(tags.GameURL),
    tags,
    initialFen,
    plies,
    result,
    issues,
    pgn,
  }
}
