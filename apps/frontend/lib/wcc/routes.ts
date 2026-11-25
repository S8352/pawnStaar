/**
 * The WCC URL shapes, in one place.
 *
 * Every link in the feature goes through these, so the route structure can
 * change without hunting template literals through components.
 */

/** The broadcast hub. */
export function wccHref(): string {
  return '/wcc'
}

/** One match year. */
export function yearHref(year: number): string {
  return `/wcc/${year}`
}

/** One classical game of a match, numbered as the organisers number it. */
export function gameHref(year: number, n: number): string {
  return `/wcc/${year}/game-${n}`
}

/** The tiebreak day of a match. */
export function tiebreaksHref(year: number): string {
  return `/wcc/${year}/tiebreaks`
}

/**
 * The same link, deep-linked to a ply, so a shared position opens where the
 * sharer was looking. Joins with `&` if the href already carries a query.
 */
export function withPly(href: string, ply: number): string {
  return `${href}${href.includes('?') ? '&' : '?'}ply=${ply}`
}
