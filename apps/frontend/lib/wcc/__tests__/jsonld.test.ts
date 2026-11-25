import { describe, expect, it } from 'vitest'

import { OFFICIAL_LINKS } from '@/lib/wcc/config'
import type { LichessRoundSummary, LichessTour, WccGame } from '@/types/wcc'

import { sportsEventJsonLd } from '../jsonld'

const TOUR: Pick<LichessTour, 'name' | 'url' | 'info'> = {
  name: 'FIDE World Chess Championship 2026',
  url: 'https://lichess.org/broadcast/fide-world-chess-championship-2026/qfkdt8mn',
  info: { location: 'Zurich, Switzerland' },
}

const ROUND: LichessRoundSummary = {
  id: 'L3j03TZq',
  name: 'Game 1',
  slug: 'game-1',
  url: 'https://lichess.org/broadcast/fide-world-chess-championship-2026/game-1/L3j03TZq',
  startsAt: 1_770_000_000_000,
}

const GAME: Pick<WccGame, 'tags'> = {
  tags: { White: 'Gukesh D', Black: 'Sindarov, Javokhir' },
}

const PAGE_URL = 'https://www.pawnstaar.com/wcc/2026/game/1'

describe('sportsEventJsonLd', () => {
  it('describes a finished round with a game', () => {
    const jsonLd = sportsEventJsonLd({
      tour: TOUR,
      round: { ...ROUND, finished: true, finishedAt: 1_770_020_000_000 },
      game: GAME,
      pageUrl: PAGE_URL,
    })

    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: 'FIDE World Chess Championship 2026 · Game 1',
      startDate: '2026-02-02T02:40:00.000Z',
      endDate: '2026-02-02T08:13:20.000Z',
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: 'Zurich, Switzerland' },
      competitor: [
        { '@type': 'Person', name: 'Gukesh D' },
        { '@type': 'Person', name: 'Sindarov, Javokhir' },
      ],
      url: PAGE_URL,
      sameAs: ROUND.url,
      organizer: { '@type': 'Organization', name: 'FIDE', url: OFFICIAL_LINKS.fide },
    })
  })

  it('leaves out the competitors and the end date for an upcoming round', () => {
    const jsonLd = sportsEventJsonLd({
      tour: TOUR,
      round: { ...ROUND, name: 'Game 2', startsAt: 1_770_100_000_000 },
      pageUrl: PAGE_URL,
    })

    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: 'FIDE World Chess Championship 2026 · Game 2',
      startDate: '2026-02-03T06:26:40.000Z',
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: 'Zurich, Switzerland' },
      url: PAGE_URL,
      sameAs: ROUND.url,
      organizer: { '@type': 'Organization', name: 'FIDE', url: OFFICIAL_LINKS.fide },
    })
  })

  it('leaves out the start date and the location when the broadcast has neither', () => {
    const jsonLd = sportsEventJsonLd({
      tour: { name: TOUR.name, url: TOUR.url },
      round: { id: ROUND.id, name: ROUND.name, slug: ROUND.slug, url: ROUND.url },
      pageUrl: PAGE_URL,
    })

    expect(jsonLd).not.toHaveProperty('startDate')
    expect(jsonLd).not.toHaveProperty('location')
    expect(jsonLd.eventStatus).toBe('https://schema.org/EventScheduled')
  })
})
