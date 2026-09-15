import { distance, polylineLength, type Network, type NetworkEdge, type Point } from './types'

export interface Projection {
  /** Closest point on the segment. */
  point: Point
  /** Position along the segment, clamped to [0, 1]. */
  t: number
  /** Squared distance from the query point (squared to avoid a sqrt per test). */
  dist2: number
}

/**
 * Closest point on segment [a, b] to p, clamped to the segment.
 *
 * A degenerate segment (a === b) has no direction to project onto, so t is 0
 * and the answer is the point itself. Real networks produce these wherever the
 * artwork has a duplicated vertex.
 */
export function projectPointOnSegment(p: Point, a: Point, b: Point): Projection {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const lengthSq = abx * abx + aby * aby
  let t = 0
  if (lengthSq > 0) {
    t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / lengthSq
    t = t < 0 ? 0 : t > 1 ? 1 : t
  }
  const point: Point = [a[0] + t * abx, a[1] + t * aby]
  const dx = p[0] - point[0]
  const dy = p[1] - point[1]
  return { point, t, dist2: dx * dx + dy * dy }
}

export interface Snap {
  edgeId: number
  /** Index of the segment within the edge's geometry: geom[i] -> geom[i + 1]. */
  segmentIndex: number
  /** Position along that segment, in [0, 1]. */
  t: number
  /** The snapped point itself. */
  point: Point
  /** Distance from the query point to the network. */
  distance: number
  /** Arc length from the edge's `a` end to the snapped point. */
  offsetFromA: number
}

/**
 * Uniform grid over edge segments.
 *
 * Brute force would be acceptable at this network's size, but the index keeps
 * tap-anywhere routing constant-time as the map grows, and it is the same
 * structure the topology builder needs for endpoint merging.
 */
export class SnapIndex {
  private network: Network
  private cellSize: number
  private cells = new Map<string, number[]>()
  /** Parallel arrays: segment i belongs to edge `segEdge[i]` at `segIndex[i]`. */
  private segEdge: number[] = []
  private segIndex: number[] = []

  constructor(network: Network, cellSize = 64) {
    this.network = network
    this.cellSize = cellSize
    for (let edgeId = 0; edgeId < network.edges.length; edgeId++) {
      const geom = network.edges[edgeId]!.geom
      for (let i = 0; i + 1 < geom.length; i++) {
        const ref = this.segEdge.length
        this.segEdge.push(edgeId)
        this.segIndex.push(i)
        this.addToCells(ref, geom[i]!, geom[i + 1]!)
      }
    }
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`
  }

  private addToCells(ref: number, a: Point, b: Point): void {
    const size = this.cellSize
    const minX = Math.floor(Math.min(a[0], b[0]) / size)
    const maxX = Math.floor(Math.max(a[0], b[0]) / size)
    const minY = Math.floor(Math.min(a[1], b[1]) / size)
    const maxY = Math.floor(Math.max(a[1], b[1]) / size)
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = this.key(cx, cy)
        const bucket = this.cells.get(key)
        if (bucket) bucket.push(ref)
        else this.cells.set(key, [ref])
      }
    }
  }

  /**
   * Nearest point on the network. Searches an expanding ring of cells and only
   * stops once the ring's guaranteed-minimum distance exceeds the best hit, so
   * a near miss in a diagonal cell can't be skipped.
   */
  snap(p: Point): Snap | null {
    const size = this.cellSize
    const cx = Math.floor(p[0] / size)
    const cy = Math.floor(p[1] / size)
    let best: Snap | null = null
    let bestDist2 = Infinity

    const maxRing = Math.ceil(
      Math.max(
        this.network.bounds[1][0] - this.network.bounds[0][0],
        this.network.bounds[1][1] - this.network.bounds[0][1],
      ) / size,
    )

    for (let ring = 0; ring <= maxRing; ring++) {
      // Everything in this ring is at least (ring - 1) cells away, so once the
      // best hit beats that, no further ring can improve on it.
      if (best && bestDist2 < Math.pow(Math.max(0, ring - 1) * size, 2)) break

      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          // Only the ring's perimeter is new; the interior was covered already.
          if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue
          const bucket = this.cells.get(this.key(cx + dx, cy + dy))
          if (!bucket) continue
          for (const ref of bucket) {
            const edgeId = this.segEdge[ref]!
            const segmentIndex = this.segIndex[ref]!
            const geom = this.network.edges[edgeId]!.geom
            const projection = projectPointOnSegment(
              p,
              geom[segmentIndex]!,
              geom[segmentIndex + 1]!,
            )
            if (projection.dist2 < bestDist2) {
              bestDist2 = projection.dist2
              best = {
                edgeId,
                segmentIndex,
                t: projection.t,
                point: projection.point,
                distance: Math.sqrt(projection.dist2),
                offsetFromA: arcLengthTo(geom, segmentIndex, projection.point),
              }
            }
          }
        }
      }
    }

    return best
  }
}

function arcLengthTo(geom: readonly Point[], segmentIndex: number, point: Point): number {
  let total = 0
  for (let i = 0; i < segmentIndex; i++) total += distance(geom[i]!, geom[i + 1]!)
  return total + distance(geom[segmentIndex]!, point)
}

/**
 * Split an edge at a snapped point, returning the new node id.
 *
 * Mutates the network in place: the original edge is truncated to end at the
 * new node and a second edge carries the remainder. Run at build time for the
 * origin and every destination, so the runtime never has to splice the graph.
 *
 * Snaps landing on an existing endpoint reuse that node rather than creating a
 * zero-length edge.
 */
export function splitEdgeAt(network: Network, snap: Snap, epsilon = 1e-6): number {
  const edge = network.edges[snap.edgeId]!
  const geom = edge.geom

  if (snap.offsetFromA <= epsilon) return edge.a
  if (snap.offsetFromA >= edge.len - epsilon) return edge.b

  const nodeId = network.nodes.length
  network.nodes.push(snap.point)

  // The split point lands inside segment `segmentIndex`, so it terminates the
  // first half and opens the second.
  const head: Point[] = [...geom.slice(0, snap.segmentIndex + 1), snap.point]
  const tail: Point[] = [snap.point, ...geom.slice(snap.segmentIndex + 1)]

  const tailEdge: NetworkEdge = {
    a: nodeId,
    b: edge.b,
    len: polylineLength(tail),
    geom: tail,
    kind: edge.kind,
    ...(edge.oneWay ? { oneWay: true } : {}),
  }

  edge.b = nodeId
  edge.geom = head
  edge.len = polylineLength(head)
  network.edges.push(tailEdge)

  return nodeId
}
