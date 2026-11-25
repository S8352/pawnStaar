import { Hero } from "@/components/marketing/hero"
import { Philosophy } from "@/components/marketing/philosophy"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { ProductWindow } from "@/components/marketing/product-window"
import { WccBanner } from "@/components/marketing/wcc-banner"
import { WccSpotlight } from "@/components/marketing/wcc-spotlight"
import { FAQ } from "@/components/marketing/faq"
import { ClosingCTA } from "@/components/marketing/closing-cta"
import { Footer } from "@/components/marketing/footer"

/*
  Section order follows the Margin template's inventory: the page alternates
  between the default surface and `bg-surface`, and opens and closes on a
  full-bleed dark band.

  While the paid features are unbuilt there is no pricing section; the
  championship spotlight sits in its slot, and a banner above the hero sends
  arrivals straight to the live board.
*/
export default function HomePage() {
  return (
    <>
      <WccBanner />
      <Hero />
      <Philosophy />
      <FeatureGrid />
      <ProductWindow />
      <WccSpotlight />
      <FAQ />
      <ClosingCTA />
      <Footer />
    </>
  )
}
