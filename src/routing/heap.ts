/**
 * Binary min-heap keyed by node id, with decrease-key.
 *
 * Dijkstra can also be done with a lazy heap that pushes duplicates and skips
 * stale pops, but decrease-key keeps the heap bounded by node count, which
 * makes the search allocation-free after construction.
 */
export class MinHeap {
  /** Node ids, heap-ordered by `priority`. */
  private heap: Int32Array
  /** Priority per node id (not per heap slot). */
  private priority: Float64Array
  /** Heap slot holding each node id, or -1 if absent. */
  private position: Int32Array
  private size = 0

  constructor(capacity: number) {
    this.heap = new Int32Array(capacity)
    this.priority = new Float64Array(capacity)
    this.position = new Int32Array(capacity).fill(-1)
  }

  get length(): number {
    return this.size
  }

  has(node: number): boolean {
    return this.position[node]! >= 0
  }

  priorityOf(node: number): number {
    return this.priority[node]!
  }

  /** Insert, or lower an existing node's priority. Higher values are ignored. */
  push(node: number, priority: number): void {
    const slot = this.position[node]!
    if (slot >= 0) {
      if (priority >= this.priority[node]!) return
      this.priority[node] = priority
      this.siftUp(slot)
      return
    }
    const at = this.size++
    this.heap[at] = node
    this.priority[node] = priority
    this.position[node] = at
    this.siftUp(at)
  }

  /** Remove and return the lowest-priority node id, or -1 when empty. */
  pop(): number {
    if (this.size === 0) return -1
    const top = this.heap[0]!
    this.position[top] = -1
    const last = this.heap[--this.size]!
    if (this.size > 0) {
      this.heap[0] = last
      this.position[last] = 0
      this.siftDown(0)
    }
    return top
  }

  private siftUp(start: number): void {
    const { heap, priority, position } = this
    const node = heap[start]!
    const value = priority[node]!
    let at = start
    while (at > 0) {
      const parentAt = (at - 1) >> 1
      const parent = heap[parentAt]!
      if (priority[parent]! <= value) break
      heap[at] = parent
      position[parent] = at
      at = parentAt
    }
    heap[at] = node
    position[node] = at
  }

  private siftDown(start: number): void {
    const { heap, priority, position, size } = this
    const node = heap[start]!
    const value = priority[node]!
    let at = start
    for (;;) {
      const left = 2 * at + 1
      if (left >= size) break
      const right = left + 1
      let childAt = left
      if (right < size && priority[heap[right]!]! < priority[heap[left]!]!) {
        childAt = right
      }
      const child = heap[childAt]!
      if (priority[child]! >= value) break
      heap[at] = child
      position[child] = at
      at = childAt
    }
    heap[at] = node
    position[node] = at
  }
}
