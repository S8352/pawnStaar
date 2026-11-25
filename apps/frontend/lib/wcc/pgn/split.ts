/**
 * Splits a multi-game PGN export or stream chunk into individual game texts.
 */

/**
 * A new game begins at a line starting with `[` that follows a blank line and
 * comes after movetext, i.e. the previous non-blank line was not a tag. That
 * keeps the blank line between a game's tag section and its movetext from
 * splitting the game in two.
 */
export function splitPgnGames(raw: string): string[] {
  const trimmed = raw.trim()
  if (trimmed === '') return []

  const games: string[][] = []
  let current: string[] = []
  let previousNonBlankWasTag = false
  let sawBlankLine = false

  for (const line of trimmed.split(/\r?\n/)) {
    const text = line.trim()

    if (text === '') {
      sawBlankLine = true
      current.push(line)
      continue
    }

    const isTag = text.startsWith('[')
    if (isTag && sawBlankLine && !previousNonBlankWasTag && current.length > 0) {
      games.push(current)
      current = []
    }

    current.push(line)
    previousNonBlankWasTag = isTag
    sawBlankLine = false
  }

  if (current.length > 0) games.push(current)

  return games.map((lines) => lines.join('\n').trim()).filter((game) => game !== '')
}
