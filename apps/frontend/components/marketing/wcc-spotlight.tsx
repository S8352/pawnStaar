import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/eyebrow"
import { Reveal } from "@/components/ui/reveal"
import { WCC_PLAYERS, WCC_YEAR } from "@/lib/wcc/config"

/*
  Takes the slot the pricing section held, on the same `bg-surface` band, so
  the page keeps its light/dark rhythm. This section exists only to send
  people to the hub.
*/
export function WccSpotlight() {
  const [a, b] = WCC_PLAYERS

  return (
    <section id="championship" className="bg-surface section-spacing">
      <div className="container mx-auto container-padding">
        <Reveal stagger className="max-w-3xl">
          <Eyebrow index={4}>World Championship</Eyebrow>

          <h2 className="mt-6 font-display text-display-sm text-balance">
            The title match, move by move.
          </h2>

          <p className="mt-6 max-w-xl text-body text-muted-foreground">
            {a.displayName} defends the title against {b.displayName} in Geneva. Follow every
            game as it is played: the board, both clocks, the evaluation and the full move
            list.
          </p>

          <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
            <Button size="lg" asChild>
              <Link href="/wcc">Follow the match</Link>
            </Button>
            <Link
              href={`/wcc/${WCC_YEAR}/game-1`}
              className="micro-label border-b border-current pb-1 transition-colors duration-200 ease-editorial hover:text-gold-text"
            >
              Replay Game 1
            </Link>
          </div>

          <p className="mt-10 text-xs text-muted-foreground">
            Moves relayed from Lichess Broadcasts.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
