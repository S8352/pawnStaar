"use client"

import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { useNow } from "@/hooks/use-now"
import { VENUE_TIME_ZONE } from "@/lib/wcc/config"
import { QUICK_ZONES, formatCountdown, formatInZone, viewerTimeZone } from "@/lib/wcc/time"

/*
  How long until the game starts, and what time that is where you are.

  "19:00" on its own is the most common way to get a chess start time wrong, so
  the zone is always named and the viewer's own is worked out for them rather
  than left as arithmetic. The venue's zone leads because that is the one the
  organisers publish and the commentators quote.

  Nothing here renders until the browser has a clock. `useNow` returns null on
  the server and on the first client render for exactly this reason: a countdown
  and a local zone are both readings of the machine the page is on, and
  rendering either during SSR would hand the hydrating client different text
  from the one it was sent.
*/

export function Countdown({
  startsAt,
  roundName,
}: {
  startsAt?: number
  roundName: string
}): React.JSX.Element | null {
  const now = useNow(startsAt === undefined ? null : 1000)

  if (startsAt === undefined) return null

  if (now === null) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-48" />
        <span className="sr-only">Loading start time…</span>
      </div>
    )
  }

  const viewerZone = viewerTimeZone()

  // The venue's zone and the viewer's lead; repeating either as a quick zone
  // would only pad the list, and in India it would pad it with itself.
  const alreadyListed = new Set<string>([VENUE_TIME_ZONE, viewerZone])

  const rows: { label: string; timeZone: string }[] = [
    { label: "Venue", timeZone: VENUE_TIME_ZONE },
    ...(viewerZone === VENUE_TIME_ZONE ? [] : [{ label: "Your time", timeZone: viewerZone }]),
    ...QUICK_ZONES.filter((zone) => !alreadyListed.has(zone.timeZone)),
  ]

  return (
    <div className="flex flex-col gap-2">
      <p className="micro-label text-muted-foreground">
        <span className="sr-only">{roundName} </span>Starts in
      </p>

      <p className="font-display text-2xl tabular-nums">{formatCountdown(startsAt - now)}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {rows.map((row) => (
          <React.Fragment key={row.label}>
            <dt className="micro-label">{row.label}</dt>
            <dd className="tabular-nums">
              {formatInZone(startsAt, row.timeZone, { withDate: true })}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  )
}
