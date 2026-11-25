import { notFound, redirect } from "next/navigation"

import { FEATURED_TOUR_ID, REVALIDATE, WCC_YEAR } from "@/lib/wcc/config"
import { gameHref, tiebreaksHref } from "@/lib/wcc/routes"
import { gameNumberOf, getTourSnapshot, pickCurrentRound } from "@/lib/wcc/snapshot"

/*
  `/wcc/2026` sends a visitor to whatever is worth watching right now: the game
  in progress, else the next one due, else the last one played. It deliberately
  renders nothing itself — a hub page that duplicated the match page would be
  one more thing to keep in step, and the round strip already is the hub.

  The redirect is worked out server-side from the round list rather than from
  the date, because the round list is the only thing that knows a game started
  early or a rest day moved.
*/

export const revalidate = 15

export default async function WccYearPage({
  params,
}: {
  params: Promise<{ year: string }>
}): Promise<never> {
  const { year } = await params

  if (Number(year) !== WCC_YEAR) notFound()

  const tour = await getTourSnapshot(FEATURED_TOUR_ID, { revalidate: REVALIDATE.page })
  const round = pickCurrentRound(tour, Date.now())

  if (round === undefined) notFound()

  const n = gameNumberOf(round)

  redirect(n != null ? gameHref(WCC_YEAR, n) : tiebreaksHref(WCC_YEAR))
}
