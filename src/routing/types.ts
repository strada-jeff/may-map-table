/** A point in map space: artwork pixels at 100% scale. [x, y], y down. */
export type Point = readonly [number, number]

/**
 * Road classes.
 *
 * `bridge` is not a cost distinction — it is the flag that exempts a road from
 * intersection splitting, so it passes over what it crosses rather than
 * joining it. That topology meaning is the only reason `kind` still exists.
 */
export type EdgeKind = 'path' | 'bridge'

export interface NetworkEdge {
  /** Node id of this edge's start. */
  a: number
  /** Node id of this edge's end. */
  b: number
  /** Geometric length in map units (not the routing weight). */
  len: number
  /** Full polyline geometry in a -> b order, inclusive of both endpoints. */
  geom: Point[]
  kind: EdgeKind
  /** Traversable a->b only. Irrelevant for walking maps; see plan. */
  oneWay?: boolean
}

export interface Network {
  bounds: readonly [Point, Point]
  /** Index is the node id. */
  nodes: Point[]
  /** Index is the edge id. Parallel edges between the same node pair are legal. */
  edges: NetworkEdge[]
}

export function distance(p: Point, q: Point): number {
  return Math.hypot(q[0] - p[0], q[1] - p[1])
}

/** Summed segment length of a polyline. */
export function polylineLength(geom: readonly Point[]): number {
  let total = 0
  for (let i = 1; i < geom.length; i++) total += distance(geom[i - 1]!, geom[i]!)
  return total
}
