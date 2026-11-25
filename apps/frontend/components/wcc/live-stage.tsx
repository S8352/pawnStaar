"use client"

import * as React from "react"

import { EvalBar, EvalText } from "@/components/wcc/eval-bar"
import { PhaseBadge } from "@/components/wcc/phase-badge"
import { PlayerStrip } from "@/components/wcc/player-strip"
import { WccBoard } from "@/components/wcc/wcc-board"
import { cn } from "@/lib/utils"
import { clocksAtPly } from "@/lib/wcc/clock"
import { lastMoveSquares, sideToMove } from "@/lib/wcc/fen"
import { moveAnnouncement, moveLabel, resultForColor } from "@/lib/wcc/results"
import { MOVE_ANNOUNCE_STORAGE_KEY } from "@/lib/wcc/storage-keys"
import type { TimeControl, WccGame } from "@/types/wcc"

/*
  The board and everything pinned to it: the two name plates, the evaluation
  bar, the phase of the time control, and whatever transport controls the
  parent passes in.

  The parent owns the cursor, so this component is a pure function of "which
  position are we looking at". That is what makes the clock honest: a viewer
  who has stepped back is reading the clocks exactly as they were published,
  and only the live end of a live game extrapolates a countdown.

  Which player has which colour alternates from game to game. The only thing
  assumed here is Lichess's own convention that `players[0]` is White; top and
  bottom are then chosen by board orientation, and results and clocks are
  always looked up by colour.

  The evaluation bar exists twice because it changes axis, not just size: a
  vertical bar beside the board on a desktop, a horizontal strip above it on a
  phone. Only one of the two is ever displayed, so only one reaches the
  accessibility tree.
*/

export interface LiveStageProps {
  game: WccGame
  ply: number
  orientation: "white" | "black"
  spoilerFree: boolean
  isLiveEnd: boolean
  lastMoveObservedAt?: number
  timeControl: TimeControl | null
  /** BoardControls rendered by the parent so it owns cursor/handlers. */
  controls: React.ReactNode
  className?: string
}

/**
 * Whether the viewer has switched move announcements off.
 *
 * Read at announcement time rather than cached, so a change made in another
 * tab is honoured straight away. Storage throws outright in some privacy
 * modes, where the default (announce) applies.
 */
function announcementsDisabled(): boolean {
  try {
    return window.localStorage.getItem(MOVE_ANNOUNCE_STORAGE_KEY) === "off"
  } catch {
    return false
  }
}

export function LiveStage({
  game,
  ply,
  orientation,
  spoilerFree,
  isLiveEnd,
  lastMoveObservedAt,
  timeControl,
  controls,
  className,
}: LiveStageProps): React.JSX.Element {
  const { plies } = game

  // Ply 0 is the position before the first move; `plies[ply - 1]` is the move
  // that produced the position on the board, and carries its evaluation.
  const played = ply > 0 ? plies[ply - 1] : undefined
  const fen = played?.fen ?? game.initialFen
  const lastMove = lastMoveSquares(played?.uci)
  const toMove = sideToMove(fen)
  const clocks = clocksAtPly(plies, ply)

  const [announcement, setAnnouncement] = React.useState("")
  const announcedPly = React.useRef<number | null>(null)

  React.useEffect(() => {
    // Only the live end is announced. A viewer stepping back through the game
    // is driving, and a live region narrating their own keystrokes is noise.
    if (ply === 0 || ply !== plies.length) return
    if (announcedPly.current === ply) return

    const firstSeen = announcedPly.current === null
    announcedPly.current = ply

    // Nothing to announce on the first render: the region reports *changes*,
    // and the position the page opened on is not one.
    if (firstSeen || announcementsDisabled()) return

    setAnnouncement(moveAnnouncement(plies, ply))
  }, [ply, plies])

  const strip = (colour: "white" | "black"): React.JSX.Element => (
    <PlayerStrip
      // Lichess's convention: index 0 is White, index 1 is Black.
      player={game.players[colour === "white" ? 0 : 1]}
      color={colour}
      clockMs={clocks[colour]}
      clockAt={lastMoveObservedAt}
      // Only the side to move counts down, and only at the live end of a game
      // still being played — a finished game shows a result here, not a clock.
      clockRunning={isLiveEnd && toMove === (colour === "white" ? "w" : "b")}
      isToMove={toMove === (colour === "white" ? "w" : "b")}
      result={resultForColor(game.status, colour)}
    />
  )

  const evalProps = {
    evalCp: played?.evalCp,
    evalMate: played?.evalMate,
    hidden: spoilerFree,
  }

  return (
    <section aria-label="Live board" className={className}>
      <EvalBar
        {...evalProps}
        boardOrientation={orientation}
        axis="horizontal"
        className="lg:hidden"
      />

      <div className="flex items-stretch gap-2">
        <EvalBar
          {...evalProps}
          boardOrientation={orientation}
          axis="vertical"
          className="hidden lg:block"
        />

        <div className="min-w-0 flex-1">
          {strip(orientation === "white" ? "black" : "white")}

          {/*
            Edge to edge on a phone, where the strips are full bleed too, and
            capped from `sm` up so the board never outgrows a comfortable
            reading size. On a desktop the cap also tracks the viewport height,
            so the strips and the controls stay on screen with it.
          */}
          <div className="mx-auto w-full max-w-none sm:max-w-[560px] lg:max-w-[min(560px,calc(100vh-16rem))]">
            <WccBoard
              fen={fen}
              orientation={orientation}
              lastMove={lastMove}
              ariaLabel={`Board after ${moveLabel(plies, ply)}, ${
                toMove === "w" ? "white" : "black"
              } to move`}
            />
          </div>

          {strip(orientation)}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <EvalText {...evalProps} />
        <PhaseBadge ply={ply} timeControl={timeControl} />
      </div>

      {/*
        On a phone the transport bar follows the viewer down the page: the move
        list below it is long, and losing the controls behind a scroll is how
        you end up pinching to find the Live button. `box-content` keeps the
        bar 48px tall and puts the home-indicator inset *below* it, rather than
        letting the inset squeeze the 44px buttons.
      */}
      <div
        className={cn(
          "sticky bottom-0 z-10 box-content flex h-12 items-center justify-center bg-background/95 backdrop-blur",
          "lg:static lg:h-auto lg:bg-transparent lg:backdrop-blur-none"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {controls}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  )
}
