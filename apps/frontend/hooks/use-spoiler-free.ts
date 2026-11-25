'use client'

import { useCallback, useEffect, useState } from 'react'

import { SPOILER_FREE_STORAGE_KEY } from '@/lib/wcc/storage-keys'

/**
 * Whether evaluations are hidden, remembered across visits.
 *
 * The state starts *hidden* on the server and on the first client render, and
 * the stored preference is only applied in an effect after mount. That is the
 * whole point of the hook: a viewer who turned spoiler-free on must never see
 * an evaluation flash up while the page loads, and the server cannot know what
 * they chose. Starting from the safe side costs a viewer who left it off a
 * single frame of em dashes; starting from the other side would spoil the
 * result for everyone who asked us not to.
 *
 * `hydrated` reports whether that read has happened, so a caller can tell
 * "hidden because the viewer asked" from "hidden because we do not know yet".
 *
 * Stored as `'1'` / `'0'`. Any other value — including a key the viewer never
 * set — reads as off.
 */
export function useSpoilerFree(): {
  spoilerFree: boolean
  hydrated: boolean
  setSpoilerFree(v: boolean): void
} {
  const [spoilerFree, setSpoilerFreeState] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let stored: string | null = null

    try {
      stored = window.localStorage.getItem(SPOILER_FREE_STORAGE_KEY)
    } catch {
      // Storage throws outright in some privacy modes. The default applies.
    }

    setSpoilerFreeState(stored === '1')
    setHydrated(true)
  }, [])

  const setSpoilerFree = useCallback((v: boolean) => {
    setSpoilerFreeState(v)

    try {
      window.localStorage.setItem(SPOILER_FREE_STORAGE_KEY, v ? '1' : '0')
    } catch {
      // Ignored: the setting still applies, it just does not outlive the tab.
    }
  }, [])

  return { spoilerFree, hydrated, setSpoilerFree }
}
