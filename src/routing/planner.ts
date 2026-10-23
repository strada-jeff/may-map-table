import { buildGraph, dijkstraFrom, pathTo } from './graph'
import { SnapIndex, splitEdgeAt } from './snap'
import type { Network, Point } from './types'

/** A point bound onto the road network: the node routes start or end at. */
export interface BoundAnchor {
  id: string
  point: Point
  node: number
  snapDistance: number
}

export interface PlannedRoute {
  originId: string
  coordinates: Point[]
  distance: number
}

export interface RoutePlan {
  /** Keyed by destination id. A destination no origin reaches is absent. */
  routes: Map<string, PlannedRoute>
  /** Placement problems worth fixing in the CMS; the plan is still usable. */
  problems: string[]
}

/**
 * Routes from whichever origin reaches each destination, computed from the
 * pins as loaded rather than precomputed at build time — so moving a pin in
 * the CMS needs no rebuild.
 *
 * `base` is build-network's output: the road network with the origins
 * already split in (`origins` name their nodes). It's cloned, never mutated,
 * since each destination is spliced into the graph the same way.
 */
export function planRoutes(
  base: Network,
  origins: readonly BoundAnchor[],
  destinations: readonly { id: string; point: Point }[],
  maxSnapDistance: number,
): RoutePlan {
  const network = structuredClone(base) as Network
  const problems: string[] = []

  // A fresh index per destination: each split changes the edges under it, so
  // two pins on one road each land on that road as the other left it.
  const bound: BoundAnchor[] = []
  for (const destination of destinations) {
    const snap = new SnapIndex(network).snap(destination.point)
    if (!snap) {
      problems.push(`Cannot snap "${destination.id}": the network has no edges`)
      continue
    }
    if (snap.distance > maxSnapDistance) {
      problems.push(
        `"${destination.id}" is ${snap.distance.toFixed(1)}u from the nearest road ` +
          `(limit ${maxSnapDistance}u) - is the anchor in the right place?`,
      )
    }
    const node = splitEdgeAt(network, snap)
    bound.push({ ...destination, node, snapDistance: snap.distance })
  }

  const graph = buildGraph(network)
  const routes = new Map<string, PlannedRoute>()
  const reachedBy = new Map<string, string[]>()

  for (const origin of origins) {
    const tree = dijkstraFrom(graph, origin.node)
    for (const destination of bound) {
      const route = pathTo(network, tree, destination.node)
      if (!route) continue
      reachedBy.set(destination.id, [...(reachedBy.get(destination.id) ?? []), origin.id])
      if (routes.has(destination.id)) continue
      routes.set(destination.id, {
        originId: origin.id,
        coordinates: route.coordinates,
        distance: Math.round(route.distance * 10) / 10,
      })
    }
  }

  // Every destination should be reachable from exactly one origin. Zero
  // means a dead pin; more than one means an unexpected connection between
  // what should be separate networks (the first origin wins).
  for (const destination of bound) {
    const reaching = reachedBy.get(destination.id) ?? []
    if (reaching.length === 0) problems.push(`"${destination.id}" is unreachable from every origin`)
    if (reaching.length > 1) {
      problems.push(
        `"${destination.id}" is reachable from multiple origins ` +
          `(${reaching.join(', ')}) — expected exactly one for separate networks`,
      )
    }
  }

  return { routes, problems }
}
