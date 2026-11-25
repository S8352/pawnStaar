/**
 * A clock the server never reads.
 *
 * Anything rendered from `Date.now()` differs between the server render and the
 * hydrating one, so this hook deliberately has no value until the browser has
 * taken over: the first reading arrives in an effect, after hydration.
 */
import { useEffect, useState } from 'react'

/**
 * `Date.now()`, refreshed every `intervalMs`, or `null` on the server and on
 * the first client render.
 *
 * A `null` interval stops the clock and freezes its last reading. While the tab
 * is hidden the clock is parked — a backgrounded countdown is worth nothing —
 * and it re-reads the moment the tab comes back, so it never resumes stale.
 */
export function useNow(intervalMs: number | null): number | null {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    if (intervalMs === null) return

    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = (): void => {
      setNow(Date.now())
      timer = setTimeout(tick, intervalMs)
    }

    const sync = (): void => {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined

      setNow(Date.now())
      if (!document.hidden) timer = setTimeout(tick, intervalMs)
    }

    sync()
    document.addEventListener('visibilitychange', sync)

    return () => {
      if (timer !== undefined) clearTimeout(timer)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [intervalMs])

  return now
}
