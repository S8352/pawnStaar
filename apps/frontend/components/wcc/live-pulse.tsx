"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { fetchTourSnapshot } from "@/lib/wcc/client"
import { FEATURED_TOUR_ID } from "@/lib/wcc/config"

/*
  The "a game is being played right now" dot, in two forms.

  `LiveDot` is the dot itself, which the status banner, the round strip and the
  match header all need; it says nothing on its own and is always labelled by
  whatever it sits beside.

  `LivePulse` is the navbar's version, which has to find out for itself. It asks
  once, after mount. Not on the server: the navbar is on every page of the site,
  and blocking a marketing page's render on a Lichess round list would be a poor
  trade for a 6px dot. Not on a timer either, for the same reason — a visitor on
  the hub gets the live state from the page itself, and one who is not can
  afford a dot that is a page load stale. Nothing renders until the answer is
  yes, so a slow or failed request costs the navbar nothing.

  The global reduced-motion rule in `globals.css` stops the ping for anyone who
  has asked for less movement; the dot stays, because it is the information.
*/

export function LiveDot({ className }: { className?: string }): React.JSX.Element {
  return (
    <span aria-hidden className={cn("relative flex h-1.5 w-1.5 shrink-0", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
    </span>
  )
}

export function LivePulse(): React.JSX.Element | null {
  const [live, setLive] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()

    fetchTourSnapshot(FEATURED_TOUR_ID, controller.signal)
      .then(({ rounds }) => setLive(rounds.some((round) => round.ongoing === true)))
      .catch(() => {
        // A dot that cannot be confirmed is simply not drawn.
      })

    return () => controller.abort()
  }, [])

  if (!live) return null

  return (
    <>
      <LiveDot />
      <span className="sr-only">live now</span>
    </>
  )
}
