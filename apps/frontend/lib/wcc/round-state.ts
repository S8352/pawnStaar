/**
 * Round lifecycle: deciding whether a round is upcoming, live or finished, what
 * that implies for polling and caching, and how the round JSON and the parsed
 * PGN are reconciled into one list of games.
 *
 * Pure functions: shared by the server snapshot path and the browser stream path.
 */
import { POLL } from '@/lib/wcc/config'
import { START_FEN } from '@/lib/wcc/fen'
import type {
  GameResult,
  LichessGameStatus,
  LichessPlayer,
  LichessRoundGame,
  LichessRoundSummary,
  ParsedGame,
  PgnTags,
  RoundState,
  WccGame,
} from '@/types/wcc'

/** FNV-1a 32-bit constants. */
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193

/**
 * Poll interval for a round whose games are all decided but which the
 * broadcaster has not flagged finished yet — that flag often lands late.
 */
const SETTLING_MS = 60_000

/** A round is over once Lichess says so, by either marker. */
export function isRoundFinished(round: LichessRoundSummary): boolean {
  return round.finishedAt != null || round.finished === true
}

/**
 * Lifecycle state of a round. The published start time is the weakest signal:
 * a round Lichess flags `ongoing`, or one that already has moves, is live even
 * if `startsAt` is still ahead — rounds start early and published times slip,
 * and showing a countdown over a game in progress is the worse failure.
 */
export function deriveRoundState(
  round: LichessRoundSummary,
  games: Pick<WccGame, 'plies' | 'status'>[],
  now: number,
): RoundState {
  if (isRoundFinished(round)) return 'finished'
  if (round.ongoing === true) return 'live'

  const started = games.some((game) => game.plies.length > 0)
  if (round.startsAt != null && round.startsAt > now && !started) return 'upcoming'

  return 'live'
}

/** How long a client should wait before asking for this round again, in ms. */
export function pollAfterFor(
  state: RoundState,
  games: Pick<WccGame, 'status'>[],
  round: LichessRoundSummary,
): number {
  if (state === 'finished') return 0
  if (state === 'upcoming') return POLL.upcomingMs

  const allDecided = games.length > 0 && games.every((game) => game.status !== '*')
  if (allDecided && !isRoundFinished(round)) return SETTLING_MS

  return POLL.liveMs
}

/** `Cache-Control` for a round response in the given state. */
export function cacheControlFor(state: RoundState): string {
  switch (state) {
    case 'finished':
      return 'public, s-maxage=3600, stale-while-revalidate=86400'
    case 'upcoming':
      return 'public, s-maxage=30, stale-while-revalidate=60'
    default:
      return 'public, s-maxage=5, stale-while-revalidate=10'
  }
}

const normaliseStatus = (status: LichessGameStatus): GameResult =>
  status === '½-½' ? '1/2-1/2' : status

const parseFideId = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** Keeps the round JSON player but borrows a fide id from the PGN tags if it has none. */
const withFideId = (player: LichessPlayer, tagged: string | undefined): LichessPlayer => {
  if (player.fideId !== undefined) return player
  const fideId = parseFideId(tagged)
  return fideId === undefined ? player : { ...player, fideId }
}

const playerFromTags = (tags: PgnTags, side: 'White' | 'Black'): LichessPlayer => {
  const fideId = parseFideId(tags[`${side}FideId`])
  return { name: tags[side] ?? '', ...(fideId === undefined ? {} : { fideId }) }
}

/** A stand-in `ParsedGame` for a round game the PGN export has not caught up with. */
const synthesiseGame = (json: LichessRoundGame): ParsedGame => {
  const tags: PgnTags = { White: json.players[0].name, Black: json.players[1].name }
  if (json.players[0].fideId !== undefined) tags.WhiteFideId = String(json.players[0].fideId)
  if (json.players[1].fideId !== undefined) tags.BlackFideId = String(json.players[1].fideId)

  return {
    id: json.id,
    tags,
    initialFen: START_FEN,
    plies: [],
    result: normaliseStatus(json.status),
    issues: [],
    pgn: '',
  }
}

const toWccGame = (game: ParsedGame, json: LichessRoundGame | undefined): WccGame => {
  const players: [LichessPlayer, LichessPlayer] = json
    ? [withFideId(json.players[0], game.tags.WhiteFideId), withFideId(json.players[1], game.tags.BlackFideId)]
    : [playerFromTags(game.tags, 'White'), playerFromTags(game.tags, 'Black')]

  const fromJson = json === undefined ? undefined : normaliseStatus(json.status)
  const status = game.result !== '*' ? game.result : (fromJson ?? game.result)

  const last = game.plies[game.plies.length - 1]
  const lastMove = last?.uci ?? json?.lastMove

  return {
    ...game,
    players,
    status,
    currentFen: last?.fen ?? json?.fen ?? game.initialFen,
    ...(lastMove === undefined ? {} : { lastMove }),
  }
}

/**
 * Reconciles the round JSON (authoritative for players, clocks and game ids)
 * with the parsed PGN (authoritative for moves and results).
 *
 * Games are matched by id; PGN exports that carry no `GameURL` tag are matched
 * positionally instead. Round games the PGN has not published yet are
 * synthesised, and parsed games the round JSON does not list are appended.
 */
export function mergeRoundGames(roundGames: LichessRoundGame[], parsed: ParsedGame[]): WccGame[] {
  const used = new Set<ParsedGame>()

  const games = roundGames.map((json, index) => {
    const byId = parsed.find((game) => game.id !== null && game.id === json.id)
    const byIndex =
      parsed[index] !== undefined && parsed[index].id === null && !used.has(parsed[index])
        ? parsed[index]
        : undefined
    const match = byId ?? byIndex

    if (match) used.add(match)

    return toWccGame(match ?? synthesiseGame(json), json)
  })

  const appended = parsed.filter((game) => !used.has(game)).map((game) => toWccGame(game, undefined))

  return [...games, ...appended]
}

/** FNV-1a 32-bit digest of the input, as eight lowercase hex characters. */
export function hashVersion(input: string): string {
  let hash = FNV_OFFSET_BASIS

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}
