"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FlipVertical2,
  Link2,
  Radio,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { withPly } from "@/lib/wcc/routes"

/*
  The transport bar under the board.

  Every control is a real button at the 44px floor, because this is the part of
  the page people use on a phone with one thumb while the game is running.
  Holding Prev or Next jumps to the start or the end, which is the gesture a
  video scrubber taught everyone, and it means reaching move 1 of a 60-move
  game does not take 60 taps.

  The "Live" button only exists while the viewer has stepped away from a game
  that is still being played: a button that is always there and usually inert
  teaches people to ignore it.
*/

/** Hold a step button this long and it jumps to that end of the game. */
const HOLD_MS = 400

/** How long the share confirmation stays up. */
const COPIED_MS = 2000

export interface BoardControlsProps {
  ply: number
  maxPly: number
  onFirst(): void
  onPrev(): void
  onNext(): void
  onLast(): void
  onFlip(): void
  onLive?(): void
  isFollowingLive: boolean
  isLive: boolean
  /** Base URL to copy; the current ply is appended to it. */
  shareHref?: string
  className?: string
}

/**
 * Press-and-hold behaviour for a step button: a tap steps, a hold jumps.
 *
 * The click that follows a completed hold is swallowed, so holding Prev lands
 * on move 1 rather than move 1 then move 0. Keyboard activation produces a
 * click with no pointer sequence, so it always counts as a tap.
 */
function useHoldToJump(
  onTap: () => void,
  onHold: () => void
): React.ComponentPropsWithoutRef<"button"> {
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const held = React.useRef(false)

  const clear = React.useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  React.useEffect(() => clear, [clear])

  return {
    onPointerDown: () => {
      held.current = false
      clear()
      timer.current = setTimeout(() => {
        held.current = true
        onHold()
      }, HOLD_MS)
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick: () => {
      if (held.current) {
        held.current = false
        return
      }
      onTap()
    },
    style: { touchAction: "manipulation" },
  }
}

export function BoardControls({
  ply,
  maxPly,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onFlip,
  onLive,
  isFollowingLive,
  isLive,
  shareHref,
  className,
}: BoardControlsProps): React.JSX.Element {
  const [copied, setCopied] = React.useState(false)
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  React.useEffect(
    () => () => {
      if (copiedTimer.current !== undefined) clearTimeout(copiedTimer.current)
    },
    []
  )

  const atStart = ply <= 0
  const atEnd = ply >= maxPly

  const prevProps = useHoldToJump(onPrev, onFirst)
  const nextProps = useHoldToJump(onNext, onLast)

  // A clipboard write can be refused (no permission, insecure context). There
  // is nothing useful to say about that, so the confirmation simply does not
  // appear and the URL stays in the address bar where it always was.
  const share = async (): Promise<void> => {
    if (!shareHref) return

    try {
      await navigator.clipboard.writeText(withPly(shareHref, ply))
      setCopied(true)
      if (copiedTimer.current !== undefined) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS)
    } catch {
      // Ignored on purpose.
    }
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        onClick={onFirst}
        disabled={atStart}
        aria-label="First move (Home)"
        title="First move (Home)"
      >
        <ChevronsLeft />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        disabled={atStart}
        aria-label="Previous move (left arrow)"
        title="Previous move (←)"
        {...prevProps}
      >
        <ChevronLeft />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        disabled={atEnd}
        aria-label="Next move (right arrow)"
        title="Next move (→)"
        {...nextProps}
      >
        <ChevronRight />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        onClick={onLast}
        disabled={atEnd}
        aria-label="Last move (End)"
        title="Last move (End)"
      >
        <ChevronsRight />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        onClick={onFlip}
        aria-label="Flip board (X)"
        title="Flip board (X)"
      >
        <FlipVertical2 />
      </Button>

      {isLive && !isFollowingLive && onLive && (
        <Button
          variant="default"
          className="h-11 px-4"
          onClick={onLive}
          aria-label="Jump to live (L)"
          title="Jump to live (L)"
        >
          <Radio />
          Live
        </Button>
      )}

      {shareHref && (
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          onClick={share}
          aria-label="Copy link to this position"
          title="Copy link to this position"
        >
          <Link2 />
        </Button>
      )}

      <p aria-live="polite" className="micro-label text-muted-foreground">
        {copied ? "Copied" : ""}
      </p>

      <p className="sr-only">
        Keyboard shortcuts: left and right arrows step through the moves, Home
        and End jump to the first and last move, X flips the board, L returns to
        the live position.
      </p>
    </div>
  )
}
