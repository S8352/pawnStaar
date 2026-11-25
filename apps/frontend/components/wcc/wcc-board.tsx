"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import { Chessboard } from "react-chessboard"

import { BOARD_DARK_SQUARE, BOARD_LIGHT_SQUARE } from "@/components/ui/chessboard"
import { cn } from "@/lib/utils"

/*
  The spectator's board: a position to read, never a position to play.

  Square colours come from the play board rather than from the theme tokens,
  so a game watched here and a game played in /play look like the same board.
  They deliberately do not invert in light mode — see the note on those
  constants — and react-chessboard takes them as props, not classes.

  The last move is marked with a gold tint *and* an inset outline. Colour alone
  would be the only cue for a colour-blind viewer, and on a board already made
  of two greens a tint by itself is easy to miss.
*/

/** Gold wash plus an outline, so the highlight is not colour-only. */
const LAST_MOVE_STYLE: Record<string, string> = {
  backgroundColor: "hsl(47 78% 59% / 0.5)",
  boxShadow: "inset 0 0 0 2px hsl(47 78% 40%)",
}

const DEFAULT_ANIMATION_MS = 150

export interface WccBoardProps {
  fen: string
  orientation: "white" | "black"
  lastMove?: { from: string; to: string }
  animationMs?: number
  /** Describes the position for screen readers; the board itself is an image. */
  ariaLabel: string
  className?: string
}

export function WccBoard({
  fen,
  orientation,
  lastMove,
  animationMs,
  ariaLabel,
  className,
}: WccBoardProps): React.JSX.Element {
  const reduced = useReducedMotion()

  const customSquareStyles = React.useMemo(
    () =>
      lastMove
        ? { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE }
        : undefined,
    [lastMove]
  )

  return (
    // `pan-y` keeps a vertical page scroll that starts on the board working;
    // the board itself has nothing to drag.
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("w-full aspect-square select-none", className)}
      style={{ touchAction: "pan-y" }}
    >
      <Chessboard
        id="wcc-board"
        position={fen}
        boardOrientation={orientation}
        arePiecesDraggable={false}
        areArrowsAllowed={false}
        showBoardNotation
        animationDuration={reduced ? 0 : animationMs ?? DEFAULT_ANIMATION_MS}
        customLightSquareStyle={{ backgroundColor: BOARD_LIGHT_SQUARE }}
        customDarkSquareStyle={{ backgroundColor: BOARD_DARK_SQUARE }}
        customBoardStyle={{ borderRadius: 0 }}
        customSquareStyles={customSquareStyles}
        onPieceDrop={() => false}
      />
    </div>
  )
}
