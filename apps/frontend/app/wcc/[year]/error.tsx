"use client"

import * as React from "react"
import { WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

/*
  What a visitor sees when Lichess cannot be reached at all.

  It says that and nothing more. The upstream status code, the breaker state and
  the retry window are of no use to someone who wants to watch a chess game, and
  the one useful action — ask again — is a button rather than an instruction to
  reload.
*/

export default function WccError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.JSX.Element {
  React.useEffect(() => console.error(error), [error])

  return (
    <EmptyState
      icon={WifiOff}
      title="Could not reach Lichess."
      description="The live feed is temporarily unavailable."
      action={
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      }
    />
  )
}
