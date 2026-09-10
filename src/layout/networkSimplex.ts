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

/** Slack of an edge: how much longer it is than its minimum length. */
function slack(e: SimplexEdge): number {
  return e.to.rank - e.from.rank - e.minLength
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
  private outEdges = new Map<SimplexVertex, SimplexEdge[]>()
  private inEdges = new Map<SimplexVertex, SimplexEdge[]>()
  private incident = new Map<SimplexVertex, { edge: SimplexEdge; isOut: boolean }[]>()

  // Spanning-tree state (tree edges are a subset of `edges`).
  private treeNodes = new Set<SimplexVertex>()
  private treeAdj = new Map<SimplexVertex, { node: SimplexVertex; edge: SimplexEdge }[]>()
  private treeEdgeList: SimplexEdge[] = []
  private low = new Map<SimplexVertex, number>()
  private lim = new Map<SimplexVertex, number>()
  private parentEdge = new Map<SimplexVertex, SimplexEdge | undefined>()
  private cutValues = new Map<SimplexEdge, number>()

  constructor(vertices: SimplexVertex[], edges: SimplexEdge[]) {
    this.vertices = vertices
    this.edges = edges

    for (const v of vertices) {
      this.outEdges.set(v, [])
      this.inEdges.set(v, [])
      this.incident.set(v, [])
    }
    for (const e of edges) {
      this.outEdges.get(e.from)!.push(e)
      this.inEdges.get(e.to)!.push(e)
      this.incident.get(e.from)!.push({ edge: e, isOut: true })
      this.incident.get(e.to)!.push({ edge: e, isOut: false })
    }
  }

  run(): void {
    this.initRanks()
    this.feasibleTree()
    this.initLowLimValues()
    this.initCutValues()

    let leave = this.findLeaveEdge()
    while (leave) {
      const enter = this.findEnterEdge(leave)
      if (!enter) {
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
      if (Math.abs(this.cutValues.get(edge) ?? 0) > SLACK_EPSILON) continue
      const enter = this.findEnterEdge(edge)
      if (!enter) continue
      const delta = slack(enter)
      if (delta > 1) {
        // TikZ rerank(node, d) does rank -= d on the node's component.
        if (this.lim.get(edge.from)! < this.lim.get(edge.to)!) {
          this.shiftComponent(edge, edge.from, -delta / 2)
        } else {
          this.shiftComponent(edge, edge.to, delta / 2)
        }
      }
    }
  }

  /**
   * Shift every vertex in `from`'s tree component (the tree cut at
   * `edge`) by `delta`. Equivalent to TikZ's `rerank`.
   */
  private shiftComponent(edge: SimplexEdge, from: SimplexVertex, delta: number): void {
    const visited = new Set<SimplexVertex>([from])
    // BFS over a growing array with a head index rather than
    // `queue.shift()`. V8 left-trims fast-element arrays, so shift() is
    // amortized O(1) in practice and this is a modest constant-factor
    // win — but it is O(1) by construction rather than by grace of a VM
    // optimization that stops applying once the array leaves fast mode.
    const queue: SimplexVertex[] = [from]
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head]!
      v.rank += delta
      for (const { node: w, edge: treeEdge } of this.treeAdj.get(v) ?? []) {
        if (treeEdge === edge || visited.has(w)) continue
        visited.add(w)
        queue.push(w)
      }
    }
  }

  // ── Longest-path initial ranking (forward Kahn) ───────────────────────────

  private initRanks(): void {
    const indegree = new Map<SimplexVertex, number>()
    for (const v of this.vertices) {
      v.rank = 0
      indegree.set(v, this.inEdges.get(v)!.length)
    }

    const queue: SimplexVertex[] = []
    for (const v of this.vertices) {
      if (indegree.get(v) === 0) queue.push(v)
    }

    // Head index instead of `queue.shift()` — see shiftComponent.
    let processed = 0
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head]!
      processed++
      for (const e of this.outEdges.get(v)!) {
        e.to.rank = Math.max(e.to.rank, v.rank + e.minLength)
        indegree.set(e.to, indegree.get(e.to)! - 1)
        if (indegree.get(e.to) === 0) queue.push(e.to)
      }
    }

    if (processed !== this.vertices.length) {
      throw new Error('network simplex: graph is not acyclic')
    }
  }

  // ── Feasible tight tree ──────────────────────────────────────────────────

  private feasibleTree(): void {
    const start = this.vertices[0]!
    this.treeNodes.clear()
    this.treeAdj.clear()
    this.treeEdgeList = []
    this.treeNodes.add(start)

    const size = this.vertices.length
    while (this.tightTree() < size) {
      const edge = this.findMinSlackEdge()
      const delta = this.treeNodes.has(edge.from) ? slack(edge) : -slack(edge)
      this.shiftRanks(delta)
    }
  }

  /** Grow the tree by absorbing tight edges; returns the node count. */
  private tightTree(): number {
    const dfs = (v: SimplexVertex): void => {
      for (const { edge, isOut } of this.incident.get(v) ?? []) {
        const w = isOut ? edge.to : edge.from
        if (!this.treeNodes.has(w) && Math.abs(slack(edge)) <= SLACK_EPSILON) {
          this.treeNodes.add(w)
          this.addTreeEdge(v, w, edge)
          dfs(w)
        }
      }
    }
    for (const v of [...this.treeNodes]) dfs(v)
    return this.treeNodes.size
  }

  private findMinSlackEdge(): SimplexEdge {
    let best: SimplexEdge | undefined
    let bestSlack = Infinity
    for (const e of this.edges) {
      const fromIn = this.treeNodes.has(e.from)
      const toIn = this.treeNodes.has(e.to)
      if (fromIn !== toIn) {
        const s = slack(e)
        if (s < bestSlack) {
          bestSlack = s
          best = e
        }
      }
    }
    return best!
  }

  private shiftRanks(delta: number): void {
    for (const v of this.treeNodes) v.rank += delta
  }

  // ── Tree helpers ─────────────────────────────────────────────────────────

  private addTreeEdge(u: SimplexVertex, w: SimplexVertex, edge: SimplexEdge): void {
    if (!this.treeAdj.has(u)) this.treeAdj.set(u, [])
    if (!this.treeAdj.has(w)) this.treeAdj.set(w, [])
    this.treeAdj.get(u)!.push({ node: w, edge })
    this.treeAdj.get(w)!.push({ node: u, edge })
    this.treeEdgeList.push(edge)
  }

  private removeTreeEdge(u: SimplexVertex, w: SimplexVertex): void {
    this.treeAdj.set(u, (this.treeAdj.get(u) ?? []).filter((x) => x.node !== w))
    this.treeAdj.set(w, (this.treeAdj.get(w) ?? []).filter((x) => x.node !== u))
    this.treeEdgeList = this.treeEdgeList.filter((e) => !this.connects(e, u, w))
  }

  private connects(e: SimplexEdge, u: SimplexVertex, w: SimplexVertex): boolean {
    return (e.from === u && e.to === w) || (e.from === w && e.to === u)
  }

  private treeEdgeBetween(u: SimplexVertex, w: SimplexVertex): SimplexEdge | undefined {
    return this.treeAdj.get(u)?.find((x) => x.node === w)?.edge
  }

  // ── Low/lim values for ancestor queries ─────────────────────────────────

  private initLowLimValues(): void {
    this.low.clear()
    this.lim.clear()
    this.parentEdge.clear()

    const root = this.vertices[0]!
    const visited = new Set<SimplexVertex>()
    let nextLim = 1

    const dfs = (v: SimplexVertex): number => {
      const low = nextLim
      visited.add(v)
      for (const { node: w, edge } of this.treeAdj.get(v) ?? []) {
        if (!visited.has(w)) {
          this.parentEdge.set(w, edge)
          nextLim = dfs(w)
        }
      }
      this.low.set(v, low)
      this.lim.set(v, nextLim)
      nextLim++
      return nextLim
    }

    dfs(root)
  }

  /** True if `v` is in the subtree rooted at `root`. */
  private isDescendant(v: SimplexVertex, root: SimplexVertex): boolean {
    const rl = this.low.get(root)!
    const vl = this.lim.get(v)!
    const rl2 = this.lim.get(root)!
    return rl <= vl && vl <= rl2
  }

  // ── Cut values ───────────────────────────────────────────────────────────

  private initCutValues(): void {
    this.cutValues.clear()

    // Postorder over tree nodes, minus the root (children before parents).
    const order: SimplexVertex[] = []
    const visited = new Set<SimplexVertex>()
    const dfs = (v: SimplexVertex): void => {
      visited.add(v)
      for (const { node: w } of this.treeAdj.get(v) ?? []) {
        if (!visited.has(w)) dfs(w)
      }
      order.push(v)
    }
    dfs(this.vertices[0]!)
    order.pop()

    for (const v of order) {
      this.cutValues.set(this.parentEdge.get(v)!, this.calcCutValue(v))
    }
  }

  private calcCutValue(child: SimplexVertex): number {
    const te = this.parentEdge.get(child)!
    const parent = te.from === child ? te.to : te.from
    const childIsTail = te.from === child

    let cutValue = te.weight
    for (const { edge, isOut } of this.incident.get(child) ?? []) {
      const other = isOut ? edge.to : edge.from
      if (other === parent) continue

      const pointsToHead = isOut === childIsTail
      cutValue += pointsToHead ? edge.weight : -edge.weight
      const otherTreeEdge = this.treeEdgeBetween(child, other)
      if (otherTreeEdge) {
        const otherCut = this.cutValues.get(otherTreeEdge)!
        cutValue += pointsToHead ? -otherCut : otherCut
      }
    }
    return cutValue
  }

  // ── Simplex iterations ───────────────────────────────────────────────────

  private findLeaveEdge(): SimplexEdge | undefined {
    for (const e of this.treeEdgeList) {
      // Strictly negative beyond tolerance — pivoting on numerical noise
      // would flip the same pair of edges forever without improving.
      if ((this.cutValues.get(e) ?? 0) < -SLACK_EPSILON) return e
    }
    return undefined
  }

  private findEnterEdge(leave: SimplexEdge): SimplexEdge | undefined {
    const v = leave.from
    const w = leave.to

    let tailLabel = v
    let flip = false
    if (this.lim.get(v)! > this.lim.get(w)!) {
      tailLabel = w
      flip = true
    }

    let best: SimplexEdge | undefined
    let bestSlack = Infinity
    for (const e of this.edges) {
      const fromDesc = this.isDescendant(e.from, tailLabel)
      const toDesc = this.isDescendant(e.to, tailLabel)
      if (flip === fromDesc && flip !== toDesc) {
        const s = slack(e)
        if (s < bestSlack) {
          bestSlack = s
          best = e
        }
      }
    }
    return best
  }

  private exchangeEdges(leave: SimplexEdge, enter: SimplexEdge): void {
    this.removeTreeEdge(leave.from, leave.to)
    this.addTreeEdge(enter.from, enter.to, enter)
    this.initLowLimValues()
    this.initCutValues()
    this.updateRanks()
  }

  private updateRanks(): void {
    const root = this.vertices[0]!
    // Head index instead of `queue.shift()` — see shiftComponent. This
    // runs once per simplex pivot, so it is the hottest of the three.
    // (The pivot loop's real cost is the full low/lim + cut-value
    // recomputation in exchangeEdges, not the traversal itself.)
    const queue: SimplexVertex[] = [root]
    const visited = new Set<SimplexVertex>()

    for (let head = 0; head < queue.length; head++) {
      const v = queue[head]!
      visited.add(v)
      for (const { node: w, edge } of this.treeAdj.get(v) ?? []) {
        if (visited.has(w)) continue
        // `v` is the tree parent of `w`. If the edge points v→w, w sits
        // below v (rank + minLength); otherwise w→v, so w sits above.
        const flipped = edge.from === v
        w.rank = v.rank + (flipped ? edge.minLength : -edge.minLength)
        queue.push(w)
      }
    }
  }
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

  const realEdges = edges.filter((e) => e.from !== e.to)

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
