import type React from "react"
import type { Metadata } from "next"
import { Inter, Archivo_Black } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/features/navbar"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// Already the display face on /plan. Promoted here so the whole site shares it.
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "PawnStaar - Your AI Chess Coach",
  description:
    "Revolutionize your chess game with AI-powered coaching, personalized training, and an engaging community platform.",
  keywords: "chess, AI coach, chess training, chess community, chess analysis",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the
    // theme class onto <html> before React hydrates, so server and client
    // markup legitimately differ on this one element.
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${archivoBlack.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
