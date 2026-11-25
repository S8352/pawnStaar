/**
 * The round strip's model: one pill per classical game, plus a single pill for
 * the tiebreak day when the tournament has one.
 *
 * Pure, so the strip itself only has to turn this into links. Round names are
 * typed by hand at Lichess, so a game's number always comes from
 * `gameNumberOf` rather than from a position in the round list.
 */
import { ROUND_OVERRIDES } from '@/lib/wcc/config'
import { gameNumberOf } from '@/lib/wcc/rounds'
import { gameHref, tiebreaksHref } from '@/lib/wcc/routes'
import type { GameResult, LichessRoundSummary, WccGame } from '@/types/wcc'

import { isRoundFinished } from './round-state'

export type RoundPillState = 'finished' | 'ongoing' | 'upcoming'

/** The glyphs a finished pill shows under its label. */
export type ResultGlyph = '1-0' | '0-1' | '½'

export interface RoundPill {
  /** Stable key and `aria-current` test: the round, or `tiebreaks`. */
  key: string
  label: string
  href: string
  state: RoundPillState
  active: boolean
  /** Known result of a finished round, when its game has been loaded. */
  result?: ResultGlyph
  /** Start time of an upcoming round, for a date the browser formats. */
  startsAt?: number
  /** Accessible name, since `G7` on its own says very little. */
  title: string
}

/**
 * Mirrors `tiebreakRounds`, which cannot be reused here because it takes a
 * whole `TourSnapshot` and the strip is handed a round list.
 */
const isTiebreak = (round: LichessRoundSummary): boolean =>
  ROUND_OVERRIDES[round.id]?.tiebreak === true || gameNumberOf(round) === undefined

const stateOf = (round: LichessRoundSummary): RoundPillState => {
  if (isRoundFinished(round)) return 'finished'

  return round.ongoing === true ? 'ongoing' : 'upcoming'
}

/** `1/2-1/2` reads as a fraction in a 2-character pill; `½` does not. */
const glyphFor = (status: GameResult): ResultGlyph | undefined => {
  switch (status) {
    case '1-0':
      return '1-0'
    case '0-1':
      return '0-1'
    case '1/2-1/2':
      return '½'
    default:
      return undefined
  }
}

/** The earliest announced start among a set of rounds, if any announced one. */
const earliestStart = (rounds: LichessRoundSummary[]): number | undefined => {
  const times = rounds
    .map((round) => round.startsAt)
    .filter((startsAt): startsAt is number => startsAt !== undefined)

  return times.length === 0 ? undefined : Math.min(...times)
}

/**
 * The tiebreak day collapses to one pill: how many rounds it is split into is
 * a broadcasting detail, and the viewer only cares that it exists and whether
 * it has been reached. It counts as live if any of its rounds is, and as
 * finished only once all of them are.
 */
const tiebreakPill = (
  rounds: LichessRoundSummary[],
  activeRoundId: string,
  year: number,
): RoundPill => {
  const state: RoundPillState = rounds.some((round) => round.ongoing === true)
    ? 'ongoing'
    : rounds.every(isRoundFinished)
      ? 'finished'
      : 'upcoming'

  const startsAt = earliestStart(rounds)

  return {
    key: 'tiebreaks',
    label: 'TB',
    href: tiebreaksHref(year),
    state,
    active: rounds.some((round) => round.id === activeRoundId),
    ...(startsAt === undefined || state !== 'upcoming' ? {} : { startsAt }),
    title: 'Tiebreaks',
  }
}

/**
 * One pill per round, in the order the tournament lists them.
 *
 * `games` is keyed by round id and only needs to hold the rounds whose results
 * are known; a finished round with no game loaded shows a tick instead.
 */
export function roundPills(input: {
  rounds: LichessRoundSummary[]
  activeRoundId: string
  year: number
  games?: Record<string, WccGame>
}): RoundPill[] {
  const { rounds, activeRoundId, year, games } = input

  const pills = rounds
    .flatMap((round) => {
      const number = gameNumberOf(round)

      return isTiebreak(round) || number === undefined ? [] : [{ round, number }]
    })
    .map(({ round, number }): RoundPill => {
      const state = stateOf(round)
      const result = state === 'finished' ? glyphFor(games?.[round.id]?.status ?? '*') : undefined

      return {
        key: round.id,
        label: `G${number}`,
        href: gameHref(year, number),
        state,
        active: round.id === activeRoundId,
        ...(result === undefined ? {} : { result }),
        ...(round.startsAt === undefined || state !== 'upcoming'
          ? {}
          : { startsAt: round.startsAt }),
        title: round.name,
      }
    })

  const tiebreaks = rounds.filter(isTiebreak)
  if (tiebreaks.length > 0) pills.push(tiebreakPill(tiebreaks, activeRoundId, year))

  return pills
}
