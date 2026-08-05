import * as React from "react"

import { cn } from "@/lib/utils"

/*
  The PawnStaar mark, redrawn as vector.

  It replaces the logo.png raster for one reason: the pawn is near-black, so on
  any dark surface it disappeared. Here the pawn is `currentColor`, so it simply
  inherits whatever text colour its container has — cream on dark, near-black on
  light — with no theme prop, no second asset and no hydration flash. The star
  stays gold in both themes.

  Geometry measured off the original 900x900 raster, not eyeballed. Convex-hull
  corner detection puts the three sharp tips at (464,76), (848,350) and
  (670,802); a circumcircle through them gives centre (476,465), R 389.

  The star is NOT a closed five-pointer. A complete one would place a tip near
  x=121, and the original has no gold at all left of x=417 — so it is an open
  arc covering only the eastern three tips, stroked rather than filled
  (sampling the centre of the original returns transparent). Both ends of the
  path terminate underneath the pawn — verified against the pawn silhouette at
  those heights — so the stroke appears to pass behind it.

  logo.png stays on disk: app/plan/page.tsx uses it as the OpenGraph image,
  which has to be a raster.
*/

/*
  Both endpoints are pushed well inside the pawn silhouette — (380,342) sits in
  the head, which spans x 262..550 at that height, and (438,580) sits in the
  body, which spans x 335..471 there. Ending exactly at the geometric inner
  vertex left the cap poking out past the body edge.
*/
const STAR = "M 380 342 L 464 76 L 564 336 L 848 350 L 626 509 L 670 802 L 438 580"

// Neck pinches to half-width 32 at y440, then flares concavely to y741.
const PAWN_BODY =
  "M 374 445 C 372 570 317 672 246 741 L 557 741 C 495 672 441 570 438 445 Z"

export function LogoMark({
  className,
  title,
}: {
  className?: string
  /** Supply only when the mark stands alone; beside the wordmark it is decorative. */
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 900 900"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* Behind the pawn, stroked rather than filled, and open at both ends. */}
      <path
        d={STAR}
        fill="none"
        stroke="hsl(var(--gold))"
        strokeWidth="62"
        strokeLinejoin="round"
        strokeLinecap="butt"
      />
      <g fill="currentColor">
        <circle cx="406" cy="295" r="146" />
        <path d={PAWN_BODY} />
        {/* Sharp-cornered plinth, matching the radius-0 system. */}
        <rect x="189" y="777" width="426" height="48" />
      </g>
    </svg>
  )
}
