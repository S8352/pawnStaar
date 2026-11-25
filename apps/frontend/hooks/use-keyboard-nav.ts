'use client'

import { useEffect, useRef } from 'react'

import { SINGLE_KEY_SHORTCUTS_STORAGE_KEY } from '@/lib/wcc/storage-keys'

export interface KeyboardNavHandlers {
  onPrev(): void
  onNext(): void
  onFirst(): void
  onLast(): void
  onFlip(): void
  /** Omit where there is no live position to jump back to. */
  onLive?(): void
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Whether the keystroke was aimed at something the viewer is typing in. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable
}

/**
 * Whether single-key shortcuts are switched off.
 *
 * Unprefixed letter shortcuts are hostile to anyone driving the page by voice
 * or with a switch device, so they can be turned off entirely. Reading storage
 * per keystroke keeps a change made in another tab honoured immediately;
 * storage throws in some privacy modes, where the default (on) applies.
 */
function shortcutsDisabled(): boolean {
  try {
    return window.localStorage.getItem(SINGLE_KEY_SHORTCUTS_STORAGE_KEY) === 'off'
  } catch {
    return false
  }
}

/**
 * Board shortcuts: ←/→ to step, Home/End for the ends, X to flip, L to rejoin
 * the live position.
 *
 * One listener on `window` for the whole page, attached once: the handlers
 * live in a ref so a parent re-rendering every time a move arrives does not
 * detach and reattach it. Keystrokes already handled, modified or typed into a
 * field are left alone.
 */
export function useKeyboardNav(handlers: KeyboardNavHandlers, enabled = true): void {
  const latest = useRef(handlers)

  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (shortcutsDisabled()) return

      const { onPrev, onNext, onFirst, onLast, onFlip, onLive } = latest.current

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          onPrev()
          return
        case 'ArrowRight':
          event.preventDefault()
          onNext()
          return
        case 'Home':
          event.preventDefault()
          onFirst()
          return
        case 'End':
          event.preventDefault()
          onLast()
          return
        case 'x':
        case 'X':
          onFlip()
          return
        case 'l':
        case 'L':
          onLive?.()
          return
        default:
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
