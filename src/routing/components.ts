import type { Network } from './types'

/**
 * Node ids grouped by connectivity, largest group first.
 *
 * The build fails when there is more than one group, but the app computes it
 * again for the debug overlay so a broken export is visible on screen rather
 * than only in a terminal someone has to think to look at.
 */
export function connectedComponents(network: Network): number[][] {
  const adjacency: number[][] = network.nodes.map(() => [])
  for (const edge of network.edges) {
    adjacency[edge.a]!.push(edge.b)
    adjacency[edge.b]!.push(edge.a)
  }

  const seen = new Uint8Array(network.nodes.length)
  const components: number[][] = []

  for (let start = 0; start < network.nodes.length; start++) {
    if (seen[start]) continue
    const stack = [start]
    const component: number[] = []
    seen[start] = 1
    while (stack.length > 0) {
      const node = stack.pop()!
      component.push(node)
      for (const next of adjacency[node]!) {
        if (seen[next]) continue
        seen[next] = 1
        stack.push(next)
      }
    }
    components.push(component)
  }

  return components.sort((a, b) => b.length - a.length)
}
