"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, User, Settings, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const NAV_ITEMS = [
  { href: "/analysis", label: "Analysis" },
  { href: "/live", label: "Live play" },
  { href: "/plan", label: "The plan" },
  { href: "/#pricing", label: "Pricing" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem("token")
    setIsLoggedIn(!!token)
  }, [])

  // Close the mobile sheet on navigation.
  useEffect(() => setIsOpen(false), [pathname])

  // /login owns its full viewport as a focused split-screen task page and
  // carries its own logo link home, so it goes without the site chrome.
  if (pathname === "/login") return null

  return (
    // The hero follows the theme now, so there is no dark band for the bar to
    // blend into and no scroll listener needed to leave one.
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 text-foreground backdrop-blur">
      <div className="container mx-auto container-padding">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark className="h-7 w-7" />
            <span className="micro-label text-base font-normal tracking-[1px]">
              PawnStaar
            </span>
          </Link>

          {/*
            Nav items are always visible, logged in or not. Hiding them behind
            auth meant a first-time visitor could not see what the product
            contained — the single worst thing the old header did.
          */}
          <nav className="hidden items-center gap-9 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="micro-label transition-opacity duration-200 ease-editorial hover:opacity-60"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account menu">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src="/placeholder-user.jpg" alt="" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                {/* A solid, visible primary action — the old one was a ghost
                    button with no fill until hover, which never fires on touch. */}
                <Button variant="solid" asChild>
                  <Link href="/login">Start free</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* The mobile sheet now carries the full nav plus a primary CTA. It used
            to contain a single ghost "Sign In" link and nothing else. */}
        {isOpen && (
          <div id="mobile-menu" className="border-t border-border py-6 md:hidden">
            <nav className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="micro-label flex min-h-[44px] items-center border-b border-border"
                >
                  {item.label}
                </Link>
              ))}
              {isLoggedIn && (
                <>
                  <Link
                    href="/dashboard"
                    className="micro-label flex min-h-[44px] items-center border-b border-border"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/settings"
                    className="micro-label flex min-h-[44px] items-center border-b border-border"
                  >
                    Settings
                  </Link>
                </>
              )}
            </nav>

            {!isLoggedIn && (
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="solid" className="w-full" asChild>
                  <Link href="/login">Start free</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
