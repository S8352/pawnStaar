"use client"

import * as React from "react"
import { Download, ExternalLink } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MoveList } from "@/components/wcc/move-list"
import { cn } from "@/lib/utils"
import { OFFICIAL_LINKS, VENUE_TIME_ZONE } from "@/lib/wcc/config"
import { formatInZone, viewerTimeZone } from "@/lib/wcc/time"
import type { LichessRoundSummary, TimeControl, WccGame } from "@/types/wcc"

/*
  The column beside the board: the moves, and everything else worth having to
  hand while watching.

  Two tabs rather than a stack, because the move list wants all the height it
  can get on a laptop and the schedule is read once. The board never moves when
  the tab changes — the panel is its own grid column on a desktop and sits below
  the board on a phone — so switching is free.

  The schedule prints every round twice: once in the venue's zone, which is the
  one the organisers publish, and once in the viewer's. The second column only
  appears after mount, because the viewer's zone is a property of the browser
  and a server render cannot know it.
*/

export interface CompanionPanelProps {
  game: WccGame
  ply: number
  onSelectPly(ply: number): void
  spoilerFree: boolean
  timeControl: TimeControl | null
  rounds: LichessRoundSummary[]
  roundId: string
}

const LINK_CLASS =
  "micro-label flex min-h-[44px] items-center gap-2 border-b border-border text-gold-text hover:opacity-60"

export function CompanionPanel({
  game,
  ply,
  onSelectPly,
  spoilerFree,
  timeControl,
  rounds,
  roundId,
}: CompanionPanelProps): React.JSX.Element {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const round = rounds.find((entry) => entry.id === roundId)
  const viewerZone = mounted ? viewerTimeZone() : null

  return (
    <Tabs defaultValue="moves" className="flex flex-col">
      <TabsList className="self-start">
        <TabsTrigger value="moves">Moves</TabsTrigger>
        <TabsTrigger value="info">Info</TabsTrigger>
      </TabsList>

      <TabsContent value="moves">
        {/* The time-control phase badge lives in the stage, beside the
            evaluation text; repeating it here showed it twice on a phone. */}
        <MoveList
          plies={game.plies}
          currentPly={ply}
          onSelect={onSelectPly}
          spoilerFree={spoilerFree}
          timeControl={timeControl}
          eco={game.tags.ECO}
          opening={game.tags.Opening}
        />
      </TabsContent>

      <TabsContent value="info">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="micro-label pb-2 text-left text-muted-foreground">
              Schedule
            </caption>
            <thead>
              <tr className="micro-label text-muted-foreground">
                <th scope="col" className="px-2 py-2 text-left font-normal">
                  Round
                </th>
                <th scope="col" className="px-2 py-2 text-left font-normal">
                  Venue
                </th>
                {viewerZone !== null && (
                  <th scope="col" className="px-2 py-2 text-left font-normal">
                    Your time
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rounds.map((entry) => (
                <tr
                  key={entry.id}
                  aria-current={entry.id === roundId ? "true" : undefined}
                  className={cn(
                    "border-t border-border",
                    entry.id === roundId && "bg-surface font-medium"
                  )}
                >
                  <th scope="row" className="px-2 py-2 text-left font-normal">
                    {entry.name}
                    {entry.id === roundId && <span className="sr-only"> (showing)</span>}
                  </th>
                  <td className="px-2 py-2 tabular-nums">
                    {entry.startsAt === undefined
                      ? "—"
                      : formatInZone(entry.startsAt, VENUE_TIME_ZONE, { withDate: true })}
                  </td>
                  {viewerZone !== null && (
                    <td className="px-2 py-2 tabular-nums">
                      {entry.startsAt === undefined
                        ? "—"
                        : formatInZone(entry.startsAt, viewerZone, { withDate: true })}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="micro-label mt-4 text-muted-foreground">
          Venue times are {VENUE_TIME_ZONE.replace("_", " ")}
          {viewerZone === null ? "" : `; your times are ${viewerZone.replace("_", " ")}`}.
        </p>

        <nav aria-label="Championship links" className="mt-4 flex flex-col">
          <a href={OFFICIAL_LINKS.fide} className={LINK_CLASS} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            Official championship site
          </a>
          <a
            href={OFFICIAL_LINKS.regulations}
            className={LINK_CLASS}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            Regulations
          </a>
          {round !== undefined && (
            <a href={round.url} className={LINK_CLASS} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              {round.name} on Lichess
            </a>
          )}
          <a href={`/api/wcc/round/${roundId}/pgn`} download className={LINK_CLASS}>
            <Download aria-hidden className="h-3.5 w-3.5" />
            Download PGN
          </a>
        </nav>
      </TabsContent>
    </Tabs>
  )
}
