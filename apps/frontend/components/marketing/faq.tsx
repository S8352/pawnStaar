import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Eyebrow } from "@/components/ui/eyebrow"
import { Reveal } from "@/components/ui/reveal"

const QUESTIONS = [
  {
    q: "Do I need to import my games manually?",
    a: "No. Link your Lichess or Chess.com account once and games arrive on their own after you play them. Manual PGN upload is there if you want it.",
  },
  {
    q: "What if I don't know my rating?",
    a: "Play ten rapid games on either platform. That places you within about fifty points. The daily plan adjusts itself from there.",
  },
  {
    q: "Is fifteen minutes really enough?",
    a: "For most players under 1400, yes — because almost all of the rating lost at that level goes to moves a three-second scan would have caught. A plan you actually do beats a better plan you abandon in a fortnight.",
  },
  {
    q: "Will this teach me openings?",
    a: "Deliberately not, at first. Below 1400 almost no game is decided by the opening. We come back to theory once tactics stop deciding your games.",
  },
  {
    q: "Can my coach see the analysis?",
    a: "Yes. Share a game or a whole month of progress with a coach so the lesson starts where the problem actually is.",
  },
]

export function FAQ() {
  return (
    <section className="section-spacing">
      <div className="container mx-auto container-padding">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <Reveal className="md:col-span-4">
            <Eyebrow index={5}>Questions</Eyebrow>
            <h2 className="mt-8 font-display text-display-sm text-balance">
              Before you start.
            </h2>
          </Reveal>

          <Reveal delay={0.1} className="md:col-span-7 md:col-start-6">
            <Accordion type="single" collapsible className="border-t border-border">
              {QUESTIONS.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  {/* h-11-equivalent padding keeps the tap target comfortable. */}
                  <AccordionTrigger className="py-6 text-left font-display text-lg leading-snug hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pr-8 text-body text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
