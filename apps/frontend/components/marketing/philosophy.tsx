import { Eyebrow } from "@/components/ui/eyebrow"
import { Reveal } from "@/components/ui/reveal"

/*
  The statement section. One idea, set large, with nothing competing.

  It exists to slow the scroll down for a beat after the hero and to say the
  thing the product is actually about. The two-tone treatment carries over from
  the hero so the page reads as one voice.
*/
export function Philosophy() {
  return (
    <section className="bg-surface section-spacing">
      <div className="container mx-auto container-padding">
        <Reveal stagger className="max-w-4xl">
          <Eyebrow index={1}>Philosophy</Eyebrow>

          <h2 className="mt-8 font-display text-display-sm text-balance">
            Most chess advice assumes you have an evening.
            <span className="text-muted-foreground"> You have a bus ride.</span>
          </h2>

          <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-14">
            <p className="text-body text-muted-foreground">
              Below 1400, games are not lost in the opening. They are lost when
              somebody leaves a piece where it can be taken. Learning twelve moves of
              theory feels like progress and changes nothing about the position on
              move twenty-five.
            </p>
            <p className="text-body text-muted-foreground">
              So we point the time at the thing that actually moves the rating: the
              pattern in your own mistakes. You already have the games. Nobody has
              read them back to you.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
