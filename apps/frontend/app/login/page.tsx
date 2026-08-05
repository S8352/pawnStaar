import Link from "next/link"

import { AuthForm } from "@/components/features/auth-form"
import { LogoMark } from "@/components/ui/logo"

/*
  Split screen: a brand panel and the form.

  The panel used to be pinned near-black in both themes; it now sits on
  `bg-surface` so it still separates from the form side while following the
  theme. Hierarchy is carried by `text-muted-foreground` rather than an opacity
  on the foreground, which only reads correctly against dark.

  The page previously printed "Welcome to PawnStaar" and then rendered
  <AuthForm>, which printed the very same heading again inside its own
  min-h-screen wrapper — a duplicated title and a double-height scroll
  container. The page now owns all the framing and the form owns only the form.
*/
export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Hidden on small screens, where it would just be a wall of scrolling
          above the thing the user came to do. */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "conic-gradient(currentColor 0 25%, transparent 0 50%, currentColor 0 75%, transparent 0)",
            backgroundSize: "240px 240px",
          }}
        />

        <Link href="/" className="relative flex items-center gap-3">
          <LogoMark className="h-7 w-7" />
          <span className="micro-label text-base tracking-[1px]">PawnStaar</span>
        </Link>

        <div className="relative max-w-md">
          <p className="font-display text-display-sm text-balance">
            Checks, captures, threats.
            <span className="block text-foreground/55">Yours and theirs.</span>
          </p>
          <p className="mt-6 text-body text-muted-foreground">
            Three seconds, before every move. It is the whole difference between
            knowing tactics and not hanging pieces.
          </p>
        </div>

        <p className="micro-label relative text-muted-foreground">
          Chess for adults who started late
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-7 w-7" />
            <span className="micro-label text-base tracking-[1px]">PawnStaar</span>
          </Link>

          <h1 className="font-display text-3xl leading-tight">Welcome to PawnStaar</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in, or create an account. The free plan does not expire.
          </p>

          <div className="mt-10">
            <AuthForm />
          </div>
        </div>
      </main>
    </div>
  )
}
