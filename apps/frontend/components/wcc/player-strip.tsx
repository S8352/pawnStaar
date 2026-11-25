"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { LiveClock } from "@/components/wcc/live-clock"
import { cn } from "@/lib/utils"
import type { ColorResult } from "@/lib/wcc/results"
import type { LichessPlayer } from "@/types/wcc"

/*
  The name plate above and below the board: who is playing, which pieces they
  have, and either their clock or their score.

  Whose move it is shows three ways — the words "to move", a gold left border,
  and the running clock — because colour alone is no cue at all for a
  colour-blind viewer, and in a strip this quiet a 2px rule is easy to miss.
  The border is always drawn and merely changes colour, so the two strips never
  jog sideways as the move passes between them.

  Which colour a player has alternates from game to game, so everything here is
  driven by the `color` prop rather than by a position in the players array.
*/

/*
  The swatch shows which pieces the player has, so like the board squares it is
  deliberately the same in both themes: it encodes white versus black, not UI
  chrome. The light value is `BOARD_LIGHT_SQUARE`, spelled out because Tailwind
  only sees arbitrary values it can read as literals in the source.
*/
const SWATCH_CLASS: Record<"white" | "black", string> = {
  white: "bg-[#E4E4DC]",
  black: "bg-[#1a1a1a]",
}

/** What a score glyph means, for a screen reader that cannot see the strip. */
const RESULT_LABEL: Record<ColorResult, string> = {
  "1": "Won",
  "0": "Lost",
  "½": "Drew",
}

export interface PlayerStripProps {
  player: LichessPlayer
  color: "white" | "black"
  clockMs?: number
  clockAt?: number
  clockRunning: boolean
  isToMove: boolean
  result?: ColorResult
  className?: string
}

export function PlayerStrip({
  player,
  color,
  clockMs,
  clockAt,
  clockRunning,
  isToMove,
  result,
  className,
}: PlayerStripProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-between gap-3 border-y border-l-2 border-border px-3 bg-surface",
        isToMove ? "border-l-gold" : "border-l-transparent",
        className
      )}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <span
          aria-hidden
          className={cn(
            "h-2.5 w-2.5 shrink-0 border border-border",
            SWATCH_CLASS[color]
          )}
        />

        <span className="truncate font-display text-sm">{player.name}</span>

        {player.title && (
          <span className="micro-label shrink-0 text-gold-text">{player.title}</span>
        )}

        {player.rating !== undefined && (
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {player.rating}
          </span>
        )}

        {player.fed && (
          <span className="micro-label shrink-0 text-muted-foreground">{player.fed}</span>
        )}

        {isToMove && <span className="micro-label shrink-0">to move</span>}
      </div>

      {result ? (
        <Badge variant="secondary" aria-label={RESULT_LABEL[result]} className="shrink-0">
          {result}
        </Badge>
      ) : (
        <LiveClock
          baseMs={clockMs}
          baseAt={clockAt}
          running={clockRunning}
          label={`${color} clock`}
          className="shrink-0"
        />
      )}
    </div>
  )
}
