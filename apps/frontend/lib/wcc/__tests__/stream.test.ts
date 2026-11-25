import { describe, expect, it, vi } from 'vitest'

import { LICHESS_BASE_URL, POLL } from '@/lib/wcc/config'
import type { ParsedGame } from '@/types/wcc'

import { createPgnFrameSplitter, openRoundStream } from '../stream'

const GAME_1 = [
  '[Event "FIDE World Championship 2026"]',
  '[Site "Astana KAZ"]',
  '[White "Gukesh D"]',
  '[Black "Sindarov, Javokhir"]',
  '[Result "1/2-1/2"]',
  '[GameURL "https://lichess.org/aaaaaaaa"]',
  '',
  '1. e4 { [%clk 2:00:00] } e5 { [%clk 2:00:00] } 2. Nf3 Nc6 1/2-1/2',
].join('\n')

const GAME_2 = [
  '[Event "FIDE World Championship 2026"]',
  '[White "Sindarov, Javokhir"]',
  '[Black "Gukesh D"]',
  '[Result "*"]',
  '[GameURL "https://lichess.org/bbbbbbbb"]',
  '',
  '1. d4 Nf6 *',
].join('\n')

const GAME_3 = [
  '[Event "FIDE World Championship 2026"]',
  '[White "Gukesh D"]',
  '[Black "Sindarov, Javokhir"]',
  '[Result "*"]',
  '[GameURL "https://lichess.org/cccccccc"]',
  '',
  '1. c4 *',
].join('\n')

const BOTH = `${GAME_1}\n\n\n${GAME_2}\n`

const ALL_THREE = `${GAME_1}\n\n\n${GAME_2}\n\n\n${GAME_3}\n`

/** Feeds `text` to the splitter, cut at the given offsets. */
const pushCutAt = (push: (chunk: string) => void, text: string, cuts: number[]): void => {
  const bounds = [
    0,
    ...[...new Set(cuts)].filter((cut) => cut > 0 && cut < text.length).sort((a, b) => a - b),
    text.length,
  ]

  for (let i = 0; i < bounds.length - 1; i += 1) push(text.slice(bounds[i], bounds[i + 1]))
}

const streamOf = (chunks: string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[index]))
      index += 1
    },
  })
}

/** A body that never produces a chunk and never ends, so only an abort stops it. */
const hangingStream = (): ReadableStream<Uint8Array> => new ReadableStream({})

const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('createPgnFrameSplitter', () => {
  it('holds a game back until the next one begins', () => {
    const frames: string[] = []
    const splitter = createPgnFrameSplitter((pgn) => frames.push(pgn))

    splitter.push(`${GAME_1}\n\n`)
    expect(frames).toEqual([])

    splitter.push(GAME_2)
    expect(frames).toEqual([GAME_1])
  })

  it('emits what is left on flush', () => {
    const frames: string[] = []
    const splitter = createPgnFrameSplitter((pgn) => frames.push(pgn))

    splitter.push(BOTH)
    splitter.flush()

    expect(frames).toEqual([GAME_1, GAME_2])
  })

  it('emits nothing on a flush with nothing buffered', () => {
    const frames: string[] = []
    const splitter = createPgnFrameSplitter((pgn) => frames.push(pgn))

    splitter.push('\n\n')
    splitter.flush()
    splitter.flush()

    expect(frames).toEqual([])
  })

  it('reassembles chunks cut mid-tag, mid-move and at the blank line', () => {
    const frames: string[] = []
    const splitter = createPgnFrameSplitter((pgn) => frames.push(pgn))

    pushCutAt(splitter.push, BOTH, [
      BOTH.indexOf('[Black "Sindarov') + 8, // mid-tag
      BOTH.indexOf('2. Nf3') + 3, // mid-move
      BOTH.indexOf(GAME_2), // exactly at the blank line before the next game
      BOTH.indexOf('1. d4 Nf6') + 4, // mid-move of the second game
    ])
    splitter.flush()

    expect(frames).toEqual([GAME_1, GAME_2])
  })

  it('keeps the separator when a chunk ends right after an emitted game', () => {
    const frames: string[] = []
    const splitter = createPgnFrameSplitter((pgn) => frames.push(pgn))

    // The cut lands on the blank line between games 2 and 3, with game 1
    // already complete: the emitted tail must keep the separator the next
    // chunk needs, or games 2 and 3 run into one another.
    pushCutAt(splitter.push, ALL_THREE, [ALL_THREE.indexOf(GAME_3)])
    splitter.flush()

    expect(frames).toEqual([GAME_1, GAME_2, GAME_3])
  })

  it('reassembles a stream delivered one character at a time', () => {
    const frames: string[] = []
    const splitter = createPgnFrameSplitter((pgn) => frames.push(pgn))

    for (const character of BOTH) splitter.push(character)
    splitter.flush()

    expect(frames).toEqual([GAME_1, GAME_2])
  })

  it('does not split a game between its tags and its movetext', () => {
    const frames: string[] = []
    const splitter = createPgnFrameSplitter((pgn) => frames.push(pgn))

    splitter.push(GAME_1)
    splitter.flush()

    expect(frames).toEqual([GAME_1])
  })
})

describe('openRoundStream', () => {
  it('asks Lichess for the round pgn stream with clocks and comments', async () => {
    const fetchImpl = vi.fn(async () => new Response(streamOf([]), { status: 200 }))

    openRoundStream('L3j03TZq', { onGame: () => {} }, { fetchImpl: fetchImpl as never })
    await settle()

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(
      `${LICHESS_BASE_URL}/api/stream/broadcast/round/L3j03TZq.pgn?clocks=true&comments=true`,
    )
    expect(init.headers).toEqual({ Accept: 'application/x-chess-pgn' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('reports one parsed game per frame, then a drop when the stream ends', async () => {
    const chunks = [
      BOTH.slice(0, BOTH.indexOf('1. e4') + 3),
      BOTH.slice(BOTH.indexOf('1. e4') + 3, BOTH.indexOf(GAME_2) + 20),
      BOTH.slice(BOTH.indexOf(GAME_2) + 20),
    ]
    const games: ParsedGame[] = []
    const onConnect = vi.fn()
    const onDrop = vi.fn()

    openRoundStream(
      'L3j03TZq',
      { onGame: (game) => games.push(game), onConnect, onDrop },
      { fetchImpl: (async () => new Response(streamOf(chunks), { status: 200 })) as never },
    )
    await settle()

    expect(onConnect).toHaveBeenCalledTimes(1)
    expect(games.map((game) => game.id)).toEqual(['aaaaaaaa', 'bbbbbbbb'])
    expect(games[0].plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
    expect(games[1].plies.map((p) => p.san)).toEqual(['d4', 'Nf6'])
    expect(onDrop).toHaveBeenCalledTimes(1)
  })

  it('honours the Retry-After window of a rate limit', async () => {
    const onRateLimited = vi.fn()
    const onDrop = vi.fn()
    const onConnect = vi.fn()

    openRoundStream(
      'L3j03TZq',
      { onGame: () => {}, onConnect, onDrop, onRateLimited },
      {
        fetchImpl: (async () =>
          new Response('rate limited', { status: 429, headers: { 'Retry-After': '30' } })) as never,
      },
    )
    await settle()

    expect(onRateLimited).toHaveBeenCalledWith(30)
    expect(onConnect).not.toHaveBeenCalled()
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('falls back to the configured window for a rate limit with no Retry-After', async () => {
    const onRateLimited = vi.fn()

    openRoundStream(
      'L3j03TZq',
      { onGame: () => {}, onRateLimited },
      { fetchImpl: (async () => new Response('rate limited', { status: 429 })) as never },
    )
    await settle()

    expect(onRateLimited).toHaveBeenCalledWith(POLL.rateLimitedSec)
  })

  it('reports any other failed response as a drop', async () => {
    const onDrop = vi.fn()
    const onConnect = vi.fn()

    openRoundStream(
      'L3j03TZq',
      { onGame: () => {}, onConnect, onDrop },
      { fetchImpl: (async () => new Response('nope', { status: 503 })) as never },
    )
    await settle()

    expect(onConnect).not.toHaveBeenCalled()
    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDrop.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('reports a rejected request as a drop', async () => {
    const onDrop = vi.fn()

    openRoundStream(
      'L3j03TZq',
      { onGame: () => {}, onDrop },
      {
        fetchImpl: (async () => {
          throw new TypeError('network down')
        }) as never,
      },
    )
    await settle()

    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDrop.mock.calls[0][0]).toBeInstanceOf(TypeError)
  })

  it('stays silent when the caller closes it', async () => {
    const onDrop = vi.fn()
    const onConnect = vi.fn()

    const stream = openRoundStream(
      'L3j03TZq',
      { onGame: () => {}, onConnect, onDrop },
      { fetchImpl: (async () => new Response(hangingStream(), { status: 200 })) as never },
    )
    await settle()
    stream.close()
    await settle()

    expect(onConnect).toHaveBeenCalledTimes(1)
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('stays silent when the request is aborted before it resolves', async () => {
    const onDrop = vi.fn()

    const stream = openRoundStream(
      'L3j03TZq',
      { onGame: () => {}, onDrop },
      {
        fetchImpl: ((_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          })) as never,
      },
    )
    stream.close()
    await settle()

    expect(onDrop).not.toHaveBeenCalled()
  })

  it('can be pointed at another origin', async () => {
    // Typed as (url: string) => ... so mock.calls[0][0] is the requested URL
    // rather than an empty tuple.
    const fetchImpl = vi.fn(async (_url: string) => new Response(streamOf([]), { status: 200 }))

    openRoundStream(
      'L3j03TZq',
      { onGame: () => {} },
      { fetchImpl: fetchImpl as never, baseUrl: 'https://example.test' },
    )
    await settle()

    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://example.test/api/stream/broadcast/round/L3j03TZq.pgn?clocks=true&comments=true',
    )
  })
})
