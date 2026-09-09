/**
 * Crossing minimization for layered layouts — a TypeScript port of TikZ's
 * `CrossingMinimizationGansnerKNV1993.lua` (weighted median + transpose,
 * keep-best sweeps) with dagre's O(e log n) bilayer cross count
 * (`order/cross-count.js`, Barth et al.) substituted for TikZ's quadratic
 * counter, and dagre's early-stop loop control (stop after 4 sweeps
 * without improvement; TikZ's 24 as the cap).
 *
 * Preconditions (guaranteed by the layered pipeline): the graph is a DAG
 * and every edge connects adjacent ranks (dummy nodes have been
 * inserted), so for a 'down' sweep the relevant neighbors of a rank-r
 * vertex are exactly its in-edge tails, and for 'up' its out-edge heads.
 */

export interface OrderingEdge {
  from: OrderingVertex
  to: OrderingVertex
  weight: number
}

export interface OrderingVertex {
  inEdges: OrderingEdge[]
  outEdges: OrderingEdge[]
}

type Direction = 'down' | 'up'

const MAX_ITERATIONS = 24
const MAX_NON_IMPROVING = 4

/**
 * Reorder each rank in place to minimize weighted edge crossings.
 * `ranks[i]` is the array of vertices on rank i, in current order.
 */
export function minimizeCrossings(ranks: OrderingVertex[][]): void {
  if (ranks.length === 0) return

  const snapshot = (): OrderingVertex[][] => ranks.map((r) => r.slice())
  const restore = (s: OrderingVertex[][]): void => {
    s.forEach((r, i) => {
      ranks[i]!.splice(0, ranks[i]!.length, ...r)
    })
  }

  // Initial order: keep the better of the pre-existing order, a
  // down-DFS, and an up-DFS (TikZ computeInitialRankOrdering).
  let best = snapshot()
  let bestCC = crossCount(ranks)
  for (const dir of ['down', 'up'] as Direction[]) {
    initialOrder(ranks, dir)
    const cc = crossCount(ranks)
    if (cc < bestCC) {
      bestCC = cc
      best = snapshot()
    }
  }
  restore(best)

  let lastBest = 0
  for (let i = 0; i < MAX_ITERATIONS && lastBest < MAX_NON_IMPROVING; i++, lastBest++) {
    const dir: Direction = i % 2 === 0 ? 'down' : 'up'
    weightedMedian(ranks, dir)
    transpose(ranks, dir)
    const cc = crossCount(ranks)
    if (cc < bestCC) {
      bestCC = cc
      best = snapshot()
      lastBest = 0
    }
  }
  restore(best)
}

// ── Initial order ─────────────────────────────────────────────────────────

/**
 * DFS from source nodes (down) or sink nodes (up); vertices are appended
 * to their rank in first-visit order (Gansner et al. 1993 / dagre
 * init-order, extended to both directions like TikZ).
 */
function initialOrder(ranks: OrderingVertex[][], dir: Direction): void {
  const rankOf = new Map<OrderingVertex, number>()
  ranks.forEach((rank, r) => {
    for (const v of rank) rankOf.set(v, r)
  })

  const newRanks: OrderingVertex[][] = ranks.map(() => [])
  const visited = new Set<OrderingVertex>()

  const roots: OrderingVertex[] = []
  for (const rank of ranks) {
    for (const v of rank) {
      const degree = dir === 'down' ? v.inEdges.length : v.outEdges.length
      if (degree === 0) roots.push(v)
    }
  }
  // Roots in reverse insertion order, like TikZ, then any vertex not
  // reachable from a root (defensive; every DAG vertex is reachable).
  const all = ranks.flat()
  const starts = [...roots.reverse(), ...all]

  for (const start of starts) {
    if (visited.has(start)) continue
    // Iterative pre-order DFS.
    const stack: OrderingVertex[] = [start]
    visited.add(start)
    while (stack.length > 0) {
      const v = stack.pop()!
      newRanks[rankOf.get(v)!]!.push(v)
      const edges = dir === 'down' ? v.outEdges : v.inEdges
      for (let i = edges.length - 1; i >= 0; i--) {
        const w = dir === 'down' ? edges[i]!.to : edges[i]!.from
        if (!visited.has(w)) {
          visited.add(w)
          stack.push(w)
        }
      }
    }
  }

  newRanks.forEach((r, i) => {
    ranks[i]!.splice(0, ranks[i]!.length, ...r)
  })
}

// ── Cross count (dagre / Barth et al. bilayer, weighted) ─────────────────

export function crossCount(ranks: OrderingVertex[][]): number {
  let cc = 0
  for (let i = 1; i < ranks.length; i++) {
    cc += twoLayerCrossCount(ranks[i - 1]!, ranks[i]!)
  }
  return cc
}

function twoLayerCrossCount(north: OrderingVertex[], south: OrderingVertex[]): number {
  const southPos = new Map<OrderingVertex, number>()
  south.forEach((v, i) => southPos.set(v, i))

  // Edges between the layers, in north order then south order, mapped to
  // their south endpoint position.
  const entries: { pos: number; weight: number }[] = []
  for (const v of north) {
    const outs = v.outEdges
      .filter((e) => southPos.has(e.to))
      .map((e) => ({ pos: southPos.get(e.to)!, weight: e.weight }))
      .sort((a, b) => a.pos - b.pos)
    entries.push(...outs)
  }

  // Accumulator tree over south positions.
  let firstIndex = 1
  while (firstIndex < south.length) firstIndex <<= 1
  const treeSize = 2 * firstIndex - 1
  firstIndex -= 1
  const tree = new Array<number>(treeSize).fill(0)

  let cc = 0
  for (const entry of entries) {
    let index = entry.pos + firstIndex
    tree[index]! += entry.weight
    let weightSum = 0
    while (index > 0) {
      if (index % 2) {
        weightSum += tree[index + 1]!
      }
      index = (index - 1) >> 1
      tree[index]! += entry.weight
    }
    cc += entry.weight * weightSum
  }
  return cc
}

// ── Weighted median (TikZ orderByWeightedMedian) ─────────────────────────

function weightedMedian(ranks: OrderingVertex[][], dir: Direction): void {
  const pos = positionMap(ranks)
  if (dir === 'down') {
    for (let r = 1; r < ranks.length; r++) {
      reorderByMedian(ranks[r]!, pos, 'in')
    }
  } else {
    for (let r = ranks.length - 2; r >= 0; r--) {
      reorderByMedian(ranks[r]!, pos, 'out')
    }
  }
}

function reorderByMedian(
  rank: OrderingVertex[],
  pos: Map<OrderingVertex, number>,
  side: 'in' | 'out',
): void {
  const fixed = new Map<OrderingVertex, number>()
  const movable: { v: OrderingVertex; median: number; i: number }[] = []

  rank.forEach((v, i) => {
    const edges = side === 'in' ? v.inEdges : v.outEdges
    const neighborPos: number[] = []
    for (const e of edges) {
      const w = side === 'in' ? e.from : e.to
      const p = pos.get(w)
      if (p !== undefined) neighborPos.push(p)
    }
    const m = medianPosition(neighborPos)
    if (m < 0) fixed.set(v, i)
    else movable.push({ v, median: m, i })
  })

  movable.sort((a, b) => a.median - b.median || a.i - b.i)

  // Fixed vertices keep their slots; movable vertices fill the remaining
  // slots in median order (TikZ Ranking:reorderTable / dagre sort.js).
  const result = new Array<OrderingVertex | undefined>(rank.length)
  for (const [v, i] of fixed) result[i] = v
  let mi = 0
  for (let i = 0; i < result.length; i++) {
    if (result[i] === undefined) result[i] = movable[mi++]!.v
  }
  rank.splice(0, rank.length, ...(result as OrderingVertex[]))
}

/**
 * Gansner et al. 1993 median (graphviz `medianvalue` indexing): odd →
 * middle; exactly 2 → mean; even ≥ 4 → the two middle positions weighted
 * toward the more compact side. -1 when there are no neighbors (fixed).
 *
 * Note: TikZ's `computeMedianPosition` is off by one for even counts
 * (it uses positions n/2-1, n/2 1-based); we follow graphviz and the
 * paper, using the two true middle elements.
 */
function medianPosition(positions: number[]): number {
  const n = positions.length
  if (n === 0) return -1
  positions.sort((a, b) => a - b)
  if (n % 2 === 1) return positions[(n - 1) / 2]!
  if (n === 2) return (positions[0]! + positions[1]!) / 2
  const m = n / 2
  const left = positions[m - 1]! - positions[0]!
  const right = positions[n - 1]! - positions[m]!
  if (left + right === 0) return (positions[m - 1]! + positions[m]!) / 2
  return (positions[m - 1]! * right + positions[m]! * left) / (left + right)
}

// ── Transpose (TikZ transpose) ────────────────────────────────────────────

function transpose(ranks: OrderingVertex[][], dir: Direction): void {
  let improved = true
  while (improved) {
    improved = false
    const order: number[] = []
    if (dir === 'down') {
      for (let r = 0; r < ranks.length - 1; r++) order.push(r)
    } else {
      for (let r = ranks.length - 2; r >= 0; r--) order.push(r)
    }
    for (const r of order) {
      const rank = ranks[r]!
      const otherPos = positionMapOf(ranks[dir === 'down' ? r - 1 : r + 1] ?? [])
      for (let i = 0; i + 1 < rank.length; i++) {
        const v = rank[i]!
        const w = rank[i + 1]!
        const cnVW = pairCrossings(v, w, otherPos, dir)
        const cnWV = pairCrossings(w, v, otherPos, dir)
        if (cnVW > cnWV) {
          rank[i] = w
          rank[i + 1] = v
          improved = true
        }
      }
    }
  }
}

/**
 * Crossings between the adjacent-rank edges of same-rank neighbors
 * (`left` before `right`) given the other rank's positions. For 'down'
 * the incoming edges toward the previous rank are compared; for 'up'
 * the outgoing edges toward the next rank.
 */
function pairCrossings(
  left: OrderingVertex,
  right: OrderingVertex,
  otherPos: Map<OrderingVertex, number>,
  dir: Direction,
): number {
  const edgesOf = (v: OrderingVertex): OrderingEdge[] =>
    dir === 'down' ? v.inEdges : v.outEdges
  const neighbor = (e: OrderingEdge): OrderingVertex => (dir === 'down' ? e.from : e.to)

  let crossings = 0
  for (const le of edgesOf(left)) {
    const lp = otherPos.get(neighbor(le))
    if (lp === undefined) continue
    for (const re of edgesOf(right)) {
      const rp = otherPos.get(neighbor(re))
      if (rp === undefined) continue
      if (rp - lp < 0) crossings++
    }
  }
  return crossings
}

// ── Helpers ───────────────────────────────────────────────────────────────

function positionMap(ranks: OrderingVertex[][]): Map<OrderingVertex, number> {
  const pos = new Map<OrderingVertex, number>()
  for (const rank of ranks) {
    rank.forEach((v, i) => pos.set(v, i))
  }
  return pos
}

function positionMapOf(rank: OrderingVertex[]): Map<OrderingVertex, number> {
  const pos = new Map<OrderingVertex, number>()
  rank.forEach((v, i) => pos.set(v, i))
  return pos
}
