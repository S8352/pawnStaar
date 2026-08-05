import Link from "next/link"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eyebrow } from "@/components/ui/eyebrow"
import { Reveal } from "@/components/ui/reveal"

/*
  This section replaces the old CTA pricing pair, and it is where the reported
  white-on-white "Start Free" button is put to rest.

  The original set variant="outline" (which painted bg-background — pure white
  in light mode) and then added text-white on top, on a dark blue panel. Both
  halves of the mistake are now impossible here: the cards run entirely on
  tokens, and `outline` is transparent and inherits currentColor.

  No call site in this file names a colour. That is the point.
*/

const FREE = [
  "40 games analysed per month",
  "Basic daily workouts",
  "Live play access",
]

const PREMIUM = [
  "Unlimited game analysis",
  "Personalised daily workouts",
  "Advanced progress tracking",
  "Coach integration",
  "Priority support",
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-surface section-spacing">
      <div className="container mx-auto container-padding">
        <Reveal className="max-w-3xl">
          <Eyebrow index={4}>Pricing</Eyebrow>
          <h2 className="mt-8 font-display text-display-sm text-balance">
            Start free. Stay free, if it suits you.
          </h2>
        </Reveal>

        <Reveal stagger className="mt-16 grid gap-px md:grid-cols-2">
          {/* Free — inherits the page surface. */}
          <div className="flex h-full flex-col border border-border bg-background p-8 lg:p-10">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-2xl">Free</h3>
              <span className="micro-label text-muted-foreground">No card required</span>
            </div>

            <p className="mt-6 font-display text-5xl">
              $0
              <span className="ml-2 align-middle text-base font-normal text-muted-foreground">
                forever
              </span>
            </p>

            <ul className="mt-10 space-y-4">
              {FREE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-body">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-gold-text" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">Start free</Link>
              </Button>
            </div>
          </div>

          {/*
            Premium follows the theme now rather than being a pinned dark slab.
            It used its dark fill to out-weigh the Free card beside it; a gold
            outline does that job in both themes instead.
          */}
          <div className="relative flex h-full flex-col border border-gold bg-background p-8 lg:p-10">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-2xl">Premium</h3>
              <Badge variant="gold">Most popular</Badge>
            </div>

            <p className="mt-6 font-display text-5xl text-gold-text">
              $9
              <span className="ml-2 align-middle text-base font-normal text-muted-foreground">
                per month
              </span>
            </p>

            <ul className="mt-10 space-y-4">
              {PREMIUM.map((item) => (
                <li key={item} className="flex items-start gap-3 text-body">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-gold-text" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10">
              <Button className="w-full" asChild>
                <Link href="/login">Upgrade to Premium</Link>
              </Button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mt-8 text-sm text-muted-foreground">
            Cancel anytime. The free plan does not expire.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
