import * as React from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { WccMatchSkeleton } from "@/components/wcc/match-skeleton"
import { WccMatchPage } from "@/components/wcc/wcc-match-page"
import { LichessError } from "@/lib/lichess/errors"
import { FEATURED_TOUR_ID, REVALIDATE, WCC_YEAR } from "@/lib/wcc/config"
import { type GameParam, parseGameParam } from "@/lib/wcc/game-param"
import { sportsEventJsonLd } from "@/lib/wcc/jsonld"
import { matchPageDescription, matchPageTitle } from "@/lib/wcc/meta"
import { isRoundFinished } from "@/lib/wcc/round-state"
import { gameHref, tiebreaksHref } from "@/lib/wcc/routes"
import {
  getRoundSnapshot,
  getTourSnapshot,
  resolveGameRound,
  tiebreakRounds,
} from "@/lib/wcc/snapshot"
import type { LichessRoundSummary, RoundSnapshot, TourSnapshot, WccGame } from "@/types/wcc"

/*
  One game of the championship.

  Read the security note before touching the round lookup. `getRoundSnapshot`
  has no allow-list of its own — the gate (`isAllowedRoundId`) lives in the API
  route layer, which a server component goes round. So the URL segment this
  route parses is a game *number*, and the round id it turns into always comes
  from the allow-listed tour's own round list. A round id must never be read
  from `params`: if it ever is, it has to pass `isAllowedRoundId` first.

  Round names are typed by hand at Lichess, so `resolveGameRound` matches on the
  name rather than on a position in the list, and the tiebreak day is whichever
  of its rounds is still to be played.
*/

export const revalidate = 15

const SITE_ORIGIN = "https://www.pawnstaar.com"

interface RouteParams {
  year: string
  game: string
}

interface Target {
  param: GameParam
  tour: TourSnapshot
  round: LichessRoundSummary
  pageUrl: string
}

/** The canonical URL of a game or the tiebreak day. */
const hrefFor = (param: GameParam): string =>
  param.kind === "tiebreaks" ? tiebreaksHref(WCC_YEAR) : gameHref(WCC_YEAR, param.number)

/**
 * The tiebreak round to show: the first one still to be played, else the last
 * one, so a decided tiebreak day still has a page rather than a 404.
 */
const pickTiebreakRound = (tour: TourSnapshot): LichessRoundSummary | undefined => {
  const rounds = tiebreakRounds(tour)

  return rounds.find((round) => !isRoundFinished(round)) ?? rounds[rounds.length - 1]
}

/**
 * The round this URL names, or null when the championship has no such round.
 *
 * Shared by the page and its metadata; both run in one request, so the tour
 * fetch behind this is served from the data cache the second time.
 */
async function resolveTarget(params: RouteParams): Promise<Target | null> {
  if (Number(params.year) !== WCC_YEAR) return null

  const param = parseGameParam(params.game)
  if (param === null) return null

  const tour = await getTourSnapshot(FEATURED_TOUR_ID, { revalidate: REVALIDATE.page })

  const round =
    param.kind === "tiebreaks" ? pickTiebreakRound(tour) : resolveGameRound(tour, param.number)
  if (round === undefined) return null

  return { param, tour, round, pageUrl: `${SITE_ORIGIN}${hrefFor(param)}` }
}

/** The round snapshot, turning a 404 from Lichess into a 404 of our own. */
async function loadRound(roundId: string): Promise<RoundSnapshot> {
  try {
    return await getRoundSnapshot(roundId, { revalidate: REVALIDATE.page })
  } catch (error) {
    // A round the tour lists but the round endpoint does not know is gone, not
    // broken. Anything else is the error boundary's to report.
    if (error instanceof LichessError && error.status === 404) notFound()
    throw error
  }
}

/**
 * The games of every round already finished, for the match score.
 *
 * One cached Lichess call per finished round per day: a finished round's moves
 * never change, so `REVALIDATE.roundFinished` is a day. The round being
 * displayed is skipped — the page loads that one anyway, and fetching the same
 * round twice in a render with two different cache windows is how a cached
 * route starts fighting itself.
 *
 * Each call is isolated: one round that cannot be loaded costs its own result
 * and nothing else, because a score missing half a point is better than a page
 * that will not render.
 */
async function loadFinishedGames(
  tour: TourSnapshot,
  currentRoundId: string,
): Promise<{ finishedGames: WccGame[]; gamesByRound: Record<string, WccGame> }> {
  const rounds = tour.rounds.filter(
    (round) => isRoundFinished(round) && round.id !== currentRoundId,
  )

  const loaded = await Promise.all(
    rounds.map(async (round) => {
      try {
        const snapshot = await getRoundSnapshot(round.id, {
          revalidate: REVALIDATE.roundFinished,
        })

        return { roundId: round.id, games: snapshot.games }
      } catch {
        return { roundId: round.id, games: [] as WccGame[] }
      }
    }),
  )

  return {
    finishedGames: loaded.flatMap((entry) => entry.games),
    gamesByRound: Object.fromEntries(
      loaded.flatMap((entry) => (entry.games[0] === undefined ? [] : [[entry.roundId, entry.games[0]]])),
    ),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  /*
    Metadata is never allowed to fail the page. A championship page that renders
    under a generic title because Lichess was unreachable is a small loss; one
    that 500s in `generateMetadata` before the error boundary can say so is not.
  */
  try {
    const target = await resolveTarget(await params)

    if (target === null) {
      return { title: matchPageTitle(), description: matchPageDescription() }
    }

    const snapshot = await getRoundSnapshot(target.round.id, { revalidate: REVALIDATE.page })
    const game = snapshot.games[0]

    const title = matchPageTitle(target.param)
    const description = matchPageDescription({
      result: game?.status,
      moveCount: game === undefined ? undefined : Math.ceil(game.plies.length / 2),
      startsAt: target.round.startsAt,
    })

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: target.tour.tour.image ? [target.tour.tour.image] : [],
        url: target.pageUrl,
      },
    }
  } catch {
    return { title: matchPageTitle(), description: matchPageDescription() }
  }
}

export default async function WccGamePage({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<React.JSX.Element> {
  /*
    The round is resolved here, outside the Suspense boundary below, so that a
    URL naming no round answers 404 rather than 200 with a not-found body:
    nothing has been streamed yet at this point. See `WccMatchSkeleton` for why
    this is not a `loading.tsx`.
  */
  const target = await resolveTarget(await params)
  if (target === null) notFound()

  return (
    <React.Suspense fallback={<WccMatchSkeleton />}>
      <MatchContent target={target} />
    </React.Suspense>
  )
}

/** The part worth waiting for: the round's moves and the finished rounds. */
async function MatchContent({ target }: { target: Target }): Promise<React.JSX.Element> {
  const snapshot = await loadRound(target.round.id)
  const { finishedGames, gamesByRound } = await loadFinishedGames(target.tour, target.round.id)

  const jsonLd = JSON.stringify(
    sportsEventJsonLd({
      tour: target.tour.tour,
      round: target.round,
      game: snapshot.games[0],
      pageUrl: target.pageUrl,
    }),
    // Broadcast names and locations are upstream text, and one `</script>` in
    // any of them would close this block early.
  ).replace(/</g, "\\u003c")

  return (
    <>
      <WccMatchPage
        initialTour={target.tour}
        initialRound={snapshot}
        finishedGames={finishedGames}
        gamesByRound={gamesByRound}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  )
}
