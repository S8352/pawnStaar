import type React from "react"
import type { Metadata } from "next"

import { LichessAttribution } from "@/components/wcc/lichess-attribution"

/*
  The shell every WCC page shares.

  The skip link is the first focusable thing on the page and goes straight to
  the board, because the chrome above it — a sticky navbar, a score strip and
  fourteen round pills — is a lot of tabbing to get past, and the board is why
  anyone is here. It targets `#wcc-board`, which the match page puts on the
  board's container.
*/

export const metadata: Metadata = {
  title: "WCC Live · PawnStaar",
}

export default function WccLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <>
      <a
        href="#wcc-board"
        className="micro-label sr-only border border-border bg-background focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-3"
      >
        Skip to live chessboard
      </a>

      <div className="container mx-auto container-padding py-6">{children}</div>

      {/* Outside the content container but on the same gutters, so the rule
          runs the full width of the page while its text stays aligned. */}
      <div className="container mx-auto container-padding">
        <LichessAttribution />
      </div>
    </>
  )
}
