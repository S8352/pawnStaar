import * as React from "react"

import { OFFICIAL_LINKS } from "@/lib/wcc/config"

/*
  Credit where the moves come from.

  Lichess publishes these broadcasts for anyone to build on and asks only to be
  named for it, so this sits on every page of the feature rather than being
  tucked into an about box. It is a real link, not plain text: a reader who
  wants the official board should be one click from it.
*/

export function LichessAttribution({
  href = OFFICIAL_LINKS.lichess,
}: {
  href?: string
}): React.JSX.Element {
  return (
    <footer className="rule mt-10 py-6 text-xs text-muted-foreground">
      Live moves powered by{" "}
      <a
        href={href}
        className="text-gold-text underline underline-offset-4 hover:no-underline"
        target="_blank"
        rel="noreferrer"
      >
        Lichess Broadcasts
      </a>
      .
    </footer>
  )
}
