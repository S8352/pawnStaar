import { Brain, TrendingUp, Gamepad2, MessageCircle, BookOpen, Shield } from "lucide-react"

import { Eyebrow } from "@/components/ui/eyebrow"
import { Reveal } from "@/components/ui/reveal"

/*
  Replaces the six identical shadow-on-hover cards.

  Six equal boxes give the eye no entry point — everything reads as the same
  importance, so nothing gets read. This breaks the grid instead: one wide lead
  feature, a 2-up, then a 3-up, separated by hairline rules rather than shadows.
  The rhythm change is what makes the section scannable.
*/

const LEAD = {
  icon: Brain,
  title: "It reads your games, not somebody else's",
  description:
    "Every move analysed against an engine, then translated into the one habit that would have saved the position. Not a list of evaluations — a thing to do differently on Tuesday.",
}

const PAIR = [
  {
    icon: Gamepad2,
    title: "Puzzles from your own blunders",
    description:
      "The daily set is generated from positions you actually reached and actually got wrong, at the rating you actually are.",
  },
  {
    icon: TrendingUp,
    title: "Progress you can see",
    description:
      "Tactics, openings and endgames tracked separately, so improvement shows up as a line rather than a feeling.",
  },
]

const TRIO = [
  {
    icon: BookOpen,
    title: "Curated lessons",
    description: "A library built by Grandmasters, surfaced when your games say you need it.",
  },
  {
    icon: MessageCircle,
    title: "Community",
    description: "Share games, compare mistakes, and learn from players a rung ahead of you.",
  },
  {
    icon: Shield,
    title: "Coach integration",
    description: "Hand your coach the analysis so the lesson starts where the problem is.",
  },
]

export function FeatureGrid() {
  return (
    <section className="section-spacing">
      <div className="container mx-auto container-padding">
        <Reveal className="max-w-3xl">
          <Eyebrow index={2}>What it does</Eyebrow>
          <h2 className="mt-8 font-display text-display-sm text-balance">
            Everything points at one thing.
          </h2>
        </Reveal>

        {/* Lead — given the most room, so the eye starts here. */}
        <Reveal className="rule mt-16 pt-12">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <LEAD.icon className="h-7 w-7 text-gold-text" strokeWidth={1.5} />
              <h3 className="mt-6 font-display text-2xl leading-tight text-balance">
                {LEAD.title}
              </h3>
            </div>
            <p className="text-body text-muted-foreground md:col-span-6 md:col-start-7">
              {LEAD.description}
            </p>
          </div>
        </Reveal>

        {/* Two-up. */}
        <Reveal stagger className="rule mt-12 grid gap-10 pt-12 md:grid-cols-2 md:gap-16">
          {PAIR.map((feature) => (
            <div key={feature.title}>
              <feature.icon className="h-6 w-6 text-gold-text" strokeWidth={1.5} />
              <h3 className="mt-5 font-display text-xl leading-tight">{feature.title}</h3>
              <p className="mt-3 text-body text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </Reveal>

        {/* Three-up — the supporting cast, set smaller. */}
        <Reveal stagger className="rule mt-12 grid gap-10 pt-12 md:grid-cols-3 md:gap-12">
          {TRIO.map((feature) => (
            <div key={feature.title}>
              <feature.icon className="h-5 w-5 text-gold-text" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-lg leading-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
