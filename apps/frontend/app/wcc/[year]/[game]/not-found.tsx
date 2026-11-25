import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { WCC_YEAR } from "@/lib/wcc/config"
import { yearHref } from "@/lib/wcc/routes"

/*
  A game number the championship does not have — game 99, or a tiebreak day in
  a match that was decided in the classical games. The way out is the round the
  tournament is actually on, not the home page.
*/

export default function WccGameNotFound(): React.JSX.Element {
  return (
    <EmptyState
      title="Could not load this game."
      description="There is no such game in this championship yet."
      action={
        <Button variant="outline" asChild>
          <Link href={yearHref(WCC_YEAR)}>Go to the current game</Link>
        </Button>
      }
    />
  )
}
