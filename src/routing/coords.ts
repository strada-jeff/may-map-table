import L from 'leaflet'
import type { Point } from './types'
import { anchors } from './generated'

/**
 * Map space is artwork pixels with y increasing downward, as in SVG.
 * Leaflet's CRS.Simple puts latitude on the y axis increasing *upward*, so the
 * two disagree by a flip. Every conversion goes through here — constructing an
 * L.latLng inline is how the map ends up upside down.
 */
export class MapSpace {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number

  constructor(bounds: readonly [Point, Point]) {
    this.minX = bounds[0][0]
    this.minY = bounds[0][1]
    this.maxX = bounds[1][0]
    this.maxY = bounds[1][1]
  }

  /** [x, y] in artwork pixels -> [lat, lng] for Leaflet. */
  toLatLngTuple(point: Point): [number, number] {
    return [this.maxY - point[1], point[0]]
  }

  /** Inverse of toLatLngTuple, for turning a tap back into map space. */
  fromLatLngTuple(lat: number, lng: number): Point {
    return [lng, this.maxY - lat]
  }

  toLatLng(point: Point): L.LatLng {
    const [lat, lng] = this.toLatLngTuple(point)
    return L.latLng(lat, lng)
  }

  toLatLngs(points: readonly Point[]): L.LatLng[] {
    return points.map((point) => this.toLatLng(point))
  }

  fromLatLng(latlng: L.LatLng): Point {
    return this.fromLatLngTuple(latlng.lat, latlng.lng)
  }

  /** Full extent of the artwork, for the image overlay and maxBounds. */
  get latLngBounds(): L.LatLngBounds {
    return L.latLngBounds(
      this.toLatLng([this.minX, this.maxY]),
      this.toLatLng([this.maxX, this.minY]),
    )
  }
}

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
