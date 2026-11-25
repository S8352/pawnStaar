"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"

import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { formatEval, thinkTimeMs } from "@/lib/wcc/derive"
import type { Ply, TimeControl } from "@/types/wcc"

/*
  The move list, which is also the game's navigation.

  Two things it deliberately does not do:

  - It never calls `scrollIntoView`. That scrolls every scrollable ancestor,
    which on this page means the whole article jumps whenever a move arrives.
    The current cell is positioned against this container instead, and only
    when it has actually left the visible band. The container is `relative` so
    that it is the cell's `offsetParent` and `offsetTop` needs no correction.
  - It never shows an evaluation while spoiler-free is on, not even dimmed:
    the point of the setting is that the number cannot be glimpsed.

  Think time is a bar rather than a number so a glance down the list shows
  where the long thinks were. The seconds stay available as a tooltip and to
  screen readers, because a bar on its own cannot be read out.
*/

/** The think-time bar is a 2px rule, thin enough not to read as a divider. */
const THINK_BAR_HEIGHT = "h-0.5"

export interface MoveListProps {
  plies: Ply[]
  currentPly: number
  onSelect(ply: number): void
  spoilerFree: boolean
  timeControl: TimeControl | null
  eco?: string
  opening?: string
  className?: string
}

interface MoveCellProps {
  ply: Ply
  isCurrent: boolean
  spoilerFree: boolean
  thinkMs: number | undefined
  maxThinkMs: number
  onSelect(ply: number): void
}

const MoveCell = React.memo(function MoveCell({
  ply,
  isCurrent,
  spoilerFree,
  thinkMs,
  maxThinkMs,
  onSelect,
}: MoveCellProps): React.JSX.Element {
  // Odd plies are White's.
  const colour = ply.ply % 2 === 1 ? "white" : "black"
  const moveNumber = Math.ceil(ply.ply / 2)

  const hasEval = ply.evalCp !== undefined || ply.evalMate !== undefined
  const showEval = hasEval && !spoilerFree
  const evaluation = formatEval(ply.evalCp, ply.evalMate, 1)

  const seconds = thinkMs === undefined ? undefined : Math.round(thinkMs / 1000)
  const widthPct =
    thinkMs === undefined || maxThinkMs <= 0
      ? 0
      : Math.min(100, (thinkMs / maxThinkMs) * 100)

  return (
    <button
      type="button"
      data-ply={ply.ply}
      onClick={() => onSelect(ply.ply)}
      aria-current={isCurrent ? "step" : undefined}
      aria-label={`Move ${moveNumber}, ${colour}, ${ply.san}${
        showEval ? `, evaluation ${evaluation}` : ""
      }`}
      className={cn(
        "flex w-full flex-col gap-1 px-2 py-1.5 text-left text-sm ring-offset-background transition-colors duration-200 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isCurrent ? "bg-gold text-gold-foreground" : "hover:bg-accent"
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{ply.san}</span>
        {showEval && (
          <span
            className={cn(
              "text-xs text-muted-foreground tabular-nums",
              isCurrent && "text-gold-foreground/80"
            )}
          >
            {evaluation}
          </span>
        )}
      </span>

      {thinkMs !== undefined && (
        <>
          <span
            className={cn(
              "block w-full",
              THINK_BAR_HEIGHT,
              isCurrent ? "bg-gold-foreground/20" : "bg-border"
            )}
            title={`${seconds}s`}
            aria-hidden
          >
            <span
              className={cn(
                "block h-full",
                isCurrent ? "bg-gold-foreground/70" : "bg-gold-text"
              )}
              style={{ width: `${widthPct}%` }}
            />
          </span>
          <span className="sr-only">{`${seconds} seconds`}</span>
        </>
      )}
    </button>
  )
})

export function MoveList({
  plies,
  currentPly,
  onSelect,
  spoilerFree,
  timeControl,
  eco,
  opening,
  className,
}: MoveListProps): React.JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const thinkTimes = React.useMemo(
    () => plies.map((_, index) => thinkTimeMs(plies, index, timeControl)),
    [plies, timeControl]
  )

  const maxThinkMs = React.useMemo(
    () => thinkTimes.reduce<number>((max, ms) => (ms === undefined ? max : Math.max(max, ms)), 0),
    [thinkTimes]
  )

  const rows = React.useMemo(() => {
    const pairs: { moveNumber: number; white?: Ply; black?: Ply; whiteIndex: number }[] = []
    for (let i = 0; i < plies.length; i += 2) {
      pairs.push({
        moveNumber: i / 2 + 1,
        white: plies[i],
        black: plies[i + 1],
        whiteIndex: i,
      })
    }
    return pairs
  }, [plies])

  // Keep the current move visible without disturbing the page around it.
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const cell = container.querySelector<HTMLElement>(`[data-ply="${currentPly}"]`)
    if (!cell) return

    const top = cell.offsetTop
    const bottom = top + cell.offsetHeight
    const viewTop = container.scrollTop
    const viewBottom = viewTop + container.clientHeight

    if (top < viewTop) container.scrollTop = top
    else if (bottom > viewBottom) container.scrollTop = bottom - container.clientHeight
    // Keyed on the cursor alone: a viewer who has pinned a move and scrolled
    // away should not be yanked back every time a new move arrives.
  }, [currentPly])

  if (plies.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          title="Moves not available for this game yet."
          description="The board will update as soon as Lichess publishes the first move."
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="Moves"
      className={cn(
        "relative overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-14rem)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // `scroll-behavior` governs the scrollTop assignment above, so reduced
        // motion is handled by not asking for smooth in the first place.
        !reduced && "scroll-smooth",
        className
      )}
    >
      {(eco || opening) && (
        <p className="micro-label border-b border-border px-2 py-2 text-muted-foreground">
          {[eco, opening].filter(Boolean).join(" · ")}
        </p>
      )}

      <ol>
        {rows.map(({ moveNumber, white, black, whiteIndex }) => (
          <li key={moveNumber} className="grid grid-cols-[2.5rem_1fr_1fr] odd:bg-surface">
            <span className="flex items-center px-2 py-1.5 text-sm text-muted-foreground tabular-nums">
              {moveNumber}.
            </span>

            {white ? (
              <MoveCell
                ply={white}
                isCurrent={white.ply === currentPly}
                spoilerFree={spoilerFree}
                thinkMs={thinkTimes[whiteIndex]}
                maxThinkMs={maxThinkMs}
                onSelect={onSelect}
              />
            ) : (
              <span />
            )}

            {black ? (
              <MoveCell
                ply={black}
                isCurrent={black.ply === currentPly}
                spoilerFree={spoilerFree}
                thinkMs={thinkTimes[whiteIndex + 1]}
                maxThinkMs={maxThinkMs}
                onSelect={onSelect}
              />
            ) : (
              <span />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
