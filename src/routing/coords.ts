import type { Point } from './types'
import { origins } from './generated'

/**
 * A config-friendly map point: either raw artwork-pixel coords, or a
 * network.svg #origins anchor id (e.g. CONFIG.map's initialCenter, "main").
 * Pin ids aren't accepted: pins come from the CMS at runtime, and config
 * resolves before they load.
 */
export function resolveMapPoint(ref: Point | string): Point {
  if (typeof ref !== 'string') return ref

  const anchor = origins.find((a) => a.id === ref)
  if (!anchor) {
    throw new Error(`"${ref}" isn't a network.svg #origins anchor.`)
  }
  return anchor.point
}
