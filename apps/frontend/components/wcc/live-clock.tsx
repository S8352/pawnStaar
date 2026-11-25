"use client"

import * as React from "react"

import { useNow } from "@/hooks/use-now"
import { cn } from "@/lib/utils"
import { formatClock, remainingMs } from "@/lib/wcc/clock"

/*
  One player's clock.

  The reading comes from the broadcast, which only publishes it once per move;
  between moves the side to move is counting down with nobody telling us so.
  `running` is therefore the caller's assertion that this colour is on the move
  in a game still being played, and the countdown is extrapolated from the last
  published reading plus the moment it was observed. A clock that is not
  running shows exactly what was published and nothing else — a viewer who has
  stepped back through the moves is reading history, not a live clock.

  The element is `aria-live="off"` on purpose. A clock that announced itself
  every second would make the page unusable with a screen reader; the reading
  is in the label, available on demand.
*/

/** Below this the reading turns to the warning colour. */
const DEFAULT_LOW_MS = 60_000

export interface LiveClockProps {
  baseMs?: number
  baseAt?: number
  running: boolean
  label: string
  lowMs?: number
  className?: string
}

export function LiveClock({
  baseMs,
  baseAt,
  running,
  label,
  lowMs = DEFAULT_LOW_MS,
  className,
}: LiveClockProps): React.JSX.Element {
  // `useNow` is null until after hydration, so the first paint and the server
  // render both show the published reading: no mismatch, and no jump.
  const now = useNow(running ? 1000 : null)

  const displayedMs =
    running && now !== null && baseAt !== undefined && baseMs !== undefined
      ? remainingMs(baseMs, baseAt, now)
      : baseMs

  const text = formatClock(displayedMs)
  const low = running && displayedMs !== undefined && displayedMs < lowMs

  return (
    // `min-w` holds the box across `1:59:59` → `59:59` → `9:59`, so a clock
    // crossing an hour does not drag the strip around it.
    <span
      aria-live="off"
      aria-label={`${label} ${text}`}
      className={cn(
        "inline-block min-w-[4.5rem] text-right font-mono text-sm tabular-nums",
        low && "text-warning",
        className
      )}
    >
      {text}
    </span>
  )
}
