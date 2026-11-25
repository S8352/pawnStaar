"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { formatEval, winPct } from "@/lib/wcc/derive"

/*
  The engine's opinion, as a bar and as a number.

  The two colours are fixed in both themes, exactly as the board squares are:
  they encode white versus black, not UI chrome, so inverting them with the
  theme would mean the bar read backwards in light mode. The dark end is the
  surface the board already sits on; the light end is the cream of the light
  squares.

  Spoiler-free is not a dimming: a `hidden` bar sits at dead even and the text
  reads as an em dash, so the number cannot be glimpsed, inferred from a
  lopsided bar, or read out of the DOM by a screen reader. The bar stays in the
  layout rather than disappearing, because a control that vanishes when you
  switch it on leaves nothing to switch back.
*/

/** Fixed in both themes — see the note above. */
const TRACK_CLASS = "bg-[hsl(220_17%_18%)]"
const WHITE_FILL_CLASS = "bg-[hsl(60_20%_95%)]"

/** Dead even, which is what a hidden evaluation shows. */
const EVEN_PCT = 50

export interface EvalBarProps {
  evalCp?: number
  evalMate?: number
  boardOrientation: "white" | "black"
  axis: "vertical" | "horizontal"
  hidden: boolean
  className?: string
}

export function EvalBar({
  evalCp,
  evalMate,
  boardOrientation,
  axis,
  hidden,
  className,
}: EvalBarProps): React.JSX.Element {
  const pct = hidden ? EVEN_PCT : winPct(evalCp, evalMate)
  const vertical = axis === "vertical"

  // White's share grows from whichever end of the bar White's pieces are on,
  // so the bar reads the same way round as the board beside it.
  const whiteAtStart = boardOrientation === "white"
  const fillAnchor = vertical
    ? whiteAtStart
      ? "inset-x-0 bottom-0"
      : "inset-x-0 top-0"
    : whiteAtStart
      ? "inset-y-0 left-0"
      : "inset-y-0 right-0"

  return (
    <div
      role="meter"
      aria-label="Evaluation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={hidden ? "Evaluation hidden" : formatEval(evalCp, evalMate)}
      className={cn(
        "relative overflow-hidden",
        TRACK_CLASS,
        vertical ? "h-full w-3" : "h-2.5 w-full",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute transition-[height,width] duration-200 ease-editorial",
          WHITE_FILL_CLASS,
          fillAnchor
        )}
        style={vertical ? { height: `${pct}%` } : { width: `${pct}%` }}
      />
      {hidden && <span className="sr-only">Eval hidden</span>}
    </div>
  )
}

export function EvalText({
  evalCp,
  evalMate,
  hidden,
}: {
  evalCp?: number
  evalMate?: number
  hidden: boolean
}): React.JSX.Element {
  if (hidden) {
    return (
      <span className="text-sm tabular-nums">
        <span aria-hidden>—</span>
        <span className="sr-only">Evaluation hidden</span>
      </span>
    )
  }

  return <span className="text-sm tabular-nums">{formatEval(evalCp, evalMate)}</span>
}

/** The bar at list-row width, for showing an evaluation beside a move. */
export function MiniEvalBar({
  evalCp,
  evalMate,
  hidden,
}: {
  evalCp?: number
  evalMate?: number
  hidden: boolean
}): React.JSX.Element {
  return (
    <EvalBar
      evalCp={evalCp}
      evalMate={evalMate}
      boardOrientation="white"
      axis="vertical"
      hidden={hidden}
      className="h-full w-1"
    />
  )
}
