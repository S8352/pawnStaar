/**
 * Lexical layer of the PGN parser: tag pairs and movetext tokens.
 *
 * Nothing here understands chess; it only turns text into tokens that
 * `parse-game.ts` can replay. None of these functions throw.
 */
import type { GameResult, PgnTags } from '@/types/wcc'

const TAG_RE = /^\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]/
const RESULT_RE = /^(1-0|0-1|1\/2-1\/2)/
const MOVE_NUMBER_RE = /^\d+\.*/
const NAG_RE = /^\$\d+/
const WORD_BREAK_RE = /[\s{}();$]/

/** Parses the tag-pair section into a plain record, unescaping `\"` and `\\`. */
export function parseTags(section: string): PgnTags {
  const tags: PgnTags = {}
  for (const line of section.split(/\r?\n/)) {
    const match = TAG_RE.exec(line.trim())
    if (!match) continue
    tags[match[1]] = match[2].replace(/\\(["\\])/g, '$1')
  }
  return tags
}

/** Separates a single game's tag-pair section from its movetext. */
export function splitTagsAndMovetext(game: string): { tagSection: string; movetext: string } {
  const lines = game.split(/\r?\n/)
  const tagLines: string[] = []
  let index = 0

  for (; index < lines.length; index++) {
    const text = lines[index].trim()
    if (text === '') {
      // A blank line after the tag pairs ends the tag section.
      if (tagLines.length > 0) {
        index++
        break
      }
      continue
    }
    if (text.startsWith('[')) {
      tagLines.push(lines[index])
      continue
    }
    break
  }

  return {
    tagSection: tagLines.join('\n'),
    movetext: lines.slice(index).join('\n').trim(),
  }
}

export type PgnToken =
  | { kind: 'san'; text: string; ply: number }
  | { kind: 'comment'; text: string; ply: number }
  | { kind: 'result'; text: GameResult }

/** Index just past the `)` that closes the variation opening at `start`. */
function skipVariation(text: string, start: number): number {
  let depth = 0
  let index = start

  while (index < text.length) {
    const char = text[index]
    if (char === '{') {
      const end = text.indexOf('}', index + 1)
      index = end === -1 ? text.length : end + 1
      continue
    }
    if (char === ';') {
      const end = text.indexOf('\n', index)
      index = end === -1 ? text.length : end + 1
      continue
    }
    if (char === '(') {
      depth++
      index++
      continue
    }
    if (char === ')') {
      depth--
      index++
      if (depth <= 0) return index
      continue
    }
    index++
  }

  return index
}

/**
 * Tokenizes movetext into SAN moves, comments and the result.
 *
 * Move numbers, NAGs, `( ... )` variations and `;` line comments are dropped.
 * A `{ ... }` comment is attached to the ply of the most recent SAN, or ply 0
 * when it precedes the first move.
 */
export function tokenizeMovetext(movetext: string): PgnToken[] {
  const tokens: PgnToken[] = []
  const length = movetext.length
  let ply = 0
  let index = 0

  while (index < length) {
    const char = movetext[index]

    if (/\s/.test(char)) {
      index++
      continue
    }

    if (char === '{') {
      const end = movetext.indexOf('}', index + 1)
      tokens.push({
        kind: 'comment',
        text: end === -1 ? movetext.slice(index + 1) : movetext.slice(index + 1, end),
        ply,
      })
      index = end === -1 ? length : end + 1
      continue
    }

    if (char === ';') {
      const end = movetext.indexOf('\n', index)
      index = end === -1 ? length : end + 1
      continue
    }

    if (char === '(') {
      index = skipVariation(movetext, index)
      continue
    }

    // Stray closers from truncated streams.
    if (char === ')' || char === '}') {
      index++
      continue
    }

    if (char === '*') {
      tokens.push({ kind: 'result', text: '*' })
      index++
      continue
    }

    const rest = movetext.slice(index)

    const result = RESULT_RE.exec(rest)
    if (result) {
      tokens.push({ kind: 'result', text: result[1] as GameResult })
      index += result[1].length
      continue
    }

    const nag = NAG_RE.exec(rest)
    if (nag) {
      index += nag[0].length
      continue
    }

    // A `$` with no digits after it: a NAG split across two stream chunks, or
    // malformed input. `WORD_BREAK_RE` stops the word scan on `$`, so without
    // this branch the scan below would make no progress at all.
    if (char === '$') {
      index++
      continue
    }

    if (char >= '0' && char <= '9') {
      const moveNumber = MOVE_NUMBER_RE.exec(rest)
      if (moveNumber) {
        index += moveNumber[0].length
        continue
      }
    }

    if (char === '!' || char === '?') {
      index++
      continue
    }

    let end = index
    while (end < length && !WORD_BREAK_RE.test(movetext[end])) end++

    if (end === index) {
      // The character at `index` is a word break that no branch above consumed.
      // Dropping it guarantees forward progress for every input, so no future
      // branch can reintroduce the infinite loop a bare `$` once caused.
      index++
      continue
    }

    const san = movetext.slice(index, end).replace(/[!?]+$/, '')
    index = end

    if (san !== '') {
      ply++
      tokens.push({ kind: 'san', text: san, ply })
    }
  }

  return tokens
}
