import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Zap, Target, Users } from "lucide-react"

export function Hero() {
  return (
    <section className="relative bg-cover bg-center py-20 lg:py-32" style={{ backgroundImage: "url('/placeholder.jpg')" }}>
      <div className="absolute inset-0 bg-bg-overlay" />
      <div className="container relative mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-6">
            <img src="/logo.png" alt="PawnStaar" className="h-14 w-auto mx-auto" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Your AI Chess Coach
            <span className="block text-pawn-accent">& Community</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-200 mb-8">
            Revolutionize your chess game with personalized AI coaching, deep game analysis, and an engaging community
            of players.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button size="lg" asChild>
              <Link href="/login">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/analysis">Try Analysis</Link>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="bg-pawn-accent/10 p-4 rounded-full mb-4">
                <Target className="h-8 w-8 text-pawn-accent" />
              </div>
              <h3 className="text-lg font-semibold text-pawn-primary mb-2">Personalized Puzzles</h3>
              <p className="text-gray-600">AI-generated puzzles from your own games and mistakes</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="bg-pawn-accent/10 p-4 rounded-full mb-4">
                <Zap className="h-8 w-8 text-pawn-accent" />
              </div>
              <h3 className="text-lg font-semibold text-pawn-primary mb-2">Game Analysis</h3>
              <p className="text-gray-600">Deep AI analysis of your games with actionable insights</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="bg-pawn-accent/10 p-4 rounded-full mb-4">
                <Users className="h-8 w-8 text-pawn-accent" />
              </div>
              <h3 className="text-lg font-semibold text-pawn-primary mb-2">Live Play</h3>
              <p className="text-gray-600">Play against opponents and improve in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
