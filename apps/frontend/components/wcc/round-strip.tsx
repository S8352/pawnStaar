"use client"

import * as React from "react"
import Link from "next/link"
import { useReducedMotion } from "motion/react"

import { LiveDot } from "@/components/wcc/live-pulse"
import { cn } from "@/lib/utils"
import { WCC_YEAR } from "@/lib/wcc/config"
import { type RoundPill, roundPills } from "@/lib/wcc/round-pills"
import { formatInZone, viewerTimeZone } from "@/lib/wcc/time"
import type { LichessRoundSummary, WccGame } from "@/types/wcc"

/*
  The fourteen games as one scrollable row.

  It is navigation, so it is a `<nav>` of real links: a viewer can middle-click
  game 9, and the browser's own history works. The active pill carries
  `aria-current="page"` as well as the gold fill, because the fill is the only
  other thing marking it and colour is not a cue for everyone.

  Round *numbers* never come from a position in this list. Lichess round names
  are typed by a human, and a tournament that gains a tiebreak round or has its
  rounds re-ordered would otherwise silently relabel every link.

  Start dates are drawn only after mount: they are formatted in the viewer's own
  zone, which the server cannot know, and a date rendered during SSR would not
  match the one the browser produces. They are decoration either way — the
  companion panel carries the full schedule with its zones named — so each pill
  states its own name and state in words instead.
*/

/** What `G7` means, said in full for anyone who cannot see the strip. */
function pillLabel(pill: RoundPill): string {
  if (pill.state === "ongoing") return `${pill.title}, live`

  if (pill.state === "finished") {
    if (pill.result === undefined) return `${pill.title}, finished`

    return `${pill.title}, ${pill.result === "½" ? "drawn" : pill.result}`
  }

  return pill.title
}

/** The second line of a pill: a result, a live dot, or a date. */
function PillDetail({
  pill,
  showDates,
}: {
  pill: RoundPill
  showDates: boolean
}): React.JSX.Element | null {
  if (pill.state === "ongoing") return <LiveDot />

  if (pill.state === "finished") {
    return <span className="tabular-nums opacity-70">{pill.result ?? "✓"}</span>
  }

  if (pill.startsAt === undefined || !showDates) return null

  return (
    <span className="tabular-nums opacity-70">
      {formatInZone(pill.startsAt, viewerTimeZone(), { withDate: true })}
    </span>
  )
}

export function RoundStrip({
  rounds,
  activeRoundId,
  games,
}: {
  rounds: LichessRoundSummary[]
  activeRoundId: string
  games?: Record<string, WccGame>
}): React.JSX.Element {
  const scroller = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Game 11 of 14 is off the right-hand edge on a phone, so the pill the page
  // is actually showing is brought into view. `block: "nearest"` keeps the
  // scroll horizontal: the strip sits near the top of the page and has no
  // business moving the article under it.
  React.useEffect(() => {
    const active = scroller.current?.querySelector<HTMLElement>('[aria-current="page"]')

    active?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduced ? "auto" : "smooth",
    })
  }, [activeRoundId, reduced])

  const pills = roundPills({ rounds, activeRoundId, year: WCC_YEAR, games })

  return (
    <nav aria-label="Rounds">
      <div ref={scroller} className="flex gap-1 overflow-x-auto py-2">
        {pills.map((pill) => (
          <Link
            key={pill.key}
            href={pill.href}
            aria-current={pill.active ? "page" : undefined}
            aria-label={pillLabel(pill)}
            title={pill.title}
            className={cn(
              "flex min-h-[44px] min-w-[44px] shrink-0 flex-col items-center justify-center gap-1 px-3 text-center text-xs transition-colors duration-200 ease-editorial",
              pill.active
                ? "bg-gold text-gold-foreground"
                : "border border-border hover:bg-surface"
            )}
          >
            <span className="micro-label">{pill.label}</span>
            <PillDetail pill={pill} showDates={mounted} />
          </Link>
        ))}
      </div>
    </nav>
  )
}
