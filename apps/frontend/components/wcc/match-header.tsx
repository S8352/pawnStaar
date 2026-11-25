"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/eyebrow"
import { Countdown } from "@/components/wcc/countdown"
import { LiveDot } from "@/components/wcc/live-pulse"
import { SpoilerToggle } from "@/components/wcc/spoiler-toggle"
import { useNow } from "@/hooks/use-now"
import { cn } from "@/lib/utils"
import { ANTI_CHEAT_DELAY_MIN, WCC_YEAR } from "@/lib/wcc/config"
import {
  type MatchHeaderPlayer,
  formatPoints,
  matchHeaderPlayers,
} from "@/lib/wcc/match-presentation"
import type { PlayerScore } from "@/lib/wcc/score"
import { formatCountdown } from "@/lib/wcc/time"
import type {
  LichessRoundSummary,
  LichessTour,
  RoundConnectionStatus,
  RoundState,
  WccGame,
} from "@/types/wcc"

/*
  Who is playing, what the match stands at, and what the round is doing.

  Two versions, because the question changes with the screen. On a desktop this
  is a masthead: full names, federations, ratings and the score at display size,
  with the round's state and the spoiler switch to the side. On a phone it is a
  44px strip that follows the viewer down the page under the navbar, carrying
  the three things worth keeping on screen while scrolling a move list — the
  score, the spoiler control, and whether the game is live.

  Neither version hardcodes a colour. Which pieces each player has alternates
  from game to game, and the score is keyed by FIDE id rather than by name,
  because the PGN says "Gukesh D" where the tour metadata says "Gukesh
  Dommaraju". `matchHeaderPlayers` owns both of those; this file only lays out
  what it returns.
*/

export interface MatchHeaderProps {
  tour: LichessTour
  rounds: LichessRoundSummary[]
  scores: PlayerScore[]
  currentRound: LichessRoundSummary
  roundState: RoundState
  connection: RoundConnectionStatus
  game?: WccGame
  spoilerFree: boolean
  onSpoilerChange(v: boolean): void
}

/** `Geneva, Switzerland` → `Geneva`: the country is not news on a strip. */
const cityOf = (location: string | undefined): string | undefined => {
  const city = location?.split(",")[0]?.trim()

  return city === "" ? undefined : city
}

function PlayerName({
  player,
  className,
}: {
  player: MatchHeaderPlayer
  className?: string
}): React.JSX.Element {
  return (
    <span className={cn("flex min-w-0 flex-col", className)}>
      {/*
        A notch below the score itself. At `text-display-sm` the two full names
        and the score wrap onto three lines of 48px type on a 1440px screen and
        push the board off the bottom of a laptop — on a page whose whole point
        is the board.
      */}
      <span className="font-display text-2xl leading-tight xl:text-3xl">
        {player.displayName}
        {player.fed !== undefined && (
          <span className="ml-2 text-base text-muted-foreground">({player.fed})</span>
        )}
      </span>
      <span className="micro-label mt-1 text-muted-foreground tabular-nums">
        {player.rating === undefined ? "Rating unavailable" : `Elo ${player.rating}`}
      </span>
    </span>
  )
}

export function MatchHeader({
  tour,
  rounds,
  scores,
  currentRound,
  roundState,
  connection,
  game,
  spoilerFree,
  onSpoilerChange,
}: MatchHeaderProps): React.JSX.Element {
  // Only a round that has not started needs a ticking clock in the strip; the
  // desktop countdown runs its own, inside `Countdown`.
  const now = useNow(roundState === "upcoming" ? 1000 : null)

  const players = matchHeaderPlayers(scores, game)
  const city = cityOf(tour.info?.location)
  const eyebrow = `WCC ${WCC_YEAR}${city === undefined ? "" : ` · ${city}`}`
  const score = players.map((player) => formatPoints(player.points)).join(" – ")

  /*
    `Dommaraju 0.5 – 0.5 Sindarov`: the points meet in the middle so the strip
    reads as a scoreboard rather than as two separate tallies, and each surname
    stays next to the player it belongs to whichever way round the colours are.
  */
  const compactScore = [
    players[0]?.surname,
    players.map((player) => formatPoints(player.points)).join(" – "),
    players[1]?.surname,
  ]
    .filter((part) => part !== undefined && part !== "")
    .join(" ")

  const live = connection === "live"
  const compactStatus =
    roundState === "upcoming" && currentRound.startsAt !== undefined && now !== null
      ? formatCountdown(currentRound.startsAt - now)
      : null

  const statusBlock = (): React.JSX.Element => {
    if (live) {
      return (
        <Badge variant="destructive" className="gap-2">
          <LiveDot />
          LIVE
        </Badge>
      )
    }

    if (roundState === "upcoming") {
      return <Countdown startsAt={currentRound.startsAt} roundName={currentRound.name} />
    }

    return <Badge variant="secondary">Finished</Badge>
  }

  return (
    <header>
      {/* Desktop masthead. */}
      <div className="hidden lg:block">
        <Eyebrow className="mb-5">{eyebrow}</Eyebrow>

        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-2">
            {players[0] && <PlayerName player={players[0]} />}
            <span className="font-display text-display-sm leading-tight tabular-nums">
              {score}
            </span>
            {players[1] && <PlayerName player={players[1]} />}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 xl:items-end">
            {statusBlock()}
            <SpoilerToggle checked={spoilerFree} onCheckedChange={onSpoilerChange} />
            {ANTI_CHEAT_DELAY_MIN !== null && (
              <Badge variant="outline">
                Official anti-cheating delay: {ANTI_CHEAT_DELAY_MIN} min
              </Badge>
            )}
          </div>
        </div>

        <p className="sr-only">{`${currentRound.name} of ${rounds.length}.`}</p>
      </div>

      {/*
        Mobile strip. `top-16` clears the 64px navbar, which is sticky too, so
        the two stack rather than overlap.
      */}
      <div className="sticky top-16 z-20 flex h-11 items-center justify-between gap-2 border-b border-border bg-background/95 px-1 backdrop-blur lg:hidden">
        <p className="micro-label min-w-0 flex-1 truncate">
          <span className="sr-only">Match score: </span>
          {compactScore}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          {live && (
            <Badge variant="destructive" className="gap-1.5 px-1.5">
              <LiveDot />
              LIVE
            </Badge>
          )}
          {!live && compactStatus !== null && (
            <span className="micro-label text-muted-foreground tabular-nums">{compactStatus}</span>
          )}
          {!live && roundState === "finished" && (
            <Badge variant="secondary" className="px-1.5">
              Finished
            </Badge>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-pressed={spoilerFree}
            aria-label={spoilerFree ? "Show evaluations" : "Hide evaluations"}
            onClick={() => onSpoilerChange(!spoilerFree)}
          >
            {spoilerFree ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>
    </header>
  )
}
