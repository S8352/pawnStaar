import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"

export function CTA() {
  const benefits = [
    "Unlimited game analysis",
    "Personalized daily workouts",
    "Advanced progress tracking",
    "Coach integration",
    "Priority support",
  ]

  return (
    <section className="py-20 bg-gradient-to-r from-pawn-primary to-pawn-primary/90">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">Ready to Transform Your Chess Game?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of players who have improved their rating with PawnStaar
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-4">Free Plan</h3>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-pawn-accent" />
                  40 games analyzed per month
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-pawn-accent" />
                  Basic daily workouts
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-pawn-accent" />
                  Live play access
                </li>
              </ul>
              <Button
                variant="outline"
                className="w-full border-white text-white hover:bg-white hover:text-pawn-primary"
                asChild
              >
                <Link href="/login">Start Free</Link>
              </Button>
            </div>

            <div className="bg-pawn-accent text-pawn-primary rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-pawn-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Premium Plan</h3>
              <ul className="space-y-2 mb-6">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-pawn-primary hover:bg-pawn-primary/90 text-white" asChild>
                <Link href="/login">
                  Upgrade to Premium
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <p className="text-sm opacity-75">No credit card required for free plan • Cancel anytime</p>
        </div>
      </div>
    </section>
  )
}
