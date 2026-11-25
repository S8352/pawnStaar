import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/ui/logo"
import { Reveal } from "@/components/ui/reveal"

/*
  The hero follows the theme.

  It used to be pinned near-black in both modes. Everything here now runs on
  tokens, so light↔dark inverts the surface, the type and — because the
  chessboard motif paints with `currentColor` — the squares along with it.

  Note that hierarchy comes from `text-muted-foreground`, never from an opacity
  on the foreground. Cream at 40% over near-black reads fine; near-black at 40%
  over white lands around 2.4:1 and fails AA. The token is correct in both
  directions, an opacity is only correct in one.

  There is no usable hero photography in the repo (placeholder.jpg is a single
  pixel), so the composition is typographic. When real art arrives it goes
  behind the motif, and the controls switch to the `onDark` button variant.
*/

const STATS = [
  { value: "14", label: "Championship games, every move live" },
  { value: "15", label: "Minutes a day, that's the plan" },
  { value: "1400", label: "Where blunders stop deciding games" },
]

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-background text-foreground">
      {/*
        Chessboard motif. `currentColor` means it inverts with the theme for
        free. The opacity is per-theme because the same value reads very
        differently against white as against near-black.
      */}
      <div
        aria-hidden
        /*
          Lower in light, not higher. A dark square at 4% on white drops ~10
          levels off 255; a cream square at 2.5% on near-black lifts only ~6
          off 15 — and the eye reads the drop from white far more strongly.
        */
        className="pointer-events-none absolute inset-0 opacity-[0.018] dark:opacity-[0.025]"
        style={
          {
            // One conic tile covers 2x2 squares. Sized against the viewport so
            // it reads as a board at 375px as well as at 1440px.
            "--tile": "clamp(112px, 18vw, 280px)",
            backgroundImage:
              "conic-gradient(currentColor 0 25%, transparent 0 50%, currentColor 0 75%, transparent 0)",
            backgroundSize: "var(--tile) var(--tile)",
          } as React.CSSProperties
        }
      />
      {/* Warm light from the top-right. Turned right down in light mode, where
          it otherwise becomes a muddy yellow wash across the whole field. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 -top-1/2 h-[120vh] w-[120vh] rounded-full opacity-[0.05] dark:opacity-[0.13]"
        style={{
          background: "radial-gradient(circle, hsl(var(--gold)) 0%, transparent 62%)",
        }}
      />

      <div className="container relative mx-auto container-padding">
        <div className="flex min-h-[88vh] flex-col justify-center py-28">
          <Reveal stagger className="max-w-5xl">
            <div className="micro-label flex items-center gap-3 text-muted-foreground">
              <LogoMark className="h-5 w-5" />
              <span>PawnStaar</span>
              <span aria-hidden className="h-px w-8 bg-current opacity-40" />
              <span>AI chess coaching</span>
            </div>

            {/*
              Two-tone headline: the promise in full contrast, the qualifier
              dropped to muted. Lifted from the Margin template — it lets a
              long headline carry a clear primary and secondary read.
            */}
            <h1 className="mt-8 font-display text-display text-balance">
              <span className="block">Stop losing the</span>
              <span className="block">same game twice.</span>
              {/*
                Opacity rather than the muted token, and only here. This line is
                display-size, so AA asks 3:1 not 4.5:1 — measured 5.6:1 on dark
                and 4.2:1 on light, both clear. `text-muted-foreground` passes
                too but sits too bright to read as a qualifier; it stopped
                receding behind the two lines above it.
              */}
              <span className="mt-2 block text-foreground/55">Fifteen minutes a day.</span>
            </h1>

            <p className="mt-8 max-w-xl text-body text-muted-foreground">
              PawnStaar reads your own games, finds the pattern in your mistakes, and
              turns it into a daily routine short enough that you will actually do it.
            </p>

            {/* One primary action. The secondary is a text link, not a rival button. */}
            <div className="mt-11 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
              <Button size="lg" asChild>
                <Link href="/wcc">Follow the championship</Link>
              </Button>
              <Link
                href="/plan"
                className="micro-label border-b border-current pb-1 transition-colors duration-200 ease-editorial hover:text-gold-text"
              >
                Read the 15-minute plan
              </Link>
            </div>
          </Reveal>

          <Reveal
            delay={0.25}
            className="mt-24 grid grid-cols-1 gap-px border-t border-border pt-10 sm:grid-cols-3"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-4 py-2">
                <span className="font-display text-3xl text-gold-text">{stat.value}</span>
                <span className="max-w-[16ch] text-sm leading-snug text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
