"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { EmptyState } from "@/components/ui/empty-state"
import { BoardControls } from "@/components/wcc/board-controls"
import { CompanionPanel } from "@/components/wcc/companion-panel"
import { LiveStage } from "@/components/wcc/live-stage"
import { MatchHeader } from "@/components/wcc/match-header"
import { RoundStrip } from "@/components/wcc/round-strip"
import { StatusBanner } from "@/components/wcc/status-banner"
import { useKeyboardNav } from "@/hooks/use-keyboard-nav"
import { useMoveCursor } from "@/hooks/use-move-cursor"
import { useSpoilerFree } from "@/hooks/use-spoiler-free"
import { useWccRound } from "@/hooks/use-wcc-round"
import { useWccTour } from "@/hooks/use-wcc-tour"
import { FEATURED_TIME_CONTROL } from "@/lib/wcc/config"
import { resolveTimeControl } from "@/lib/wcc/derive"
import { mergeMatchGames } from "@/lib/wcc/match-games"
import { matchScore } from "@/lib/wcc/score"
import type { LichessRoundSummary, RoundSnapshot, TourSnapshot, WccGame } from "@/types/wcc"

/*
  The match page, assembled.

  Everything on it is a function of two live sources — the round, which carries
  the moves, and the tour, which carries the round list — plus one piece of
  viewer intent, the move cursor. The server hands over a snapshot of both so
  the first paint is the real game rather than a spinner, and the hooks take
  over from there.

  The match *score* is the one thing a single round cannot answer: a snapshot
  only covers its own round. So the server also loads the finished rounds and
  passes their games down, and they are merged here with whatever the live
  round currently holds, de-duplicated by game id so a round arriving from both
  sources is not counted twice.

  `GameView` exists so the cursor and the board orientation are keyed by game
  id: navigating from game 2 to game 3 should open at the live position with
  White at the bottom, not at ply 40 of a game that has not reached it.
*/

export interface WccMatchPageProps {
  initialTour: TourSnapshot
  initialRound: RoundSnapshot
  /** The game of every round already finished, for the match score. */
  finishedGames: WccGame[]
  /**
   * The same games keyed by the round they were played in, for the round
   * strip's result glyphs. The two props share their objects, so carrying both
   * does not double the payload.
   */
  gamesByRound: Record<string, WccGame>
}

/** `?ply=24`, or undefined when the parameter is absent or is not a ply. */
function plyFromParam(raw: string | null): number | undefined {
  if (raw === null) return undefined

  const ply = Number(raw)

  return Number.isSafeInteger(ply) && ply >= 0 ? ply : undefined
}

/**
 * Moves the board to the ply a shared link names.
 *
 * `useSearchParams` needs a Suspense boundary above it, because a route Next
 * can prerender has no query string to read at that point — so whatever sits
 * inside that boundary is rendered twice into the HTML, once as the fallback
 * and once resolved. This component renders nothing, which is the point: the
 * game itself stays outside the boundary and reaches the page exactly once, in
 * every render mode, with no shell for a crawler or a reader on a slow
 * connection to land on.
 *
 * The cost is that a `?ply=` link opens at the live position and steps to the
 * shared one a frame later, rather than rendering there. The alternative was a
 * board the server either sent twice or did not send at all.
 */
function SharedPlyLink({ onPly }: { onPly(ply: number): void }): null {
  const raw = useSearchParams().get("ply")

  // Kept in a ref because `onPly` is rebuilt whenever the game gains a move,
  // and re-running on that would drag a viewer who has stepped away back to
  // the shared ply every time Lichess publishes one.
  const latest = React.useRef(onPly)
  React.useEffect(() => {
    latest.current = onPly
  })

  const applied = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (raw === null || applied.current === raw) return
    applied.current = raw

    const ply = plyFromParam(raw)
    if (ply !== undefined) latest.current(ply)
  }, [raw])

  return null
}

export function WccMatchPage({
  initialTour,
  initialRound,
  finishedGames,
  gamesByRound,
}: WccMatchPageProps): React.JSX.Element {
  const tour = useWccTour(initialTour.tour.id, { initialData: initialTour })
  const live = useWccRound({ initialData: initialRound, tourId: initialTour.tour.id })
  const { spoilerFree, setSpoilerFree } = useSpoilerFree()

  // A championship round broadcasts exactly one game.
  const game: WccGame | undefined = live.games[0]

  const scores = React.useMemo(
    () => matchScore(mergeMatchGames(finishedGames, live.games)),
    [finishedGames, live.games]
  )

  // The strip's own round is the one source the server could not have had: its
  // result arrives while the page is open.
  const stripGames = React.useMemo(
    () => (game === undefined ? gamesByRound : { ...gamesByRound, [live.round.id]: game }),
    [game, gamesByRound, live.round.id]
  )

  const liveConnection = live.status === "live" || live.status === "reconnecting"

  return (
    <div className="mx-auto grid max-w-[1440px] gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,60fr)_minmax(320px,40fr)] lg:grid-rows-[auto_auto_auto_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <MatchHeader
          tour={tour.tour}
          rounds={tour.rounds}
          scores={scores}
          currentRound={live.round}
          roundState={live.state}
          connection={live.status}
          game={game}
          spoilerFree={spoilerFree}
          onSpoilerChange={setSpoilerFree}
        />
      </div>

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <RoundStrip rounds={tour.rounds} activeRoundId={live.round.id} games={stripGames} />
      </div>

      <div className="min-w-0 lg:col-start-1 lg:row-start-3">
        <StatusBanner
          roundState={live.state}
          connection={live.status}
          transport={live.transport}
          retryInSec={live.retryInSec}
          error={live.error}
          startsAt={live.round.startsAt}
          result={game?.status}
          moveCount={game === undefined ? undefined : Math.ceil(game.plies.length / 2)}
          onRetry={live.refresh}
        />
      </div>

      {game === undefined ? (
        <div id="wcc-board" tabIndex={-1} className="min-w-0 lg:col-start-1 lg:row-start-4">
          <EmptyState
            title="Moves not available for this game yet."
            description="The board will appear as soon as Lichess publishes the game."
          />
        </div>
      ) : (
        <GameView
          key={game.id ?? live.round.id}
          game={game}
          roundId={live.round.id}
          rounds={tour.rounds}
          liveConnection={liveConnection}
          lastMoveObservedAt={game.id === null ? undefined : live.lastMoveObservedAt[game.id]}
          spoilerFree={spoilerFree}
        />
      )}
    </div>
  )
}

/**
 * The board and the companion column for one game.
 *
 * Both halves are grid items of the layout above: this returns a fragment
 * rather than a wrapper so the board stays in the left column and the
 * companion in the right, while the pair of them is keyed as one unit.
 */
function GameView({
  game,
  roundId,
  rounds,
  liveConnection,
  lastMoveObservedAt,
  spoilerFree,
}: {
  game: WccGame
  roundId: string
  rounds: LichessRoundSummary[]
  /** Whether the transport currently believes the round is being played. */
  liveConnection: boolean
  lastMoveObservedAt?: number
  spoilerFree: boolean
}): React.JSX.Element {
  const pathname = usePathname()
  const cursor = useMoveCursor(game.plies.length)
  const [orientation, setOrientation] = React.useState<"white" | "black">("white")

  useKeyboardNav({
    onPrev: cursor.prev,
    onNext: cursor.next,
    onFirst: cursor.first,
    onLast: cursor.last,
    onFlip: () => setOrientation((o) => (o === "white" ? "black" : "white")),
    onLive: cursor.last,
  })

  // The operator types this tag by hand, so an unrecognised wording falls back
  // to the control the organisers published rather than to none at all.
  const timeControl = resolveTimeControl(game.tags.TimeControl, FEATURED_TIME_CONTROL)

  // Only the latest position of a game still being played shows a running
  // clock; a viewer who has stepped back is reading published clocks.
  const isLiveEnd = cursor.isFollowingLive && game.status === "*" && liveConnection

  return (
    <>
      <React.Suspense fallback={null}>
        <SharedPlyLink onPly={cursor.setPly} />
      </React.Suspense>

      <div id="wcc-board" tabIndex={-1} className="min-w-0 lg:col-start-1 lg:row-start-4">
        <LiveStage
          game={game}
          ply={cursor.ply}
          orientation={orientation}
          spoilerFree={spoilerFree}
          isLiveEnd={isLiveEnd}
          lastMoveObservedAt={lastMoveObservedAt}
          timeControl={timeControl}
          controls={
            <BoardControls
              ply={cursor.ply}
              maxPly={game.plies.length}
              onFirst={cursor.first}
              onPrev={cursor.prev}
              onNext={cursor.next}
              onLast={cursor.last}
              onFlip={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
              onLive={cursor.last}
              isFollowingLive={cursor.isFollowingLive}
              isLive={game.status === "*" && liveConnection}
              shareHref={pathname}
            />
          }
        />
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-span-full">
        <CompanionPanel
          game={game}
          ply={cursor.ply}
          onSelectPly={cursor.setPly}
          spoilerFree={spoilerFree}
          timeControl={timeControl}
          rounds={rounds}
          roundId={roundId}
        />
      </div>
    </>
  )
}
