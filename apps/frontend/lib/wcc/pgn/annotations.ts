/**
 * Decodes the `[%clk ...]` / `[%eval ...]` commands Lichess embeds in PGN
 * comments, keeping any remaining prose as a plain comment.
 */

export interface PlyAnnotations {
  clockMs?: number
  evalCp?: number
  evalMate?: number
  comment?: string
}

const CLK_RE = /\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/
const EVAL_RE = /\[%eval\s+(#?[+-]?\d+(?:\.\d+)?)\]/
const COMMAND_RE = /\[%[^\]]*\]/g

export function parseAnnotations(comment: string): PlyAnnotations {
  const annotations: PlyAnnotations = {}

  const clock = CLK_RE.exec(comment)
  if (clock) {
    const totalSeconds = Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3])
    if (Number.isFinite(totalSeconds)) annotations.clockMs = Math.round(totalSeconds * 1000)
  }

  const evaluation = EVAL_RE.exec(comment)
  if (evaluation) {
    const raw = evaluation[1]
    if (raw.startsWith('#')) {
      const mate = Number.parseInt(raw.slice(1), 10)
      if (Number.isFinite(mate)) annotations.evalMate = mate
    } else {
      const pawns = Number.parseFloat(raw)
      if (Number.isFinite(pawns)) annotations.evalCp = Math.round(pawns * 100)
    }
  }

  const prose = comment.replace(COMMAND_RE, '').replace(/\s+/g, ' ').trim()
  if (prose !== '') annotations.comment = prose

  return annotations
}
