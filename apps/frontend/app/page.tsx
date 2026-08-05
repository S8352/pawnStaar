import { Hero } from "@/components/marketing/hero"
import { Philosophy } from "@/components/marketing/philosophy"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { ProductWindow } from "@/components/marketing/product-window"
import { Pricing } from "@/components/marketing/pricing"
import { FAQ } from "@/components/marketing/faq"
import { ClosingCTA } from "@/components/marketing/closing-cta"
import { Footer } from "@/components/marketing/footer"

/*
  Section order follows the Margin template's inventory: the page alternates
  between the default surface and `bg-surface`, and opens and closes on a
  full-bleed dark band.
*/
export default function HomePage() {
  return (
    <>
      <Hero />
      <Philosophy />
      <FeatureGrid />
      <ProductWindow />
      <Pricing />
      <FAQ />
      <ClosingCTA />
      <Footer />
    </>
  )
}
