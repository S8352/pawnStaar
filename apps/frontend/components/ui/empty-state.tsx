import * as React from "react"
import type { LucideIcon } from "lucide-react"

/*
  Empty states, which the app had none of. A new user previously landed on a
  dashboard that explained nothing and a game list that said only
  "No games imported yet." — a dead end with no next action.

  Every empty state here names the action that fills it.
*/
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center border border-dashed border-border px-6 py-16 text-center">
      {Icon && <Icon className="h-7 w-7 text-muted-foreground" strokeWidth={1.25} />}
      <p className="mt-5 font-display text-lg">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-7">{action}</div>}
    </div>
  )
}

/** Matches the shape of the cards it replaces while data is in flight. */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border p-6" aria-hidden>
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 animate-pulse bg-muted" />
            <div className="h-9 w-20 animate-pulse bg-muted" />
          </div>
          <div className="mt-4 h-6 w-3/4 animate-pulse bg-muted" />
          <div className="mt-6 space-y-2">
            <div className="h-4 w-1/2 animate-pulse bg-muted" />
            <div className="h-4 w-2/5 animate-pulse bg-muted" />
            <div className="h-4 w-1/3 animate-pulse bg-muted" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
