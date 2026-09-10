/**
 * Brandes–Köpf secondary-axis coordinate assignment (Brandes & Köpf 2002,
 * *Fast and Simple Horizontal Coordinate Assignment*).
 *
 * The alternative to the Gansner et al. auxiliary-graph network simplex in
 * `assignSecondary`. Both place ranked, ordered vertices on the cross axis;
 * they trade differently:
 *
 *   - **Gansner** (`coordinates: 'gansner'`, the default) is what TikZ's
 *     `NodePositioningGansnerKNV1993` does. It optimizes a global objective,
 *     so it produces the most balanced drawings — but it runs a second
 *     network simplex on an auxiliary graph with |V|+|E| vertices, and the
 *     simplex recomputes low/lim and cut values in full on every pivot.
 *     That is the quadratic term that dominates `layered()` on large graphs.
 *   - **Brandes–Köpf** (`coordinates: 'brandes-koepf'`) is a heuristic: four
 *     extreme alignments (upper/lower × left/right), each linear, averaged
 *     at the end. O(V+E). Long edges still come out straight — that is the
 *     property the four-way median is designed to preserve — but the result
 *     is not the optimum of any single objective, so drawings can be
 *     slightly less symmetric than Gansner's.
 *
 * Structure follows the paper. The type-1 conflict scan and the
 * smallest-width balance step follow dagre's `position/bk.js`, which is the
 * clearest open expression of those two details; the compaction here is the
 * paper's own `placeBlock` (sink/shift), made iterative so deep block graphs
 * cannot overflow the stack.
 *
 * Preconditions (guaranteed by the layered pipeline, same as `ordering`):
 * every edge connects adjacent ranks, and `ranks[i]` is rank i in final
 * left-to-right order.
 */

export interface BKEdge {
  from: BKVertex
  to: BKVertex
}

export interface BKVertex {
  /** Dummy vertices are bend points; an edge joining two of them is an *inner segment*. */
  kind: 'node' | 'dummy'
  /** Half the vertex's extent along the axis being assigned. */
  secondaryHalf: number
  /**
   * Gap this vertex wants against its rank neighbours, overriding
   * `nodeSep`. Cluster border vertices use it so a box hugs its
   * contents instead of standing a full node gap away.
   */
  gap?: number
  /** Output: the assigned coordinate (vertex center on the cross axis). */
  secondary: number
  /** Edges from the previous rank into this vertex. */
  inEdges: BKEdge[]
  /** Edges from this vertex into the next rank. */
  outEdges: BKEdge[]
}

/** Which neighbor set a pass aligns toward. */
type Align = 'upper' | 'lower'

/** Which side a pass biases toward when a vertex has two median neighbors. */
type Bias = 'left' | 'right'

/**
 * Assign `secondary` for every vertex in `ranks`. Coordinates are vertex
 * centers and are not normalized — the caller shifts them onto its origin.
 *
 * `nodeSep` is the edge-to-edge gap between rank neighbors, matching the
 * separator semantics of the Gansner path.
 */
export function assignCoordinatesBK(ranks: BKVertex[][], nodeSep: number): void {
  const vertices = ranks.flat()
  if (vertices.length === 0) return

  // Conflicts are pairs of vertices, so they are invariant under both the
  // layer reversal and the in-layer reversal below: compute them once.
  const conflicts = findType1Conflicts(ranks)

  const candidates: Candidate[] = []
  for (const align of ['upper', 'lower'] as const) {
    for (const bias of ['left', 'right'] as const) {
      // A single "align upward, bias left" implementation covers all four
      // passes: reversing the rank array turns 'upper' into 'lower', and
      // reversing each rank turns 'left' into 'right' (undone by negating
      // the coordinates afterwards).
      let layers = ranks.map((r) => r.slice())
      if (align === 'lower') layers.reverse()
      if (bias === 'right') layers = layers.map((r) => r.slice().reverse())

      const { root, align: blocks } = verticalAlignment(layers, conflicts, align)
      const xs = horizontalCompaction(layers, root, blocks, nodeSep)
      if (bias === 'right') {
        for (const [v, value] of xs) xs.set(v, -value)
      }
      candidates.push({ xs, bias })
    }
  }

  balance(vertices, candidates)
}

// ── Type-1 conflicts ──────────────────────────────────────────────────────

/**
 * Pairs of vertices whose connecting edge must not be used for alignment.
 * Keyed by object identity, so both directions are stored.
 */
class ConflictSet {
  private readonly byVertex = new Map<BKVertex, Set<BKVertex>>()

  add(v: BKVertex, w: BKVertex): void {
    this.side(v).add(w)
    this.side(w).add(v)
  }

  has(v: BKVertex, w: BKVertex): boolean {
    return this.byVertex.get(v)?.has(w) ?? false
  }

  private side(v: BKVertex): Set<BKVertex> {
    let set = this.byVertex.get(v)
    if (!set) {
      set = new Set()
      this.byVertex.set(v, set)
    }
    return set
  }
}

/**
 * Mark every non-inner segment that crosses an inner segment (a type-1
 * conflict). Aligning across such a crossing would bend a long edge, so the
 * alignment passes skip these pairs — this is what keeps multi-rank edges
 * straight.
 *
 * Scans rank pairs left to right: between two consecutive inner segments
 * (positions k0..k1 on the upper rank) every edge reaching outside that
 * window crosses one of them.
 */
function findType1Conflicts(ranks: BKVertex[][]): ConflictSet {
  const conflicts = new ConflictSet()

  for (let i = 1; i < ranks.length; i++) {
    const upper = ranks[i - 1]!
    const lower = ranks[i]!
    if (upper.length === 0 || lower.length === 0) continue

    const upperPos = positionsOf(upper)
    let k0 = 0
    let scanPos = 0

    for (let l = 0; l < lower.length; l++) {
      const v = lower[l]!
      const innerUpper = innerSegmentPartner(v, upperPos)
      const k1 = innerUpper ? upperPos.get(innerUpper)! : upper.length - 1

      if (innerUpper || l === lower.length - 1) {
        for (let scan = scanPos; scan <= l; scan++) {
          const w = lower[scan]!
          for (const u of neighborsOf(w, 'upper', upperPos)) {
            const uPos = upperPos.get(u)!
            // An inner segment may only conflict with a non-inner one.
            if ((uPos < k0 || uPos > k1) && !(u.kind === 'dummy' && w.kind === 'dummy')) {
              conflicts.add(u, w)
            }
          }
        }
        scanPos = l + 1
        k0 = k1
      }
    }
  }

  return conflicts
}

/** The upper endpoint of `v`'s inner segment, if it has one. */
function innerSegmentPartner(
  v: BKVertex,
  upperPos: Map<BKVertex, number>
): BKVertex | undefined {
  if (v.kind !== 'dummy') return undefined
  for (const u of neighborsOf(v, 'upper', upperPos)) {
    if (u.kind === 'dummy') return u
  }
  return undefined
}

// ── Vertical alignment ────────────────────────────────────────────────────

interface Alignment {
  /** Block representative for each vertex. */
  root: Map<BKVertex, BKVertex>
  /** Next vertex in the block's cyclic chain. */
  align: Map<BKVertex, BKVertex>
}

/**
 * Group vertices into vertical blocks by aligning each with its median
 * neighbor on the previous layer, skipping conflicted pairs and any
 * alignment that would cross one already made on this layer.
 */
function verticalAlignment(
  layers: BKVertex[][],
  conflicts: ConflictSet,
  align: Align
): Alignment {
  const root = new Map<BKVertex, BKVertex>()
  const blocks = new Map<BKVertex, BKVertex>()

  for (const layer of layers) {
    for (const v of layer) {
      root.set(v, v)
      blocks.set(v, v)
    }
  }

  for (let i = 1; i < layers.length; i++) {
    const prevPos = positionsOf(layers[i - 1]!)
    // Rightmost position on the previous layer already claimed by an
    // alignment from this layer; alignments must stay monotonic or blocks
    // would cross.
    let claimed = -1

    for (const v of layers[i]!) {
      const ws = neighborsOf(v, align, prevPos)
      if (ws.length === 0) continue
      ws.sort((a, b) => prevPos.get(a)! - prevPos.get(b)!)

      // One or two medians, depending on parity.
      const mid = (ws.length - 1) / 2
      for (let m = Math.floor(mid); m <= Math.ceil(mid); m++) {
        if (blocks.get(v) !== v) break // already aligned this vertex
        const w = ws[m]!
        const wPos = prevPos.get(w)!
        if (claimed < wPos && !conflicts.has(v, w)) {
          blocks.set(w, v)
          root.set(v, root.get(w)!)
          blocks.set(v, root.get(v)!)
          claimed = wPos
        }
      }
    }
  }

  return { root, align: blocks }
}

// ── Horizontal compaction ─────────────────────────────────────────────────

/**
 * Place each block as far left as its left neighbors allow, then pull
 * whole classes of blocks together (the paper's `sink`/`shift`).
 *
 * The paper's `placeBlock` is recursive; this is the same traversal with an
 * explicit stack, so a block graph deeper than the JS stack (long dummy
 * chains do get deep) cannot overflow it.
 */
function horizontalCompaction(
  layers: BKVertex[][],
  root: Map<BKVertex, BKVertex>,
  blocks: Map<BKVertex, BKVertex>,
  nodeSep: number
): Map<BKVertex, number> {
  const vertices = layers.flat()
  const x = new Map<BKVertex, number>()
  const sink = new Map<BKVertex, BKVertex>()
  const shift = new Map<BKVertex, number>()
  const leftOf = new Map<BKVertex, BKVertex>()

  for (const v of vertices) {
    sink.set(v, v)
    shift.set(v, Infinity)
  }
  for (const layer of layers) {
    for (let i = 1; i < layer.length; i++) leftOf.set(layer[i]!, layer[i - 1]!)
  }

  /** Required gap between two rank neighbors, edge to edge. */
  const sep = (left: BKVertex, right: BKVertex): number =>
    left.secondaryHalf + gapBetween(left, right, nodeSep) + right.secondaryHalf

  /** Members of `v`'s block, walking the cyclic align chain from `v`. */
  const members = (v: BKVertex): BKVertex[] => {
    const out: BKVertex[] = []
    let w = v
    do {
      out.push(w)
      w = blocks.get(w)!
    } while (w !== v)
    return out
  }

  const started = new Set<BKVertex>()
  const placed = new Set<BKVertex>()

  const place = (start: BKVertex): void => {
    const stack: BKVertex[] = [start]

    while (stack.length > 0) {
      const v = stack[stack.length - 1]!
      if (placed.has(v)) {
        stack.pop()
        continue
      }

      if (!started.has(v)) {
        started.add(v)
        x.set(v, 0)
        // First visit: queue the blocks this one is compacted against.
        // A dependency that is started but not placed is an ancestor on
        // the stack; leaving it at its provisional 0 is what the
        // recursive form does too (its `x` check returns early).
        let queued = false
        for (const w of members(v)) {
          const p = leftOf.get(w)
          if (!p) continue
          const u = root.get(p)!
          if (!started.has(u)) {
            stack.push(u)
            queued = true
          }
        }
        if (queued) continue
      }

      // Second visit: every dependency is placed, so compact against them.
      stack.pop()
      placed.add(v)
      for (const w of members(v)) {
        const p = leftOf.get(w)
        if (!p) continue
        const u = root.get(p)!
        if (sink.get(v) === v) sink.set(v, sink.get(u)!)
        const sinkU = sink.get(u)!
        if (sink.get(v) !== sinkU) {
          // Different classes: remember how far this one may later slide.
          shift.set(sinkU, Math.min(shift.get(sinkU)!, x.get(v)! - x.get(u)! - sep(p, w)))
        } else {
          x.set(v, Math.max(x.get(v)!, x.get(u)! + sep(p, w)))
        }
      }
    }
  }

  for (const v of vertices) {
    const r = root.get(v)!
    if (!started.has(r)) place(r)
  }

  // Absolute coordinates: block position plus its class's shift.
  const result = new Map<BKVertex, number>()
  for (const v of vertices) {
    const r = root.get(v)!
    let value = x.get(r) ?? 0
    const classShift = shift.get(sink.get(r)!)
    if (classShift !== undefined && classShift < Infinity) value += classShift
    result.set(v, value)
  }
  return result
}

// ── Balance ───────────────────────────────────────────────────────────────

interface Candidate {
  xs: Map<BKVertex, number>
  bias: Bias
}

/**
 * Combine the four extreme alignments: shift them all into register with
 * the narrowest one (left-biased passes by their left edge, right-biased by
 * their right), then take each vertex's average of the two median values.
 */
function balance(vertices: BKVertex[], candidates: Candidate[]): void {
  const extents = candidates.map((c) => {
    let min = Infinity
    let max = -Infinity
    for (const v of vertices) {
      const value = c.xs.get(v)!
      min = Math.min(min, value - v.secondaryHalf)
      max = Math.max(max, value + v.secondaryHalf)
    }
    return { min, max }
  })

  let narrowest = 0
  for (let i = 1; i < extents.length; i++) {
    if (extents[i]!.max - extents[i]!.min < extents[narrowest]!.max - extents[narrowest]!.min) {
      narrowest = i
    }
  }

  const target = extents[narrowest]!
  candidates.forEach((c, i) => {
    const delta =
      c.bias === 'left' ? target.min - extents[i]!.min : target.max - extents[i]!.max
    if (delta !== 0) {
      for (const [v, value] of c.xs) c.xs.set(v, value + delta)
    }
  })

  const values: number[] = []
  for (const v of vertices) {
    values.length = 0
    for (const c of candidates) values.push(c.xs.get(v)!)
    values.sort((a, b) => a - b)
    v.secondary = (values[1]! + values[2]!) / 2
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Edge-to-edge gap between two rank neighbours. A vertex asking for its
 * own `gap` wins over the layout's `nodeSep`; when both ask, the tighter
 * of the two applies, so a border never gets pushed out by its neighbour.
 */
export function gapBetween(
  left: { gap?: number },
  right: { gap?: number },
  nodeSep: number
): number {
  if (left.gap === undefined && right.gap === undefined) return nodeSep
  if (left.gap === undefined) return right.gap!
  if (right.gap === undefined) return left.gap
  return Math.min(left.gap, right.gap)
}

function positionsOf(layer: BKVertex[]): Map<BKVertex, number> {
  const pos = new Map<BKVertex, number>()
  layer.forEach((v, i) => pos.set(v, i))
  return pos
}

/**
 * `v`'s distinct neighbors that lie in the adjacent layer described by
 * `adjacentPos` — in-edge tails when aligning upward, out-edge heads when
 * aligning downward.
 *
 * Filtering on membership rather than trusting the edge lists keeps the
 * pass safe against a self-loop (which sits in both lists) or any edge that
 * did not get split into adjacent-rank segments.
 */
function neighborsOf(
  v: BKVertex,
  align: Align,
  adjacentPos: Map<BKVertex, number>
): BKVertex[] {
  const out: BKVertex[] = []
  const edges = align === 'upper' ? v.inEdges : v.outEdges
  for (const e of edges) {
    const w = align === 'upper' ? e.from : e.to
    if (w === v || !adjacentPos.has(w)) continue
    if (!out.includes(w)) out.push(w)
  }
  return out
}
