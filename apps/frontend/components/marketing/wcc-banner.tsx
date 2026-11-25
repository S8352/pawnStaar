"use client"

import * as React from "react"
import Link from "next/link"

import { LiveDot } from "@/components/wcc/live-pulse"
import { fetchTourSnapshot } from "@/lib/wcc/client"
import { FEATURED_TOUR_ID, WCC_PLAYERS } from "@/lib/wcc/config"
import { isRoundFinished } from "@/lib/wcc/round-state"
import { gameNumberOf, pickCurrentRound } from "@/lib/wcc/rounds"
import { formatInZone, viewerTimeZone } from "@/lib/wcc/time"

/*
  The strip above the hero that sends visitors to the championship hub.

  The server renders only what is true regardless of time: the event and the
  two players. The status — "Game 2 · live now", or the next start in the
  viewer's own time zone — is appended after mount, because the viewer's time
  zone is unknown on the server and a hydration mismatch here would be paid on
  every visit to the home page. One request, no timer: a visitor who clicks
  through gets the live state from the hub itself.
*/

type Status = { text: string; live: boolean } | null

function describe(round: Parameters<typeof gameNumberOf>[0], now: number): Status {
  const n = gameNumberOf(round)
  const name = n != null ? `Game ${n}` : round.name
  if (round.ongoing === true) return { text: `${name} · live now`, live: true }
  if (isRoundFinished(round)) return { text: `${name} finished · more to come`, live: false }
  if (round.startsAt != null && round.startsAt > now) {
    return {
      text: `${name} · ${formatInZone(round.startsAt, viewerTimeZone(), { withDate: true })} your time`,
      live: false,
    }
  }
  return { text: `${name} · starting`, live: false }
}

export function WccBanner(): React.JSX.Element {
  const [status, setStatus] = React.useState<Status>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    fetchTourSnapshot(FEATURED_TOUR_ID, controller.signal)
      .then((tour) => {
        const round = pickCurrentRound(tour, Date.now())
        if (round) setStatus(describe(round, Date.now()))
      })
      .catch(() => {
        // The static line stands on its own; a failed request adds nothing.
      })
    return () => controller.abort()
  }, [])

  const [a, b] = WCC_PLAYERS

  return (
    <div className="border-b border-border bg-surface">
      <div className="container mx-auto container-padding">
        <Link
          href="/wcc"
          className="micro-label flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 py-2 text-foreground transition-opacity duration-200 ease-editorial hover:opacity-70"
        >
          <span className="text-gold-text">World Championship 2026</span>
          <span className="text-muted-foreground">
            {a.displayName} vs {b.displayName}
          </span>
          {status && (
            <span className="flex items-center gap-2" aria-live="polite">
              {status.live && <LiveDot />}
              <span className={status.live ? "text-destructive" : "text-muted-foreground"}>{status.text}</span>
            </span>
          )}
          <span className="ml-auto border-b border-current pb-px">Follow every move</span>
        </Link>
      </div>
    </div>
  )
}
