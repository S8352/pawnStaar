import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { phaseFor } from "@/lib/wcc/derive"
import type { TimeControl } from "@/types/wcc"

/*
  Which part of the time control the position is in.

  Under a classical championship control the first forty moves carry no
  increment at all, so a player can be down to seconds with moves still to
  make; from move 41 the increment arrives and the pressure changes character.
  That distinction is the single most useful thing to know about a clock
  reading, and it is invisible in the reading itself.

  The control itself is resolved by the caller, which passes `null` when it
  could not be established — the badge then says so rather than inventing one.
*/

/** `7_200_000` → `120`, `90_000` → `1.5`; trailing zeros dropped. */
function minutes(ms: number): number {
  return Number((ms / 60_000).toFixed(1))
}

/** `30_000` → `30`. */
function seconds(ms: number): number {
  return Math.round(ms / 1000)
}

/** The badge's text for the phase the given ply falls in. */
function phaseLabel(ply: number, tc: TimeControl | null): string {
  switch (phaseFor(ply, tc)) {
    case "no-increment": {
      const moves = tc?.phases[0]?.moves
      return moves === undefined
        ? "No increment"
        : `Moves 1–${moves} · No increment`
    }

    case "increment": {
      const incMs = tc?.phases[1]?.incMs ?? 0
      const after = tc?.phases[0]?.moves
      const increment = `+${seconds(incMs)}s/move`
      return after === undefined ? increment : `Move ${after + 1}+ · ${increment}`
    }

    default: {
      const phase = tc?.phases[0]
      if (!phase) return "—"
      return `${minutes(phase.baseMs)}+${seconds(phase.incMs)}`
    }
  }
}

export function PhaseBadge({
  ply,
  timeControl,
}: {
  ply: number
  timeControl: TimeControl | null
}): React.JSX.Element {
  const label = phaseLabel(ply, timeControl)

  return (
    <Badge
      variant="secondary"
      aria-label={timeControl ? `Time control: ${label}` : "Time control unknown"}
    >
      {label}
    </Badge>
  )
}
