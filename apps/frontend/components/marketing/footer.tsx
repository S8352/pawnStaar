import Link from "next/link"

/*
  Minimal footer with an oversized wordmark, per the Margin inventory. The
  wordmark is set to bleed to the container edges so it reads as a graphic
  device rather than a logo, and it is aria-hidden because the brand name is
  already announced by the nav.
*/

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/analysis", label: "Analysis" },
      { href: "/live", label: "Live play" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { href: "/plan", label: "The 15-minute plan" },
      { href: "/login", label: "Create an account" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto container-padding">
        <div className="grid gap-12 py-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="max-w-xs text-body text-muted-foreground">
              Chess for adults who started late.
            </p>
            <a
              href="https://instagram.com/pawnstaar.chess"
              className="micro-label mt-6 inline-block border-b border-current pb-1 text-gold-text transition-opacity duration-200 ease-editorial hover:opacity-70"
            >
              @pawnstaar.chess
            </a>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} className="md:col-span-3 lg:col-span-2">
              <h2 className="micro-label text-muted-foreground">{column.heading}</h2>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-opacity duration-200 ease-editorial hover:opacity-60"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Oversized wordmark. Decorative — the nav already names the brand. */}
        <div aria-hidden className="rule overflow-hidden pt-10">
          <span className="block select-none font-display leading-[0.8] tracking-[-0.03em] text-foreground/10 [font-size:clamp(3.5rem,15vw,13rem)]">
            PAWNSTAAR
          </span>
        </div>

        <div className="flex flex-col gap-2 py-8 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} PawnStaar</span>
          <span>Built for players with a job.</span>
        </div>
      </div>
    </footer>
  )
}
