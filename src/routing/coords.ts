import type { Point } from './types'
import { anchors } from './generated'

/**
 * A config-friendly map point: either raw artwork-pixel coords, or an
 * #origins/#destinations anchor id from network.svg (e.g. CONFIG.map's
 * initialCenter, "main"). Resolved here since both need the same lookup.
 */
export function resolveMapPoint(ref: Point | string): Point {
  if (typeof ref !== 'string') return ref

  const anchor = anchors.origins.find((a) => a.id === ref) ?? anchors.destinations.find((a) => a.id === ref)
  if (!anchor) {
    throw new Error(`"${ref}" isn't an #origins/#destinations anchor id in network.svg.`)
  }
  return anchor.point
}
