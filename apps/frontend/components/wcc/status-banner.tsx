"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { LiveDot } from "@/components/wcc/live-pulse"
import { useNow } from "@/hooks/use-now"
import { cn } from "@/lib/utils"
import { statusText } from "@/lib/wcc/status-text"
import type {
  GameResult,
  RoundConnectionStatus,
  RoundState,
  WccTransport,
} from "@/types/wcc"

/*
  One line, under the round strip, saying what the page is currently doing.

  It is the only place the transport is allowed to speak. The board shows the
  position; everything about streams, polls, backoff and rate limits is confined
  here so that a reconnect never decorates the game itself. The wording lives in
  `lib/wcc/status-text` — this component only paints it.

  A single live region, not one per fact: a screen reader should hear "playing
  now, reconnecting" as one sentence rather than as two interleaved updates.
*/

export interface StatusBannerProps {
  roundState: RoundState
  connection: RoundConnectionStatus
  transport: WccTransport
  retryInSec: number | null
  error: { status: number; code: string } | null
  startsAt?: number
  result?: GameResult
  /** Full moves played, not plies. */
  moveCount?: number
  onRetry(): void
  className?: string
}

export function StatusBanner({
  roundState,
  connection,
  transport,
  retryInSec,
  error,
  startsAt,
  result,
  moveCount,
  onRetry,
  className,
}: StatusBannerProps): React.JSX.Element {
  // Only an upcoming round counts down, so nothing else pays for a timer.
  const now = useNow(roundState === "upcoming" ? 1000 : null)

  const status = statusText({
    roundState,
    connection,
    transport,
    retryInSec,
    error,
    startsAt,
    result,
    moveCount,
    now,
  })

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("rule flex items-center gap-3 py-2 micro-label", className)}
    >
      {roundState === "live" && connection === "live" && <LiveDot />}

      <span>{status.text}</span>

      {status.suffix && (
        <span
          className={cn(
            status.suffixTone === "warning" ? "text-warning" : "text-muted-foreground"
          )}
        >
          {status.suffix}
        </span>
      )}

      {status.polling && <span className="text-muted-foreground">· polling</span>}

      {status.showRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
