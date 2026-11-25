import type { Metadata } from "next"

export const dynamic = "force-static"

export const metadata: Metadata = {
  metadataBase: new URL("https://pawnstaar.com"),
  title: "The 15-Minute Daily Chess Plan | Pawnstaar",
  description:
    "A daily chess routine for adults with a job. Fifteen minutes, three blocks, and the one habit that fixes most blunders under 1400.",
  openGraph: {
    title: "The 15-Minute Daily Chess Plan",
    type: "article",
    description:
      "A daily chess routine for adults with a job. Fifteen minutes, three blocks, and the one habit that fixes most blunders under 1400.",
    images: [{ url: "/logo.png", width: 900, height: 900 }],
  },
}

export default function PlanPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <article className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
        <h1 className="font-display text-[2rem] leading-[1.15] text-gold-text sm:text-[2.75rem]">
          The 15-Minute Daily Chess Plan
        </h1>

        <p className="mt-5 text-body text-muted-foreground">
          For adults with a job, a family, and no time to study for hours. Three blocks, fifteen
          minutes, every day.
        </p>

        <p className="mt-7 text-body">
          Most improvement advice assumes you have an evening. You have a bus ride and a lunch
          break. This is what fits in that, and it works because it puts the fifteen minutes where
          the rating actually comes from at your level.
        </p>

        <hr className="mt-12 border-t border-border" />

        <section className="mt-10">
          <h2 className="font-display text-[1.4rem] leading-[1.3]">
            <span className="text-gold-text">Block 1.</span> Five minutes of fast tactics.
          </h2>
          <p className="mt-4 text-body">
            Ten to fifteen puzzles, rated at or slightly below where you are. Go fast. If a puzzle
            takes more than twenty seconds, look at the answer and move on.
          </p>
          <p className="mt-4 text-body">
            This block is not about calculating. It is about recognising. You are teaching your eye
            to see a back rank, a loose piece, a fork before you have consciously worked anything
            out. Speed is the point, and getting some wrong is fine.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[1.4rem] leading-[1.3]">
            <span className="text-gold-text">Block 2.</span> Five minutes on one of your own games.
          </h2>
          <p className="mt-4 text-body">
            Open your most recent loss. Find the move where it went wrong. Not the blunder at the
            end, the move before things got bad.
          </p>
          <p className="mt-4 text-body">
            Ask one question: what did I not look at? You are looking for the pattern in your own
            mistakes, and there will be one. Most players under 1400 lose the same game over and
            over without noticing.
          </p>
          <p className="mt-4 text-body">
            No engine for the first two minutes. Guess first, then check.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[1.4rem] leading-[1.3]">
            <span className="text-gold-text">Block 3.</span> Five minutes on one hard puzzle.
          </h2>
          <p className="mt-4 text-body">
            One puzzle, rated a few hundred points above you. Do not move until you are sure. Sit
            with it.
          </p>
          <p className="mt-4 text-body">
            This is the opposite of Block 1. Here you are practising the thing you actually have to
            do in a real game: calculate a line to the end and commit. One puzzle is enough. Five
            minutes on one hard position beats fifty easy ones.
          </p>
        </section>

        <hr className="mt-12 border-t border-border" />

        <section className="mt-10">
          <h2 className="font-display text-[1.4rem] leading-[1.3] text-gold-text">
            How to spend the fifteen minutes, by rating
          </h2>
          <p className="mt-4 text-body">
            The three blocks stay the same whatever your rating. What changes is how you split them,
            and what you point them at.
          </p>
          <p className="mt-4 text-body">
            Find your row. If you are between two, take the lower one. Nobody ever got worse at chess
            by drilling something slightly too easy.
          </p>

          <div className="mt-8">
            <div className="border-t border-border py-6">
              <h3 className="font-display text-[1.3rem] leading-[1.3]">Under 1100</h3>
              <p className="mt-3 text-body">
                Split: 10 minutes easy puzzles, 5 minutes on your own game. Skip the hard puzzle for
                now.
              </p>
              <p className="mt-2 text-body">
                Drill: mate in one, mate in two, simple forks.
              </p>
              <p className="mt-4 text-body">
                At this level you are not calculating badly, you are not seeing. Volume of easy
                patterns beats depth, because the job is to build a library of shapes your eye
                recognises without thinking.
              </p>
              <p className="mt-4 text-body">
                If a puzzle takes you more than thirty seconds, look at the answer and move on. That
                is not giving up, it is the correct use of the time.
              </p>
              <p className="mt-4 text-body">
                In your games: before every move, look at every check your opponent has, then every
                capture. Count the defenders of any square before you take on it.
              </p>
            </div>

            <div className="border-t border-border py-6">
              <h3 className="font-display text-[1.3rem] leading-[1.3]">1100 to 1300</h3>
              <p className="mt-3 text-body">
                Split: 8 minutes puzzles, 4 minutes on your own game, 3 minutes on one harder puzzle.
              </p>
              <p className="mt-2 text-body">
                Drill: mate in two, forks, back rank, pins.
              </p>
              <p className="mt-4 text-body">
                You can see checks now. The gap is the loose piece, the one nobody is defending while
                you are looking somewhere else. Start every turn by asking what is undefended, yours
                and theirs.
              </p>
              <p className="mt-4 text-body">
                Watch for two enemy pieces sitting on the same rank, file or diagonal. That is where
                pins, skewers and forks live, and at this level almost nobody looks for the alignment
                before it happens.
              </p>
            </div>

            <div className="border-t border-border py-6">
              <h3 className="font-display text-[1.3rem] leading-[1.3]">1300 to 1500</h3>
              <p className="mt-3 text-body">
                Split: 5 minutes fast puzzles, 5 minutes on your own game, 5 minutes on one hard
                puzzle.
              </p>
              <p className="mt-2 text-body">
                Drill: forks, pins, deflection, and calculation.
              </p>
              <p className="mt-4 text-body">
                Something changes here. Below 1300 most decisive attacks come from the king being
                exposed. From about 1300 the tactics that win start by taking material, and the
                attack only comes afterwards. That is a different kind of looking.
              </p>
              <p className="mt-4 text-body">
                Compare at least two candidate moves before you commit, and calculate each one until
                the position goes quiet. Assume your opponent finds your idea and has an answer. Most
                losses at this level come from calculating one line beautifully and never checking
                the reply.
              </p>
            </div>

            <div className="border-t border-b border-border py-6">
              <h3 className="font-display text-[1.3rem] leading-[1.3]">1500 and up</h3>
              <p className="mt-3 text-body">
                Split: 5 minutes fast puzzles, 5 minutes on your own game, 5 minutes on calculation.
              </p>
              <p className="mt-2 text-body">
                Drill: sacrifices, attraction, quiet moves, prophylaxis.
              </p>
              <p className="mt-4 text-body">
                The tactics that beat you now are the ones that look wrong. A piece offered for
                nothing, a king pulled onto a square it did not want. You are not missing them
                because you cannot calculate. You are missing them because you dismiss them in half a
                second.
              </p>
              <p className="mt-4 text-body">
                Give every strange-looking move three seconds before you reject it. And before you
                start your own plan, spend one move working out what your opponent wants to do, then
                decide whether to stop it first.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[1.4rem] leading-[1.3] text-gold-text">
            How to play, if you only get a few games a week
          </h2>
          <p className="mt-4 text-body">
            Two slow games are worth more than fifteen fast ones.
          </p>
          <p className="mt-4 text-body">
            In a rapid or classical game you have time to actually run the checks above. That is the
            part that builds something. In blitz you are only using patterns you already own, so it
            is a good test of where you are and a poor way to get better.
          </p>
          <p className="mt-4 text-body">
            If you get three sessions a week, make two of them slow, and keep one for blitz because
            chess should also be fun. Then look at one of the slow games afterwards. The looking is
            where the improvement is.
          </p>
          <p className="mt-4 text-body">
            If you do not know your rating, play ten rapid games on Lichess or Chess.com. It will
            place you within about fifty points.
          </p>
        </section>

        <hr className="mt-12 border-t border-border" />

        <section className="mt-10">
          <h2 className="font-display text-[1.4rem] leading-[1.3] text-gold-text">
            The one habit that matters more than any of this
          </h2>
          <p className="mt-4 text-body">
            Before every move you play, in every game: checks, captures, threats. Yours and theirs.
          </p>
          <p className="mt-4 text-body">
            That is it. Three seconds. Most rating below 1400 is lost to moves that a three-second
            scan would have caught, and almost nobody does the scan because it feels too simple to
            matter.
          </p>
          <p className="mt-4 text-body">
            It is the whole difference between knowing tactics and not hanging pieces.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[1.4rem] leading-[1.3] text-gold-text">
            What to skip
          </h2>
          <p className="mt-4 text-body">Openings. Not forever, but for now.</p>
          <p className="mt-4 text-body">
            Below 1400 almost no game is decided by the opening. They are decided by someone leaving
            a piece where it can be taken. Learning twelve moves of a line feels like progress and
            changes nothing about the position on move twenty-five, which is where your games are
            actually lost.
          </p>
          <p className="mt-4 text-body">
            Learn the ideas of one opening for each colour. Stop there. Come back to theory when
            tactics stop deciding your games.
          </p>
        </section>

        <hr className="mt-12 border-t border-border" />

        <section className="mt-10">
          <p className="text-body">
            That is the plan. It is deliberately small, because a plan you actually do beats a
            better plan you abandon in a fortnight.
          </p>
          <p className="mt-4 text-body">
            I post one rated puzzle every day on Instagram. Mondays are the easiest of the week and
            Sundays the hardest, and the whole ladder climbs as the series goes on. If you want
            Block 1 handed to you daily, that is where it is.
          </p>
          <p className="mt-7">
            <a
              href="https://instagram.com/pawnstaar.chess"
              className="inline-block py-2 text-[17px] font-semibold leading-[1.7] text-gold-text underline underline-offset-4"
            >
              @pawnstaar.chess on Instagram
            </a>
          </p>
        </section>

        <footer className="mt-14 border-t border-border pt-6 text-sm leading-[1.7] text-muted-foreground">
          Pawnstaar. Chess for adults who started late.
        </footer>
      </article>
    </div>
  )
}
