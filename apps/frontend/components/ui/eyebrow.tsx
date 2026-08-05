import * as React from "react"

import { cn } from "@/lib/utils"

/*
  The numbered section label — `(01) — ANALYSIS`.

  Lifted from the Margin template, which uses it to give a long page a sense
  of running order. It is the cheapest way to make a page feel edited rather
  than assembled, and it gives the eye a fixed place to land when scanning.
*/

interface EyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Rendered as a zero-padded ordinal, e.g. 1 becomes "(01)". */
  index?: number
  children: React.ReactNode
}

export function Eyebrow({ index, children, className, ...props }: EyebrowProps) {
  return (
    <div
      className={cn("micro-label flex items-center gap-3 text-muted-foreground", className)}
      {...props}
    >
      {index !== undefined && (
        <span className="text-gold-text">({String(index).padStart(2, "0")})</span>
      )}
      <span aria-hidden className="h-px w-6 bg-border" />
      <span>{children}</span>
    </div>
  )
}
