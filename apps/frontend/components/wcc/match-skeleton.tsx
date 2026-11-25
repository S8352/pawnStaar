import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"

/*
  The shape of the match page while the round is being fetched.

  Deliberately the real layout rather than a spinner: the board is a square in a
  60/40 grid with a score strip and a row of round pills above it, and holding
  that space means nothing jumps when the game arrives.

  This is a Suspense fallback inside the route rather than a `loading.tsx` file.
  A `loading.tsx` anywhere above this page flushes the shell before the page
  body runs, and `notFound()` and `redirect()` thrown after that cannot set a
  status: `/wcc/2026` answered 200 with a client-side redirect instead of 307,
  and `/wcc/2026/game-99` answered 200 with the not-found UI instead of 404.
  Resolving the round first and suspending only on the fetch keeps both the
  status codes and the skeleton.
*/

/** Fourteen classical games, so fourteen pills. */
const PILL_COUNT = 14

/** Enough move rows to fill the panel without pretending to know the game. */
const MOVE_ROW_COUNT = 12

export function WccMatchSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto grid max-w-[1440px] gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,60fr)_minmax(320px,40fr)] lg:items-start">
      <div className="min-w-0 space-y-4">
        <Skeleton className="h-11 w-full" />

        <div className="flex gap-1 overflow-hidden">
          {Array.from({ length: PILL_COUNT }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-11 shrink-0" />
          ))}
        </div>

        <Skeleton className="aspect-square w-full" />
      </div>

      <div className="min-w-0 space-y-2">
        {Array.from({ length: MOVE_ROW_COUNT }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  )
}
