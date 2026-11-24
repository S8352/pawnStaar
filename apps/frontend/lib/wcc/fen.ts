/**
 * FEN helpers shared by the server snapshot and the browser stream reader.
 * Pure string handling, no chess.js dependency.
 */

/** Standard chess starting position (matches chess.js `DEFAULT_POSITION`). */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const SQUARE_RE = /^[a-h][1-8]$/

/** Side to move encoded in the FEN's second field; defaults to white. */
export function sideToMove(fen: string): 'w' | 'b' {
  return fen.split(/\s+/)[1] === 'b' ? 'b' : 'w'
}

/** Origin/destination squares of a UCI move, ignoring any promotion suffix. */
export function lastMoveSquares(uci: string | undefined): { from: string; to: string } | undefined {
  if (!uci || uci.length < 4) return undefined
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  if (!SQUARE_RE.test(from) || !SQUARE_RE.test(to)) return undefined
  return { from, to }
}
