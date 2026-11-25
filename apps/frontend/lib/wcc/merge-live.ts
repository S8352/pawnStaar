/**
 * Stream-time merge: folding one complete PGN frame from the Lichess broadcast
 * stream into the game it replaces.
 *
 * This is the PGN-only sibling of `mergeRoundGames` in `round-state.ts`, which
 * reconciles the round JSON with the PGN export at snapshot time. The stream
 * carries no JSON, so the game already on screen plays the part the round JSON
 * plays there: it is what the players, the known result and the last position
 * fall back to when the incoming frame does not carry them.
 *
 * Pure and browser-safe.
 */
import type { LichessPlayer, ParsedGame, PgnTags, WccGame } from '@/types/wcc'

const parseFideId = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** Keeps the player on screen but borrows a fide id from the PGN tags if it has none. */
const withFideId = (player: LichessPlayer, tagged: string | undefined): LichessPlayer => {
  if (player.fideId !== undefined) return player
  const fideId = parseFideId(tagged)
  return fideId === undefined ? player : { ...player, fideId }
}

const playerFromTags = (tags: PgnTags, side: 'White' | 'Black'): LichessPlayer => {
  const fideId = parseFideId(tags[`${side}FideId`])
  return { name: tags[side] ?? '', ...(fideId === undefined ? {} : { fideId }) }
}

/**
 * Replaces `existing` with the game the stream just sent. Every frame is a
 * complete game, so the moves, tags and raw PGN are taken wholesale; the
 * players survive because the stream's tags carry less about them than the
 * round JSON did.
 */
export function mergeParsedIntoGame(existing: WccGame | undefined, parsed: ParsedGame): WccGame {
  const players: [LichessPlayer, LichessPlayer] = existing
    ? [
        withFideId(existing.players[0], parsed.tags.WhiteFideId),
        withFideId(existing.players[1], parsed.tags.BlackFideId),
      ]
    : [playerFromTags(parsed.tags, 'White'), playerFromTags(parsed.tags, 'Black')]

  const status = parsed.result !== '*' ? parsed.result : (existing?.status ?? parsed.result)

  const last = parsed.plies[parsed.plies.length - 1]
  const lastMove = last?.uci ?? existing?.lastMove

  return {
    ...parsed,
    players,
    status,
    currentFen: last?.fen ?? existing?.currentFen ?? parsed.initialFen,
    ...(lastMove === undefined ? {} : { lastMove }),
  }
}
