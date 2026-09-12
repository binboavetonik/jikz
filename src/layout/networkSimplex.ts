/**
 * Network-simplex rank assignment (Gansner, Koutsofios, North, Vo 1993).
 *
 * Structure follows dagre's `rank/network-simplex.js` (the cleanest open
 * expression of the algorithm), with TikZ's `balanceRanksTopBottom`
 * post-pass added so free nodes slide to the least-crowded feasible rank
 * (better aspect ratio). A zero-weight virtual root connects disconnected
 * components — the same trick dagre's nesting graph and TikZ's cluster
 * handling rely on upstream.
 */

export interface SimplexVertex {
  rank: number
}

export interface SimplexEdge {
  from: SimplexVertex
  to: SimplexVertex
  minLength: number
  weight: number
}

/**
 * Tolerance for "this edge is tight" and "this cut value is negative".
 *
 * Ranks are integers only when the simplex is assigning *ranks*. The
 * coordinate pass (`Layered.assignSecondaryGansner`) feeds it separator
 * edges whose `minLength` is `halfWidth + nodeSep + halfWidth` — measured
 * text extents, so arbitrary reals. Exact `=== 0` tests then fail on
 * values like 7.1e-15, and `feasibleTree` spins forever: `tightTree`
 * refuses to absorb an edge it considers slack, `findMinSlackEdge` hands
 * that same edge back, and shifting the tree by 7.1e-15 changes nothing.
 *
 * 1e-9 is far below any distance that matters in a drawing (a nanometre
 * of a pixel) and far above the residue float arithmetic leaves behind.
 */
const SLACK_EPSILON = 1e-9

export class NetworkSimplex {
  private vertices: SimplexVertex[]
  private edges: SimplexEdge[]

  // ── Index-based graph view ───────────────────────────────────────────────
  // Every structure below is keyed by vertex index (position in
  // `vertices`) or edge index (position in `edges`) rather than by object
  // identity. The pivot loop recomputes low/lim, cut values and ranks
  // over the whole tree on every exchange, so these are the hot arrays;
  // typed arrays and plain number[] adjacency keep that O(V+E) per pivot
  // free of Map/Set hashing and closure allocation. Iteration orders are
  // exactly those of the original Map/Set-based implementation (insertion
  // order everywhere), so the pivots — and therefore the ranks — are
  // identical.
  private n: number
  private edgeFrom: Int32Array
  private edgeTo: Int32Array
  private edgeMin: Float64Array
  private edgeWeight: Float64Array
  /** Per vertex: incident edge indices in edge order (out and in mixed). */
  private incident: number[][]
  private outEdges: number[][]
  private inEdges: number[][]

  // ── Spanning-tree state (tree edges are a subset of `edges`) ────────────
  private inTree: Uint8Array
  /** Vertices in the order they joined the tree (vertex 0 first). */
  private treeOrder: number[] = []
  /** Per vertex: tree edge indices, insertion order. */
  private treeAdj: number[][]
  private isTreeEdge: Uint8Array
  private treeEdgeList: number[] = []
  private low: Int32Array
  private lim: Int32Array
  /** Tree edge to the parent, or -1 for the root / untouched. */
  private parentEdge: Int32Array
  /** Per edge; meaningful for tree edges only. */
  private cutValues: Float64Array

  constructor(vertices: SimplexVertex[], edges: SimplexEdge[]) {
    this.vertices = vertices
    this.edges = edges
    const n = (this.n = vertices.length)
    const m = edges.length

    const index = new Map<SimplexVertex, number>()
    for (let i = 0; i < n; i++) index.set(vertices[i]!, i)

    this.edgeFrom = new Int32Array(m)
    this.edgeTo = new Int32Array(m)
    this.edgeMin = new Float64Array(m)
    this.edgeWeight = new Float64Array(m)
    this.incident = Array.from({ length: n }, () => [])
    this.outEdges = Array.from({ length: n }, () => [])
    this.inEdges = Array.from({ length: n }, () => [])
    for (let e = 0; e < m; e++) {
      const edge = edges[e]!
      const u = index.get(edge.from)!
      const w = index.get(edge.to)!
      this.edgeFrom[e] = u
      this.edgeTo[e] = w
      this.edgeMin[e] = edge.minLength
      this.edgeWeight[e] = edge.weight
      this.outEdges[u]!.push(e)
      this.inEdges[w]!.push(e)
      this.incident[u]!.push(e)
      this.incident[w]!.push(e)
    }

    this.inTree = new Uint8Array(n)
    this.treeAdj = Array.from({ length: n }, () => [])
    this.isTreeEdge = new Uint8Array(m)
    this.low = new Int32Array(n)
    this.lim = new Int32Array(n)
    this.parentEdge = new Int32Array(n).fill(-1)
    this.cutValues = new Float64Array(m)
  }

  /** Slack of an edge: how much longer it is than its minimum length. */
  private slack(e: number): number {
    return this.vertices[this.edgeTo[e]!]!.rank - this.vertices[this.edgeFrom[e]!]!.rank - this.edgeMin[e]!
  }

  private other(e: number, v: number): number {
    const u = this.edgeFrom[e]!
    return u === v ? this.edgeTo[e]! : u
  }

  /**
   * Requires a *simple* graph: no self-loops and at most one edge per
   * ordered vertex pair. The cut-value bookkeeping identifies the tree
   * edge between two vertices by its endpoints, so a parallel pair is
   * counted twice, cut values drift, and a pivot can be chosen for which
   * no entering edge exists. Callers merge parallel edges first — see
   * {@link mergeParallelEdges}.
   */
  run(): void {
    this.initRanks()
    this.feasibleTree()
    this.initLowLimValues()
    this.initCutValues()

    // The simplex terminates (each pivot strictly improves the objective
    // past SLACK_EPSILON), but a defensive cap turns any future
    // degeneracy into a feasible, slightly sub-optimal ranking instead
    // of a hang. Every pivot keeps the ranking feasible, so stopping
    // early is always safe.
    const maxPivots = 100 * (this.edges.length + this.n) + 1000
    let pivots = 0
    let leave = this.findLeaveEdge()
    while (leave >= 0 && pivots++ < maxPivots) {
      const enter = this.findEnterEdge(leave)
      if (enter < 0) {
        throw new Error('network simplex: no replacement edge found (infeasible)')
      }
      this.exchangeEdges(leave, enter)
      leave = this.findLeaveEdge()
    }
  }

  /**
   * TikZ `balanceRanksLeftRight` (Gansner et al. 1993 §5.2): after the
   * optimum is reached, tree edges whose cut value is zero carry slack
   * that can be distributed to either side without changing the
   * objective. Shift such components by half the replacement edge's
   * slack so drawings come out balanced/symmetric instead of tight to
   * one side. Call after `run()`, while the tree state is alive.
   *
   * Used for coordinate assignment (secondary axis); rank assignment
   * uses the top/bottom balance in `networkSimplexRanks` instead.
   */
  balanceLeftRight(): void {
    for (const edge of [...this.treeEdgeList]) {
      if (Math.abs(this.cutValues[edge]!) > SLACK_EPSILON) continue
      const enter = this.findEnterEdge(edge)
      if (enter < 0) continue
      const delta = this.slack(enter)
      if (delta > 1) {
        // TikZ rerank(node, d) does rank -= d on the node's component.
        const from = this.edgeFrom[edge]!
        const to = this.edgeTo[edge]!
        if (this.lim[from]! < this.lim[to]!) {
          this.shiftComponent(edge, from, -delta / 2)
        } else {
          this.shiftComponent(edge, to, delta / 2)
        }
      }
    }
  }

  /**
   * Shift every vertex in `from`'s tree component (the tree cut at
   * `edge`) by `delta`. Equivalent to TikZ's `rerank`.
   */
  private shiftComponent(edge: number, from: number, delta: number): void {
    const visited = new Uint8Array(this.n)
    visited[from] = 1
    // BFS over a growing array with a head index rather than
    // `queue.shift()` — O(1) by construction.
    const queue: number[] = [from]
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head]!
      this.vertices[v]!.rank += delta
      for (const treeEdge of this.treeAdj[v]!) {
        if (treeEdge === edge) continue
        const w = this.other(treeEdge, v)
        if (visited[w]) continue
        visited[w] = 1
        queue.push(w)
      }
    }
  }

  // ── Longest-path initial ranking (forward Kahn) ───────────────────────────

  private initRanks(): void {
    const n = this.n
    const indegree = new Int32Array(n)
    for (let v = 0; v < n; v++) {
      this.vertices[v]!.rank = 0
      indegree[v] = this.inEdges[v]!.length
    }

    const queue: number[] = []
    for (let v = 0; v < n; v++) {
      if (indegree[v] === 0) queue.push(v)
    }

    let processed = 0
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head]!
      processed++
      const vRank = this.vertices[v]!.rank
      for (const e of this.outEdges[v]!) {
        const w = this.edgeTo[e]!
        const wv = this.vertices[w]!
        wv.rank = Math.max(wv.rank, vRank + this.edgeMin[e]!)
        if (--indegree[w]! === 0) queue.push(w)
      }
    }

    if (processed !== n) {
      throw new Error('network simplex: graph is not acyclic')
    }
  }

  // ── Feasible tight tree ──────────────────────────────────────────────────

  private feasibleTree(): void {
    this.inTree.fill(0)
    for (const adj of this.treeAdj) adj.length = 0
    this.isTreeEdge.fill(0)
    this.treeEdgeList = []
    this.inTree[0] = 1
    this.treeOrder = [0]

    const size = this.n
    while (this.tightTree() < size) {
      const edge = this.findMinSlackEdge()
      const delta = this.inTree[this.edgeFrom[edge]!] ? this.slack(edge) : -this.slack(edge)
      this.shiftRanks(delta)
    }
  }

  /**
   * Grow the tree by absorbing tight edges; returns the node count.
   * Depth-first from every vertex already in the tree, in tree insertion
   * order: an explicit (vertex, next-incident-index) stack reproduces the
   * recursive visiting order exactly without recursion-depth limits.
   */
  private tightTree(): number {
    const stackV: number[] = []
    const stackI: number[] = []
    // Snapshot, as the original iterated a copy of the tree-node set:
    // vertices absorbed during this pass are explored by the DFS that
    // absorbed them, not by the outer loop.
    for (const root of [...this.treeOrder]) {
      stackV.push(root)
      stackI.push(0)
      while (stackV.length > 0) {
        const top = stackV.length - 1
        const v = stackV[top]!
        const inc = this.incident[v]!
        const i = stackI[top]!
        if (i >= inc.length) {
          stackV.pop()
          stackI.pop()
          continue
        }
        stackI[top] = i + 1
        const edge = inc[i]!
        const w = this.other(edge, v)
        if (!this.inTree[w] && Math.abs(this.slack(edge)) <= SLACK_EPSILON) {
          this.inTree[w] = 1
          this.treeOrder.push(w)
          this.addTreeEdge(v, w, edge)
          stackV.push(w)
          stackI.push(0)
        }
      }
    }
    return this.treeOrder.length
  }

  private findMinSlackEdge(): number {
    let best = -1
    let bestSlack = Infinity
    const m = this.edges.length
    for (let e = 0; e < m; e++) {
      const fromIn = this.inTree[this.edgeFrom[e]!]
      const toIn = this.inTree[this.edgeTo[e]!]
      if (fromIn !== toIn) {
        const s = this.slack(e)
        if (s < bestSlack) {
          bestSlack = s
          best = e
        }
      }
    }
    return best
  }

  private shiftRanks(delta: number): void {
    for (let v = 0; v < this.n; v++) if (this.inTree[v]) this.vertices[v]!.rank += delta
  }

  // ── Tree helpers ─────────────────────────────────────────────────────────

  private addTreeEdge(u: number, w: number, edge: number): void {
    this.treeAdj[u]!.push(edge)
    this.treeAdj[w]!.push(edge)
    this.isTreeEdge[edge] = 1
    this.treeEdgeList.push(edge)
  }

  private removeTreeEdge(edge: number): void {
    const u = this.edgeFrom[edge]!
    const w = this.edgeTo[edge]!
    removeFrom(this.treeAdj[u]!, edge)
    removeFrom(this.treeAdj[w]!, edge)
    removeFrom(this.treeEdgeList, edge)
    this.isTreeEdge[edge] = 0
  }

  // ── Low/lim values for ancestor queries ─────────────────────────────────

  /**
   * Postorder numbering of the tree from vertex 0: `lim[v]` is v's
   * postorder index, `low[v]` the smallest index in v's subtree, so
   * "u is in v's subtree" is `low[v] <= lim[u] <= lim[v]`.
   */
  private initLowLimValues(): void {
    const visited = new Uint8Array(this.n)
    this.parentEdge.fill(-1)
    let nextLim = 1

    // Iterative DFS mirroring the recursive form: children are visited
    // in treeAdj order, `low` is taken on entry and `lim` on exit.
    const stackV: number[] = [0]
    const stackI: number[] = [0]
    visited[0] = 1
    this.low[0] = nextLim
    while (stackV.length > 0) {
      const top = stackV.length - 1
      const v = stackV[top]!
      const adj = this.treeAdj[v]!
      const i = stackI[top]!
      if (i < adj.length) {
        stackI[top] = i + 1
        const edge = adj[i]!
        const w = this.other(edge, v)
        if (!visited[w]) {
          visited[w] = 1
          this.parentEdge[w] = edge
          this.low[w] = nextLim
          stackV.push(w)
          stackI.push(0)
        }
        continue
      }
      this.lim[v] = nextLim++
      stackV.pop()
      stackI.pop()
    }
  }


  // ── Cut values ───────────────────────────────────────────────────────────

  private initCutValues(): void {
    // Postorder over tree nodes, minus the root (children before parents).
    // Same iterative DFS as initLowLimValues, so the order is identical.
    const visited = new Uint8Array(this.n)
    const stackV: number[] = [0]
    const stackI: number[] = [0]
    visited[0] = 1
    while (stackV.length > 0) {
      const top = stackV.length - 1
      const v = stackV[top]!
      const adj = this.treeAdj[v]!
      const i = stackI[top]!
      if (i < adj.length) {
        stackI[top] = i + 1
        const w = this.other(adj[i]!, v)
        if (!visited[w]) {
          visited[w] = 1
          stackV.push(w)
          stackI.push(0)
        }
        continue
      }
      stackV.pop()
      stackI.pop()
      if (v !== 0) this.cutValues[this.parentEdge[v]!] = this.calcCutValue(v)
    }
  }

  private calcCutValue(child: number): number {
    const te = this.parentEdge[child]!
    const parent = this.other(te, child)
    const childIsTail = this.edgeFrom[te] === child

    let cutValue = this.edgeWeight[te]!
    for (const edge of this.incident[child]!) {
      const isOut = this.edgeFrom[edge] === child
      const other = isOut ? this.edgeTo[edge]! : this.edgeFrom[edge]!
      if (other === parent) continue

      const pointsToHead = isOut === childIsTail
      const w = this.edgeWeight[edge]!
      cutValue += pointsToHead ? w : -w
      // In a simple graph the only tree edge between child and `other`
      // (a tree child of `child`, since the parent was skipped) is this
      // edge itself, and its cut value is already set (postorder).
      if (this.isTreeEdge[edge]) {
        const otherCut = this.cutValues[edge]!
        cutValue += pointsToHead ? -otherCut : otherCut
      }
    }
    return cutValue
  }

  // ── Simplex iterations ───────────────────────────────────────────────────

  private findLeaveEdge(): number {
    for (const e of this.treeEdgeList) {
      // Strictly negative beyond tolerance — pivoting on numerical noise
      // would flip the same pair of edges forever without improving.
      if (this.cutValues[e]! < -SLACK_EPSILON) return e
    }
    return -1
  }

  private findEnterEdge(leave: number): number {
    const v = this.edgeFrom[leave]!
    const w = this.edgeTo[leave]!

    let tailLabel = v
    let flip = false
    if (this.lim[v]! > this.lim[w]!) {
      tailLabel = w
      flip = true
    }

    const tLow = this.low[tailLabel]!
    const tLim = this.lim[tailLabel]!
    const lim = this.lim
    let best = -1
    let bestSlack = Infinity
    const m = this.edges.length
    for (let e = 0; e < m; e++) {
      const fl = lim[this.edgeFrom[e]!]!
      const tl = lim[this.edgeTo[e]!]!
      const fromDesc = tLow <= fl && fl <= tLim
      const toDesc = tLow <= tl && tl <= tLim
      if (flip === fromDesc && flip !== toDesc) {
        const s = this.slack(e)
        if (s < bestSlack) {
          bestSlack = s
          best = e
        }
      }
    }
    return best
  }

  private exchangeEdges(leave: number, enter: number): void {
    this.removeTreeEdge(leave)
    this.addTreeEdge(this.edgeFrom[enter]!, this.edgeTo[enter]!, enter)
    this.initLowLimValues()
    this.initCutValues()
    this.updateRanks()
  }

  private updateRanks(): void {
    // BFS from the root over tree edges; each child's rank follows from
    // its parent's plus/minus the edge's minLength.
    const visited = new Uint8Array(this.n)
    const queue: number[] = [0]
    visited[0] = 1
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head]!
      const vRank = this.vertices[v]!.rank
      for (const edge of this.treeAdj[v]!) {
        const w = this.other(edge, v)
        if (visited[w]) continue
        visited[w] = 1
        // `v` is the tree parent of `w`. If the edge points v→w, w sits
        // below v (rank + minLength); otherwise w→v, so w sits above.
        const flipped = this.edgeFrom[edge] === v
        this.vertices[w]!.rank = vRank + (flipped ? this.edgeMin[edge]! : -this.edgeMin[edge]!)
        queue.push(w)
      }
    }
  }
}

/** Remove the first occurrence of `x` from `arr` in place, preserving order. */
function removeFrom(arr: number[], x: number): void {
  const i = arr.indexOf(x)
  if (i >= 0) arr.splice(i, 1)
}

/**
 * Assign optimal ranks minimizing weighted edge length, subject to
 * `rank[to] - rank[from] >= minLength`. Mutates `vertex.rank` in place
 * and normalizes so the minimum rank is 0.
 */
export function networkSimplexRanks(
  vertices: SimplexVertex[],
  edges: SimplexEdge[],
): void {
  if (vertices.length === 0) return

  const realEdges = mergeParallelEdges(edges)

  // Zero-weight virtual root connects disconnected components so the
  // simplex sees one connected graph; it doesn't affect the objective.
  const root: SimplexVertex = { rank: 0 }
  const rootEdges: SimplexEdge[] = vertices.map((v) => ({
    from: root,
    to: v,
    minLength: 1,
    weight: 0,
  }))

  const simplex = new NetworkSimplex([root, ...vertices], [...rootEdges, ...realEdges])
  simplex.run()

  balanceRanks(vertices, realEdges)
  normalizeRanks(vertices)
}

/**
 * Collapse a multigraph into the simple graph {@link NetworkSimplex}
 * requires: self-loops are dropped and every set of parallel edges
 * (same ordered endpoints) becomes one edge whose weight is the sum and
 * whose minLength is the max — the same constraints, expressed once.
 * dagre's `util.simplify` does exactly this before its simplex.
 *
 * Parallel edges are routine after cycle removal: a 2-cycle a→b, b→a
 * has its back edge reversed and both become a→b.
 */
export function mergeParallelEdges(edges: readonly SimplexEdge[]): SimplexEdge[] {
  const byPair = new Map<SimplexVertex, Map<SimplexVertex, SimplexEdge>>()
  const merged: SimplexEdge[] = []
  for (const e of edges) {
    if (e.from === e.to) continue
    let row = byPair.get(e.from)
    if (!row) {
      row = new Map()
      byPair.set(e.from, row)
    }
    const existing = row.get(e.to)
    if (existing) {
      existing.weight += e.weight
      existing.minLength = Math.max(existing.minLength, e.minLength)
    } else {
      const copy: SimplexEdge = { from: e.from, to: e.to, minLength: e.minLength, weight: e.weight }
      row.set(e.to, copy)
      merged.push(copy)
    }
  }
  return merged
}

/**
 * TikZ `balanceRanksTopBottom`: a node with equal total in/out weight can
 * slide along its feasible rank interval without changing the objective;
 * move it to the least-crowded such rank for a better aspect ratio.
 */
function balanceRanks(vertices: SimplexVertex[], edges: SimplexEdge[]): void {
  const minRank = new Map<SimplexVertex, number>()
  const maxRank = new Map<SimplexVertex, number>()
  const inEdges = new Map<SimplexVertex, SimplexEdge[]>()
  const outEdges = new Map<SimplexVertex, SimplexEdge[]>()

  let minR = Infinity
  let maxR = -Infinity
  for (const v of vertices) {
    inEdges.set(v, [])
    outEdges.set(v, [])
    minR = Math.min(minR, v.rank)
    maxR = Math.max(maxR, v.rank)
  }
  for (const e of edges) {
    inEdges.get(e.to)!.push(e)
    outEdges.get(e.from)!.push(e)
  }

  // Rank histogram, built once and patched whenever a vertex moves.
  // Rebuilding it inside the loop (once per balanced vertex) made this
  // pass O(V²); the incremental form sees identical counts, because the
  // only thing that changes a rank here is this loop itself. Cheap
  // either way in profiles — balanceRanks is well under 1% of a
  // `layered()` build — but O(V) beats O(V²) for free.
  const counts = new Map<number, number>()
  for (const x of vertices) counts.set(x.rank, (counts.get(x.rank) ?? 0) + 1)

  for (const v of vertices) {
    let iw = 0
    let ow = 0
    minRank.set(v, minR)
    maxRank.set(v, maxR)
    for (const e of inEdges.get(v)!) {
      iw += e.weight
      minRank.set(v, Math.max(minRank.get(v)!, e.from.rank + e.minLength))
    }
    for (const e of outEdges.get(v)!) {
      ow += e.weight
      maxRank.set(v, Math.min(maxRank.get(v)!, e.to.rank - e.minLength))
    }

    if (iw === ow) {
      let best = minRank.get(v)!
      for (let r = best + 1; r <= maxRank.get(v)!; r++) {
        if ((counts.get(r) ?? 0) < (counts.get(best) ?? 0)) best = r
      }
      if (best !== v.rank) {
        counts.set(v.rank, counts.get(v.rank)! - 1)
        counts.set(best, (counts.get(best) ?? 0) + 1)
        v.rank = best
      }
    }
  }
}

function normalizeRanks(vertices: SimplexVertex[]): void {
  let min = Infinity
  for (const v of vertices) min = Math.min(min, v.rank)
  for (const v of vertices) v.rank -= min
}
