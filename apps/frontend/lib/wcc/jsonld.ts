/**
 * schema.org `SportsEvent` markup for a broadcast round.
 *
 * Only `eventStatus` values schema.org actually defines are emitted: there is
 * no `EventLive` or `EventCompleted`, so every round is `EventScheduled` and the
 * start and end dates carry the timing.
 */
import { OFFICIAL_LINKS } from '@/lib/wcc/config'
import type { LichessRoundSummary, LichessTour, WccGame } from '@/types/wcc'

export function sportsEventJsonLd(input: {
  tour: Pick<LichessTour, 'name' | 'url' | 'info'>
  round: LichessRoundSummary
  game?: Pick<WccGame, 'tags'>
  pageUrl: string
}): Record<string, unknown> {
  const { tour, round, game, pageUrl } = input
  const location = tour.info?.location

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${tour.name} · ${round.name}`,
    ...(round.startsAt === undefined ? {} : { startDate: new Date(round.startsAt).toISOString() }),
    ...(round.finishedAt === undefined ? {} : { endDate: new Date(round.finishedAt).toISOString() }),
    eventStatus: 'https://schema.org/EventScheduled',
    ...(location === undefined ? {} : { location: { '@type': 'Place', name: location } }),
    ...(game === undefined
      ? {}
      : {
          competitor: [
            { '@type': 'Person', name: game.tags.White },
            { '@type': 'Person', name: game.tags.Black },
          ],
        }),
    url: pageUrl,
    sameAs: round.url,
    organizer: { '@type': 'Organization', name: 'FIDE', url: OFFICIAL_LINKS.fide },
  }
}
