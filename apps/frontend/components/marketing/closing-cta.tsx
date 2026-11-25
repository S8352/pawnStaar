import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/ui/reveal"

/*
  The atmospheric closing CTA, bookending the hero.

  It sits on `bg-surface` rather than the page background so it still reads as
  a distinct band — but it follows the theme now instead of being pinned dark,
  so the page no longer opens light and closes black.

  One action only. The FAQ directly above handles the remaining objections; by
  this point there is nothing left to offer except the button.
*/
export function ClosingCTA() {
  return (
    <section className="relative isolate overflow-hidden bg-surface text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06] dark:opacity-[0.16]"
        style={{
          background: "radial-gradient(circle, hsl(var(--gold)) 0%, transparent 62%)",
        }}
      />

      <div className="container relative mx-auto container-padding">
        <Reveal stagger className="mx-auto max-w-3xl py-32 text-center md:py-44">
          <h2 className="font-display text-display text-balance">
            Every move.
            {/* Display-size, so 3:1 applies — see the note in hero.tsx. */}
            <span className="block text-foreground/55">As it happens.</span>
          </h2>

          <p className="mx-auto mt-8 max-w-md text-body text-muted-foreground">
            The world title is being decided in Geneva. The board, both clocks and the
            evaluation, live.
          </p>

          <div className="mt-11 flex justify-center">
            <Button size="lg" asChild>
              <Link href="/wcc">Follow the match</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
