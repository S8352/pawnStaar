import * as React from "react"

import { Eyebrow } from "@/components/ui/eyebrow"

/*
  One header for every app route. The four routes each rolled their own
  `<h1 className="text-3xl font-bold text-primary">` plus a grey paragraph,
  with three different spacing conventions between them.
*/
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="rule mb-10 flex flex-col gap-6 pb-8 pt-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <Eyebrow className="mb-5">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-display-sm">{title}</h1>
        {description && (
          <p className="mt-3 max-w-xl text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  )
}
