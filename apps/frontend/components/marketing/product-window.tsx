import { Eyebrow } from "@/components/ui/eyebrow"
import { Reveal } from "@/components/ui/reveal"

/*
  The floating product window from the Margin inventory: a framed slice of the
  actual interface, so the page shows the thing rather than only describing it.

  Rendered as markup rather than a screenshot on purpose — it stays correct when
  the tokens change, works in both themes, and costs no image weight.
*/

const MOVES = [
  { no: "18.", move: "Nxe5", verdict: "Blunder", note: "Drops the exchange to Bxh2+", tone: "bad" },
  { no: "18.", move: "Rfe1", verdict: "Best", note: "Holds the centre and the h2 square", tone: "good" },
  { no: "21.", move: "Qd2", verdict: "Inaccuracy", note: "Queen leaves the b-file undefended", tone: "warn" },
]

const TONE = {
  bad: "text-destructive",
  good: "text-success",
  warn: "text-warning",
} as const

export function ProductWindow() {
  return (
    <section className="section-spacing">
      <div className="container mx-auto container-padding">
        <Reveal className="max-w-3xl">
          <Eyebrow index={3}>The analysis</Eyebrow>
          <h2 className="mt-8 font-display text-display-sm text-balance">
            The move before it went wrong.
          </h2>
          <p className="mt-6 max-w-xl text-body text-muted-foreground">
            Not the blunder at the end — the quiet move that made it available. That is
            the one worth looking at, and it is the one you never find on your own.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <div className="border border-border bg-card">
            {/* Window chrome. Hairline, sharp-cornered, no traffic lights. */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="micro-label text-muted-foreground">
                Rapid · 12 Aug · Lost on time
              </span>
              <span className="micro-label text-gold-text">Accuracy 71%</span>
            </div>

            <div className="grid md:grid-cols-12">
              {/* Board */}
              <div className="border-b border-border p-6 md:col-span-5 md:border-b-0 md:border-r">
                <div
                  className="aspect-square w-full"
                  role="img"
                  aria-label="Chess position from move 18"
                  /*
                    A conic gradient draws a true checkerboard in one layer.
                    The two-overlaid-45deg-gradients trick leaves diamond
                    artifacts where the layers meet. One tile covers 2x2
                    squares, so an 8x8 board is a 25% tile.
                  */
                  style={{
                    backgroundImage:
                      "conic-gradient(hsl(var(--forest)) 0 25%, hsl(60 20% 88%) 0 50%, hsl(var(--forest)) 0 75%, hsl(60 20% 88%) 0)",
                    backgroundSize: "25% 25%",
                  }}
                />
              </div>

              {/* Move list */}
              <div className="p-6 md:col-span-7">
                <ul className="divide-y divide-border">
                  {MOVES.map((m, i) => (
                    <li key={i} className="flex items-start gap-4 py-4 first:pt-0">
                      <span className="w-8 shrink-0 text-sm tabular-nums text-muted-foreground">
                        {m.no}
                      </span>
                      <span className="w-16 shrink-0 font-display text-sm">{m.move}</span>
                      <span className="flex-1">
                        <span
                          className={`micro-label ${TONE[m.tone as keyof typeof TONE]}`}
                        >
                          {m.verdict}
                        </span>
                        <span className="mt-1.5 block text-sm text-muted-foreground">
                          {m.note}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 border-l-2 border-gold pl-4 text-sm leading-relaxed text-muted-foreground">
                  <span className="text-foreground">Pattern this month: </span>
                  you take on e5 without counting defenders. It has cost you four games.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
