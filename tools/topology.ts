import { distance, polylineLength, type EdgeKind, type Network, type NetworkEdge, type Point } from '../src/routing/types'
import type { ExtractedPath } from './extract'
import { connectedComponents } from '../src/routing/components'

export { connectedComponents }

export interface TopologyOptions {
  /** Endpoints closer than this merge into one node. */
  epsilon?: number
  /**
   * Endpoint pairs within this distance but beyond epsilon are reported as
   * near misses: the junctions the illustrator almost closed.
   */
  nearMissFactor?: number
}

export interface TopologyReport {
  nodeCount: number
  edgeCount: number
  /** Node id sets, largest first. More than one means the artwork has a gap. */
  components: number[][]
  /** Nodes with exactly one edge - dead ends, often unintentional. */
  danglingNodes: number[]
  /** Junctions that just missed merging, with the gap that would close them. */
  nearMisses: { a: Point; b: Point; gap: number }[]
  /** Points where two paths were split apart to create a junction. */
  intersectionsFound: number
  /** Crossings deliberately left unconnected because one side is a bridge. */
  bridgeCrossingsSkipped: number
}

interface WorkingPath {
  id: string
  kind: EdgeKind
  points: Point[]
  closed: boolean
  oneWay: boolean
}

/**
 * Turn loose polylines into a routable graph.
 *
 * Nothing in the source declares connectivity; it is derived entirely from
 * geometry. Endpoints that coincide merge, paths that cross split. That is
 * what makes the network drawable by hand rather than hand-coded.
 */
export function buildTopology(
  paths: ExtractedPath[],
  bounds: readonly [Point, Point],
  opts: TopologyOptions = {},
): { network: Network; report: TopologyReport } {
  const { epsilon = 2, nearMissFactor = 6 } = opts

  const working: WorkingPath[] = paths.map((p) => ({
    id: p.id,
    kind: p.kind,
    points: [...p.points],
    closed: p.closed,
    oneWay: p.oneWay,
  }))

  const { splits, intersectionsFound, bridgeCrossingsSkipped } = findSplitPoints(
    working,
    epsilon,
  )
  const segments = splitPaths(working, splits, epsilon)

  const nodes = new NodeStore(epsilon)
  const edges: NetworkEdge[] = []
  for (const segment of segments) {
    const geom = dedupeConsecutive(segment.points, epsilon / 100)
    if (geom.length < 2) continue
    const a = nodes.idFor(geom[0]!)
    const b = nodes.idFor(geom.at(-1)!)
    // Snap the geometry's ends onto the merged node positions so an edge's
    // polyline actually starts and ends where the graph says it does.
    geom[0] = nodes.points[a]!
    geom[geom.length - 1] = nodes.points[b]!
    const len = polylineLength(geom)
    if (len <= 0) continue
    // Splitting walks each path in drawing order, so a -> b is the direction
    // of travel for a one-way segment.
    edges.push({
      a,
      b,
      geom,
      len,
      kind: segment.kind,
      ...(segment.oneWay ? { oneWay: true } : {}),
    })
  }

  const network: Network = { bounds, nodes: nodes.points, edges }
  const compacted = compact(network)

  return {
    network: compacted,
    report: {
      nodeCount: compacted.nodes.length,
      edgeCount: compacted.edges.length,
      components: connectedComponents(compacted),
      danglingNodes: danglingNodes(compacted),
      nearMisses: findNearMisses(compacted, epsilon, epsilon * nearMissFactor),
      intersectionsFound,
      bridgeCrossingsSkipped,
    },
  }
}

/**
 * Spatial hash that merges points within epsilon.
 *
 * Checks the 9 neighbouring cells so a pair straddling a cell boundary still
 * merges - the classic bug in grid-based dedupe.
 */
class NodeStore {
  points: Point[] = []
  private cells = new Map<string, number[]>()
  private epsilon: number

  constructor(epsilon: number) {
    this.epsilon = epsilon
  }

  idFor(p: Point): number {
    const size = Math.max(this.epsilon, 1e-6)
    const cx = Math.floor(p[0] / size)
    const cy = Math.floor(p[1] / size)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = this.cells.get(`${cx + dx},${cy + dy}`)
        if (!bucket) continue
        for (const id of bucket) {
          if (distance(this.points[id]!, p) <= this.epsilon) return id
        }
      }
    }
    const id = this.points.length
    this.points.push(p)
    const key = `${cx},${cy}`
    const bucket = this.cells.get(key)
    if (bucket) bucket.push(id)
    else this.cells.set(key, [id])
    return id
  }
}

interface SplitPoint {
  /** Index of the segment the split falls in. */
  segmentIndex: number
  /** Position along that segment. */
  t: number
  point: Point
}

/**
 * Find every place a path must be cut: true crossings and T-junctions.
 *
 * Bridges are exempt. Two lines crossing in 2D are indistinguishable from a
 * junction; only the author knows one passes over the other, which is why the
 * bridge sublayer exists.
 */
function findSplitPoints(paths: WorkingPath[], epsilon: number) {
  const splits: SplitPoint[][] = paths.map(() => [])
  let intersectionsFound = 0
  let bridgeCrossingsSkipped = 0

  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const first = paths[i]!
      const second = paths[j]!
      const spansBridge = first.kind === 'bridge' || second.kind === 'bridge'

      for (let si = 0; si + 1 < first.points.length; si++) {
        const a1 = first.points[si]!
        const a2 = first.points[si + 1]!
        for (let sj = 0; sj + 1 < second.points.length; sj++) {
          const b1 = second.points[sj]!
          const b2 = second.points[sj + 1]!
          const hit = segmentIntersection(a1, a2, b1, b2)
          if (!hit) continue

          // A crossing at a shared endpoint is already a junction; splitting
          // there would only manufacture a zero-length edge.
          const atEndpoint =
            distance(hit.point, a1) <= epsilon ||
            distance(hit.point, a2) <= epsilon ||
            distance(hit.point, b1) <= epsilon ||
            distance(hit.point, b2) <= epsilon

          if (spansBridge) {
            // Endpoints still join: a bridge connects to the paths it meets,
            // it just does not connect to what it flies over.
            if (atEndpoint) continue
            bridgeCrossingsSkipped++
            continue
          }
          if (atEndpoint) continue

          intersectionsFound++
          splits[i]!.push({ segmentIndex: si, t: hit.t1, point: hit.point })
          splits[j]!.push({ segmentIndex: sj, t: hit.t2, point: hit.point })
        }
      }
    }
  }

  // T-junctions: an endpoint of one path resting on the interior of another.
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]!
    if (path.closed) continue
    for (const end of [path.points[0]!, path.points.at(-1)!]) {
      for (let j = 0; j < paths.length; j++) {
        if (i === j) continue
        const other = paths[j]!
        if (path.kind === 'bridge' && other.kind === 'bridge') continue
        const hit = nearestOnPath(other.points, end)
        if (!hit || hit.distance > epsilon) continue
        if (
          distance(hit.point, other.points[0]!) <= epsilon ||
          distance(hit.point, other.points.at(-1)!) <= epsilon
        ) {
          continue
        }
        intersectionsFound++
        splits[j]!.push({ segmentIndex: hit.segmentIndex, t: hit.t, point: end })
      }
    }
  }

  return { splits, intersectionsFound, bridgeCrossingsSkipped }
}

interface Segment {
  points: Point[]
  kind: EdgeKind
  oneWay: boolean
}

function splitPaths(
  paths: WorkingPath[],
  splits: SplitPoint[][],
  epsilon: number,
): Segment[] {
  const out: Segment[] = []

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]!
    const { kind, oneWay } = path
    const cuts = [...splits[i]!].sort(
      (a, b) => a.segmentIndex - b.segmentIndex || a.t - b.t,
    )

    if (cuts.length === 0) {
      // A ring with no cuts is unreachable, but keep it: the validation report
      // surfaces it as an isolated component rather than silently dropping it.
      out.push({ points: path.points, kind, oneWay })
      continue
    }

    let current: Point[] = [path.points[0]!]
    let cutIndex = 0
    for (let s = 0; s + 1 < path.points.length; s++) {
      while (
        cutIndex < cuts.length &&
        cuts[cutIndex]!.segmentIndex === s
      ) {
        const cut = cuts[cutIndex]!
        if (distance(cut.point, current.at(-1)!) > epsilon) current.push(cut.point)
        if (current.length >= 2) out.push({ points: current, kind, oneWay })
        current = [cut.point]
        cutIndex++
      }
      current.push(path.points[s + 1]!)
    }
    if (current.length >= 2) out.push({ points: current, kind, oneWay })
  }

  return out
}

/**
 * Collapse chains of degree-2 nodes into single edges carrying the full curve.
 *
 * A roundabout with only two approaches collapses into two parallel edges
 * between the same node pair, which is legal and must survive: the graph is a
 * multigraph, and dropping one arc silently routes people the long way round.
 */
function compact(network: Network): Network {
  // One-way edges never join a chain. Chaining reverses an edge whenever it is
  // entered from its `b` end, which would silently flip the direction of
  // travel - a roundabout would then circulate whichever way the walk happened
  // to go. Excluding them costs a few extra nodes and removes the hazard.
  const chainable = network.edges.map((edge) => !edge.oneWay)

  const degree: number[] = network.nodes.map(() => 0)
  const incident: number[][] = network.nodes.map(() => [])
  network.edges.forEach((edge, id) => {
    degree[edge.a]!++
    if (edge.b !== edge.a) degree[edge.b]!++
    if (!chainable[id]) return
    incident[edge.a]!.push(id)
    if (edge.b !== edge.a) incident[edge.b]!.push(id)
  })

  const consumed = new Set<number>()
  const chains: NetworkEdge[] = []

  // A node only disappears if *every* edge touching it can be chained through.
  // Counting only the chainable ones would compact away a node that a one-way
  // edge also lands on, orphaning that edge's endpoint.
  const isThrough = (node: number) => degree[node] === 2 && incident[node]!.length === 2

  const walkChain = (startEdge: number, startNode: number): NetworkEdge => {
    const first = network.edges[startEdge]!
    let geom: Point[] = first.a === startNode ? [...first.geom] : [...first.geom].reverse()
    const kind = first.kind
    let at = first.a === startNode ? first.b : first.a
    consumed.add(startEdge)
    let previousEdge = startEdge

    while (isThrough(at) && at !== startNode) {
      const nextEdge = incident[at]!.find((id) => id !== previousEdge)
      if (nextEdge === undefined || consumed.has(nextEdge)) break
      const edge = network.edges[nextEdge]!
      // A change of kind ends the chain. Absorbing across it would spread one
      // segment's kind over everything it touches, relabelling a whole run of
      // ordinary road as a bridge - wrong in the data and wrong on the debug
      // overlay, and wrong in the weighting if kinds ever differ in cost.
      if (edge.kind !== kind) break
      const forward = edge.a === at
      const piece = forward ? edge.geom : [...edge.geom].reverse()
      geom = geom.concat(piece.slice(1))
      consumed.add(nextEdge)
      previousEdge = nextEdge
      at = forward ? edge.b : edge.a
    }

    return { a: startNode, b: at, geom, len: polylineLength(geom), kind }
  }

  // Start every chain at a junction or dead end, so through-nodes disappear.
  for (let node = 0; node < network.nodes.length; node++) {
    if (isThrough(node)) continue
    for (const edgeId of incident[node]!) {
      if (consumed.has(edgeId)) continue
      chains.push(walkChain(edgeId, node))
    }
  }

  // Whatever is left is a pure loop with no junction to start from - a ring
  // road no approach touches. Keep it as a self-edge rather than dropping it.
  for (let id = 0; id < network.edges.length; id++) {
    if (!chainable[id] || consumed.has(id)) continue
    chains.push(walkChain(id, network.edges[id]!.a))
  }

  // One-way edges pass through untouched, keeping their authored a -> b sense.
  for (let id = 0; id < network.edges.length; id++) {
    if (!chainable[id]) chains.push(network.edges[id]!)
  }

  const used = new Set<number>()
  for (const edge of chains) {
    used.add(edge.a)
    used.add(edge.b)
  }

  // Reindex so through-nodes vanish from the node list too.
  const remap = new Map<number, number>()
  const nodes: Point[] = []
  for (const old of [...used].sort((a, b) => a - b)) {
    remap.set(old, nodes.length)
    nodes.push(network.nodes[old]!)
  }

  return {
    bounds: network.bounds,
    nodes,
    edges: chains.map((edge) => ({
      ...edge,
      a: remap.get(edge.a)!,
      b: remap.get(edge.b)!,
    })),
  }
}

function danglingNodes(network: Network): number[] {
  const degree = new Int32Array(network.nodes.length)
  for (const edge of network.edges) {
    degree[edge.a]!++
    degree[edge.b]!++
  }
  const out: number[] = []
  for (let node = 0; node < degree.length; node++) {
    if (degree[node] === 1) out.push(node)
  }
  return out
}

/**
 * Endpoint pairs that just missed merging.
 *
 * These are the actionable bugs: a junction the illustrator meant to close,
 * sitting a hair outside epsilon. Reporting the gap turns authoring into a
 * feedback loop instead of a precision exercise.
 */
function findNearMisses(
  network: Network,
  epsilon: number,
  limit: number,
): { a: Point; b: Point; gap: number }[] {
  const ends = danglingNodes(network)
  const out: { a: Point; b: Point; gap: number }[] = []
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const a = network.nodes[ends[i]!]!
      const b = network.nodes[ends[j]!]!
      const gap = distance(a, b)
      if (gap > epsilon && gap <= limit) out.push({ a, b, gap })
    }
  }
  return out.sort((x, y) => x.gap - y.gap)
}

function dedupeConsecutive(points: Point[], tolerance: number): Point[] {
  const out: Point[] = []
  for (const point of points) {
    const last = out.at(-1)
    if (last && distance(last, point) <= tolerance) continue
    out.push(point)
  }
  return out
}

export function segmentIntersection(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): { point: Point; t1: number; t2: number } | null {
  const rx = a2[0] - a1[0]
  const ry = a2[1] - a1[1]
  const sx = b2[0] - b1[0]
  const sy = b2[1] - b1[1]
  const denominator = rx * sy - ry * sx
  if (Math.abs(denominator) < 1e-12) return null // parallel or degenerate

  const t1 = ((b1[0] - a1[0]) * sy - (b1[1] - a1[1]) * sx) / denominator
  const t2 = ((b1[0] - a1[0]) * ry - (b1[1] - a1[1]) * rx) / denominator
  if (t1 < 0 || t1 > 1 || t2 < 0 || t2 > 1) return null

  return { point: [a1[0] + t1 * rx, a1[1] + t1 * ry], t1, t2 }
}

function nearestOnPath(
  points: readonly Point[],
  p: Point,
): { segmentIndex: number; t: number; point: Point; distance: number } | null {
  let best: { segmentIndex: number; t: number; point: Point; distance: number } | null =
    null
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const abx = b[0] - a[0]
    const aby = b[1] - a[1]
    const lengthSq = abx * abx + aby * aby
    let t = 0
    if (lengthSq > 0) {
      t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / lengthSq
      t = t < 0 ? 0 : t > 1 ? 1 : t
    }
    const point: Point = [a[0] + t * abx, a[1] + t * aby]
    const d = distance(p, point)
    if (!best || d < best.distance) best = { segmentIndex: i, t, point, distance: d }
  }
  return best
}
