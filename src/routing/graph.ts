import { MinHeap } from './heap'
import type { Network, Point } from './types'

/**
 * Adjacency in compressed-sparse-row form. Arcs are directed: an undirected
 * edge contributes two.
 *
 * `arcEdge` is what makes this a multigraph. Two roads can join the same pair
 * of nodes — the two ways around a roundabout being the common case — so an
 * arc must be identified by its edge id, never by its (from, to) pair.
 */
export interface Graph {
  nodeCount: number
  /** Arc slice for node n is [offsets[n], offsets[n + 1]). */
  offsets: Int32Array
  arcTarget: Int32Array
  arcEdge: Int32Array
  arcWeight: Float64Array
}

export function buildGraph(network: Network): Graph {
  const nodeCount = network.nodes.length
  const degree = new Int32Array(nodeCount)

  // Cost is simply length: every road class is equally quick to drive, so
  // there is nothing to weight. If that ever changes, multiply here rather
  // than touching `len`, which must stay purely geometric.
  const arcs: { from: number; to: number; edge: number; weight: number }[] = []
  for (let id = 0; id < network.edges.length; id++) {
    const edge = network.edges[id]!
    const weight = edge.len
    // A non-finite length would poison every distance downstream of it.
    if (!Number.isFinite(weight) || weight <= 0) continue
    arcs.push({ from: edge.a, to: edge.b, edge: id, weight })
    degree[edge.a]!++
    // A one-way edge contributes a single arc, so the search can only traverse
    // it a -> b. Geometry order is therefore the direction of travel.
    if (!edge.oneWay) {
      arcs.push({ from: edge.b, to: edge.a, edge: id, weight })
      degree[edge.b]!++
    }
  }

  const offsets = new Int32Array(nodeCount + 1)
  for (let n = 0; n < nodeCount; n++) offsets[n + 1] = offsets[n]! + degree[n]!

  const arcTarget = new Int32Array(arcs.length)
  const arcEdge = new Int32Array(arcs.length)
  const arcWeight = new Float64Array(arcs.length)
  const cursor = Int32Array.from(offsets.subarray(0, nodeCount))
  for (const arc of arcs) {
    const at = cursor[arc.from]!++
    arcTarget[at] = arc.to
    arcEdge[at] = arc.edge
    arcWeight[at] = arc.weight
  }

  return { nodeCount, offsets, arcTarget, arcEdge, arcWeight }
}

/** Shortest-path tree rooted at one source. */
export interface ShortestPathTree {
  source: number
  /** Weighted cost to each node; Infinity where unreachable. */
  dist: Float64Array
  /** Predecessor node id, or -1 at the source and for unreachable nodes. */
  prev: Int32Array
  /** Edge id used to arrive at each node. Required for parallel edges. */
  prevEdge: Int32Array
}

/**
 * One sweep answers every destination, which is the whole reason this app
 * needs no A*: the origin is fixed, so a single tree covers the entire map.
 */
export function dijkstraFrom(graph: Graph, source: number): ShortestPathTree {
  const { nodeCount, offsets, arcTarget, arcEdge, arcWeight } = graph
  const dist = new Float64Array(nodeCount).fill(Infinity)
  const prev = new Int32Array(nodeCount).fill(-1)
  const prevEdge = new Int32Array(nodeCount).fill(-1)
  const settled = new Uint8Array(nodeCount)
  const heap = new MinHeap(nodeCount)

  dist[source] = 0
  heap.push(source, 0)

  for (;;) {
    const node = heap.pop()
    if (node < 0) break
    if (settled[node]) continue
    settled[node] = 1

    const base = dist[node]!
    const end = offsets[node + 1]!
    for (let arc = offsets[node]!; arc < end; arc++) {
      const next = arcTarget[arc]!
      if (settled[next]) continue
      const candidate = base + arcWeight[arc]!
      if (candidate < dist[next]!) {
        dist[next] = candidate
        prev[next] = node
        prevEdge[next] = arcEdge[arc]!
        heap.push(next, candidate)
      }
    }
  }

  return { source, dist, prev, prevEdge }
}

export interface RoutePath {
  /** Node ids from source to target inclusive. */
  nodes: number[]
  /** Edge ids traversed, in order. */
  edges: number[]
  /** Full polyline, always running source -> target. */
  coordinates: Point[]
  /** Geometric length in map units. */
  distance: number
  /** Weighted cost, i.e. what the search minimised. */
  cost: number
}

/**
 * Reconstruct a route by walking `prevEdge` back from the target.
 *
 * Walking `prev` alone would be enough to name the nodes, but not to recover
 * the geometry: between two nodes joined by parallel edges there is no way to
 * tell which one the search chose.
 */
export function pathTo(
  network: Network,
  tree: ShortestPathTree,
  target: number,
): RoutePath | null {
  if (!Number.isFinite(tree.dist[target]!)) return null

  const nodes: number[] = [target]
  const edges: number[] = []
  let at = target
  while (at !== tree.source) {
    const edge = tree.prevEdge[at]!
    const parent = tree.prev[at]!
    if (edge < 0 || parent < 0) return null
    edges.push(edge)
    nodes.push(parent)
    at = parent
  }
  nodes.reverse()
  edges.reverse()

  const coordinates: Point[] = []
  let distance = 0
  for (let i = 0; i < edges.length; i++) {
    const edge = network.edges[edges[i]!]!
    const from = nodes[i]!
    // Geometry is stored a -> b; flip it when the route runs the other way, so
    // the output polyline always reads source -> target and the draw-on
    // animation starts at the origin.
    const geom = edge.a === from ? edge.geom : [...edge.geom].reverse()
    // Skip the first point of every edge after the first: it duplicates the
    // previous edge's last point.
    coordinates.push(...(i === 0 ? geom : geom.slice(1)))
    distance += edge.len
  }
  if (edges.length === 0) coordinates.push(network.nodes[target]!)

  return { nodes, edges, coordinates, distance, cost: tree.dist[target]! }
}
