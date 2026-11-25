"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/*
  The spoiler-free switch.

  A switch, not a checkbox: it turns something off right now rather than
  recording a choice to be submitted. The eye icon changes with it so the state
  is legible at a glance from across the room, which is how people actually use
  this — they flip it before scrolling past a finished game.

  `'use client'` because `onCheckedChange` is a function, and a function cannot
  cross the server/client boundary as a prop; this control only ever renders
  inside a client tree.
*/

export function SpoilerToggle({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean
  onCheckedChange(v: boolean): void
  className?: string
}): React.JSX.Element {
  // Two of these can share a page (a header control and a settings row), so
  // the id is generated rather than fixed. `useId` is stable across hydration.
  const id = React.useId()
  const descriptionId = `${id}-description`

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={descriptionId}
      />

      <label
        htmlFor={id}
        className="micro-label flex cursor-pointer items-center gap-1.5 select-none"
      >
        {checked ? (
          <EyeOff aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <Eye aria-hidden className="h-3.5 w-3.5" />
        )}
        Spoiler-free
      </label>

      <p id={descriptionId} className="sr-only">
        Hides evaluations and engine numbers
      </p>
    </div>
  )
}
