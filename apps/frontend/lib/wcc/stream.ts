/**
 * Browser-side reader for the Lichess broadcast PGN stream.
 *
 * Lichess answers `/api/stream/broadcast/round/:id.pgn` with an endless
 * `Access-Control-Allow-Origin: *` body: first every game of the round as PGN,
 * then a game's *complete* PGN again whenever it changes. So every frame is a
 * full replacement for one game, never a delta, and the reader's only real job
 * is cutting the byte stream back into whole games.
 *
 * Browser-safe: no server imports, everything cleaned up through one
 * `AbortController`.
 */
import { LICHESS_BASE_URL, POLL } from '@/lib/wcc/config'
import { parseGame, splitPgnGames } from '@/lib/wcc/pgn'
import type { ParsedGame } from '@/types/wcc'

export interface RoundStreamHandlers {
  onGame(game: ParsedGame): void
  onConnect?(): void
  onDrop?(err?: unknown): void
  onRateLimited?(retryAfterSec: number): void
}

export interface RoundStream {
  close(): void
}

/**
 * Offset of the final game in `buffer`, or 0 when it holds at most one game.
 *
 * Same boundary rule as `splitPgnGames` — a `[` line after a blank line whose
 * preceding non-blank line was not itself a tag — but reported as an offset
 * into the raw text, so the tail can be kept byte for byte. Keeping it raw is
 * what makes a chunk that ends exactly on the blank line safe: trimming the
 * tail would swallow the separator the next chunk still needs.
 */
function lastFrameStart(buffer: string): number {
  let start = 0
  let offset = 0
  let previousNonBlankWasTag = false
  let sawBlankLine = false
  let sawLine = false

  for (;;) {
    const newline = buffer.indexOf('\n', offset)
    const lineStart = offset
    const lineEnd = newline === -1 ? buffer.length : newline
    const text = buffer.slice(lineStart, lineEnd).trim()
    offset = lineEnd + 1

    if (text === '') {
      sawBlankLine = true
      sawLine = true
    } else {
      const isTag = text.startsWith('[')

      if (isTag && sawBlankLine && !previousNonBlankWasTag && sawLine) {
        start = lineStart
        sawLine = false
      }

      sawLine = true
      previousNonBlankWasTag = isTag
      sawBlankLine = false
    }

    if (newline === -1) return start
  }
}

/**
 * Accumulates stream text and calls `onFrame` with each complete game.
 *
 * A game is only complete once the next one has started, so the last game in
 * the buffer is always held back until then — or until `flush()`, which the
 * reader calls when the stream ends.
 */
export function createPgnFrameSplitter(onFrame: (pgn: string) => void): {
  push(chunk: string): void
  flush(): void
} {
  let buffer = ''

  const emit = (text: string): void => {
    for (const pgn of splitPgnGames(text)) onFrame(pgn)
  }

  return {
    push(chunk: string): void {
      buffer += chunk

      const start = lastFrameStart(buffer)
      if (start <= 0) return

      emit(buffer.slice(0, start))
      buffer = buffer.slice(start)
    },

    flush(): void {
      const pending = buffer
      buffer = ''
      if (pending.trim() !== '') emit(pending)
    },
  }
}

const isAbort = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError'

/** Seconds Lichess asked us to wait, falling back to the configured window. */
const retryAfterSecOf = (res: Response): number => {
  const header = res.headers.get('Retry-After')
  const parsed = header === null ? Number.NaN : Number.parseInt(header, 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : POLL.rateLimitedSec
}

/**
 * Opens the round's PGN stream and reports each game as it arrives.
 *
 * A clean end of stream is still reported through `onDrop`: Lichess closes
 * idle broadcast streams, so reaching the end means reconnecting, not that the
 * round is over. Closing the stream from here is silent.
 */
export function openRoundStream(
  roundId: string,
  handlers: RoundStreamHandlers,
  opts?: { fetchImpl?: typeof fetch; baseUrl?: string },
): RoundStream {
  const controller = new AbortController()
  const fetchImpl = opts?.fetchImpl ?? globalThis.fetch
  const baseUrl = opts?.baseUrl ?? LICHESS_BASE_URL
  const url = `${baseUrl}/api/stream/broadcast/round/${roundId}.pgn?clocks=true&comments=true`

  let cancelBody: (() => void) | undefined
  controller.signal.addEventListener('abort', () => cancelBody?.())

  const read = async (): Promise<void> => {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: 'application/x-chess-pgn' },
    })

    if (res.status === 429) {
      handlers.onRateLimited?.(retryAfterSecOf(res))
      return
    }

    if (!res.ok || res.body === null) {
      handlers.onDrop?.(new Error(`broadcast stream ${roundId}: HTTP ${res.status}`))
      return
    }

    handlers.onConnect?.()

    const splitter = createPgnFrameSplitter((pgn) => handlers.onGame(parseGame(pgn)))
    const decoder = new TextDecoder('utf-8')
    const reader = res.body.getReader()
    cancelBody = () => {
      void reader.cancel().catch(() => {})
    }

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value !== undefined) splitter.push(decoder.decode(value, { stream: true }))
    }

    if (controller.signal.aborted) return

    splitter.push(decoder.decode())
    splitter.flush()
    handlers.onDrop?.()
  }

  void read().catch((error: unknown) => {
    if (isAbort(error) || controller.signal.aborted) return
    handlers.onDrop?.(error)
  })

  return {
    close: () => controller.abort(),
  }
}
