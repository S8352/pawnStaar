import { Hero } from "@/components/features/hero"
import { Features } from "@/components/features/features"
import { CTA } from "@/components/features/cta"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
      <CTA />
    </div>
  )
}
